import { useState, useEffect, useCallback, useRef } from "react";
import { useSceneStore } from "../stores/sceneStore";

interface MovementState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    running: boolean;
    jumping: boolean;
    crouching: boolean;
}

const INITIAL_MOVEMENT: MovementState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    running: false,
    jumping: false,
    crouching: false,
};

const CROUCH_CODES = ["ControlLeft", "ControlRight", "KeyC"];
const CONTROL_CODES = ["ControlLeft", "ControlRight"];

export const useKeyboardControls = () => {
    const [movement, setMovement] = useState<MovementState>(INITIAL_MOVEMENT);

    // Tracks which physical keys are currently driving crouch, so releasing
    // one (e.g. Control) while another (e.g. C) is still held doesn't
    // incorrectly stand the player up.
    const crouchKeysRef = useRef<Set<string>>(new Set());

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

        if (CROUCH_CODES.includes(event.code)) {
            crouchKeysRef.current.add(event.code);
            setMovement((prev) => ({ ...prev, crouching: true }));
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

        if (CROUCH_CODES.includes(event.code)) {
            crouchKeysRef.current.delete(event.code);
            setMovement((prev) => ({
                ...prev,
                crouching: crouchKeysRef.current.size > 0,
            }));
        }
    }, []);

    // Browsers reserve Ctrl-based combos (Ctrl+D bookmark, Ctrl+W close tab,
    // etc.) and will act on them regardless of preventDefault(), stealing
    // focus/pointer-lock away from the page. When that happens the real
    // keyup for whatever was held never reaches us, so without this the
    // movement/crouch state gets stuck on until the same key is pressed
    // again. Reset everything on blur, and if Control specifically was the
    // culprit, nudge the player toward the C key instead.
    useEffect(() => {
        const handleBlur = () => {
            const controlWasHeld = CONTROL_CODES.some((code) =>
                crouchKeysRef.current.has(code)
            );
            if (controlWasHeld) {
                useSceneStore.getState().setCrouchKeyNotice(true);
            }
            crouchKeysRef.current.clear();
            setMovement(INITIAL_MOVEMENT);
        };

        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
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
