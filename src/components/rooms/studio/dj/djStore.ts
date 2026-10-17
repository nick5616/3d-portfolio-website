import { create } from "zustand";
import { trackMeta } from "./crate";

// Everything on the booth: two CDJs and a two-channel DJM. This is the
// room's shared state (djSync.ts sends each control as its own part, so two
// people working different knobs never clash). Nobody sends audio: every
// visitor's browser plays the mix itself from the same records and the same
// controls.
//
// A deck's playhead isn't sent as it moves. It's an anchor - "at this moment
// it was here, playing or not" - and everyone works out where it is now from
// the anchor and the deck's speed (tempo fader, sync, nudge, direction).
// Whenever something changes the speed or loops the playhead, the anchor is
// moved up to that moment in the same change, so the arithmetic always
// starts from where the deck really was.
//
// Times are this browser's clock (`now()`); djSync.ts converts anchors from
// other visitors' clocks as they arrive.

export type DeckId = "a" | "b";
export const DECKS: DeckId[] = ["a", "b"];

export interface Anchor {
    pos: number; // s into the track
    at: number; // ms, now() when it was there
    playing: boolean;
}
export interface Loop {
    in: number;
    out: number; // -1 while only the in-point is set
    on: boolean;
}
export interface Scratch {
    pos: number;
    at: number;
}

export interface Deck {
    track: string | null;
    anchor: Anchor;
    cue: number;
    hot: (number | null)[]; // A..H
    loop: Loop | null;
    tempo: number; // fader, -1..1 of the range; + is faster (toward you, as on a CDJ)
    range: number; // ± percent: 6, 10, 16, or 100 (WIDE)
    keylock: boolean; // MASTER TEMPO
    sync: boolean;
    reverse: boolean;
    bend: number; // jog nudge, a fraction of speed
    scratch: Scratch | null; // hand on the platter
    vinyl: boolean; // jog mode: VINYL scratches, CDJ nudges
}

export interface Channel {
    trim: number; // -1..1, centre is unity
    hi: number; // -1..1, -1 is a kill
    mid: number;
    low: number;
    color: number; // -1..1, the SOUND COLOR FX knob
    fader: number; // 0..1
    xf: "A" | "THRU" | "B";
}

export const BEAT_FX = ["delay", "echo", "pingpong", "spiral", "reverb", "trans", "filter", "flanger", "phaser", "roll"] as const;
export type BeatFxType = (typeof BEAT_FX)[number];
export const BEAT_FRACTIONS = [1 / 8, 1 / 4, 1 / 2, 3 / 4, 1, 2, 4, 8, 16];
export const COLOR_FX = ["space", "dubecho", "sweep", "noise", "crush", "filter"] as const;
export type ColorFxType = (typeof COLOR_FX)[number];

export interface DjShared {
    decks: Record<DeckId, Deck>;
    ch: Record<DeckId, Channel>;
    master: DeckId | null; // the tempo master
    xfader: number; // -1 (A) .. 1 (B)
    xcurve: 0 | 1 | 2; // slow blend / normal / sharp cut
    level: number; // master level, 0..1
    colorFx: ColorFxType;
    fx: { type: BeatFxType; beat: number; ch: DeckId | "master"; depth: number; on: boolean };
    quantize: boolean;
}

export const now = () => performance.timeOrigin + performance.now();

const freshDeck = (): Deck => ({
    track: null,
    anchor: { pos: 0, at: 0, playing: false },
    cue: 0,
    hot: Array(8).fill(null),
    loop: null,
    tempo: 0,
    range: 10,
    keylock: false,
    sync: false,
    reverse: false,
    bend: 0,
    scratch: null,
    vinyl: true,
});
const freshChannel = (): Channel => ({ trim: 0, hi: 0, mid: 0, low: 0, color: 0, fader: 1, xf: "THRU" });

export const initialShared = (): DjShared => ({
    decks: { a: freshDeck(), b: freshDeck() },
    ch: { a: freshChannel(), b: freshChannel() },
    master: null,
    xfader: 0,
    xcurve: 1,
    level: 0.8,
    colorFx: "filter",
    fx: { type: "echo", beat: 3, ch: "master", depth: 0.5, on: false },
    quantize: true,
});

export const useDj = create<DjShared>(() => initialShared());

// What's only yours: your headphones, the console's switches.
interface DjLocal {
    phonesCue: Record<DeckId, boolean>;
    phonesMix: number; // 0 cue .. 1 master
    phonesLevel: number;
    phonesSink: string | null; // output device id
    deleteMode: boolean; // hot cue CALL/DELETE
    remaining: boolean; // time display
    jumpBeats: number;
    previewing: Record<DeckId, boolean>; // holding CUE at the cue point
    notice: string | null;
}
export const useDjLocal = create<DjLocal>(() => ({
    phonesCue: { a: false, b: false },
    phonesMix: 0.5,
    phonesLevel: 0.7,
    phonesSink: null,
    deleteMode: false,
    remaining: false,
    jumpBeats: 4,
    previewing: { a: false, b: false },
    notice: null,
}));

// --- Where things are -----------------------------------------------------------

const other = (id: DeckId): DeckId => (id === "a" ? "b" : "a");
export const bpmOf = (s: DjShared, id: DeckId) => trackMeta(s.decks[id].track)?.bpm ?? 0;
const durationOf = (s: DjShared, id: DeckId) => trackMeta(s.decks[id].track)?.duration ?? Infinity;

// Speed from the tempo fader, or from the master when synced (pitch only;
// a nudge or REV on the master doesn't drag the follower along).
export const baseRate = (s: DjShared, id: DeckId): number => {
    const deck = s.decks[id];
    const m = s.master;
    if (deck.sync && m && m !== id) {
        const mine = bpmOf(s, id);
        const theirs = bpmOf(s, m);
        if (mine > 0 && theirs > 0) return (theirs * baseRate(s, m)) / mine;
    }
    return 1 + (deck.tempo * deck.range) / 100;
};
// The fader setting that gives `rate`, widening the range if it won't fit.
const fitTempo = (deck: Deck, rate: number) => {
    let tempo = ((rate - 1) * 100) / deck.range;
    if (Math.abs(tempo) > 1) {
        deck.range = 100;
        tempo = rate - 1;
    }
    deck.tempo = Math.max(-1, Math.min(1, tempo));
};
export const rateOf = (s: DjShared, id: DeckId) => {
    const deck = s.decks[id];
    return baseRate(s, id) * (1 + deck.bend) * (deck.reverse ? -1 : 1);
};
export const liveBpm = (s: DjShared, id: DeckId) => bpmOf(s, id) * baseRate(s, id);
export const tempoPercent = (s: DjShared, id: DeckId) => (baseRate(s, id) - 1) * 100;

const loopLength = (loop: Loop | null) => (loop && loop.out > loop.in ? loop.out - loop.in : 0);

export const positionAt = (s: DjShared, id: DeckId, t: number): number => {
    const deck = s.decks[id];
    if (deck.scratch) return deck.scratch.pos;
    const { pos, at, playing } = deck.anchor;
    const rate = rateOf(s, id);
    let p = playing ? pos + ((t - at) / 1000) * rate : pos;
    const loop = deck.loop;
    const length = loopLength(loop);
    if (loop?.on && length > 0) {
        // Only a playhead that was inside the loop is caught by it.
        if (rate > 0 && pos <= loop.out + 1e-3 && p > loop.out) p = loop.in + ((p - loop.in) % length);
        else if (rate < 0 && pos >= loop.in - 1e-3 && p < loop.in) p = loop.out - ((loop.out - p) % length);
    }
    return Math.max(0, Math.min(durationOf(s, id), p));
};
export const positionNow = (id: DeckId) => positionAt(useDj.getState(), id, now());

// Is the deck actually making sound right now (not ended, not stopped)?
export const isRolling = (s: DjShared, id: DeckId, t = now()) => {
    const deck = s.decks[id];
    if (!deck.track || !deck.anchor.playing) return false;
    const p = positionAt(s, id, t);
    return rateOf(s, id) > 0 ? p < durationOf(s, id) - 0.01 : p > 0.01;
};

// The beat grid.
const beatLength = (s: DjShared, id: DeckId) => {
    const bpm = bpmOf(s, id);
    return bpm > 0 ? 60 / bpm : 0.5;
};
const gridOrigin = (s: DjShared, id: DeckId) => trackMeta(s.decks[id].track)?.firstBeat ?? 0;
export const beatPhase = (s: DjShared, id: DeckId, pos: number) => {
    const beat = beatLength(s, id);
    return ((((pos - gridOrigin(s, id)) / beat) % 1) + 1) % 1;
};
// Which beat in the bar (0..3), for the CDJ's beat counter.
export const beatInBar = (s: DjShared, id: DeckId, pos: number) => {
    const n = Math.floor((pos - gridOrigin(s, id)) / beatLength(s, id) + 1e-6);
    return ((n % 4) + 4) % 4;
};
const snap = (s: DjShared, id: DeckId, pos: number, mode: "round" | "floor" = "round") => {
    if (!s.quantize || !s.decks[id].track) return pos;
    const beat = beatLength(s, id);
    const origin = gridOrigin(s, id);
    const n = (pos - origin) / beat;
    return Math.max(0, origin + (mode === "round" ? Math.round(n) : Math.floor(n + 1e-6)) * beat);
};

// --- Changing things ----------------------------------------------------------------

// Every change goes through here. It hands `change` a draft of the state at
// time `t`, with each deck's position worked out; afterwards, any deck whose
// speed or loop moved gets a fresh anchor at that position (unless the change
// set the anchor itself).
type Draft = DjShared & { t: number; pos: Record<DeckId, number> };
export const commit = (change: (d: Draft) => void) => {
    const before = useDj.getState();
    const t = now();
    const draft = structuredClone(before) as Draft;
    draft.t = t;
    draft.pos = { a: positionAt(before, "a", t), b: positionAt(before, "b", t) };
    change(draft);
    const pos = draft.pos;
    const scratch: Partial<Draft> = draft;
    delete scratch.t;
    delete scratch.pos;
    const next = draft as DjShared;
    for (const id of DECKS) {
        const was = before.decks[id];
        const is = next.decks[id];
        const anchorTouched = JSON.stringify(is.anchor) !== JSON.stringify(was.anchor);
        if (anchorTouched) continue;
        const moved = rateOf(next, id) !== rateOf(before, id) || JSON.stringify(is.loop) !== JSON.stringify(was.loop);
        if (moved && is.anchor.playing) is.anchor = { pos: pos[id], at: t, playing: true };
    }
    useDj.setState(next);
};

const setAnchor = (d: Draft, id: DeckId, pos: number, playing = d.decks[id].anchor.playing) => {
    d.decks[id].anchor = { pos, at: d.t, playing };
    d.pos[id] = pos;
};

// Line a deck's beats up with the master's (the shortest way).
const alignPhase = (d: Draft, id: DeckId) => {
    const m = d.master;
    if (!m || m === id || !d.decks[m].track || !d.decks[id].track) return;
    const beat = beatLength(d, id);
    let shift = (beatPhase(d, m, d.pos[m]) - beatPhase(d, id, d.pos[id])) * beat;
    if (shift > beat / 2) shift -= beat;
    if (shift < -beat / 2) shift += beat;
    setAnchor(d, id, Math.max(0, d.pos[id] + shift));
};

const notice = (text: string) => {
    useDjLocal.setState({ notice: text });
    window.setTimeout(() => useDjLocal.getState().notice === text && useDjLocal.setState({ notice: null }), 2600);
};

export const dj = {
    load(id: DeckId, trackId: string) {
        const meta = trackMeta(trackId);
        if (!meta) return false;
        if (isRolling(useDj.getState(), id)) {
            notice(`Deck ${id === "a" ? 1 : 2} is playing - pause it to load`);
            return false;
        }
        commit((d) => {
            const keep = d.decks[id];
            d.decks[id] = {
                ...freshDeck(),
                track: trackId,
                anchor: { pos: meta.start, at: d.t, playing: false },
                cue: meta.start,
                range: keep.range,
                keylock: keep.keylock,
                sync: keep.sync,
                vinyl: keep.vinyl,
            };
            d.pos[id] = meta.start;
            if (d.master === id) d.master = null;
        });
        return true;
    },

    play(id: DeckId) {
        const s = useDj.getState();
        if (!s.decks[id].track) return;
        // PLAY while holding CUE: keep going from here when CUE is let go.
        if (useDjLocal.getState().previewing[id]) {
            useDjLocal.setState((l) => ({ previewing: { ...l.previewing, [id]: false } }));
            return;
        }
        commit((d) => {
            const deck = d.decks[id];
            const starting = !deck.anchor.playing || !isRolling(s, id, d.t);
            if (!starting) {
                setAnchor(d, id, d.pos[id], false);
                return;
            }
            // From the very end, start again from the cue.
            const p = d.pos[id] >= durationOf(d, id) - 0.05 ? deck.cue : d.pos[id];
            setAnchor(d, id, p, true);
            // The first deck rolling is the tempo master.
            if (!d.master || !d.decks[d.master].track) d.master = id;
            if (deck.sync) alignPhase(d, id);
        });
    },

    stop(id: DeckId) {
        commit((d) => setAnchor(d, id, d.pos[id], false));
    },

    // CUE, the CDJ way: while playing, back to the cue point and stop; while
    // stopped somewhere else, set the cue here; stopped on the cue, play for
    // as long as it's held.
    cueDown(id: DeckId) {
        const s = useDj.getState();
        if (!s.decks[id].track) return;
        commit((d) => {
            const deck = d.decks[id];
            if (deck.anchor.playing && isRolling(s, id, d.t)) {
                setAnchor(d, id, deck.cue, false);
            } else if (Math.abs(d.pos[id] - deck.cue) < 0.02) {
                setAnchor(d, id, deck.cue, true);
                useDjLocal.setState((l) => ({ previewing: { ...l.previewing, [id]: true } }));
            } else {
                deck.cue = snap(d, id, d.pos[id]);
                setAnchor(d, id, deck.cue, false);
            }
        });
    },
    cueUp(id: DeckId) {
        if (!useDjLocal.getState().previewing[id]) return;
        useDjLocal.setState((l) => ({ previewing: { ...l.previewing, [id]: false } }));
        commit((d) => setAnchor(d, id, d.decks[id].cue, false));
    },

    hotCue(id: DeckId, slot: number) {
        if (!useDj.getState().decks[id].track) return;
        const deleting = useDjLocal.getState().deleteMode;
        commit((d) => {
            const deck = d.decks[id];
            const at = deck.hot[slot];
            if (deleting) deck.hot[slot] = null;
            else if (at === null) deck.hot[slot] = snap(d, id, d.pos[id]);
            else {
                // Jumping into a loop's range keeps it; anywhere else drops it.
                if (deck.loop?.on && (at < deck.loop.in || at > deck.loop.out)) deck.loop = { ...deck.loop, on: false };
                if (!deck.anchor.playing) deck.cue = at;
                setAnchor(d, id, at);
            }
        });
    },

    loopIn(id: DeckId) {
        commit((d) => {
            const p = snap(d, id, d.pos[id]);
            d.decks[id].loop = { in: p, out: -1, on: false };
            if (!d.decks[id].anchor.playing) d.decks[id].cue = p;
        });
    },
    loopOut(id: DeckId) {
        commit((d) => {
            const loop = d.decks[id].loop;
            if (!loop) return;
            const out = snap(d, id, d.pos[id]);
            if (out <= loop.in + 0.05) return;
            d.decks[id].loop = { in: loop.in, out, on: true };
            // Already past the new out-point: back round to the in-point.
            setAnchor(d, id, loop.in + Math.max(0, d.pos[id] - out));
        });
    },
    reloop(id: DeckId) {
        commit((d) => {
            const loop = d.decks[id].loop;
            if (!loop || loop.out <= loop.in) return;
            if (loop.on) d.decks[id].loop = { ...loop, on: false };
            else {
                d.decks[id].loop = { ...loop, on: true };
                setAnchor(d, id, loop.in);
            }
        });
    },
    beatLoop(id: DeckId, beats: number) {
        if (!useDj.getState().decks[id].track) return;
        commit((d) => {
            const deck = d.decks[id];
            const length = beats * beatLength(d, id);
            if (deck.loop?.on && Math.abs(loopLength(deck.loop) - length) < 1e-3) {
                deck.loop = { ...deck.loop, on: false };
                return;
            }
            const start = snap(d, id, d.pos[id], "floor");
            deck.loop = { in: start, out: start + length, on: true };
            if (d.pos[id] > start + length) setAnchor(d, id, start);
        });
    },
    // ½X / 2X while looping.
    resizeLoop(id: DeckId, factor: number) {
        commit((d) => {
            const loop = d.decks[id].loop;
            if (!loop || loop.out <= loop.in) return;
            const length = (loop.out - loop.in) * factor;
            if (length < 0.02) return;
            d.decks[id].loop = { ...loop, out: loop.in + length };
            if (loop.on && d.pos[id] > loop.in + length) setAnchor(d, id, loop.in + ((d.pos[id] - loop.in) % length));
        });
    },
    beatJump(id: DeckId, direction: 1 | -1) {
        const beats = useDjLocal.getState().jumpBeats;
        commit((d) => {
            const deck = d.decks[id];
            const shift = direction * beats * beatLength(d, id);
            // In a loop, the whole loop moves (LOOP MOVE).
            if (deck.loop?.on && deck.loop.out > deck.loop.in) deck.loop = { ...deck.loop, in: deck.loop.in + shift, out: deck.loop.out + shift };
            setAnchor(d, id, Math.max(0, Math.min(durationOf(d, id), d.pos[id] + shift)));
        });
    },
    needle(id: DeckId, pos: number) {
        commit((d) => {
            const deck = d.decks[id];
            if (deck.loop?.on && (pos < deck.loop.in || pos > deck.loop.out)) deck.loop = { ...deck.loop, on: false };
            setAnchor(d, id, Math.max(0, Math.min(durationOf(d, id), pos)));
            if (!deck.anchor.playing) deck.cue = d.pos[id];
        });
    },

    tempo(id: DeckId, value: number) {
        commit((d) => {
            d.decks[id].tempo = Math.max(-1, Math.min(1, value));
        });
    },
    cycleRange(id: DeckId) {
        const ranges = [6, 10, 16, 100];
        commit((d) => {
            const deck = d.decks[id];
            const rate = baseRate(d, id);
            deck.range = ranges[(ranges.indexOf(deck.range) + 1) % ranges.length];
            // The fader means a new range now; keep the speed where it was
            // (or as near as the narrower range goes).
            if (!deck.sync) deck.tempo = Math.max(-1, Math.min(1, ((rate - 1) * 100) / deck.range));
        });
    },
    tempoReset(id: DeckId) {
        commit((d) => {
            d.decks[id].tempo = 0;
        });
    },
    keylock(id: DeckId) {
        commit((d) => {
            d.decks[id].keylock = !d.decks[id].keylock;
        });
    },
    sync(id: DeckId) {
        commit((d) => {
            const deck = d.decks[id];
            if (deck.sync) {
                // Let go of sync without a jump: the fader takes over at the
                // speed the deck was synced to (widening the range if needed).
                const rate = baseRate(d, id);
                deck.sync = false;
                fitTempo(deck, rate);
                return;
            }
            deck.sync = true;
            const o = other(id);
            if (d.decks[o].track && (d.master === null || d.master === id) && d.decks[o].anchor.playing) d.master = o;
            if (d.master === null) d.master = id;
            if (deck.anchor.playing) alignPhase(d, id);
        });
    },
    makeMaster(id: DeckId) {
        commit((d) => {
            if (d.master === id) return;
            // Hand over without anyone changing speed: the new master keeps
            // the tempo it was synced to.
            const rate = baseRate(d, id);
            const deck = d.decks[id];
            d.master = id;
            if (deck.sync) fitTempo(deck, rate);
        });
    },
    reverse(id: DeckId) {
        commit((d) => {
            d.decks[id].reverse = !d.decks[id].reverse;
        });
    },
    jogMode(id: DeckId) {
        commit((d) => {
            d.decks[id].vinyl = !d.decks[id].vinyl;
        });
    },
    bend(id: DeckId, amount: number) {
        commit((d) => {
            d.decks[id].bend = Math.max(-0.5, Math.min(0.5, amount));
        });
    },
    // A hand on the platter: the playhead follows the hand until let go.
    scratchStart(id: DeckId) {
        commit((d) => {
            d.decks[id].scratch = { pos: d.pos[id], at: d.t };
        });
    },
    scratchMove(id: DeckId, seconds: number) {
        commit((d) => {
            const s = d.decks[id].scratch;
            if (s) d.decks[id].scratch = { pos: Math.max(0, Math.min(durationOf(d, id), s.pos + seconds)), at: d.t };
        });
    },
    scratchEnd(id: DeckId) {
        commit((d) => {
            const s = d.decks[id].scratch;
            if (!s) return;
            d.decks[id].scratch = null;
            setAnchor(d, id, s.pos);
        });
    },
    // Stopped, the jog wheel searches through the track.
    search(id: DeckId, seconds: number) {
        commit((d) => {
            setAnchor(d, id, Math.max(0, Math.min(durationOf(d, id), d.pos[id] + seconds)));
            if (!d.decks[id].anchor.playing) d.decks[id].cue = d.pos[id];
        });
    },

    channel<K extends keyof Channel>(id: DeckId, key: K, value: Channel[K]) {
        commit((d) => {
            d.ch[id][key] = value;
        });
    },
    set<K extends "xfader" | "xcurve" | "level" | "colorFx" | "quantize">(key: K, value: DjShared[K]) {
        commit((d) => {
            (d as DjShared)[key] = value;
        });
    },
    fx<K extends keyof DjShared["fx"]>(key: K, value: DjShared["fx"][K]) {
        commit((d) => {
            d.fx[key] = value;
        });
    },
};

// Which deck is a sensible place for a new record: an empty or stopped one,
// preferring whichever the crowd can't hear.
export const freeDeck = (): DeckId | null => {
    const s = useDj.getState();
    const free = DECKS.filter((id) => !isRolling(s, id));
    if (!free.length) return null;
    const audible = (id: DeckId) => s.ch[id].fader * (s.ch[id].xf === "THRU" ? 1 : (s.ch[id].xf === "A" ? 1 - s.xfader : 1 + s.xfader) / 2);
    return free.sort((x, y) => audible(x) - audible(y))[0];
};
