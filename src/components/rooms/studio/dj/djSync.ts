import type { JsonValue, Parts, SharedRoom } from "../../../../multiplayer/sharedRoom";
import { DjShared, initialShared, now, useDj } from "./djStore";

// The booth over the network. It rides in the studio's shared room
// (studioSync.ts) and uses the room's rules: the state is many small parts,
// each settled on its own (newest change wins, ties to whoever has been in
// longest), and only the parts that changed are sent.
//
// Here every control is its own part - `decks.a.tempo`, `ch.b.low`,
// `decks.a.hot.3`, `fx.on` - so two people on different knobs never clash,
// and two on the same knob settle on one value. Things that only make sense
// whole (a deck's anchor, a loop, a hand on the platter) are a single part.
//
// Anchors and scratches carry a time, and every visitor's clock is a little
// different. Each pair of visitors measures the difference (send a time,
// get theirs back, halve the round trip), and incoming times are moved into
// our clock. Times we send are in our own clock; whoever receives them does
// the same conversion. If a better measurement comes in later, the times we
// took from that visitor are shifted to match.

const PREFIX = "dj:";
const WHOLE = /\.(anchor|loop|scratch)$/;
const TIMED = /\.(anchor|scratch)$/;
const FLUSH_MS = 33; // at most ~30 messages a second while a fader moves

type Flat = Record<string, JsonValue>;

const flatten = (value: unknown, path: string, out: Flat) => {
    if (value !== null && typeof value === "object" && !WHOLE.test(path)) {
        if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${path}.${i}`, out));
        else Object.entries(value).forEach(([k, v]) => flatten(v, path ? `${path}.${k}` : k, out));
    } else out[path] = value as JsonValue;
};
const flat = (s: DjShared) => {
    const out: Flat = {};
    flatten(s, "", out);
    return out;
};
const same = (a: JsonValue, b: JsonValue) => a === b || (typeof a === "object" && JSON.stringify(a) === JSON.stringify(b));

// The paths a part may name: the shape of the state, nothing else.
const KNOWN = new Set(Object.keys(flat(initialShared())));

const setPath = (target: Record<string, unknown>, path: string, value: JsonValue) => {
    if (!KNOWN.has(path)) return false;
    const keys = path.split(".");
    let node: Record<string, unknown> = target;
    for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]] as Record<string, unknown>;
    node[keys[keys.length - 1]] = value;
    return true;
};

type ClockMessage = { q: number; a: number | null };

export interface DjSync {
    snapshot: () => Parts;
    apply: (parts: Parts, from: string) => void;
    onPeerJoin: (peerId: string) => void;
    attach: (room: SharedRoom) => void;
    // Someone already here has told us how the booth is.
    heard: () => boolean;
    isLeader: () => boolean;
    leave: () => void;
}

export const createDjSync = (): DjSync => {
    let room: SharedRoom | null = null;
    let applying = false;
    let heard = false;
    let pending: Parts = {};
    let timer: number | null = null;

    // Their clock minus ours, per visitor, from the quickest round trip lately.
    const clocks = new Map<string, { offset: number; rtt: number; at: number }>();
    // Timed parts we took from another visitor, and the offset we used.
    const sourced = new Map<string, { peer: string; offset: number }>();
    const peers = new Set<string>();
    let askClock: (message: ClockMessage, target?: string) => void = () => {};
    let probeTimer: number | undefined;

    const flush = () => {
        timer = null;
        const parts = pending;
        pending = {};
        if (room && Object.keys(parts).length) room.publish(parts);
    };

    // Every change made here goes out (changes that came in don't echo).
    const unsubscribe = useDj.subscribe((next, before) => {
        if (applying) return;
        const a = flat(next);
        const b = flat(before);
        let any = false;
        for (const key in a) {
            if (same(a[key], b[key])) continue;
            pending[PREFIX + key] = a[key];
            sourced.delete(key);
            any = true;
        }
        if (any && timer === null) timer = window.setTimeout(flush, FLUSH_MS);
    });

    const setState = (s: DjShared) => {
        applying = true;
        useDj.setState(s);
        applying = false;
    };

    const record = (peer: string, offset: number, rtt: number) => {
        const known = clocks.get(peer);
        const stale = !known || now() - known.at > 30000;
        if (!stale && rtt > known!.rtt * 1.5) return;
        clocks.set(peer, { offset, rtt, at: now() });
        // Move the times we took from them onto the better estimate.
        const s = structuredClone(useDj.getState());
        let any = false;
        sourced.forEach((source, key) => {
            if (source.peer !== peer || Math.abs(source.offset - offset) < 0.5) return;
            const keys = key.split(".");
            let node: Record<string, unknown> = s as unknown as Record<string, unknown>;
            for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]] as Record<string, unknown>;
            const timed = node[keys[keys.length - 1]] as { at: number } | null;
            if (timed) {
                node[keys[keys.length - 1]] = { ...timed, at: timed.at - (offset - source.offset) };
                any = true;
            }
            source.offset = offset;
        });
        if (any) setState(s);
    };

    const probe = (peer: string) => {
        for (let i = 0; i < 5; i++) window.setTimeout(() => askClock({ q: now(), a: null }, peer), i * 300);
    };

    return {
        snapshot: () => {
            const parts: Parts = {};
            Object.entries(flat(useDj.getState())).forEach(([key, value]) => (parts[PREFIX + key] = value));
            return parts;
        },
        apply: (parts, from) => {
            const s = structuredClone(useDj.getState()) as unknown as Record<string, unknown>;
            let any = false;
            Object.entries(parts).forEach(([name, raw]) => {
                if (!name.startsWith(PREFIX)) return;
                const key = name.slice(PREFIX.length);
                let value = raw;
                if (TIMED.test(key) && value && typeof value === "object" && !Array.isArray(value) && typeof value.at === "number") {
                    const offset = clocks.get(from)?.offset ?? 0;
                    value = { ...value, at: value.at - offset };
                    sourced.set(key, { peer: from, offset });
                }
                if (setPath(s, key, value)) any = true;
            });
            if (!any) return;
            heard = true;
            setState(s as unknown as DjShared);
        },
        onPeerJoin: (peer) => {
            peers.add(peer);
            probe(peer);
        },
        attach: (r) => {
            room = r;
            askClock = r.channel<ClockMessage>("dj-clock", (message, from) => {
                if (message.a === null) askClock({ q: message.q, a: now() }, from);
                else {
                    const back = now();
                    record(from, message.a - (message.q + back) / 2, back - message.q);
                }
            });
            probeTimer = window.setInterval(() => peers.forEach((p) => askClock({ q: now(), a: null }, p)), 20000);
        },
        heard: () => heard,
        isLeader: () => room?.isLeader() ?? true,
        leave: () => {
            unsubscribe();
            if (timer !== null) window.clearTimeout(timer);
            window.clearInterval(probeTimer);
            room = null;
        },
    };
};
