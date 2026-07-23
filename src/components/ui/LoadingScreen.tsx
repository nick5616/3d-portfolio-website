import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

export const LoadingScreen: React.FC = () => {
    const { progress, active } = useProgress();
    // useProgress() reflects THREE.DefaultLoadingManager globally, which
    // also picks up later, unrelated loads (e.g. a painting texture fetched
    // lazily once the player walks up to it). Those should never bring this
    // full-screen boot gate back - once the initial load has completed once,
    // latch it closed for good instead of re-showing on every later `active`.
    const hasCompletedInitialLoad = useRef(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!active && !hasCompletedInitialLoad.current) {
            hasCompletedInitialLoad.current = true;
            setIsDismissed(true);
        }
    }, [active]);

    useEffect(() => {
        if (active && !isDismissed) {
            // Prevent scrolling while loading
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [active, isDismissed]);

    if (isDismissed || !active) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-[60]">
            <div className="max-w-sm w-full px-4">
                <div className="relative">
                    {/* Progress bar background */}
                    <div className="h-2 bg-gray-800 rounded-full">
                        {/* Progress bar fill */}
                        <div
                            className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {/* Progress text */}
                    <div className="mt-2 text-center text-white text-sm">
                        Loading... {Math.round(progress)}%
                    </div>
                </div>
            </div>
        </div>
    );
};
