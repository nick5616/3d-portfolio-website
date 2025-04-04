import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { MdGamepad } from "react-icons/md";

interface TouchPosition {
    identifier: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    activeKeys?: {
        w: boolean;
        a: boolean;
        s: boolean;
        d: boolean;
    };
}

export const VirtualControls: React.FC = () => {
    const { isMobile, setVirtualMovement, setVirtualRotation } =
        useSceneStore();

    // Create refs for touch controls
    const dpadRef = useRef<HTMLDivElement>(null);
    const joystickRef = useRef<HTMLDivElement>(null);
    const joystickKnobRef = useRef<HTMLDivElement>(null);
    const animationFrameIdRef = useRef<number>(0);

    // Track touch positions
    const dpadTouch = useRef<TouchPosition | null>(null);
    const joystickTouch = useRef<TouchPosition | null>(null);

    // Joystick configuration
    const maxJoystickDistance = 40;

    // Track active directions
    const [activeDirections, setActiveDirections] = useState({
        up: false,
        down: false,
        left: false,
        right: false,
    });

    // Helper to simulate keyboard events
    const simulateKeyEvent = (key: string, isDown: boolean) => {
        // Create a new keyboard event
        const eventType = isDown ? "keydown" : "keyup";
        const event = new KeyboardEvent(eventType, {
            bubbles: true,
            cancelable: true,
            key: key,
            code: `Key${key.toUpperCase()}`,
        });

        // Dispatch the event to the document
        document.dispatchEvent(event);
    };

    // Update movement based on d-pad touch - trigger keyboard events
    const updateDpadMovement = useCallback(() => {
        if (!dpadTouch.current) return;

        const dx = dpadTouch.current.currentX - dpadTouch.current.startX;
        const dy = dpadTouch.current.currentY - dpadTouch.current.startY;

        // More reliable directional control - determine the dominant direction
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Use a super small deadzone
        const deadzone = 5;

        // Reset active directions
        const newActiveDirections = {
            up: false,
            down: false,
            left: false,
            right: false,
        };

        // Track which keys should be pressed
        const keysToPress = {
            w: false,
            a: false,
            s: false,
            d: false,
        };

        // Determine directions based on touch position
        if (absDx > deadzone || absDy > deadzone) {
            if (absDx > absDy) {
                // Horizontal movement
                if (dx > 0) {
                    // Right
                    keysToPress.d = true;
                    newActiveDirections.right = true;
                } else {
                    // Left
                    keysToPress.a = true;
                    newActiveDirections.left = true;
                }
            } else {
                // Vertical movement
                if (dy < 0) {
                    // Up
                    keysToPress.w = true;
                    newActiveDirections.up = true;
                } else {
                    // Down
                    keysToPress.s = true;
                    newActiveDirections.down = true;
                }
            }

            console.log("D-pad movement:", keysToPress);
        }

        // Update active directions for visual feedback
        setActiveDirections(newActiveDirections);

        // Simulate keyboard events based on current state
        simulateKeyEvent("w", keysToPress.w);
        simulateKeyEvent("a", keysToPress.a);
        simulateKeyEvent("s", keysToPress.s);
        simulateKeyEvent("d", keysToPress.d);

        // Also store the current key state for cleaning up later
        dpadTouch.current.activeKeys = keysToPress;
    }, []);

    // Continuous movement with animation frame
    const startContinuousMovement = useCallback(() => {
        // Cancel any existing animation first
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }

        // Animation function for continuous updates
        const animate = () => {
            if (dpadTouch.current) {
                updateDpadMovement();
                animationFrameIdRef.current = requestAnimationFrame(animate);
            }
        };

        // Start the animation loop
        animationFrameIdRef.current = requestAnimationFrame(animate);
    }, [updateDpadMovement]);

    // Stop continuous movement
    const stopContinuousMovement = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = 0;
        }
    }, []);

    // Update joystick position and rotation
    const updateJoystickPosition = useCallback(() => {
        if (
            !joystickTouch.current ||
            !joystickRef.current ||
            !joystickKnobRef.current
        )
            return;

        const centerX = joystickTouch.current.startX;
        const centerY = joystickTouch.current.startY;

        // Calculate the offset from the center
        let deltaX = joystickTouch.current.currentX - centerX;
        let deltaY = joystickTouch.current.currentY - centerY;

        // Calculate the distance from the center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If the distance is greater than the max, normalize the deltas
        if (distance > maxJoystickDistance) {
            const scale = maxJoystickDistance / distance;
            deltaX *= scale;
            deltaY *= scale;
        }

        // Update the joystick knob position visually
        joystickKnobRef.current.style.transition = "none";
        joystickKnobRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Calculate rotation values - much less sensitive for better control
        const sensitivity = 0.0015;
        const rotationX = deltaX * sensitivity;
        const rotationY = deltaY * sensitivity;

        // Apply rotation to the camera via the store
        setVirtualRotation({ x: rotationX, y: rotationY });
    }, [setVirtualRotation]);

    // Handle touch move
    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Update d-pad touch
            if (dpadTouch.current) {
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === dpadTouch.current.identifier) {
                        dpadTouch.current.currentX = touch.clientX;
                        dpadTouch.current.currentY = touch.clientY;
                        // We don't need to call updateDpadMovement here anymore
                        // as the animation frame will handle continuous updates
                        break;
                    }
                }
            }

            // Update joystick touch
            if (joystickTouch.current) {
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === joystickTouch.current.identifier) {
                        joystickTouch.current.currentX = touch.clientX;
                        joystickTouch.current.currentY = touch.clientY;
                        updateJoystickPosition();
                        break;
                    }
                }
            }
        },
        [updateJoystickPosition]
    );

    // Handle D-pad touch start
    const handleDpadTouchStart = useCallback(
        (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            if (!touch) return;

            dpadTouch.current = {
                identifier: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                activeKeys: { w: false, a: false, s: false, d: false },
            };

            // Start continuous movement with animation frames
            startContinuousMovement();
        },
        [startContinuousMovement]
    );

    // Handle joystick touch start
    const handleJoystickTouchStart = useCallback(
        (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            if (!touch) return;

            const joystickRect = joystickRef.current?.getBoundingClientRect();
            if (!joystickRect) return;

            const centerX = joystickRect.left + joystickRect.width / 2;
            const centerY = joystickRect.top + joystickRect.height / 2;

            joystickTouch.current = {
                identifier: touch.identifier,
                startX: centerX,
                startY: centerY,
                currentX: touch.clientX,
                currentY: touch.clientY,
            };

            updateJoystickPosition();
        },
        [updateJoystickPosition]
    );

    // Handle touch end
    const handleTouchEnd = useCallback(
        (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Check if d-pad touch ended
            if (dpadTouch.current) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === dpadTouch.current.identifier) {
                        // Clean up any active key presses
                        if (dpadTouch.current.activeKeys) {
                            if (dpadTouch.current.activeKeys.w)
                                simulateKeyEvent("w", false);
                            if (dpadTouch.current.activeKeys.a)
                                simulateKeyEvent("a", false);
                            if (dpadTouch.current.activeKeys.s)
                                simulateKeyEvent("s", false);
                            if (dpadTouch.current.activeKeys.d)
                                simulateKeyEvent("d", false);
                        }

                        dpadTouch.current = null;

                        // Reset the virtualMovement state as well (for completeness)
                        setVirtualMovement({
                            forward: false,
                            backward: false,
                            left: false,
                            right: false,
                        });

                        // Stop continuous movement
                        stopContinuousMovement();

                        // Reset all active directions
                        setActiveDirections({
                            up: false,
                            down: false,
                            left: false,
                            right: false,
                        });
                        break;
                    }
                }
            }

            // Check if joystick touch ended
            if (joystickTouch.current) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === joystickTouch.current.identifier) {
                        joystickTouch.current = null;
                        setVirtualRotation({ x: 0, y: 0 });

                        // Reset joystick knob position with animation
                        if (joystickKnobRef.current) {
                            joystickKnobRef.current.style.transition =
                                "transform 0.2s ease-out";
                            joystickKnobRef.current.style.transform =
                                "translate(0px, 0px)";
                        }
                        break;
                    }
                }
            }
        },
        [setVirtualMovement, setVirtualRotation, stopContinuousMovement]
    );

    // Clean up animation frames and key events on unmount
    useEffect(() => {
        return () => {
            // Cancel any animation frames
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }

            // Reset any active key states if needed
            if (dpadTouch.current?.activeKeys) {
                if (dpadTouch.current.activeKeys.w)
                    simulateKeyEvent("w", false);
                if (dpadTouch.current.activeKeys.a)
                    simulateKeyEvent("a", false);
                if (dpadTouch.current.activeKeys.s)
                    simulateKeyEvent("s", false);
                if (dpadTouch.current.activeKeys.d)
                    simulateKeyEvent("d", false);
            }
        };
    }, []);

    // Set up event listeners
    useEffect(() => {
        if (!isMobile) return;

        const dpadElement = dpadRef.current;
        const joystickElement = joystickRef.current;

        if (dpadElement) {
            dpadElement.addEventListener("touchstart", handleDpadTouchStart, {
                passive: false,
            });
        }

        if (joystickElement) {
            joystickElement.addEventListener(
                "touchstart",
                handleJoystickTouchStart,
                { passive: false }
            );
        }

        // Global event listeners for move and end
        document.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        });
        document.addEventListener("touchend", handleTouchEnd, {
            passive: false,
        });
        document.addEventListener("touchcancel", handleTouchEnd, {
            passive: false,
        });

        return () => {
            if (dpadElement) {
                dpadElement.removeEventListener(
                    "touchstart",
                    handleDpadTouchStart
                );
            }

            if (joystickElement) {
                joystickElement.removeEventListener(
                    "touchstart",
                    handleJoystickTouchStart
                );
            }

            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            document.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [
        isMobile,
        handleDpadTouchStart,
        handleJoystickTouchStart,
        handleTouchMove,
        handleTouchEnd,
    ]);

    if (!isMobile) return null;

    return (
        <div className="virtual-controls">
            {/* D-Pad */}
            <div
                ref={dpadRef}
                className="dpad-container"
                style={{
                    position: "absolute",
                    left: "20px",
                    bottom: "20px",
                    width: "120px",
                    height: "120px",
                    borderRadius: "60px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "20px",
                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                    }}
                />
                {/* Visual indicators for directions */}
                <div
                    className="d-pad-arrows"
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                    }}
                >
                    {/* Up arrow */}
                    <div
                        style={{
                            position: "absolute",
                            top: "5px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            borderLeft: "10px solid transparent",
                            borderRight: "10px solid transparent",
                            borderBottom:
                                "10px solid" +
                                (activeDirections.up
                                    ? "rgba(255, 255, 255, 0.9)"
                                    : "rgba(255, 255, 255, 0.5)"),
                            transition: "border-bottom-color 0.1s ease",
                        }}
                    ></div>
                    {/* Down arrow */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: "5px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            borderLeft: "10px solid transparent",
                            borderRight: "10px solid transparent",
                            borderTop:
                                "10px solid" +
                                (activeDirections.down
                                    ? "rgba(255, 255, 255, 0.9)"
                                    : "rgba(255, 255, 255, 0.5)"),
                            transition: "border-top-color 0.1s ease",
                        }}
                    ></div>
                    {/* Left arrow */}
                    <div
                        style={{
                            position: "absolute",
                            left: "5px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            borderTop: "10px solid transparent",
                            borderBottom: "10px solid transparent",
                            borderRight:
                                "10px solid" +
                                (activeDirections.left
                                    ? "rgba(255, 255, 255, 0.9)"
                                    : "rgba(255, 255, 255, 0.5)"),
                            transition: "border-right-color 0.1s ease",
                        }}
                    ></div>
                    {/* Right arrow */}
                    <div
                        style={{
                            position: "absolute",
                            right: "5px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            borderTop: "10px solid transparent",
                            borderBottom: "10px solid transparent",
                            borderLeft:
                                "10px solid" +
                                (activeDirections.right
                                    ? "rgba(255, 255, 255, 0.9)"
                                    : "rgba(255, 255, 255, 0.5)"),
                            transition: "border-left-color 0.1s ease",
                        }}
                    ></div>
                </div>
            </div>

            {/* Joystick */}
            <div
                ref={joystickRef}
                className="joystick-container"
                style={{
                    position: "absolute",
                    right: "20px",
                    bottom: "20px",
                    width: "120px",
                    height: "120px",
                    borderRadius: "60px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <div
                    ref={joystickKnobRef}
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "20px",
                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                        transition: "transform 0.2s ease-out",
                    }}
                />
            </div>
        </div>
    );
};
