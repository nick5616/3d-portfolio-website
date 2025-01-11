import { useProgress } from "@react-three/drei";
import { useEffect } from "react";

export const LoadingScreen: React.FC = () => {
    const { progress, active } = useProgress();

    useEffect(() => {
        if (active) {
            // Prevent scrolling while loading
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [active]);

    if (!active) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
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
