import React, { useEffect, useCallback } from "react";
import { useSceneStore } from "../../stores/sceneStore";

export const ConsoleInputManager: React.FC = () => {
    const {
        console: consoleState,
        setConsoleActive,
        setConsoleInput,
        appendConsoleInput,
        backspaceConsoleInput,
        pushConsoleHistory,
        setConsoleProcessing,
        setIsInteracting,
    } = useSceneStore();

    // When console activates, exit pointer lock and mark interacting
    useEffect(() => {
        if (consoleState.isActive) {
            setIsInteracting(true);
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }
    }, [consoleState.isActive, setIsInteracting]);

    // Escape exits console and returns to look mode (pointer lock)
    const exitConsole = useCallback(() => {
        setConsoleActive(false);
        setIsInteracting(false);
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.requestPointerLock();
        }
    }, [setConsoleActive, setIsInteracting]);

    // Submit input to backend LLM
    const submitLine = useCallback(async () => {
        const input = consoleState.input.trim();
        console.log(
            "submitLine called with input:",
            input,
            "isProcessing:",
            consoleState.isProcessing
        );
        if (!input || consoleState.isProcessing) {
            console.log(
                "Submission blocked - empty input or already processing"
            );
            return;
        }
        console.log("Adding to history and clearing input");
        pushConsoleHistory(`> ${input}`);
        setConsoleInput("");
        setConsoleProcessing(true);
        try {
            // Use Netlify function endpoint
            const endpoint = import.meta.env.DEV 
                ? "/.netlify/functions/console-chat" 
                : "/api/console-chat";
            
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input,
                    history: consoleState.history,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const text: string = data?.text ?? "";
            // Split into lines for display
            const lines = text.replace(/\r\n/g, "\n").split("\n");
            lines.forEach((line) => pushConsoleHistory(line));
        } catch (err) {
            pushConsoleHistory(
                "[error] Failed to reach assistant. Using offline mode."
            );
        } finally {
            setConsoleProcessing(false);
        }
    }, [
        consoleState.input,
        consoleState.isProcessing,
        consoleState.history,
        pushConsoleHistory,
        setConsoleInput,
        setConsoleProcessing,
    ]);

    useEffect(() => {
        if (!consoleState.isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent default to stop page scrolling, etc.
            e.preventDefault();
            e.stopPropagation();

            if (e.key === "Escape") {
                exitConsole();
                return;
            }
            if (e.key === "Enter" || e.code === "NumpadEnter") {
                console.log(
                    "Enter pressed, submitting line. Current input:",
                    consoleState.input
                );
                submitLine();
                return;
            }
            if (e.key === "Backspace") {
                backspaceConsoleInput();
                return;
            }
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                // Regular printable character
                appendConsoleInput(e.key);
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [
        consoleState.isActive,
        appendConsoleInput,
        backspaceConsoleInput,
        submitLine,
        exitConsole,
    ]);

    return null;
};
