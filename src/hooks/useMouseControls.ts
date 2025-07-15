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
    const { controlMode, isInteracting } = useSceneStore();
    const { isMobile } = useDeviceDetection();

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            // On mobile, don't use mouse controls at all - virtual controls handle camera
            if (isMobile) {
                setRotation({ x: 0, y: 0 });
                return;
            }

            if (!isLocked || controlMode !== "firstPerson" || isInteracting) {
                setRotation({ x: 0, y: 0 });
                return;
            }

            const sensitivity = 0.002; // Reduced sensitivity for more precise control
            setRotation({
                x: event.movementX * sensitivity,
                y: event.movementY * sensitivity,
            });
        },
        [isLocked, controlMode, isMobile, isInteracting]
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

        if (controlMode !== "firstPerson") return;
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.requestPointerLock();
        }
    }, [controlMode, isMobile]);

    const handlePointerLockChange = useCallback(() => {
        // On mobile, always consider pointer "unlocked" for normal UI interaction
        if (isMobile) {
            setIsLocked(false);
            setRotation({ x: 0, y: 0 });
            return;
        }

        const canvas = document.querySelector("canvas");
        setIsLocked(document.pointerLockElement === canvas);
        if (!document.pointerLockElement) {
            setRotation({ x: 0, y: 0 });
        }
    }, [isMobile]);

    useEffect(() => {
        // On mobile, skip all pointer lock functionality
        if (isMobile) {
            setIsLocked(false);
            setRotation({ x: 0, y: 0 });
            return;
        }

        if (controlMode === "firstPerson") {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("click", requestPointerLock);
            document.addEventListener(
                "pointerlockchange",
                handlePointerLockChange
            );

            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("click", requestPointerLock);
                document.removeEventListener(
                    "pointerlockchange",
                    handlePointerLockChange
                );
            };
        }
    }, [
        controlMode,
        handleMouseMove,
        requestPointerLock,
        handlePointerLockChange,
        isMobile,
    ]);

    return { rotation, isLocked };
};
