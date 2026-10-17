import React, { useEffect, useRef, useState } from "react";
import { useSceneStore } from "../../../../stores/sceneStore";
import { requestWorldPointerLock } from "../../../../utils/mainCanvas";
import { playSound } from "../../../../audio/soundManager";
import { closeDjConsole } from "./consoleGate";
import { trackMeta, useCrate, waveformNow, CrateTrack } from "./crate";
import { canPickOutput, engineRef } from "./djEngine";
import { Btn, Fader, Knob, Meter, useFrameLoop, useTicker, useWheel } from "./djControls";
import {
    BEAT_FRACTIONS,
    BEAT_FX,
    COLOR_FX,
    DECKS,
    DeckId,
    DjShared,
    beatInBar,
    beatPhase,
    dj,
    isRolling,
    liveBpm,
    now,
    positionAt,
    rateOf,
    tempoPercent,
    useDj,
    useDjLocal,
} from "./djStore";
import "./djConsole.css";

// Up at the decks: the whole booth as a control surface. Everything you
// touch here changes the shared booth (djStore.ts), so the room hears it and
// sees the gear move; only your headphones are yours.

export const DECK_COLOR: Record<DeckId, string> = { a: "#ff2975", b: "#00ffdd" };
const HOT_COLORS = ["#3ee58f", "#ff3b4e", "#ff9a1f", "#ffd23c", "#3fa9ff", "#b07bff", "#ff5cd1", "#30e3ca"];
const HOT_NAMES = "ABCDEFGH";
// A record at 33⅓: one turn of the platter is 1.8 seconds of music.
const SECONDS_PER_TURN = 1.8;
const deckName = (id: DeckId) => (id === "a" ? "1" : "2");

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const ALIASES: Record<string, string> = { Db: "C#", "D#": "Eb", Gb: "F#", "G#": "Ab", "A#": "Bb" };
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
// Speeding a record up raises its key (unless MASTER TEMPO holds it).
const shiftedKey = (key: string, semitones: number) => {
    const minor = key.endsWith("m");
    const root = minor ? key.slice(0, -1) : key;
    const index = NOTES.indexOf(ALIASES[root] ?? root);
    if (index < 0) return key;
    const n = (((index + semitones) % 12) + 12) % 12;
    const camelot = `${(minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[n]}${minor ? "A" : "B"}`;
    return `${NOTES[n]}${minor ? "m" : ""} · ${camelot}`;
};

const clock = (seconds: number) => {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};

// --- Waveforms -----------------------------------------------------------------------

const WAVE_COLORS = ["#2b6cff", "#ff9a1f", "#f4f2ff"]; // low, mid, high (3-band)

const drawBands = (
    g: CanvasRenderingContext2D,
    track: string,
    from: number,
    secondsPerPixel: number,
    x0: number,
    width: number,
    mid: number,
    half: number
) => {
    const wave = waveformNow(track);
    if (!wave) return;
    const { data, fps, columns } = wave;
    const scales = [1, 0.7, 0.42];
    for (let band = 0; band < 3; band++) {
        g.beginPath();
        for (let x = 0; x < width; x++) {
            const t0 = from + x * secondsPerPixel;
            const c0 = Math.floor(t0 * fps);
            const c1 = Math.max(c0 + 1, Math.floor((t0 + secondsPerPixel) * fps));
            if (c1 <= 0 || c0 >= columns) continue;
            let peak = 0;
            for (let c = Math.max(0, c0); c < Math.min(columns, c1); c++) peak = Math.max(peak, data[c * 3 + band]);
            const h = (peak / 255) * half * scales[band];
            if (h > 0.4) g.rect(x0 + x, mid - h, 1, h * 2);
        }
        g.fillStyle = WAVE_COLORS[band];
        g.globalAlpha = band === 0 ? 0.95 : 0.9;
        g.fill();
    }
    g.globalAlpha = 1;
};

const fitCanvas = (canvas: HTMLCanvasElement) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    const g = canvas.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w: canvas.clientWidth, h: canvas.clientHeight };
};

const marker = (g: CanvasRenderingContext2D, x: number, y: number, color: string, down: boolean, text?: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x - 5, y);
    g.lineTo(x + 5, y);
    g.lineTo(x, y + (down ? 7 : -7));
    g.closePath();
    g.fill();
    if (text) {
        g.font = "700 9px Manrope, sans-serif";
        g.fillText(text, x + 6, y + (down ? 8 : -1));
    }
};

// Both decks' waveforms, zoomed in and scrolling past a fixed playhead, one
// above the other - for matching beats by eye.
const ZoomedWaves: React.FC = () => {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [span, setSpan] = useState(8);
    useFrameLoop(() => {
        const el = canvas.current;
        if (!el) return;
        const { g, w, h } = fitCanvas(el);
        g.clearRect(0, 0, w, h);
        const s = useDj.getState();
        const t = now();
        DECKS.forEach((id, row) => {
            const top = (row * h) / 2;
            const lane = h / 2;
            const mid = top + lane / 2;
            const deck = s.decks[id];
            const meta = trackMeta(deck.track);
            g.fillStyle = row ? "#08080c" : "#0a0a0f";
            g.fillRect(0, top, w, lane);
            if (!meta || !deck.track) {
                g.fillStyle = "#5f5b70";
                g.font = "600 12px Manrope, sans-serif";
                g.fillText(`DECK ${deckName(id)} - no track loaded`, 12, mid + 4);
                return;
            }
            const pos = positionAt(s, id, t);
            const secondsPerPixel = span / w;
            const from = pos - (w / 2) * secondsPerPixel;
            const xOf = (time: number) => (time - from) / secondsPerPixel;

            // Loop
            const loop = deck.loop;
            if (loop && loop.out > loop.in) {
                g.fillStyle = loop.on ? "rgba(255, 210, 60, 0.2)" : "rgba(255, 255, 255, 0.06)";
                g.fillRect(xOf(loop.in), top, xOf(loop.out) - xOf(loop.in), lane);
            }
            drawBands(g, deck.track, from, secondsPerPixel, 0, w, mid, lane / 2 - 4);

            // Beat grid: bars in red, beats faint.
            const beat = 60 / meta.bpm;
            const first = Math.ceil((from - meta.firstBeat) / beat);
            for (let n = first; ; n++) {
                const x = xOf(meta.firstBeat + n * beat);
                if (x > w) break;
                const bar = ((n % 4) + 4) % 4 === 0;
                g.fillStyle = bar ? "rgba(255, 59, 78, 0.85)" : "rgba(255, 255, 255, 0.28)";
                g.fillRect(x, top, bar ? 1.5 : 1, bar ? lane : 6);
                if (!bar) g.fillRect(x, top + lane - 6, 1, 6);
            }

            marker(g, xOf(deck.cue), top + 1, "#ff9a1f", true);
            deck.hot.forEach((at, i) => at !== null && marker(g, xOf(at), top + lane - 1, HOT_COLORS[i], false, HOT_NAMES[i]));
            if (loop && loop.out < 0) marker(g, xOf(loop.in), top + 1, "#ffd23c", true, "IN");

            // Playhead
            g.fillStyle = deck.scratch ? "#ffffff" : "#ff3b4e";
            g.fillRect(w / 2 - 1, top, 2, lane);

            g.font = "800 11px Manrope, sans-serif";
            g.fillStyle = DECK_COLOR[id];
            g.fillText(deckName(id), 10, top + 16);
            g.fillStyle = "#d8d4e6";
            g.font = "700 11px ui-monospace, Menlo, Consolas, monospace";
            g.fillText(liveBpm(s, id).toFixed(2), 24, top + 16);
        });
        g.fillStyle = "rgba(255, 255, 255, 0.08)";
        g.fillRect(0, h / 2, w, 1);
    });
    return (
        <div className="dj-waves">
            <canvas ref={canvas} />
            <div className="dj-waves__zoom">
                <Btn label="+" title="Zoom in" onPress={() => setSpan((v) => Math.max(2, v / 1.5))} />
                <Btn label="−" title="Zoom out" onPress={() => setSpan((v) => Math.min(32, v * 1.5))} />
            </div>
        </div>
    );
};

// The whole track on the deck's screen. Click or drag to drop the needle.
const Overview: React.FC<{ id: DeckId }> = ({ id }) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    const dragging = useRef(false);
    useFrameLoop(() => {
        const el = canvas.current;
        if (!el) return;
        const { g, w, h } = fitCanvas(el);
        g.clearRect(0, 0, w, h);
        const s = useDj.getState();
        const deck = s.decks[id];
        const meta = trackMeta(deck.track);
        if (!meta || !deck.track) return;
        const x = (t: number) => (t / meta.duration) * w;
        drawBands(g, deck.track, 0, meta.duration / w, 0, w, h / 2, h / 2 - 2);
        const pos = positionAt(s, id, now());
        g.fillStyle = "rgba(6, 6, 10, 0.55)";
        g.fillRect(0, 0, x(pos), h);
        const loop = deck.loop;
        if (loop && loop.out > loop.in) {
            g.fillStyle = loop.on ? "rgba(255, 210, 60, 0.45)" : "rgba(255, 255, 255, 0.2)";
            g.fillRect(x(loop.in), 0, Math.max(2, x(loop.out) - x(loop.in)), h);
        }
        marker(g, x(deck.cue), 0, "#ff9a1f", true);
        deck.hot.forEach((at, i) => at !== null && marker(g, x(at), h, HOT_COLORS[i], false));
        g.fillStyle = "#ff3b4e";
        g.fillRect(x(pos) - 1, 0, 2, h);
        // The last minute flashes red, as a warning.
        const left = meta.duration - pos;
        if (isRolling(s, id) && left < 30 && Math.floor(left * 2) % 2 === 0) {
            g.strokeStyle = "#ff3b4e";
            g.lineWidth = 2;
            g.strokeRect(1, 1, w - 2, h - 2);
        }
    });
    const needle = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const meta = trackMeta(useDj.getState().decks[id].track);
        if (!meta) return;
        const rect = e.currentTarget.getBoundingClientRect();
        dj.needle(id, ((e.clientX - rect.left) / rect.width) * meta.duration);
    };
    return (
        <canvas
            ref={canvas}
            className="dj-overview"
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = true;
                needle(e);
            }}
            onPointerMove={(e) => dragging.current && needle(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
        />
    );
};

// --- The CDJ ---------------------------------------------------------------------------

const DeckScreen: React.FC<{ id: DeckId; s: DjShared }> = ({ id, s }) => {
    useTicker(20);
    const remaining = useDjLocal((l) => l.remaining);
    const live = useDj.getState();
    const deck = live.decks[id];
    const meta = trackMeta(deck.track);
    const pos = positionAt(live, id, now());
    const rate = rateOf(live, id);
    const master = s.master === id;
    const semitones = deck.keylock ? 0 : Math.round(12 * Math.log2(Math.max(0.01, Math.abs(rate))));
    const beat = meta ? beatInBar(live, id, pos) : -1;
    const tempo = tempoPercent(live, id);
    const range = deck.range === 100 ? "WIDE" : `±${deck.range}`;
    return (
        <div className="dj-screen" style={{ "--deck-color": DECK_COLOR[id] } as React.CSSProperties}>
            <div className="dj-screen__head">
                <span className="dj-screen__deck">DECK {deckName(id)}</span>
                <span className="dj-screen__title">
                    {meta ? meta.title : "No track - load one from the crate below"}
                    {meta && <small>{meta.artist}</small>}
                </span>
                <span className={`dj-screen__tag ${master ? "dj-screen__tag--on" : ""}`}>MASTER</span>
                <span className={`dj-screen__tag ${deck.sync ? "dj-screen__tag--on" : ""}`} style={{ "--c": "#3fa9ff" } as React.CSSProperties}>
                    SYNC
                </span>
                <span className={`dj-screen__tag ${deck.keylock ? "dj-screen__tag--on" : ""}`} style={{ "--c": "#3ee58f" } as React.CSSProperties}>
                    MT
                </span>
            </div>
            <Overview id={id} />
            <div className="dj-screen__row">
                <div className="dj-screen__cell">
                    <span className="dj-label" style={{ textAlign: "left" }}>
                        {remaining ? "Remain" : "Time"}
                    </span>
                    <span
                        className="dj-screen__big"
                        style={{ cursor: "pointer" }}
                        onPointerDown={() => useDjLocal.setState({ remaining: !remaining })}
                        title="Elapsed / remaining"
                    >
                        {meta ? (remaining ? `-${clock(meta.duration - pos)}` : clock(pos)) : "--:--.-"}
                    </span>
                </div>
                <div className="dj-screen__cell">
                    <div className="dj-beats">
                        {[0, 1, 2, 3].map((b) => (
                            <span key={b} className={`${b === 0 ? "down" : ""} ${beat === b && isRolling(live, id) ? "on" : ""}`} />
                        ))}
                    </div>
                    <span className="dj-screen__small">{meta ? shiftedKey(meta.key, semitones) : "--"}</span>
                </div>
                <div className="dj-screen__cell dj-screen__cell--right">
                    <span className="dj-label">BPM</span>
                    <span className="dj-screen__big">{meta ? liveBpm(live, id).toFixed(1) : "---.-"}</span>
                    <span className="dj-screen__small">
                        {tempo >= 0 ? "+" : ""}
                        {tempo.toFixed(2)}% {range}
                    </span>
                </div>
            </div>
        </div>
    );
};

// The jog wheel. On top (the platter): in VINYL mode a hand on a playing
// record scratches; in CDJ mode it nudges. The outer ring always nudges.
// Stopped, turning it searches through the track.
const Jog: React.FC<{ id: DeckId }> = ({ id }) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    const gesture = useRef<{ mode: "scratch" | "search" | "bend"; angle: number; time: number; bend: number; sent: number } | null>(null);
    const wheelTimer = useRef<number>();
    // The wheel nudges a playing deck, or searches a stopped one.
    useWheel(canvas, (e) => {
        const s = useDj.getState();
        if (!s.decks[id].track) return;
        const direction = Math.sign(e.deltaY);
        if (isRolling(s, id)) {
            dj.bend(id, -direction * 0.06);
            window.clearTimeout(wheelTimer.current);
            wheelTimer.current = window.setTimeout(() => dj.bend(id, 0), 140);
        } else dj.search(id, -direction * 0.04);
    });

    useFrameLoop(() => {
        const el = canvas.current;
        if (!el) return;
        const { g, w } = fitCanvas(el);
        const R = w / 2;
        g.clearRect(0, 0, w, w);
        g.save();
        g.translate(R, R);
        const s = useDj.getState();
        const deck = s.decks[id];
        const meta = trackMeta(deck.track);
        const pos = positionAt(s, id, now());
        const rolling = isRolling(s, id);
        const touched = gesture.current !== null;

        // Outer ring: brushed metal, a lit edge in the deck's colour.
        const ring = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R);
        ring.addColorStop(0, "#3a3942");
        ring.addColorStop(0.5, "#5b5a64");
        ring.addColorStop(1, "#24232a");
        g.fillStyle = ring;
        g.beginPath();
        g.arc(0, 0, R - 1, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = touched ? "#ffffff" : DECK_COLOR[id];
        g.globalAlpha = rolling || touched ? 0.95 : 0.3;
        g.lineWidth = 3;
        g.shadowColor = g.strokeStyle;
        g.shadowBlur = rolling || touched ? 12 : 0;
        g.beginPath();
        g.arc(0, 0, R * 0.81, 0, Math.PI * 2);
        g.stroke();
        g.shadowBlur = 0;
        g.globalAlpha = 1;

        // The platter, turning with the music.
        const angle = (pos / SECONDS_PER_TURN) * Math.PI * 2;
        g.fillStyle = "#101014";
        g.beginPath();
        g.arc(0, 0, R * 0.78, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "rgba(255, 255, 255, 0.035)";
        g.lineWidth = 1;
        for (let r = R * 0.42; r < R * 0.77; r += 4) {
            g.beginPath();
            g.arc(0, 0, r, 0, Math.PI * 2);
            g.stroke();
        }
        g.save();
        g.rotate(angle);
        g.fillStyle = "#e9e6f2";
        g.fillRect(-1.5, -R * 0.77, 3, R * 0.3);
        g.restore();

        // Centre display: progress round the edge, cue as a tick.
        g.fillStyle = "#06070a";
        g.beginPath();
        g.arc(0, 0, R * 0.38, 0, Math.PI * 2);
        g.fill();
        if (meta) {
            const progress = pos / meta.duration;
            g.strokeStyle = "#2a2932";
            g.lineWidth = 4;
            g.beginPath();
            g.arc(0, 0, R * 0.33, 0, Math.PI * 2);
            g.stroke();
            g.strokeStyle = DECK_COLOR[id];
            g.beginPath();
            g.arc(0, 0, R * 0.33, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            g.stroke();
            const cueAngle = -Math.PI / 2 + (deck.cue / meta.duration) * Math.PI * 2;
            g.strokeStyle = "#ff9a1f";
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(Math.cos(cueAngle) * R * 0.27, Math.sin(cueAngle) * R * 0.27);
            g.lineTo(Math.cos(cueAngle) * R * 0.37, Math.sin(cueAngle) * R * 0.37);
            g.stroke();
        }
        g.fillStyle = "#b8b4c8";
        g.font = `700 ${Math.round(R * 0.09)}px Manrope, sans-serif`;
        g.textAlign = "center";
        g.fillText(deck.vinyl ? "VINYL" : "CDJ", 0, R * 0.04);
        g.fillStyle = deck.reverse ? "#ff3b4e" : "#5f5b70";
        g.font = `700 ${Math.round(R * 0.07)}px Manrope, sans-serif`;
        g.fillText(deck.reverse ? "REV" : "FWD", 0, R * 0.16);
        g.restore();
    });

    const polar = (e: React.PointerEvent | React.WheelEvent) => {
        const rect = canvas.current!.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        return { angle: Math.atan2(y, x), r: Math.hypot(x, y) / (rect.width / 2) };
    };

    const end = () => {
        const g = gesture.current;
        gesture.current = null;
        if (g?.mode === "scratch") dj.scratchEnd(id);
        if (g?.mode === "bend") dj.bend(id, 0);
    };

    return (
        <canvas
            ref={canvas}
            className="dj-jog"
            onPointerDown={(e) => {
                const s = useDj.getState();
                const deck = s.decks[id];
                if (!deck.track) return;
                const { angle, r } = polar(e);
                if (r > 1) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const rolling = isRolling(s, id);
                const onPlatter = r < 0.8;
                const mode = !rolling ? "search" : onPlatter && deck.vinyl ? "scratch" : "bend";
                if (mode === "scratch") dj.scratchStart(id);
                gesture.current = { mode, angle, time: performance.now(), bend: 0, sent: 0 };
            }}
            onPointerMove={(e) => {
                const g = gesture.current;
                if (!g) return;
                const { angle } = polar(e);
                let turn = angle - g.angle;
                if (turn > Math.PI) turn -= Math.PI * 2;
                if (turn < -Math.PI) turn += Math.PI * 2;
                g.angle = angle;
                const t = performance.now();
                const dt = Math.max(4, t - g.time) / 1000;
                g.time = t;
                const seconds = (turn / (Math.PI * 2)) * SECONDS_PER_TURN;
                if (g.mode === "scratch") dj.scratchMove(id, seconds);
                else if (g.mode === "search") dj.search(id, seconds);
                else {
                    // Spin it and the music runs a little ahead; hold it back
                    // and it slows - by how fast you turn.
                    const speed = turn / dt / ((Math.PI * 2) / SECONDS_PER_TURN);
                    g.bend = g.bend * 0.6 + Math.max(-0.3, Math.min(0.3, speed * 0.12)) * 0.4;
                    if (t - g.sent > 30) {
                        g.sent = t;
                        dj.bend(id, g.bend);
                    }
                }
            }}
            onPointerUp={end}
            onPointerCancel={end}
        />
    );
};

const Cdj: React.FC<{ id: DeckId; s: DjShared }> = ({ id, s }) => {
    const deck = s.decks[id];
    const local = useDjLocal();
    const loaded = Boolean(deck.track);
    const rolling = isRolling(s, id);
    const loop = deck.loop;
    const looping = Boolean(loop?.on && loop.out > loop.in);
    const loopBeats = loop && loop.out > loop.in && deck.track ? ((loop.out - loop.in) * (trackMeta(deck.track)?.bpm ?? 120)) / 60 : 0;
    const atCue = !rolling && Math.abs(positionAt(s, id, now()) - deck.cue) < 0.02;
    const tempoPosition = (1 - deck.tempo) / 2; // fader: top is -, toward you is +
    return (
        <div className="dj-unit dj-cdj" style={{ "--deck-color": DECK_COLOR[id] } as React.CSSProperties}>
            <DeckScreen id={id} s={s} />

            <div className="dj-pads">
                {deck.hot.map((at, i) => (
                    <Btn
                        key={i}
                        label={HOT_NAMES[i]}
                        color={HOT_COLORS[i]}
                        lit={at !== null && !local.deleteMode}
                        dim={at !== null}
                        blink={at !== null && local.deleteMode}
                        disabled={!loaded}
                        title={at === null ? `Set hot cue ${HOT_NAMES[i]}` : local.deleteMode ? `Delete hot cue ${HOT_NAMES[i]}` : `Jump to hot cue ${HOT_NAMES[i]}`}
                        onPress={() => dj.hotCue(id, i)}
                    />
                ))}
                <Btn
                    label="DEL"
                    title="CALL / DELETE: the next hot cue you press is cleared"
                    color="#ff3b4e"
                    lit={local.deleteMode}
                    onPress={() => useDjLocal.setState({ deleteMode: !local.deleteMode })}
                />
            </div>

            <div className="dj-col dj-left">
                <span className="dj-label">Loop</span>
                <div className="dj-pair">
                    <Btn label="In" color="#ffd23c" dim={Boolean(loop)} disabled={!loaded} onPress={() => dj.loopIn(id)} />
                    <Btn label="Out" color="#ffd23c" lit={looping} disabled={!loaded || !loop} onPress={() => dj.loopOut(id)} />
                </div>
                <Btn
                    label={looping ? "Exit" : "Reloop"}
                    color="#ffd23c"
                    dim={Boolean(loop && loop.out > loop.in)}
                    disabled={!loop || loop.out <= loop.in}
                    onPress={() => dj.reloop(id)}
                />
                <div className="dj-pair">
                    {[4, 8].map((n) => (
                        <Btn
                            key={n}
                            label={`${n} beat`}
                            color="#ffd23c"
                            lit={looping && Math.abs(loopBeats - n) < 0.01}
                            disabled={!loaded}
                            onPress={() => dj.beatLoop(id, n)}
                        />
                    ))}
                </div>
                <div className="dj-pair">
                    <Btn label="½×" title="Halve the loop" disabled={!looping} onPress={() => dj.resizeLoop(id, 0.5)} />
                    <Btn label="2×" title="Double the loop" disabled={!looping} onPress={() => dj.resizeLoop(id, 2)} />
                </div>
                <span className="dj-label" style={{ marginTop: 4 }}>
                    Beat jump · {local.jumpBeats}
                </span>
                <div className="dj-pair">
                    <Btn label="◀" disabled={!loaded} onPress={() => dj.beatJump(id, -1)} title={`Jump back ${local.jumpBeats} beats`} />
                    <Btn label="▶" disabled={!loaded} onPress={() => dj.beatJump(id, 1)} title={`Jump forward ${local.jumpBeats} beats`} />
                </div>
                <Btn
                    label="Jump size"
                    title="Beat jump size"
                    onPress={() => {
                        const sizes = [1, 2, 4, 8, 16, 32];
                        useDjLocal.setState({ jumpBeats: sizes[(sizes.indexOf(local.jumpBeats) + 1) % sizes.length] });
                    }}
                />
                <div className="dj-pair" style={{ marginTop: 4 }}>
                    <Btn label={deck.reverse ? "Rev" : "Fwd"} color="#ff3b4e" lit={deck.reverse} title="Direction" onPress={() => dj.reverse(id)} />
                    <Btn label={deck.vinyl ? "Vinyl" : "CDJ"} color="#3fa9ff" dim={deck.vinyl} title="Jog mode" onPress={() => dj.jogMode(id)} />
                </div>
            </div>

            <div className="dj-jogwrap">
                <Jog id={id} />
            </div>

            <div className="dj-col dj-right">
                <Btn label="Master" color="#ff9a1f" lit={s.master === id} disabled={!loaded} onPress={() => dj.makeMaster(id)} />
                <Btn label="Sync" color="#3fa9ff" lit={deck.sync} onPress={() => dj.sync(id)} />
                <span className="dj-tempo-readout">
                    {tempoPercent(s, id) >= 0 ? "+" : ""}
                    {tempoPercent(s, id).toFixed(2)}%
                </span>
                <Fader
                    value={tempoPosition}
                    onChange={(u) => dj.tempo(id, 1 - u * 2)}
                    length={190}
                    capLength={26}
                    def={0.5}
                    centreMark
                    title="Tempo (Shift for fine moves, double-click to reset)"
                />
                <Btn label={deck.range === 100 ? "Wide" : `±${deck.range}`} title="Tempo range" onPress={() => dj.cycleRange(id)} />
                <Btn label="Master tempo" color="#3ee58f" lit={deck.keylock} title="Key lock" onPress={() => dj.keylock(id)} style={{ fontSize: 8 }} />
                <Btn label="Reset" title="Tempo reset" onPress={() => dj.tempoReset(id)} />
            </div>

            <div className="dj-transport">
                <Btn
                    label="CUE"
                    round
                    color="#ff9a1f"
                    lit={local.previewing[id] || atCue}
                    blink={!rolling && loaded && !atCue}
                    disabled={!loaded}
                    onPress={() => dj.cueDown(id)}
                    onRelease={() => dj.cueUp(id)}
                />
                <Btn label={rolling ? "❚❚" : "▶"} round color="#3ee58f" lit={rolling} blink={!rolling && loaded} disabled={!loaded} onPress={() => dj.play(id)} />
            </div>
        </div>
    );
};

// --- The DJM -----------------------------------------------------------------------------

const useLevels = () => {
    const [levels, setLevels] = useState({ a: 0, b: 0, l: 0, r: 0 });
    const held = useRef({ a: 0, b: 0, l: 0, r: 0 });
    const last = useRef(0);
    useFrameLoop((time) => {
        if (time - last.current < 33) return;
        last.current = time;
        const engine = engineRef.current;
        const raw = engine ? engine.levels() : { a: 0, b: 0, l: 0, r: 0 };
        const next = { ...held.current };
        (Object.keys(raw) as (keyof typeof raw)[]).forEach((k) => {
            // dB scale over 45 dB, fast up, slow down.
            const v = raw[k] > 0 ? Math.max(0, 1 + (20 * Math.log10(raw[k])) / 45) : 0;
            next[k] = v > next[k] ? v : Math.max(v, next[k] - 0.04);
        });
        held.current = next;
        setLevels(next);
    });
    return levels;
};

const Mixer: React.FC<{ s: DjShared }> = ({ s }) => {
    const levels = useLevels();
    const local = useDjLocal();
    const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
    useEffect(() => {
        if (!canPickOutput || !navigator.mediaDevices?.enumerateDevices) return;
        navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => setOutputs(devices.filter((d) => d.kind === "audiooutput" && d.deviceId !== "default")))
            .catch(() => {});
    }, []);
    const fraction = BEAT_FRACTIONS[s.fx.beat];
    const fractionLabel = fraction < 1 ? `1/${Math.round(1 / fraction)}` : fraction === 0.75 ? "3/4" : String(fraction);
    const strip = (id: DeckId) => {
        const ch = s.ch[id];
        return (
            <div className="dj-strip" style={{ "--deck-color": DECK_COLOR[id] } as React.CSSProperties}>
                <span className="dj-strip__name">CH {deckName(id)}</span>
                <Knob label="Trim" value={ch.trim} onChange={(v) => dj.channel(id, "trim", v)} color="#d8d4e6" />
                <Knob label="Hi" value={ch.hi} onChange={(v) => dj.channel(id, "hi", v)} color="#f4f2ff" />
                <Knob label="Mid" value={ch.mid} onChange={(v) => dj.channel(id, "mid", v)} color="#ff9a1f" />
                <Knob label="Low" value={ch.low} onChange={(v) => dj.channel(id, "low", v)} color="#2b6cff" />
                <Knob label="Color" value={ch.color} onChange={(v) => dj.channel(id, "color", v)} color={DECK_COLOR[id]} size={46} />
                <Btn
                    label="Cue"
                    color="#ff9a1f"
                    lit={local.phonesCue[id]}
                    title={local.phonesSink ? "Listen in your headphones" : "Pick a headphone output below to cue"}
                    onPress={() => useDjLocal.setState({ phonesCue: { ...local.phonesCue, [id]: !local.phonesCue[id] } })}
                />
            </div>
        );
    };
    return (
        <div className="dj-unit dj-mixer">
            <div className="dj-mixer__top">
                {strip("a")}
                <div className="dj-center">
                    <span className="dj-label">Master</span>
                    <div className="dj-meters">
                        <Meter level={levels.l} />
                        <Meter level={levels.r} />
                    </div>
                    <Knob label="Level" value={s.level} min={0} max={1} def={0.8} onChange={(v) => dj.set("level", v)} color="#ff3b4e" />
                    <span className="dj-label">Color FX</span>
                    <div className="dj-colorfx">
                        {COLOR_FX.map((type) => (
                            <Btn key={type} label={type === "dubecho" ? "Dub echo" : type} color="#b07bff" lit={s.colorFx === type} onPress={() => dj.set("colorFx", type)} />
                        ))}
                    </div>
                    <Btn label="Quantize" color="#ffd23c" lit={s.quantize} title="Snap cues and loops to the beat grid" onPress={() => dj.set("quantize", !s.quantize)} />
                </div>
                {strip("b")}
            </div>

            <div className="dj-faders">
                {DECKS.map((id) => (
                    <div key={id} style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                        {id === "b" && <Meter level={levels.b} />}
                        <Fader value={s.ch[id].fader} onChange={(v) => dj.channel(id, "fader", v)} length={150} title={`Channel ${deckName(id)} fader`} />
                        {id === "a" && <Meter level={levels.a} />}
                    </div>
                ))}
            </div>

            <div className="dj-xf">
                <div style={{ display: "flex", gap: 16 }}>
                    {DECKS.map((id) => (
                        <div key={id} className="dj-assign" title={`Channel ${deckName(id)} crossfader assign`}>
                            {(["A", "THRU", "B"] as const).map((side) => (
                                <Btn key={side} label={side} color="#d8d4e6" lit={s.ch[id].xf === side} onPress={() => dj.channel(id, "xf", side)} />
                            ))}
                        </div>
                    ))}
                </div>
                <Fader value={(s.xfader + 1) / 2} onChange={(u) => dj.set("xfader", u * 2 - 1)} length={200} vertical={false} def={0.5} capLength={24} centreMark title="Crossfader" />
                <div className="dj-assign" title="Crossfader curve">
                    {["Blend", "Mix", "Cut"].map((name, i) => (
                        <Btn key={name} label={name} color="#d8d4e6" lit={s.xcurve === i} onPress={() => dj.set("xcurve", i as 0 | 1 | 2)} />
                    ))}
                </div>
            </div>

            <div className="dj-fx">
                <Btn label="FX" color="#3fa9ff" lit={s.fx.on} title="Beat FX on / off" onPress={() => dj.fx("on", !s.fx.on)} style={{ height: 44 }} />
                <div className="dj-fx__lcd">
                    <div className="dj-fx__row">
                        <Btn label="◀" onPress={() => dj.fx("type", BEAT_FX[(BEAT_FX.indexOf(s.fx.type) + BEAT_FX.length - 1) % BEAT_FX.length])} />
                        <span>{s.fx.type === "pingpong" ? "Ping pong" : s.fx.type}</span>
                        <Btn label="▶" onPress={() => dj.fx("type", BEAT_FX[(BEAT_FX.indexOf(s.fx.type) + 1) % BEAT_FX.length])} />
                    </div>
                    <div className="dj-fx__row">
                        <Btn label="◀" onPress={() => dj.fx("beat", Math.max(0, s.fx.beat - 1))} />
                        <span>{fractionLabel} beat</span>
                        <Btn label="▶" onPress={() => dj.fx("beat", Math.min(BEAT_FRACTIONS.length - 1, s.fx.beat + 1))} />
                    </div>
                    <div className="dj-fx__row">
                        {(["a", "b", "master"] as const).map((target) => (
                            <Btn key={target} label={target === "master" ? "Mst" : deckName(target)} color="#3fa9ff" lit={s.fx.ch === target} onPress={() => dj.fx("ch", target)} />
                        ))}
                    </div>
                </div>
                <Knob label="Depth" value={s.fx.depth} min={0} max={1} def={0.5} onChange={(v) => dj.fx("depth", v)} color="#3fa9ff" />
            </div>

            <div className="dj-phones">
                <Knob label="Phones mix" value={local.phonesMix} min={0} max={1} def={0.5} onChange={(v) => useDjLocal.setState({ phonesMix: v })} size={32} title="Cue ↔ master" />
                <Knob label="Phones" value={local.phonesLevel} min={0} max={1} def={0.7} onChange={(v) => useDjLocal.setState({ phonesLevel: v })} size={32} />
                {canPickOutput ? (
                    <label className="dj-label" style={{ display: "grid", gap: 4 }}>
                        Headphones
                        <select value={local.phonesSink ?? ""} onChange={(e) => useDjLocal.setState({ phonesSink: e.target.value || null })}>
                            <option value="">Off</option>
                            {outputs.map((d, i) => (
                                <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Output ${i + 1}`}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : (
                    <span className="dj-hint">This browser can't send audio to a second output, so CUE has nowhere to go.</span>
                )}
            </div>
        </div>
    );
};

// --- The crate -----------------------------------------------------------------------------

const Crate: React.FC<{ s: DjShared }> = ({ s }) => {
    const tracks = useCrate((c) => c.tracks);
    const loadedOn = (t: CrateTrack) => DECKS.filter((id) => s.decks[id].track === t.id).map(deckName).join(" ");
    return (
        <div className="dj-unit dj-crate">
            <span className="dj-label" style={{ textAlign: "left" }}>
                Crate · {tracks.length} tracks · Bird Dog
            </span>
            {tracks.map((t) => (
                <div key={t.id} className="dj-crate__row">
                    <Btn label="◀ 1" color={DECK_COLOR.a} disabled={isRolling(s, "a")} title="Load to deck 1" onPress={() => dj.load("a", t.id)} />
                    <span className="dj-crate__title">
                        {t.title} {loadedOn(t) && <span className="dj-crate__dim">· on {loadedOn(t)}</span>}
                    </span>
                    <span>{t.bpm.toFixed(t.bpm % 1 ? 2 : 0)} BPM</span>
                    <span className="dj-crate__dim">{t.key}</span>
                    <span className="dj-crate__dim">{clock(t.duration).slice(0, 5)}</span>
                    <Btn label="2 ▶" color={DECK_COLOR.b} disabled={isRolling(s, "b")} title="Load to deck 2" onPress={() => dj.load("b", t.id)} />
                </div>
            ))}
        </div>
    );
};

// --- The console ---------------------------------------------------------------------------

const DjConsole: React.FC = () => {
    const s = useDj();
    const notice = useDjLocal((l) => l.notice);
    const closedWithKey = useRef(false);

    useEffect(() => {
        const scene = useSceneStore.getState();
        scene.setIsInteracting(true);
        document.body.classList.add("hud-hidden");
        if (document.pointerLockElement) document.exitPointerLock();
        playSound("ui-inspect-open");
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "Escape" || (event.code === "KeyE" && !event.repeat && !(event.target instanceof HTMLSelectElement))) {
                closedWithKey.current = event.code === "KeyE";
                event.preventDefault();
                event.stopPropagation();
                closeDjConsole();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => {
            window.removeEventListener("keydown", onKey, true);
            // Let go of anything still held.
            DECKS.forEach((id) => {
                if (useDj.getState().decks[id].scratch) dj.scratchEnd(id);
                if (useDj.getState().decks[id].bend) dj.bend(id, 0);
                dj.cueUp(id);
            });
            useSceneStore.getState().setIsInteracting(false);
            document.body.classList.remove("hud-hidden");
            playSound("ui-inspect-close");
            if (closedWithKey.current) requestWorldPointerLock();
        };
    }, []);

    const masterBpm = s.master ? liveBpm(s, s.master) : 0;
    const phaseGap =
        s.master && s.decks.a.track && s.decks.b.track && isRolling(s, "a") && isRolling(s, "b")
            ? Math.abs(beatPhase(s, "a", positionAt(s, "a", now())) - beatPhase(s, "b", positionAt(s, "b", now())))
            : null;
    return (
        <div className="dj-root" role="dialog" aria-modal="true" aria-label="DJ booth">
            <div className="dj-top">
                <div className="dj-top__title">
                    <h2>The Booth</h2>
                    <span className="dj-top__meta">
                        {masterBpm ? `Master ${masterBpm.toFixed(1)} BPM` : "Load a record and press play"}
                        {phaseGap !== null && ` · beats ${Math.min(phaseGap, 1 - phaseGap) < 0.04 ? "locked" : "drifting"}`}
                        {" · everyone in the studio hears this mix"}
                    </span>
                </div>
                <div className="dj-top__right">
                    <button className="gem-btn" onClick={() => closeDjConsole()} aria-label="Step away from the decks">
                        <span className="gem-glint" />
                        Step away <span className="gem-kbd">E</span>
                    </button>
                </div>
            </div>
            <ZoomedWaves />
            <div className="dj-main">
                <Cdj id="a" s={s} />
                <Mixer s={s} />
                <Cdj id="b" s={s} />
            </div>
            <Crate s={s} />
            <div className="dj-hint">
                Drag knobs up/down (Shift for fine) · double-click to reset · hold CUE at the cue point to preview · in Vinyl mode, grab the platter to scratch;
                the outer ring nudges
            </div>
            {notice && <div className="dj-notice">{notice}</div>}
        </div>
    );
};

export default DjConsole;
