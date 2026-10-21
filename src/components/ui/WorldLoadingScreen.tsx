import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { RupeeFormationEffect } from "./loading-effects/RupeeFormationEffect";
import { roomConfigs } from "../../configs/rooms";
import { useSceneStore } from "../../stores/sceneStore";
import { currentStage, overallProgress, useReadiness, type ReadinessStage } from "../../stores/readinessStore";
import { useMultiplayerStore } from "../../multiplayer/connection";

// The one loading screen: arriving in the world, and every trip between
// rooms. It stays up until the room is really ready (stores/readinessStore.ts)
// - not for a fixed time, and not just until the textures are in - so
// whatever comes next (the character select, the room itself) answers the
// moment it's shown.

/** A trip between rooms shows the screen at least this long, so it doesn't flash. */
const MIN_TRIP_MS = 700;
const FADE_MS = 500;
/** A door that started a trip but never teleported (blocked) lets go after this. */
const NO_TRIP_MS = 2500;
/** Stuck on one stage this long: offer a way out. */
const STALLED_MS = 25_000;

const TIPS = [
    "Walk right up to a painting and press E to see it up close.",
    "One door in the gallery wants 5 rupees. What's behind it is worth it.",
    "Black rupees take 20 away. Watch your step.",
    "The computer in the farmhouse has opinions. Mostly about you.",
    "Stand still on the fairy lift to keep riding. Walk to step off.",
    "Every pad in the Jam Room makes a sound. Try stepping on them.",
    "In the software lab, a strand's colors are its stack. Gold means ML.",
    "C to crouch. Shift to run. Space to jump.",
    "Esc frees your cursor. Click to dive back in.",
    "The Hall of Achievements keeps count of everything you've found.",
    "Sketches are where ideas start. Read the whole book.",
    "Everyone in a room shares it: the same forest, the same rupees, the same song.",
];

const STAGE_LABEL: Record<ReadinessStage, string> = {
    room: "Opening the way",
    assets: "Gathering textures",
    shared: "Finding who's here",
    shaders: "Warming up the light",
    frames: "Settling in",
};

const roomName = (roomId?: string | null) => {
    if (roomId === "atrium") return "Central Hub";
    if (!roomId) return "Loading";
    return roomConfigs[roomId]?.name || "Loading";
};

type Phase = "hidden" | "shown" | "fading";

export const WorldLoadingScreen: React.FC = () => {
    const { booted, ready, stages, stageProgress, token, roomId } = useReadiness(
        useShallow((s) => ({
            booted: s.booted,
            ready: s.ready,
            stages: s.stages,
            stageProgress: s.stageProgress,
            token: s.token,
            roomId: s.roomId,
        }))
    );
    const { trip, tripToken, from, to, setRoomTransitionLoading } = useSceneStore(
        useShallow((s) => ({
            trip: s.roomTransitionLoading,
            tripToken: s.roomTransitionToken,
            from: s.roomTransitionFrom,
            to: s.roomTransitionTo,
            setRoomTransitionLoading: s.setRoomTransitionLoading,
        }))
    );
    const others = useMultiplayerStore((s) => Object.keys(s.peers).length);

    const wanted = !booted || !ready || trip;
    const [phase, setPhase] = useState<Phase>(wanted ? "shown" : "hidden");
    const shownAt = useRef(performance.now());
    // The first showing is the arrival in the world; later ones are trips.
    const isTrip = useRef(false);
    const [tip, setTip] = useState(TIPS[0]);
    const [effectReady, setEffectReady] = useState(false);

    // A load that stops getting anywhere (a chunk that never arrives, a
    // dropped connection) shouldn't leave anyone staring at this forever.
    const [stalled, setStalled] = useState(false);
    const stageKey = `${token}:${currentStage(stages)}`;
    useEffect(() => {
        setStalled(false);
        if (phase !== "shown" || ready) return;
        const timer = setTimeout(() => setStalled(true), STALLED_MS);
        return () => clearTimeout(timer);
    }, [stageKey, phase, ready]);

    // Show (from hidden; a load starting mid-fade is handled below).
    useEffect(() => {
        if (!wanted || phase !== "hidden") return;
        shownAt.current = performance.now();
        isTrip.current = useReadiness.getState().booted;
        setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
        setPhase("shown");
    }, [wanted, phase]);

    // Hide, once the room is ready and (on a trip) the trip has happened.
    useEffect(() => {
        if (phase !== "shown" || !booted || !ready) return;
        const elapsed = performance.now() - shownAt.current;
        // A door shows the screen a moment before it moves you; until the
        // next room's load has begun, "ready" is still the old room.
        const travelled = !trip || token !== tripToken;
        const wait = !travelled ? NO_TRIP_MS - elapsed : isTrip.current ? MIN_TRIP_MS - elapsed : 0;
        const timer = setTimeout(() => setPhase("fading"), Math.max(0, wait));
        return () => clearTimeout(timer);
    }, [phase, booted, ready, trip, token, tripToken]);

    useEffect(() => {
        if (phase !== "fading") return;
        const timer = setTimeout(() => {
            // The trip first, so nothing sees "hidden" while it's still on.
            if (useSceneStore.getState().roomTransitionLoading) setRoomTransitionLoading(false);
            setPhase("hidden");
        }, FADE_MS);
        return () => clearTimeout(timer);
    }, [phase, setRoomTransitionLoading]);

    // A new load while fading out (straight through another door): back up.
    useEffect(() => {
        if (phase === "fading" && !ready) setPhase("shown");
    }, [phase, ready]);

    useEffect(() => {
        if (phase === "hidden") return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [phase]);

    // The progress line never runs backwards within one showing.
    const shownProgress = useRef(0);
    const progress = ready ? 1 : overallProgress(stages, stageProgress);
    if (phase === "shown" && progress > shownProgress.current) shownProgress.current = progress;
    useEffect(() => {
        if (phase === "hidden") shownProgress.current = 0;
    }, [phase]);

    if (phase === "hidden") return null;

    const stage = currentStage(stages);
    const label = stage ? STAGE_LABEL[stage] : "Here";
    const detail =
        stage === "shared" && others > 0
            ? `Joining ${others === 1 ? "someone" : `${others} travelers`} already here`
            : stage === "assets" || stage === "shaders"
            ? `${label} · ${Math.round(stageProgress * 100)}%`
            : label;
    const destination = isTrip.current ? to ?? roomId : roomId;

    return (
        <div
            className={`fixed inset-0 z-[80] transition-opacity ease-out ${phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            style={{ backgroundColor: "#1a1a2e", transitionDuration: `${FADE_MS}ms` }}
            role="status"
            data-world-loading=""
            aria-live="polite"
            aria-busy={phase === "shown"}
            // It covers everything, so nothing behind it can be clicked
            // until it starts to go; and its clicks don't count as the
            // world's "click to look around".
            onClick={(event) => event.stopPropagation()}
        >
            {/* The rupee effect fades in once its WebGL context has warmed
                up, so it doesn't pop in with a stutter. */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${effectReady ? "opacity-100" : "opacity-0"}`}>
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    style={{ background: "transparent" }}
                    dpr={[1, 1.5]}
                    onCreated={() => requestAnimationFrame(() => requestAnimationFrame(() => setEffectReady(true)))}
                >
                    <color attach="background" args={["#1a1a2e"]} />
                    <RupeeFormationEffect />
                </Canvas>
            </div>

            {/* Breath of the Wild-style: destination bottom-left with a
                tip, progress bottom-right. */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.6))" }}
            >
                <div className="absolute left-8 bottom-10 max-w-[min(560px,80vw)]">
                    <div className="gem-label" style={{ color: "var(--sheikah)" }}>
                        {!isTrip.current ? "Arriving at" : from ? `Leaving ${roomName(from)}` : "Travelling"}
                    </div>
                    <div className="botw-title text-4xl md:text-5xl mt-1">{roomName(destination)}</div>
                    <div className="botw-rule botw-rule--left" />
                    <p
                        className="text-[15px] leading-relaxed"
                        style={{ color: "var(--gem-ink-dim)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                    >
                        {tip}
                    </p>
                </div>
                <div className="absolute right-8 bottom-10 w-48 text-right">
                    <div className="text-xs mb-2" style={{ color: "var(--gem-ink-dim)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                        {detail}
                    </div>
                    {stalled && (
                        <button
                            className="gem-btn !text-xs !py-1 mb-2 pointer-events-auto"
                            onClick={() => window.location.reload()}
                        >
                            <span className="gem-glint" />
                            Taking a while · reload
                        </button>
                    )}
                    <div className="h-[2px] bg-white/15 overflow-hidden rounded-full">
                        <div
                            className="h-full transition-[width] duration-300 ease-out"
                            style={{
                                width: `${Math.round(shownProgress.current * 100)}%`,
                                background: "var(--sheikah)",
                                boxShadow: "0 0 10px var(--sheikah-glow)",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
