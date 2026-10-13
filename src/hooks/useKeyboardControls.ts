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

// Crouch is C only. Control used to work too, but Ctrl+W/D/etc. are
// browser shortcuts that can't be blocked, so crouch-walking closed tabs.
const CROUCH_CODES = ["KeyC"];

export const useKeyboardControls = () => {
    const [movement, setMovement] = useState<MovementState>(INITIAL_MOVEMENT);

    // Tracks which physical keys are currently driving crouch, so releasing
    // one (e.g. Control) while another (e.g. C) is still held doesn't
    // incorrectly stand the player up.
    const crouchKeysRef = useRef<Set<string>>(new Set());

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // While an overlay owns the keyboard (art inspector, project viewer,
        // console, ...) keys shouldn't walk the player around behind it.
        if (useSceneStore.getState().isInteracting) return;
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

    // Releasing keys while the window is unfocused never reaches us, so
    // reset everything on blur instead of leaving movement stuck on.
    useEffect(() => {
        const handleBlur = () => {
            crouchKeysRef.current.clear();
            setMovement(INITIAL_MOVEMENT);
        };

        window.addEventListener("blur", handleBlur);
        // Opening an overlay mid-stride would otherwise leave the held keys
        // "stuck" down, since their keyups are still processed but nothing
        // resets the state they set.
        const unsubscribe = useSceneStore.subscribe((state, previous) => {
            if (state.isInteracting && !previous.isInteracting) {
                crouchKeysRef.current.clear();
                setMovement(INITIAL_MOVEMENT);
            }
        });
        return () => {
            window.removeEventListener("blur", handleBlur);
            unsubscribe();
        };
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
