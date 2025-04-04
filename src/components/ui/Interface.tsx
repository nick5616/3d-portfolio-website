import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import VirtualControls from "./VirtualControls";
import { useState, useEffect } from "react";

// Simple FPS counter component
function FpsCounter() {
    const [fps, setFps] = useState(0);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const countFrames = () => {
            frameCount++;
            const now = performance.now();
            const delta = now - lastTime;

            if (delta >= 1000) {
                setFps(Math.round((frameCount * 1000) / delta));
                frameCount = 0;
                lastTime = now;
            }

            animationFrameId = requestAnimationFrame(countFrames);
        };

        animationFrameId = requestAnimationFrame(countFrames);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    return <>{fps} FPS</>;
}

export default function Interface() {
    const { controlMode, performance } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    const [showFps, setShowFps] = useState(false);

    // Toggle FPS counter visibility
    const toggleFps = () => {
        setShowFps((prev) => !prev);
    };

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Always show virtual controls on mobile */}
            {isMobile && controlMode === "firstPerson" && <VirtualControls />}

            {/* FPS counter toggle button */}
            {performance.monitoring && (
                <div className="absolute top-4 right-4 z-50 pointer-events-auto">
                    {/* Toggle button */}
                    <button
                        onClick={toggleFps}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white transition-all hover:bg-black/30"
                        aria-label="Toggle FPS Counter"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 3v18h18" />
                            <path d="M18 17V9" />
                            <path d="M13 17V5" />
                            <path d="M8 17v-3" />
                        </svg>
                    </button>

                    {/* FPS counter (only shown when toggled) */}
                    {showFps && (
                        <div className="absolute top-12 right-0 bg-black/30 backdrop-blur-sm text-white px-3 py-1.5 rounded text-sm font-mono">
                            <FpsCounter />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
