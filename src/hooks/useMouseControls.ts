import { useState, useEffect, useCallback } from "react";
import { useSceneStore } from "../stores/sceneStore";

interface MouseRotation {
    x: number;
    y: number;
}

export const useMouseControls = () => {
    const [rotation, setRotation] = useState<MouseRotation>({ x: 0, y: 0 });
    const [isLocked, setIsLocked] = useState(false);
    const { controlMode } = useSceneStore();

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
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
        [isLocked, controlMode]
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
        if (controlMode !== "firstPerson") return;
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.requestPointerLock();
        }
    }, [controlMode]);

    const handlePointerLockChange = useCallback(() => {
        const canvas = document.querySelector("canvas");
        setIsLocked(document.pointerLockElement === canvas);
        if (!document.pointerLockElement) {
            setRotation({ x: 0, y: 0 });
        }
    }, []);

    useEffect(() => {
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
    ]);

    return { rotation, isLocked };
};
