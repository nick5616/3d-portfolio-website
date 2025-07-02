import { useState, useEffect, useCallback } from "react";
import { useSceneStore } from "../stores/sceneStore";
import { useDeviceDetection } from "./useDeviceDetection";

interface MouseRotation {
    x: number;
    y: number;
}

export const useMouseControls = () => {
    const [rotation, setRotation] = useState<MouseRotation>({ x: 0, y: 0 });
    const [isLocked, setIsLocked] = useState(false);
    const { controlMode } = useSceneStore();
    const { isMobile, isSafari, isDuckDuckGo } = useDeviceDetection();

    // Disable pointer lock for problematic browsers
    const shouldDisablePointerLock = isMobile || isSafari || isDuckDuckGo;

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            // On mobile, don't use mouse controls at all - virtual controls handle camera
            if (isMobile) {
                setRotation({ x: 0, y: 0 });
                return;
            }

            // For problematic browsers, use alternative mouse handling
            if (shouldDisablePointerLock) {
                if (controlMode !== "firstPerson") {
                    setRotation({ x: 0, y: 0 });
                    return;
                }

                // Use alternative mouse tracking without pointer lock
                if (event.buttons === 1) { // Left mouse button is pressed
                    const sensitivity = 0.002; // Reduced sensitivity for more precise control
                    setRotation({
                        x: event.movementX * sensitivity,
                        y: event.movementY * sensitivity,
                    });
                } else {
                    setRotation({ x: 0, y: 0 });
                }
                return;
            }

            if (!isLocked || controlMode !== "firstPerson") {
                setRotation({ x: 0, y: 0 });
                return;
            }

            const sensitivity = 0.002; // Reduced sensitivity for more precise control
            setRotation({
                x: event.movementX * sensitivity,
                y: event.movementY * sensitivity,
            });
        },
        [isLocked, controlMode, isMobile, shouldDisablePointerLock]
    );

    // Reset rotation when mouse stops moving
    useEffect(() => {
        if (rotation.x !== 0 || rotation.y !== 0) {
            const timer = requestAnimationFrame(() => {
                setRotation({ x: 0, y: 0 });
            });
            return () => cancelAnimationFrame(timer);
        }
    }, [rotation]);

    const requestPointerLock = useCallback(() => {
        // Never request pointer lock on mobile - let virtual controls handle everything
        if (isMobile) return;
        
        // Skip pointer lock for problematic browsers
        if (shouldDisablePointerLock) {
            console.log("Pointer lock disabled for browser compatibility");
            return;
        }

        if (controlMode !== "firstPerson") return;
        
        try {
            const canvas = document.querySelector("canvas");
            if (canvas && canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        } catch (error) {
            console.warn("Pointer lock request failed:", error);
        }
    }, [controlMode, isMobile, shouldDisablePointerLock]);

    const handlePointerLockChange = useCallback(() => {
        // On mobile, always consider pointer "unlocked" for normal UI interaction
        if (isMobile) {
            setIsLocked(false);
            setRotation({ x: 0, y: 0 });
            return;
        }

        // For problematic browsers, simulate lock state based on control mode
        if (shouldDisablePointerLock) {
            setIsLocked(controlMode === "firstPerson");
            if (controlMode !== "firstPerson") {
                setRotation({ x: 0, y: 0 });
            }
            return;
        }

        const canvas = document.querySelector("canvas");
        setIsLocked(document.pointerLockElement === canvas);
        if (!document.pointerLockElement) {
            setRotation({ x: 0, y: 0 });
        }
    }, [isMobile, shouldDisablePointerLock, controlMode]);

    useEffect(() => {
        // On mobile, skip all pointer lock functionality
        if (isMobile) {
            setIsLocked(false);
            setRotation({ x: 0, y: 0 });
            return;
        }

        if (controlMode === "firstPerson") {
            document.addEventListener("mousemove", handleMouseMove);
            
            // Only add click listener for pointer lock if not disabled
            if (!shouldDisablePointerLock) {
                document.addEventListener("click", requestPointerLock);
                document.addEventListener(
                    "pointerlockchange",
                    handlePointerLockChange
                );
            } else {
                // For problematic browsers, just update lock state
                handlePointerLockChange();
            }

            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                if (!shouldDisablePointerLock) {
                    document.removeEventListener("click", requestPointerLock);
                    document.removeEventListener(
                        "pointerlockchange",
                        handlePointerLockChange
                    );
                }
            };
        }
    }, [
        controlMode,
        handleMouseMove,
        requestPointerLock,
        handlePointerLockChange,
        isMobile,
        shouldDisablePointerLock,
    ]);

    return { rotation, isLocked };
};
