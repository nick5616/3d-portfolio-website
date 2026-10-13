import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { RupeeFormationEffect } from "./loading-effects/RupeeFormationEffect";
import { roomConfigs } from "../../configs/rooms";

type TransitionPhase = "starting" | "loading" | "completing" | "complete";

const TRANSITION_DURATION = 1200; // Total transition time
const FADE_OUT_DURATION = 500;

interface RoomTransitionLoadingScreenProps {
    isVisible: boolean;
    fromRoom?: string;
    toRoom?: string;
    onComplete?: () => void;
}

/**
 * RoomTransitionLoadingScreen - Shows during room transitions between atrium, gallery, projects, about
 * Uses the RupeeFormationEffect for a Zelda-themed loading experience
 */
const TIPS = [
    "Walk right up to a painting and press E to see it up close.",
    "One door in the gallery wants 5 rupees. What's behind it is worth it.",
    "Black rupees take 20 away. Watch your step.",
    "The computer in the holodeck has opinions. Mostly about you.",
    "In the software lab, a strand's colors are its stack. Gold means ML.",
    "C to crouch. Shift to run. Space to jump.",
    "Esc frees your cursor. Click to dive back in.",
    "The Hall of Achievements keeps count of everything you've found.",
    "Sketches are where ideas start. Read the whole book.",
];

export const RoomTransitionLoadingScreen: React.FC<
    RoomTransitionLoadingScreenProps
> = ({ isVisible, fromRoom, toRoom, onComplete }) => {
    const [transitionPhase, setTransitionPhase] =
        useState<TransitionPhase>("starting");
    const [fadeOut, setFadeOut] = useState(false);
    const [effectReady, setEffectReady] = useState(false);
    // A new tip each time the screen appears.
    const [tip, setTip] = useState(TIPS[0]);
    useEffect(() => {
        if (isVisible) setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    }, [isVisible]);

    // Handle transition phases
    useEffect(() => {
        if (!isVisible) return;

        console.log(`🏠 Room transition: ${fromRoom} → ${toRoom}`);

        // Start transition
        setTransitionPhase("starting");
        setFadeOut(false);
        setEffectReady(false);

        // Fallback timer to ensure transition completes even if something goes wrong
        const fallbackTimer = setTimeout(() => {
            console.log(`🏠 Room transition fallback: forcing completion`);
            setTransitionPhase("complete");
            onComplete?.();
        }, TRANSITION_DURATION + 2000); // 2 seconds after expected completion

        // Move to loading phase
        const loadingTimer = setTimeout(() => {
            setTransitionPhase("loading");
        }, 200);

        // Complete transition
        const completeTimer = setTimeout(() => {
            console.log(`🏠 Room transition completing...`);
            setTransitionPhase("completing");
            setFadeOut(true);

            // Finish transition
            setTimeout(() => {
                console.log(`🏠 Room transition complete, calling onComplete`);
                setTransitionPhase("complete");
                onComplete?.();
            }, FADE_OUT_DURATION);
        }, TRANSITION_DURATION - FADE_OUT_DURATION);

        return () => {
            clearTimeout(fallbackTimer);
            clearTimeout(loadingTimer);
            clearTimeout(completeTimer);
        };
    }, [isVisible, fromRoom, toRoom]);

    // Prevent scrolling during transition
    useEffect(() => {
        if (isVisible && !fadeOut) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isVisible, fadeOut]);

    if (!isVisible || transitionPhase === "complete") return null;

    const getRoomDisplayName = (roomId?: string) => {
        if (roomId === "atrium") return "Central Hub";
        if (!roomId) return "Unknown Room";
        return roomConfigs[roomId]?.name || "Unknown Room";
    };

    return (
        <div
            className={`fixed inset-0 z-[50] transition-opacity duration-500 ${
                fadeOut ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "#1a1a2e" }}
        >
            {/* Rupee formation effect canvas - stays invisible until the
                WebGL context and shaders have actually warmed up, so it
                fades in smoothly instead of popping in with a stutter. */}
            <div
                className={`absolute inset-0 transition-opacity duration-500 ${
                    effectReady ? "opacity-100" : "opacity-0"
                }`}
            >
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    style={{ background: "transparent" }}
                    onCreated={() => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                setEffectReady(true);
                            });
                        });
                    }}
                >
                    <color attach="background" args={["#1a1a2e"]} />
                    <RupeeFormationEffect />
                </Canvas>
            </div>

            {/* Breath of the Wild-style loading overlay: destination
                bottom-left with a tip, progress line bottom-right. */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.6))" }}>
                <div className="absolute left-8 bottom-10 max-w-[min(560px,80vw)]">
                    <div className="gem-label" style={{ color: "var(--sheikah)" }}>
                        {fromRoom ? `Leaving ${getRoomDisplayName(fromRoom)}` : "Travelling"}
                    </div>
                    <div className="botw-title text-4xl md:text-5xl mt-1">
                        {toRoom ? getRoomDisplayName(toRoom) : "Loading"}
                    </div>
                    <div className="botw-rule botw-rule--left" />
                    <p className="text-[15px] leading-relaxed" style={{ color: "var(--gem-ink-dim)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                        {tip}
                    </p>
                </div>
                <div className="absolute right-8 bottom-10 w-40">
                    <div className="h-[2px] bg-white/15 overflow-hidden rounded-full">
                        <div
                            className={`h-full transition-all duration-300 ease-out ${
                                transitionPhase === "starting"
                                    ? "w-0"
                                    : transitionPhase === "loading"
                                    ? "w-3/4"
                                    : "w-full"
                            }`}
                            style={{ background: "var(--sheikah)", boxShadow: "0 0 10px var(--sheikah-glow)" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
