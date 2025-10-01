import React, { useState, useEffect } from "react";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const MouseStateIndicator: React.FC = () => {
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const { isMobile } = useDeviceDetection();

    useEffect(() => {
        const handlePointerLockChange = () => {
            setIsPointerLocked(!!document.pointerLockElement);
        };

        document.addEventListener("pointerlockchange", handlePointerLockChange);
        return () => {
            document.removeEventListener(
                "pointerlockchange",
                handlePointerLockChange
            );
        };
    }, []);

    // Only show on desktop (never on mobile)
    if (isMobile) return null;

    return (
        <>
            {/* Full-screen border overlay */}
            <div
                className="fixed inset-0 pointer-events-none z-40"
                style={{
                    border: `3px solid ${
                        isPointerLocked
                            ? "transparent"
                            : "rgba(249, 115, 22, 0.6)" // Orange when free
                    }`,
                    transition: "border-color 0.3s ease",
                }}
            />

            {/* Status indicator badge - high contrast design */}
            <div className="fixed top-4 left-4 z-40 pointer-events-none">
                <div
                    className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300
                        ${
                            isPointerLocked
                                ? "bg-green-900/90 border-2 border-green-400/80 text-green-100"
                                : "bg-orange-900/90 border-2 border-orange-400/80 text-orange-100"
                        }
                    `}
                    style={{
                        backdropFilter: "blur(16px)",
                        boxShadow:
                            "0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div
                            className={`w-2 h-2 rounded-full ${
                                isPointerLocked
                                    ? "bg-green-300"
                                    : "bg-orange-300"
                            }`}
                            style={{
                                boxShadow: `0 0 4px ${
                                    isPointerLocked
                                        ? "rgba(34, 197, 94, 0.6)"
                                        : "rgba(249, 115, 22, 0.6)"
                                }`,
                            }}
                        />
                        <span>
                            {isPointerLocked
                                ? "Mouse controlling camera"
                                : "Click to control camera"}
                        </span>
                    </div>

                    {isPointerLocked && (
                        <div className="text-xs opacity-90 mt-1">
                            Press ESC to unlock mouse cursor
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
