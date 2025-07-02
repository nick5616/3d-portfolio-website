import React, { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const MouseStateIndicator: React.FC = () => {
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const { controlMode } = useSceneStore();
    const { isMobile, isSafari, isDuckDuckGo } = useDeviceDetection();

    const shouldDisablePointerLock = isMobile || isSafari || isDuckDuckGo;

    useEffect(() => {
        const handlePointerLockChange = () => {
            if (shouldDisablePointerLock) {
                // For problematic browsers, simulate based on control mode
                setIsPointerLocked(controlMode === "firstPerson");
            } else {
                setIsPointerLocked(!!document.pointerLockElement);
            }
        };

        if (!shouldDisablePointerLock) {
            document.addEventListener("pointerlockchange", handlePointerLockChange);
        } else {
            // Update state immediately for problematic browsers
            handlePointerLockChange();
        }

        return () => {
            if (!shouldDisablePointerLock) {
                document.removeEventListener(
                    "pointerlockchange",
                    handlePointerLockChange
                );
            }
        };
    }, [shouldDisablePointerLock, controlMode]);

    // Only show on desktop in first person mode (never on mobile)
    if (isMobile || controlMode !== "firstPerson") return null;

    // Get browser-specific instructions
    const getBrowserInstructions = () => {
        if (isDuckDuckGo) {
            return {
                locked: "Click and drag to look around",
                unlocked: "Click to enable camera control",
                detail: "DuckDuckGo compatibility mode active"
            };
        }
        if (isSafari) {
            return {
                locked: "Click and drag to look around",
                unlocked: "Click to enable camera control", 
                detail: "Safari compatibility mode active"
            };
        }
        return {
            locked: "Mouse controlling camera",
            unlocked: "Click to control camera",
            detail: isPointerLocked 
                ? "Press ESC to unlock mouse cursor"
                : "Press ESC first to click UI elements"
        };
    };

    const instructions = getBrowserInstructions();

    return (
        <>
            {/* Full-screen border overlay - only for normal browsers with pointer lock */}
            {!shouldDisablePointerLock && (
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
            )}

            {/* Status indicator badge - high contrast design */}
            <div className="fixed top-4 left-4 z-50 pointer-events-none">
                <div
                    className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300
                        ${
                            isPointerLocked || shouldDisablePointerLock
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
                                isPointerLocked || shouldDisablePointerLock
                                    ? "bg-green-300"
                                    : "bg-orange-300"
                            }`}
                            style={{
                                boxShadow: `0 0 4px ${
                                    isPointerLocked || shouldDisablePointerLock
                                        ? "rgba(34, 197, 94, 0.6)"
                                        : "rgba(249, 115, 22, 0.6)"
                                }`,
                            }}
                        />
                        <span>
                            {isPointerLocked || shouldDisablePointerLock
                                ? instructions.locked
                                : instructions.unlocked}
                        </span>
                    </div>

                    <div className="text-xs opacity-90 mt-1">
                        {instructions.detail}
                    </div>
                </div>
            </div>
        </>
    );
};
