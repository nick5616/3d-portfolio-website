import { requestWorldPointerLock } from "../../utils/mainCanvas";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { usePersona } from "../../hooks/usePersona";
import { useSceneStore } from "../../stores/sceneStore";
import { playSound } from "../../audio/soundManager";
import { SettingsPanel } from "./PerformanceControls";

// The world's onboarding + pause flow, as one small state machine:
//
//   welcome  - first visit (or reopened from "Guide"): one card that
//              teaches the loop and whose button IS the click that starts.
//   playing  - cursor locked: no chrome at all (a one-line Esc hint fades
//              in for the first couple of sessions).
//   paused   - cursor free, nothing else open: a game-style pause card;
//              clicking anywhere resumes.
//
// Overlays that own the cursor (art inspector, sketchbook, settings,
// console) set isInteracting, which suppresses both cards.

const SEEN_KEY = "world-guide-seen";
const ESC_HINT_KEY = "world-esc-hints";

const readNumber = (key: string) => {
    try {
        return Number(localStorage.getItem(key) ?? 0);
    } catch {
        return 0;
    }
};
const write = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // ignore
    }
};

const lockPointer = requestWorldPointerLock;

// --- Little animated demos ------------------------------------------------

const MouseDemo = () => (
    <svg width="34" height="48" viewBox="0 0 34 48" aria-hidden className="guide-mouse">
        <rect x="1.5" y="1.5" width="31" height="45" rx="15.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" />
        <path d="M17 2 V18" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <path className="guide-mouse__left" d="M3 17 A14 14 0 0 1 16 3 V18 H3 Z" fill="var(--gem-green)" />
    </svg>
);

const KeysDemo = () => (
    <div className="guide-keys" aria-hidden>
        <span className="gem-kbd guide-key" style={{ gridColumn: 2, animationDelay: "0s" }}>W</span>
        <span className="gem-kbd guide-key" style={{ gridColumn: 1, gridRow: 2, animationDelay: "0.6s" }}>A</span>
        <span className="gem-kbd guide-key" style={{ gridColumn: 2, gridRow: 2, animationDelay: "1.2s" }}>S</span>
        <span className="gem-kbd guide-key" style={{ gridColumn: 3, gridRow: 2, animationDelay: "1.8s" }}>D</span>
    </div>
);

const EscDemo = () => (
    <div className="flex items-center gap-2" aria-hidden>
        <span className="gem-kbd guide-key guide-key--esc">Esc</span>
        <svg width="16" height="20" viewBox="0 0 24 24" className="guide-cursor">
            <path d="M5 2 L19 13 L12 14 L15 21 L12 22 L9 15 L5 19 Z" fill="#fff" stroke="#000" strokeWidth="1" />
        </svg>
    </div>
);

const DESTINATIONS: {
    label: string;
    room: string;
    position: [number, number, number];
    rotation: [number, number, number];
    accent: string;
}[] = [
    { label: "Art gallery", room: "gallery", position: [-7, 1.5, 0], rotation: [0, Math.PI / 2, 0], accent: "gem--gold" },
    { label: "Software lab", room: "projects", position: [0, 1.5, 7], rotation: [0, 0, 0], accent: "gem--blue" },
    { label: "Jam room", room: "jam-room", position: [0, 1.5, 5.2], rotation: [0, 0, 0], accent: "gem--purple" },
    { label: "Achievements", room: "achievements", position: [0, 1.5, 7], rotation: [0, 0, 0], accent: "gem--green" },
];

export const WorldGuide: React.FC = () => {
    const { isMobile } = useDeviceDetection();
    const { name } = usePersona();
    const {
        isInteracting,
        setEducationalModalOpen,
        setShowStartPrompt,
        teleportToRoom,
    } = useSceneStore(
        useShallow((s) => ({
            isInteracting: s.isInteracting,
            setEducationalModalOpen: s.setEducationalModalOpen,
            setShowStartPrompt: s.setShowStartPrompt,
            teleportToRoom: s.teleportToRoom,
        }))
    );

    const [welcomeOpen, setWelcomeOpen] = useState(() => {
        // Respect people who ticked "don't show again" on the old modal.
        try {
            if (localStorage.getItem("dontShowWelcome") === "true") return false;
        } catch {
            // ignore
        }
        return readNumber(SEEN_KEY) === 0;
    });
    const [locked, setLocked] = useState(false);
    const [escHint, setEscHint] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const lockCount = useRef(0);

    useEffect(() => {
        const onChange = () => {
            const isLocked = document.pointerLockElement instanceof HTMLCanvasElement;
            setLocked(isLocked);
            if (isLocked) {
                lockCount.current++;
                // Teach Esc during the first two sessions of a visitor's life.
                const shown = readNumber(ESC_HINT_KEY);
                if (shown < 2 && lockCount.current === 1) {
                    write(ESC_HINT_KEY, String(shown + 1));
                    setEscHint(true);
                    setTimeout(() => setEscHint(false), 3200);
                }
            } else {
                setEscHint(false);
            }
        };
        document.addEventListener("pointerlockchange", onChange);
        return () => document.removeEventListener("pointerlockchange", onChange);
    }, []);

    useEffect(() => {
        setEducationalModalOpen(welcomeOpen);
        if (isMobile) document.body.classList.toggle("modal-hidden", !welcomeOpen);
    }, [welcomeOpen, isMobile, setEducationalModalOpen]);

    const paused = !isMobile && !welcomeOpen && !locked && !isInteracting;
    useEffect(() => {
        if (!paused) setSettingsOpen(false);
    }, [paused]);
    // The crosshair hides while a card is up.
    useEffect(() => {
        setShowStartPrompt(paused);
    }, [paused, setShowStartPrompt]);

    const start = () => {
        write(SEEN_KEY, "1");
        setWelcomeOpen(false);
        playSound("ui-select");
        if (!isMobile) lockPointer();
    };

    const travel = (destination: (typeof DESTINATIONS)[number]) => {
        teleportToRoom(destination.room, destination.position, destination.rotation);
        start();
    };

    // Clicks inside a card must not also bubble to useMouseControls'
    // document-level "click to lock" handler (the card decides).
    const stop = (event: React.SyntheticEvent) => event.stopPropagation();

    let content: React.ReactNode = null;

    if (welcomeOpen) {
        content = (
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-3 guide-backdrop"
                onClick={(event) => {
                    // Clicking outside the card is the same as "start".
                    stop(event);
                    start();
                }}
            >
                <div
                    className="gem gem--lg gem--green w-full max-w-[640px] p-6 md:p-8 guide-card"
                    onClick={stop}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="guide-title"
                >
                    <div className="gem-label">Welcome to</div>
                    <h2 id="guide-title" className="botw-title text-4xl md:text-5xl leading-none mt-1">
                        {name}&rsquo;s World
                    </h2>
                    <div className="botw-rule botw-rule--left" />
                    <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--gem-ink-dim)] max-w-[52ch]">
                        I make software and art, and I wanted my portfolio to feel
                        like a place you visit. Wander around. There&rsquo;s an art
                        museum, a software lab, rooms to play and make music in, rupees to collect, and a
                        locked door or two.
                    </p>

                    {isMobile ? (
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <div className="gem gem--sm gem--green p-3 text-center">
                                <div className="text-2xl" aria-hidden>◐</div>
                                <div className="font-bold mt-1">Left thumb</div>
                                <div className="text-xs text-[color:var(--gem-ink-dim)]">walk</div>
                            </div>
                            <div className="gem gem--sm gem--blue p-3 text-center">
                                <div className="text-2xl" aria-hidden>◑</div>
                                <div className="font-bold mt-1">Right thumb</div>
                                <div className="text-xs text-[color:var(--gem-ink-dim)]">look around</div>
                            </div>
                            <p className="col-span-2 text-sm text-center text-[color:var(--gem-ink-dim)]">
                                Tap doors, paintings and the sketchbook to use them.
                                Landscape works best.
                            </p>
                        </div>
                    ) : (
                        <ol className="grid grid-cols-3 gap-3 mt-6" aria-label="How to play">
                            <li className="gem gem--sm gem--green p-3 flex flex-col items-center text-center gap-2">
                                <MouseDemo />
                                <div>
                                    <div className="font-bold text-sm">Click to look</div>
                                    <div className="text-xs text-[color:var(--gem-ink-dim)]">the mouse turns your head</div>
                                </div>
                            </li>
                            <li className="gem gem--sm gem--blue p-3 flex flex-col items-center text-center gap-2">
                                <KeysDemo />
                                <div>
                                    <div className="font-bold text-sm">Walk</div>
                                    <div className="text-xs text-[color:var(--gem-ink-dim)]">
                                        <span className="gem-kbd">Shift</span> run · <span className="gem-kbd">Space</span> jump · <span className="gem-kbd">C</span> crouch
                                    </div>
                                </div>
                            </li>
                            <li className="gem gem--sm gem--purple p-3 flex flex-col items-center text-center gap-2">
                                <EscDemo />
                                <div>
                                    <div className="font-bold text-sm">Esc frees the cursor</div>
                                    <div className="text-xs text-[color:var(--gem-ink-dim)]">click again to jump back in</div>
                                </div>
                            </li>
                        </ol>
                    )}

                    {!isMobile && (
                        <p className="mt-3 text-center text-sm text-[color:var(--gem-ink-dim)]">
                            Point at a door, painting or book and press <span className="gem-kbd">E</span> to use it.
                        </p>
                    )}

                    <div className="mt-6">
                        <div className="gem-label mb-2">Or jump straight to</div>
                        <div className="flex flex-wrap gap-2">
                            {DESTINATIONS.map((destination) => (
                                <button
                                    key={destination.room}
                                    className={`gem-btn ${destination.accent} !text-[13px] !py-1.5`}
                                    onClick={() => travel(destination)}
                                >
                                    <span className="gem-glint" />
                                    {destination.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-7 flex items-center justify-between gap-3">
                        <Link to="/" className="text-sm text-[color:var(--gem-ink-dim)] underline underline-offset-4">
                            ← All four ways in
                        </Link>
                        <button className="gem-btn gem-btn--solid gem--green !text-base !px-6 !py-3" onClick={start} autoFocus>
                            <span className="gem-glint" />
                            {isMobile ? "Start exploring" : "Click to start"}
                        </button>
                    </div>
                </div>
            </div>
        );
    } else if (paused) {
        content = (
            <div
                className="fixed inset-0 z-[55] flex items-center justify-center guide-pause"
                onClick={(event) => {
                    stop(event);
                    lockPointer();
                }}
            >
                <div className="gem gem--purple px-6 py-5 text-center guide-card" onClick={stop}>
                    <div className="botw-title text-2xl">Paused</div>
                    <div className="botw-rule" style={{ maxWidth: 200 }} />
                    <button className="gem-btn gem-btn--solid gem--green !text-base !px-6 !py-3 mt-2" onClick={lockPointer}>
                        <span className="gem-glint" />
                        Click to keep exploring
                    </button>
                    <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[color:var(--gem-ink-dim)]">
                        <span><span className="gem-kbd">W A S D</span> walk</span>
                        <span><span className="gem-kbd">C</span> crouch</span>
                        <span><span className="gem-kbd">E</span> use</span>
                        <span><span className="gem-kbd">Esc</span> cursor</span>
                    </div>
                    <div className="mt-4 flex justify-center gap-2">
                        <button
                            className={`gem-btn !text-xs !py-1.5 ${settingsOpen ? "gem-btn--solid gem--purple" : ""}`}
                            onClick={() => setSettingsOpen((open) => !open)}
                            aria-expanded={settingsOpen}
                        >
                            <span className="gem-glint" />
                            Settings
                        </button>
                        <button className="gem-btn !text-xs !py-1.5" onClick={() => setWelcomeOpen(true)}>
                            <span className="gem-glint" />
                            Guide
                        </button>
                        <Link to="/" className="gem-btn !text-xs !py-1.5">
                            <span className="gem-glint" />
                            Home
                        </Link>
                    </div>
                    {settingsOpen && (
                        <div className="mt-4 pt-4 border-t border-white/15 w-64 mx-auto">
                            <SettingsPanel />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            {content && createPortal(content, document.body)}
            {escHint && (
                <div className="fixed inset-x-0 bottom-8 z-[55] flex justify-center pointer-events-none">
                    <div className="gem gem--sm gem--purple hud-toast px-4 py-2 text-sm font-semibold flex items-center gap-2">
                        <span className="gem-kbd">Esc</span> gets your cursor back
                    </div>
                </div>
            )}
        </>
    );
};
