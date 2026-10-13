import { requestWorldPointerLock } from "../utils/mainCanvas";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSceneStore } from "../stores/sceneStore";
import { useDeviceDetection } from "./useDeviceDetection";

interface MouseRotation {
    x: number;
    y: number;
}

const SENSITIVITY = 0.002;

// Mouse-look deltas are accumulated in a ref and drained once per frame by
// the camera (consumeRotation). They used to go through React state, which
// re-rendered the camera controller on every mousemove event (up to 1000/s
// on high-polling mice) and, because each setState replaced the previous
// value, silently dropped every movement but the last one between frames.
export const useMouseControls = () => {
    const accumulated = useRef<MouseRotation>({ x: 0, y: 0 });
    const [isLocked, setIsLocked] = useState(false);
    const isInteracting = useSceneStore((s) => s.isInteracting);
    const { isMobile } = useDeviceDetection();

    const lookEnabled = useRef(false);
    lookEnabled.current = !isMobile && isLocked && !isInteracting;

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!lookEnabled.current) return;
        accumulated.current.x += event.movementX * SENSITIVITY;
        accumulated.current.y += event.movementY * SENSITIVITY;
    }, []);

    const consumeRotation = useCallback((): MouseRotation => {
        const { x, y } = accumulated.current;
        accumulated.current.x = 0;
        accumulated.current.y = 0;
        return lookEnabled.current ? { x, y } : { x: 0, y: 0 };
    }, []);

    const requestPointerLock = useCallback(() => {
        // Never request pointer lock on mobile - let virtual controls handle everything
        if (isMobile) return;

        // Do not request lock while interacting with UI/console
        if (useSceneStore.getState().isInteracting) return;
        requestWorldPointerLock();
    }, [isMobile]);

    const handlePointerLockChange = useCallback(() => {
        // On mobile, always consider pointer "unlocked" for normal UI interaction
        if (isMobile) {
            setIsLocked(false);
            return;
        }
        setIsLocked(
            document.pointerLockElement instanceof HTMLCanvasElement
        );
        accumulated.current.x = 0;
        accumulated.current.y = 0;
    }, [isMobile]);

    useEffect(() => {
        // On mobile, skip all pointer lock functionality
        if (isMobile) {
            setIsLocked(false);
            return;
        }

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("click", requestPointerLock);
        document.addEventListener("pointerlockchange", handlePointerLockChange);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("click", requestPointerLock);
            document.removeEventListener(
                "pointerlockchange",
                handlePointerLockChange
            );
        };
    }, [handleMouseMove, requestPointerLock, handlePointerLockChange, isMobile]);

    return { consumeRotation, isLocked };
};
