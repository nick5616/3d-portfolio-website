import { useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { LoadingEffectsRenderer } from "./LoadingEffectsRenderer";
import { LoadingEffectType } from "./loading-effects";

type LoadingPhase = "initial" | "assets-loaded" | "physics-ready" | "complete";

const PHYSICS_INIT_DELAY = 1000; // Time to wait for physics to initialize
const FADE_OUT_DURATION = 1000;

// Change this to switch effects: 'spiral' | 'mandelbrot' | 'dna' | 'crystal' | 'rupee' | 'math' | 'courage' | 'art' | 'fitness' | 'forest'
const CURRENT_EFFECT: LoadingEffectType = "rupee";

/**
 * EnhancedLoadingScreen - Handles initial app loading only
 * This shows when the entire application is first loading (assets, physics initialization)
 * For holodeck experience transitions, see HolodeckLoadingScreen instead
 */
export const EnhancedLoadingScreen: React.FC = () => {
    const { progress, active } = useProgress();
    const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("initial");
    const [fadeOut, setFadeOut] = useState(false);

    // Handle initial app loading phases
    useEffect(() => {
        // Initial -> Assets Loaded
        if (loadingPhase === "initial" && progress === 100 && !active) {
            setLoadingPhase("assets-loaded");
            // Wait for physics to initialize
            setTimeout(() => {
                setLoadingPhase("physics-ready");
                setFadeOut(true);
                // Complete loading after fade
                setTimeout(() => {
                    setLoadingPhase("complete");
                }, FADE_OUT_DURATION);
            }, PHYSICS_INIT_DELAY);
        }
    }, [progress, active, loadingPhase]);

    // Prevent scrolling while initial app is loading
    useEffect(() => {
        if (loadingPhase !== "complete") {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [loadingPhase]);

    // Only show during initial app loading
    if (loadingPhase === "complete") return null;

    return (
        <div
            className={`fixed inset-0 z-[60] transition-opacity duration-1000 ${
                fadeOut ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "#000" }}
        >
            {/* Initial app loading effects canvas */}
            <div className="absolute inset-0">
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    style={{ background: "black" }}
                >
                    <color attach="background" args={["#000000"]} />
                    <LoadingEffectsRenderer effectType={CURRENT_EFFECT} />
                </Canvas>
            </div>

            {/* Initial app loading progress overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                <div className="max-w-sm w-full px-4">
                    <div className="relative">
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="mt-4 text-center text-white text-sm font-medium">
                            {loadingPhase === "initial" && (
                                <>Loading Assets... {Math.round(progress)}%</>
                            )}
                            {loadingPhase === "assets-loaded" && (
                                <>Initializing Physics...</>
                            )}
                            {loadingPhase === "physics-ready" && <>Ready!</>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
