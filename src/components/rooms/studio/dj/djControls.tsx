import React, { useEffect, useReducer, useRef } from "react";

// The hardware bits: rotary knobs, faders and lit buttons. Knobs turn by
// dragging up and down (hold Shift for fine moves, double-click to reset,
// and the centre has a detent like a DJM EQ); faders drag along their
// track; buttons act on press, not release, as gear does.

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const useFrameLoop = (callback: (time: number) => void) => {
    const latest = useRef(callback);
    latest.current = callback;
    useEffect(() => {
        let frame = 0;
        const loop = (time: number) => {
            latest.current(time);
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, []);
};

// The wheel turns knobs and nudges jogs without scrolling the console
// (React's wheel listeners are passive, so they can't stop the scroll).
export const useWheel = <T extends HTMLElement>(ref: React.RefObject<T>, onWheel: (event: WheelEvent) => void) => {
    const latest = useRef(onWheel);
    latest.current = onWheel;
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handle = (event: WheelEvent) => {
            event.preventDefault();
            latest.current(event);
        };
        el.addEventListener("wheel", handle, { passive: false });
        return () => el.removeEventListener("wheel", handle);
    }, [ref]);
};

// Re-render a few times a second (for readouts that move with the music).
export const useTicker = (fps: number) => {
    const [, tick] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        const id = window.setInterval(tick, 1000 / fps);
        return () => window.clearInterval(id);
    }, [fps]);
};

const polar = (r: number, degrees: number) => {
    const a = ((degrees - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
};
const arc = (r: number, from: number, to: number) => {
    if (Math.abs(to - from) < 0.01) return "";
    const [x1, y1] = polar(r, from);
    const [x2, y2] = polar(r, to);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    const sweep = to > from ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
};

export const Knob: React.FC<{
    value: number;
    onChange: (value: number) => void;
    label: string;
    min?: number;
    max?: number;
    def?: number;
    color?: string;
    size?: number;
    title?: string;
}> = ({ value, onChange, label, min = -1, max = 1, def = 0, color = "#f4f2ff", size = 40, title }) => {
    const drag = useRef<{ y: number; v: number } | null>(null);
    const root = useRef<HTMLDivElement>(null);
    const span = max - min;
    const set = (v: number) => {
        let next = clamp(v, min, max);
        if (Math.abs(next - def) < span * 0.025) next = def;
        if (next !== value) onChange(next);
    };
    useWheel(root, (e) => set(value - Math.sign(e.deltaY) * span * 0.03));
    const angle = (v: number) => -135 + (270 * (v - min)) / span;
    const r = size / 2;
    const [px, py] = polar(r * 0.62, angle(value));
    return (
        <div
            ref={root}
            className="dj-knob"
            title={title ?? label}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { y: e.clientY, v: value };
            }}
            onPointerMove={(e) => {
                if (!drag.current) return;
                const scale = e.shiftKey ? 0.2 : 1;
                set(drag.current.v + ((drag.current.y - e.clientY) / 150) * span * scale);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onDoubleClick={() => onChange(def)}
        >
            <svg width={size + 8} height={size + 8} viewBox={`${-r - 4} ${-r - 4} ${size + 8} ${size + 8}`}>
                <path d={arc(r + 2, -135, 135)} stroke="#2a2932" strokeWidth={3} fill="none" strokeLinecap="round" />
                <path
                    d={arc(r + 2, Math.min(angle(def), angle(value)), Math.max(angle(def), angle(value)))}
                    stroke={color}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                />
                <circle r={r - 2} fill="url(#dj-knob-grad)" stroke="#000" strokeWidth={1} />
                <circle r={r - 6} fill="#1b1a20" />
                <line x1={0} y1={0} x2={px} y2={py} stroke="#f4f2ff" strokeWidth={2.4} strokeLinecap="round" />
                <defs>
                    <radialGradient id="dj-knob-grad" cx="35%" cy="30%" r="80%">
                        <stop offset="0%" stopColor="#4a4954" />
                        <stop offset="100%" stopColor="#141318" />
                    </radialGradient>
                </defs>
            </svg>
            <span className="dj-label">{label}</span>
        </div>
    );
};

// `value` is 0..1 along the fader: bottom-to-top, or left-to-right.
export const Fader: React.FC<{
    value: number;
    onChange: (value: number) => void;
    length: number;
    vertical?: boolean;
    def?: number;
    capLength?: number;
    centreMark?: boolean;
    title?: string;
}> = ({ value, onChange, length, vertical = true, def, capLength = 22, centreMark, title }) => {
    const drag = useRef<{ at: number; v: number } | null>(null);
    const thick = 34;
    const travel = length - capLength;
    const offset = (vertical ? 1 - value : value) * travel;
    const pos = (e: React.PointerEvent) => (vertical ? e.clientY : e.clientX);
    const box = vertical ? { width: thick, height: length } : { width: length, height: thick };
    return (
        <div
            className={`dj-fader ${vertical ? "dj-fader--v" : "dj-fader--h"}`}
            style={box}
            title={title}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { at: pos(e), v: value };
            }}
            onPointerMove={(e) => {
                if (!drag.current) return;
                const moved = (pos(e) - drag.current.at) / travel;
                const scale = e.shiftKey ? 0.25 : 1;
                const next = clamp(drag.current.v + (vertical ? -moved : moved) * scale, 0, 1);
                if (next !== value) onChange(next);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onDoubleClick={() => def !== undefined && onChange(def)}
        >
            <div
                className="dj-fader__track"
                style={vertical ? { left: thick / 2 - 3, width: 6, top: capLength / 2, height: travel } : { top: thick / 2 - 3, height: 6, left: capLength / 2, width: travel }}
            />
            {centreMark && (
                <div
                    className="dj-fader__ticks"
                    style={
                        vertical
                            ? { left: 2, right: 2, top: length / 2 - 1, height: 2, background: "#6f6b7c" }
                            : { top: 2, bottom: 2, left: length / 2 - 1, width: 2, background: "#6f6b7c" }
                    }
                />
            )}
            <div
                className="dj-fader__cap"
                style={vertical ? { left: 2, width: thick - 4, top: offset, height: capLength } : { top: 2, height: thick - 4, left: offset, width: capLength }}
            />
        </div>
    );
};

export const Btn: React.FC<{
    label: React.ReactNode;
    onPress?: () => void;
    onRelease?: () => void;
    lit?: boolean;
    dim?: boolean;
    blink?: boolean;
    color?: string;
    round?: boolean;
    disabled?: boolean;
    title?: string;
    style?: React.CSSProperties;
}> = ({ label, onPress, onRelease, lit, dim, blink, color, round, disabled, title, style }) => {
    const held = useRef(false);
    const release = () => {
        if (!held.current) return;
        held.current = false;
        onRelease?.();
    };
    return (
        <button
            type="button"
            className={["dj-btn", lit && "dj-btn--lit", !lit && dim && "dj-btn--dim", blink && "dj-btn--blink", round && "dj-btn--round"].filter(Boolean).join(" ")}
            style={{ ...(color ? ({ "--c": color } as React.CSSProperties) : null), ...style }}
            disabled={disabled}
            title={title}
            onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                held.current = true;
                onPress?.();
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                    e.preventDefault();
                    held.current = true;
                    onPress?.();
                }
            }}
            onKeyUp={(e) => {
                if (e.key === "Enter" || e.key === " ") release();
            }}
        >
            {label}
        </button>
    );
};

// A column of LED segments, bottom up: green, then orange, then red.
export const Meter: React.FC<{ level: number; segments?: number }> = ({ level, segments = 15 }) => {
    const lit = Math.round(level * segments);
    return (
        <div className="dj-meter">
            {Array.from({ length: segments }, (_, i) => {
                const on = i < lit;
                const color = i >= segments - 2 ? "#ff3b4e" : i >= segments - 5 ? "#ff9a1f" : "#3ee58f";
                return <span key={i} style={on ? { background: color, boxShadow: `0 0 4px ${color}` } : undefined} />;
            })}
        </div>
    );
};
