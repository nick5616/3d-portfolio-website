import { useState, useEffect, useCallback } from "react";

interface MovementState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    running: boolean;
    jumping: boolean;
}

export const useKeyboardControls = () => {
    const [movement, setMovement] = useState<MovementState>({
        forward: false,
        backward: false,
        left: false,
        right: false,
        running: false,
        jumping: false,
    });

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        switch (event.code) {
            case "KeyW":
            case "ArrowUp":
                setMovement((prev) => ({ ...prev, forward: true }));
                break;
            case "KeyS":
            case "ArrowDown":
                setMovement((prev) => ({ ...prev, backward: true }));
                break;
            case "KeyA":
            case "ArrowLeft":
                setMovement((prev) => ({ ...prev, left: true }));
                break;
            case "KeyD":
            case "ArrowRight":
                setMovement((prev) => ({ ...prev, right: true }));
                break;
            case "ShiftLeft":
            case "ShiftRight":
                setMovement((prev) => ({ ...prev, running: true }));
                break;
            case "Space":
                // Only trigger jump if not already jumping
                setMovement((prev) => ({ ...prev, jumping: true }));
                break;
        }
    }, []);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        switch (event.code) {
            case "KeyW":
            case "ArrowUp":
                setMovement((prev) => ({ ...prev, forward: false }));
                break;
            case "KeyS":
            case "ArrowDown":
                setMovement((prev) => ({ ...prev, backward: false }));
                break;
            case "KeyA":
            case "ArrowLeft":
                setMovement((prev) => ({ ...prev, left: false }));
                break;
            case "KeyD":
            case "ArrowRight":
                setMovement((prev) => ({ ...prev, right: false }));
                break;
            case "ShiftLeft":
            case "ShiftRight":
                setMovement((prev) => ({ ...prev, running: false }));
                break;
            case "Space":
                setMovement((prev) => ({ ...prev, jumping: false }));
                break;
        }
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    return { movement };
};
