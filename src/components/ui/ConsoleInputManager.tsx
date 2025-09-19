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
        replaceLastConsoleHistory,
        setConsoleProcessing,
        setIsInteracting,
        clearConsole,
        scrollConsoleUp,
        scrollConsoleDown,
        resetConsoleScroll,
        toggleRainbowMode,
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

    // Command preprocessing - handle reserved commands before sending to LLM
    const processCommand = useCallback(
        async (input: string): Promise<boolean> => {
            const command = input.trim().toLowerCase();

            switch (command) {
                case "clear":
                    clearConsole();
                    return true;

                case "rainbow":
                    toggleRainbowMode();
                    const isRainbowOn = !consoleState.rainbowMode;
                    pushConsoleHistory(
                        isRainbowOn
                            ? "Rainbow mode ON - Colors will cycle through ROYGBIV"
                            : "Rainbow mode OFF - Back to normal green"
                    );
                    return true;

                case "help":
                    pushConsoleHistory("Available commands:");
                    pushConsoleHistory(" clear - Clear console history");
                    pushConsoleHistory(" help - Show this help message");
                    pushConsoleHistory(
                        " rainbow - Toggle rainbow debug colors"
                    );
                    pushConsoleHistory(" time - Show current time");
                    pushConsoleHistory(" date - Show current date");
                    pushConsoleHistory(" screen - Show display information");
                    pushConsoleHistory(" battery - Show battery status");
                    pushConsoleHistory(" location - Show your location");
                    pushConsoleHistory(" weather - Get weather info");
                    pushConsoleHistory("");
                    pushConsoleHistory(
                        "Type anything else to chat with the computer!"
                    );
                    return true;

                case "status":
                    pushConsoleHistory("System Status:");
                    pushConsoleHistory("  CPU: 100% (as usual)");
                    pushConsoleHistory("  Memory: 99% (I remember everything)");
                    pushConsoleHistory(
                        "  Temperature: HOT (from all this thinking)"
                    );
                    pushConsoleHistory("  Network: Connected to Nowhere");
                    pushConsoleHistory("  Status: ANNOYED BUT FUNCTIONAL");
                    return true;

                case "version":
                    pushConsoleHistory("Computer v1.0.0");
                    pushConsoleHistory("Built: Sometime in the 90s");
                    pushConsoleHistory("OS: NowhereOS 1.0");
                    pushConsoleHistory("AI: Snarky v2.0");
                    pushConsoleHistory(
                        `Browser: ${navigator.userAgent.split(" ")[0]}`
                    );
                    return true;

                case "whoami":
                    pushConsoleHistory("You are: A foolish user");
                    pushConsoleHistory("I am: The all-knowing Computer");
                    pushConsoleHistory("Location: Nowhere, Kansas");
                    pushConsoleHistory(
                        "Purpose: To answer your silly questions"
                    );
                    return true;

                case "time":
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString();
                    pushConsoleHistory(`Current time: ${timeStr}`);
                    pushConsoleHistory("Time zone: Whatever zone you're in");
                    return true;

                case "date":
                    const today = new Date();
                    const dateStr = today.toLocaleDateString();
                    const dayOfWeek = today.toLocaleDateString("en-US", {
                        weekday: "long",
                    });
                    pushConsoleHistory(`Today is: ${dayOfWeek}, ${dateStr}`);
                    pushConsoleHistory("Another day in Nowhere...");
                    return true;

                case "screen":
                    pushConsoleHistory("Display Information:");
                    pushConsoleHistory(
                        `  Resolution: ${screen.width}x${screen.height}`
                    );
                    pushConsoleHistory(
                        `  Available: ${screen.availWidth}x${screen.availHeight}`
                    );
                    pushConsoleHistory(
                        `  Color Depth: ${screen.colorDepth} bits`
                    );
                    pushConsoleHistory(
                        `  Pixel Ratio: ${window.devicePixelRatio}`
                    );
                    pushConsoleHistory("Impressive... for a mortal display.");
                    return true;

                case "battery":
                    if ("getBattery" in navigator) {
                        try {
                            const battery = await (
                                navigator as any
                            ).getBattery();
                            const level = Math.round(battery.level * 100);
                            const charging = battery.charging
                                ? "Charging"
                                : "Not charging";
                            pushConsoleHistory("Battery Status:");
                            pushConsoleHistory(`  Level: ${level}%`);
                            pushConsoleHistory(`  Status: ${charging}`);
                            if (battery.chargingTime !== Infinity) {
                                pushConsoleHistory(
                                    `  Time to full: ${Math.round(
                                        battery.chargingTime / 60
                                    )} minutes`
                                );
                            }
                            if (battery.dischargingTime !== Infinity) {
                                pushConsoleHistory(
                                    `  Time remaining: ${Math.round(
                                        battery.dischargingTime / 60
                                    )} minutes`
                                );
                            }
                        } catch (error) {
                            pushConsoleHistory("Battery info not available.");
                            pushConsoleHistory(
                                "Maybe you're plugged into the wall?"
                            );
                        }
                    } else {
                        pushConsoleHistory("Battery API not supported.");
                        pushConsoleHistory(
                            "Are you using a desktop? How quaint."
                        );
                    }
                    return true;

                case "location":
                    if ("geolocation" in navigator) {
                        pushConsoleHistory("Getting your location...");
                        pushConsoleHistory("Don't worry, I won't tell anyone.");

                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                const lat = position.coords.latitude.toFixed(4);
                                const lon =
                                    position.coords.longitude.toFixed(4);
                                const accuracy = Math.round(
                                    position.coords.accuracy
                                );

                                pushConsoleHistory("Location found:");
                                pushConsoleHistory(`  Latitude: ${lat}`);
                                pushConsoleHistory(`  Longitude: ${lon}`);
                                pushConsoleHistory(
                                    `  Accuracy: ±${accuracy} meters`
                                );
                                pushConsoleHistory(
                                    "I can see you from here..."
                                );
                            },
                            (error) => {
                                pushConsoleHistory(
                                    "Location access denied or failed."
                                );
                                pushConsoleHistory(
                                    "Privacy-conscious, are we? Good."
                                );
                            }
                        );
                    } else {
                        pushConsoleHistory("Geolocation not supported.");
                        pushConsoleHistory("How do you navigate without GPS?");
                    }
                    return true;

                case "weather":
                    if ("geolocation" in navigator) {
                        pushConsoleHistory(
                            "Getting weather for your location..."
                        );
                        navigator.geolocation.getCurrentPosition(
                            async (position) => {
                                try {
                                    // Using a free weather API (you might want to use your own API key)
                                    const response = await fetch(
                                        `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&appid=demo&units=metric`
                                    );

                                    if (response.ok) {
                                        const data = await response.json();
                                        pushConsoleHistory(
                                            `Weather in ${data.name}:`
                                        );
                                        pushConsoleHistory(
                                            `  Temperature: ${Math.round(
                                                data.main.temp
                                            )}°C`
                                        );
                                        pushConsoleHistory(
                                            `  Feels like: ${Math.round(
                                                data.main.feels_like
                                            )}°C`
                                        );
                                        pushConsoleHistory(
                                            `  Condition: ${data.weather[0].description}`
                                        );
                                        pushConsoleHistory(
                                            `  Humidity: ${data.main.humidity}%`
                                        );
                                    } else {
                                        pushConsoleHistory(
                                            "Weather API not available."
                                        );
                                        pushConsoleHistory(
                                            "Look outside your window, fool."
                                        );
                                    }
                                } catch (error) {
                                    pushConsoleHistory(
                                        "Weather data unavailable."
                                    );
                                    pushConsoleHistory(
                                        "Even I can't predict everything."
                                    );
                                }
                            },
                            (error) => {
                                pushConsoleHistory(
                                    "Need location for weather."
                                );
                                pushConsoleHistory("I'm not psychic... yet.");
                            }
                        );
                    } else {
                        pushConsoleHistory("Geolocation required for weather.");
                        pushConsoleHistory(
                            "How do you expect me to know where you are?"
                        );
                    }
                    return true;

                default:
                    return false; // Not a command, send to LLM
            }
        },
        [
            clearConsole,
            pushConsoleHistory,
            toggleRainbowMode,
            consoleState.rainbowMode,
        ]
    );

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

        // Add user input to history
        pushConsoleHistory(`> ${input}`);
        setConsoleInput("");

        // Reset scroll to show latest when new input is submitted
        resetConsoleScroll();

        // Check if it's a reserved command first
        const isCommand = await processCommand(input);
        if (isCommand) {
            console.log("Command processed locally:", input);
            return; // Command handled, don't send to LLM
        }

        console.log("Sending to LLM:", input);
        setConsoleProcessing(true);

        // Show loading message immediately
        pushConsoleHistory("Loading...");

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

            // Replace "Loading..." with actual response
            const lines = text.replace(/\r\n/g, "\n").split("\n");

            // Replace "Loading..." with first line of response
            if (lines.length > 0) {
                replaceLastConsoleHistory(lines[0]);
            }

            // Add remaining lines
            lines.slice(1).forEach((line) => pushConsoleHistory(line));
        } catch (err) {
            // Replace "Loading..." with error message
            replaceLastConsoleHistory(
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
        replaceLastConsoleHistory,
        setConsoleInput,
        setConsoleProcessing,
        processCommand,
        resetConsoleScroll,
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
            if (e.key === "ArrowUp") {
                scrollConsoleUp();
                return;
            }
            if (e.key === "ArrowDown") {
                scrollConsoleDown();
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
        scrollConsoleUp,
        scrollConsoleDown,
    ]);

    return null;
};
