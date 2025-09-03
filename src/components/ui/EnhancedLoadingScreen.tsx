import { useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { WarpSpeedLoadingScene } from "./WarpSpeedLoadingScene";

type LoadingPhase = "initial" | "assets-loaded" | "physics-ready" | "complete";

const PHYSICS_INIT_DELAY = 1000; // Time to wait for physics to initialize
const FADE_OUT_DURATION = 1000;

export const EnhancedLoadingScreen: React.FC = () => {
    const { progress, active } = useProgress();
    const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("initial");
    const [fadeOut, setFadeOut] = useState(false);

    // Comment out loading phase transitions for development
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

    // Force loading phase to stay in initial state
    useEffect(() => {
        setLoadingPhase("initial");
    }, []);

    // Prevent scrolling while loading
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

    if (loadingPhase === "complete") return null;

    return (
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-1000 ${
                fadeOut ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "#000" }}
        >
            {/* Warp speed effect canvas */}
            <div className="absolute inset-0">
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    style={{ background: "black" }}
                >
                    <WarpSpeedLoadingScene />
                </Canvas>
            </div>

            {/* Loading progress overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                <div className="max-w-sm w-full px-4">
                    <div className="relative">
                        {/* Progress bar background */}
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            {/* Progress bar fill */}
                            <div
                                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {/* Loading phase text */}
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
