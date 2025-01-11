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

            const sensitivity = 0.2;
            setRotation({
                x: -event.movementX * sensitivity,
                y: -event.movementY * sensitivity,
            });
        },
        [isLocked, controlMode]
    );

    const requestPointerLock = useCallback(() => {
        if (controlMode !== "firstPerson") return;
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.requestPointerLock();
        } else {
            document.body.requestPointerLock();
        }
    }, [controlMode]);

    const handlePointerLockChange = useCallback(() => {
        const canvas = document.querySelector("canvas");
        setIsLocked(document.pointerLockElement === canvas);
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
