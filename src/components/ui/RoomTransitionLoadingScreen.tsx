import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { RupeeFormationEffect } from "./loading-effects/RupeeFormationEffect";

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
export const RoomTransitionLoadingScreen: React.FC<
    RoomTransitionLoadingScreenProps
> = ({ isVisible, fromRoom, toRoom, onComplete }) => {
    const [transitionPhase, setTransitionPhase] =
        useState<TransitionPhase>("starting");
    const [fadeOut, setFadeOut] = useState(false);

    // Handle transition phases
    useEffect(() => {
        if (!isVisible) return;

        console.log(`🏠 Room transition: ${fromRoom} → ${toRoom}`);

        // Start transition
        setTransitionPhase("starting");
        setFadeOut(false);

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
        switch (roomId) {
            case "atrium":
                return "Central Hub";
            case "gallery":
                return "Art Gallery";
            case "projects":
                return "Software Projects";
            case "about":
                return "Play Place";
            default:
                return "Unknown Room";
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[50] transition-opacity duration-500 ${
                fadeOut ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "#1a1a2e" }}
        >
            {/* Rupee formation effect canvas */}
            <div className="absolute inset-0">
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    style={{ background: "transparent" }}
                >
                    <color attach="background" args={["#1a1a2e"]} />
                    <RupeeFormationEffect />
                </Canvas>
            </div>

            {/* Transition info overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                <div className="max-w-md w-full px-6 text-center">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {transitionPhase === "starting" &&
                                "Preparing Transition..."}
                            {transitionPhase === "loading" && "Loading Room..."}
                            {transitionPhase === "completing" &&
                                "Almost Ready!"}
                        </h2>

                        <div className="text-lg text-gray-300">
                            {fromRoom && toRoom && (
                                <>
                                    {getRoomDisplayName(fromRoom)} →{" "}
                                    {getRoomDisplayName(toRoom)}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Loading indicator */}
                    <div className="relative">
                        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-300 ease-out ${
                                    transitionPhase === "starting"
                                        ? "w-0"
                                        : transitionPhase === "loading"
                                        ? "w-3/4"
                                        : transitionPhase === "completing"
                                        ? "w-full"
                                        : "w-0"
                                }`}
                            />
                        </div>

                        {/* Rupee sparkle effect */}
                        <div className="absolute -top-2 -right-2 w-4 h-4">
                            <div className="w-full h-full bg-yellow-400 rounded-full animate-pulse opacity-80" />
                        </div>
                    </div>

                    {/* Room transition tip */}
                    <div className="mt-6 text-sm text-gray-400">
                        {transitionPhase === "loading" && (
                            <p>✨ Collecting rupees while the room loads...</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
