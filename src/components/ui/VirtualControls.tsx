import React, { useRef, useEffect, useState, useCallback, memo } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { MdGamepad, MdHideSource } from "react-icons/md";
import { useMobileDetect } from "../../hooks/useMobileDetect";

// Define the interface for props
interface VirtualControlsProps {
    onMovement?: (direction: { x: number; y: number }) => void;
    onAction?: () => void;
    onJump?: () => void;
    isVisible?: boolean;
    mobileOverride?: boolean;
}

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

export const VirtualControls: React.FC<VirtualControlsProps> = memo(
    ({ onMovement, onAction, onJump, isVisible = true, mobileOverride }) => {
        const {
            isMobile,
            setVirtualMovement,
            setVirtualRotation,
            performance,
            controlMode,
        } = useSceneStore();

        const isMobileLocal = mobileOverride ?? useMobileDetect();

        console.log("VirtualControls rendering, isMobile:", isMobileLocal);

        // Track active touch ids
        const [activeTouchIds, setActiveTouchIds] = useState<{
            [key: number]: "dpad" | "joystick";
        }>({});
        const [showRipple, setShowRipple] = useState(false);
        const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        // Create refs for touch controls
        const dpadRef = useRef<HTMLDivElement>(null);
        const joystickRef = useRef<HTMLDivElement>(null);
        const joystickKnobRef = useRef<HTMLDivElement>(null);
        const animationFrameIdRef = useRef<number>(0);

        // Track touch positions
        const dpadTouch = useRef<TouchPosition | null>(null);
        const joystickTouch = useRef<TouchPosition | null>(null);

        // Configure joystick based on performance
        const maxJoystickDistance = performance.quality === "low" ? 30 : 40;

        // Track active directions
        const [activeDirections, setActiveDirections] = useState({
            up: false,
            down: false,
            left: false,
            right: false,
        });

        // Helper to simulate keyboard events with debounce to reduce jitter
        const lastKeyState = useRef<{ [key: string]: boolean }>({
            w: false,
            a: false,
            s: false,
            d: false,
        });

        // Last movement timestamp for throttling
        const lastMovementTime = useRef<number>(0);

        // Minimum time between movement updates in ms (throttling)
        const movementThrottle =
            performance.quality === "low"
                ? 50
                : performance.quality === "medium"
                ? 30
                : 16;

        const simulateKeyEvent = useCallback((key: string, isDown: boolean) => {
            // Skip if key state hasn't changed to avoid jitter
            if (lastKeyState.current[key] === isDown) return;

            // Update the last key state
            lastKeyState.current[key] = isDown;

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
        }, []);

        // Update movement based on d-pad touch - with throttling
        const updateDpadMovement = useCallback(() => {
            if (!dpadTouch.current) {
                console.log("No active d-pad touch");
                return false; // Return false to indicate no movement
            }

            const now = window.performance.now();
            if (now - lastMovementTime.current < movementThrottle) {
                return true; // Keep animation going
            }
            lastMovementTime.current = now;

            const dx = dpadTouch.current.currentX - dpadTouch.current.startX;
            const dy = dpadTouch.current.currentY - dpadTouch.current.startY;

            console.log("D-pad movement update", { dx, dy });

            // Check if there's no significant movement
            const movementDeadzone = 3;
            if (
                Math.abs(dx) < movementDeadzone &&
                Math.abs(dy) < movementDeadzone
            ) {
                console.log(
                    "No significant movement detected, stopping continuous movement"
                );
                return false; // Return false to stop animation
            }

            // More reliable directional control - determine the dominant direction
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Use an even smaller deadzone for more responsive feel
            const deadzone = 3;

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

            // Determine directions based on touch position, lower threshold for touch detection
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

                // Show ripple effect when direction changes
                if (!showRipple) {
                    setShowRipple(true);
                    // Clear any existing timeout
                    if (rippleTimeoutRef.current) {
                        clearTimeout(rippleTimeoutRef.current);
                    }
                    // Set timeout to hide ripple
                    rippleTimeoutRef.current = setTimeout(() => {
                        setShowRipple(false);
                    }, 300);
                }

                // Log movement direction
                const direction = Object.entries(newActiveDirections)
                    .filter(([_, value]) => value)
                    .map(([key]) => key)
                    .join(", ");
                console.log(`Moving ${direction}`);
            } else {
                return false; // No direction active, stop the animation
            }

            // Always update active directions for visual feedback
            setActiveDirections(newActiveDirections);

            // Update the virtual movement state
            setVirtualMovement({
                forward: keysToPress.w,
                backward: keysToPress.s,
                left: keysToPress.a,
                right: keysToPress.d,
            });

            // Simulate keyboard events based on current state
            simulateKeyEvent("w", keysToPress.w);
            simulateKeyEvent("a", keysToPress.a);
            simulateKeyEvent("s", keysToPress.s);
            simulateKeyEvent("d", keysToPress.d);

            // Store the current key state for cleaning up later
            dpadTouch.current.activeKeys = keysToPress;

            return true; // Return true to indicate movement should continue
        }, [
            showRipple,
            simulateKeyEvent,
            movementThrottle,
            setVirtualMovement,
        ]);

        // Stop continuous movement - declare it before use
        const stopContinuousMovement = useCallback(() => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = 0;
            }
        }, []);

        // Continuous movement with animation frame - optimized for performance
        const startContinuousMovement = useCallback(() => {
            // Cancel any existing animation first
            stopContinuousMovement();

            // Animation function for continuous updates
            const animate = () => {
                // First check if we still have an active dpad touch
                if (!dpadTouch.current) {
                    stopContinuousMovement();
                    return;
                }

                // Call the update function and check if we should continue
                const shouldContinue = updateDpadMovement();

                // Only continue the animation if we should and still have a touch
                if (shouldContinue && dpadTouch.current) {
                    animationFrameIdRef.current =
                        requestAnimationFrame(animate);
                } else {
                    stopContinuousMovement();
                }
            };

            // Start the animation loop immediately
            animate();
        }, [updateDpadMovement, stopContinuousMovement]);

        // Check if a touch is within a certain element
        const isTouchInElement = useCallback(
            (touch: Touch, element: HTMLElement | null): boolean => {
                if (!element) return false;

                const rect = element.getBoundingClientRect();
                return (
                    touch.clientX >= rect.left &&
                    touch.clientX <= rect.right &&
                    touch.clientY >= rect.top &&
                    touch.clientY <= rect.bottom
                );
            },
            []
        );

        // Joystick smoothing factor based on performance quality
        const smoothFactor =
            performance.quality === "low"
                ? 0.8
                : performance.quality === "medium"
                ? 0.7
                : 0.6;

        // Update joystick position and rotation - with smoothing
        const lastRotation = useRef({ x: 0, y: 0 });
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

            // Add a light glow effect based on displacement
            const normalizedDistance = Math.min(
                distance / maxJoystickDistance,
                1
            );
            const glowIntensity = Math.floor(normalizedDistance * 10);
            joystickKnobRef.current.style.boxShadow = `0 0 ${glowIntensity}px ${glowIntensity}px rgba(255, 255, 255, 0.3)`;

            // Calculate rotation values - less sensitive for better control
            const sensitivity = 0.001;

            // Apply smoothing to rotation
            let rotationX = deltaX * sensitivity;
            let rotationY = deltaY * sensitivity;

            // Smooth the values
            rotationX =
                rotationX * (1 - smoothFactor) +
                lastRotation.current.x * smoothFactor;
            rotationY =
                rotationY * (1 - smoothFactor) +
                lastRotation.current.y * smoothFactor;

            // Store for next frame
            lastRotation.current = { x: rotationX, y: rotationY };

            // Apply rotation to the camera via the store
            setVirtualRotation({ x: rotationX, y: rotationY });
        }, [setVirtualRotation, maxJoystickDistance, smoothFactor]);

        // Handle touch move - with improved multi-touch handling and performance optimization
        const handleTouchMove = useCallback(
            (e: TouchEvent) => {
                e.preventDefault();
                e.stopPropagation();

                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    const touchType = activeTouchIds[touch.identifier];

                    // Only process touches that we've already classified
                    if (
                        touchType === "dpad" &&
                        dpadTouch.current &&
                        touch.identifier === dpadTouch.current.identifier
                    ) {
                        dpadTouch.current.currentX = touch.clientX;
                        dpadTouch.current.currentY = touch.clientY;
                        // The animation frame will handle continuous updates
                    } else if (
                        touchType === "joystick" &&
                        joystickTouch.current &&
                        touch.identifier === joystickTouch.current.identifier
                    ) {
                        joystickTouch.current.currentX = touch.clientX;
                        joystickTouch.current.currentY = touch.clientY;
                        updateJoystickPosition();
                    }
                }
            },
            [updateJoystickPosition, activeTouchIds]
        );

        // Handle D-pad touch start
        const handleDpadTouchStart = useCallback(
            (e: TouchEvent) => {
                e.preventDefault();
                e.stopPropagation();

                console.log("D-pad touch start detected");

                // Only process if we don't already have a dpad touch active
                if (dpadTouch.current) {
                    console.log("D-pad touch already active, ignoring");
                    return;
                }

                const touch = e.changedTouches[0];
                if (!touch) {
                    console.log("No touch detected");
                    return;
                }

                // Verify the touch is within the dpad element
                if (!isTouchInElement(touch, dpadRef.current)) {
                    console.log("Touch not within d-pad element");
                    return;
                }

                console.log("D-pad touch registered", {
                    x: touch.clientX,
                    y: touch.clientY,
                    element: dpadRef.current?.getBoundingClientRect(),
                });

                // Register this touch as a dpad touch
                const newActiveTouchIds = { ...activeTouchIds };
                newActiveTouchIds[touch.identifier] = "dpad";
                setActiveTouchIds(newActiveTouchIds);

                dpadTouch.current = {
                    identifier: touch.identifier,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                    activeKeys: { w: false, a: false, s: false, d: false },
                };

                // Reset last key states
                lastKeyState.current = {
                    w: false,
                    a: false,
                    s: false,
                    d: false,
                };

                // Try to update directions immediately to show feedback
                updateDpadMovement();

                // Start continuous movement with animation frames
                startContinuousMovement();
            },
            [
                startContinuousMovement,
                activeTouchIds,
                isTouchInElement,
                updateDpadMovement,
            ]
        );

        // Handle joystick touch start
        const handleJoystickTouchStart = useCallback(
            (e: TouchEvent) => {
                e.preventDefault();
                e.stopPropagation();

                // Only process if we don't already have a joystick touch active
                if (joystickTouch.current) return;

                const touch = e.changedTouches[0];
                if (!touch) return;

                // Verify the touch is within the joystick element
                if (!isTouchInElement(touch, joystickRef.current)) return;

                // Register this touch as a joystick touch
                const newActiveTouchIds = { ...activeTouchIds };
                newActiveTouchIds[touch.identifier] = "joystick";
                setActiveTouchIds(newActiveTouchIds);

                const joystickRect =
                    joystickRef.current?.getBoundingClientRect();
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

                // Reset rotation smoothing
                lastRotation.current = { x: 0, y: 0 };

                updateJoystickPosition();
            },
            [updateJoystickPosition, activeTouchIds, isTouchInElement]
        );

        // Handle all touch start events globally
        const handleGlobalTouchStart = useCallback(
            (e: TouchEvent) => {
                // Don't prevent default here to allow other UI interactions

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];

                    // Check if this touch is within one of our controls
                    if (isTouchInElement(touch, dpadRef.current)) {
                        handleDpadTouchStart(e);
                    } else if (isTouchInElement(touch, joystickRef.current)) {
                        handleJoystickTouchStart(e);
                    }
                }
            },
            [handleDpadTouchStart, handleJoystickTouchStart, isTouchInElement]
        );

        // Handle touch end - with complete cleanup
        const handleTouchEnd = useCallback(
            (e: TouchEvent) => {
                e.preventDefault();
                e.stopPropagation();

                console.log("Touch end detected", e.changedTouches.length);

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    const touchType = activeTouchIds[touch.identifier];

                    console.log(
                        "Touch end type:",
                        touchType,
                        "id:",
                        touch.identifier
                    );

                    // Remove this touch from our tracking
                    if (touchType) {
                        const newActiveTouchIds = { ...activeTouchIds };
                        delete newActiveTouchIds[touch.identifier];
                        setActiveTouchIds(newActiveTouchIds);
                    }

                    // Check if d-pad touch ended
                    if (
                        touchType === "dpad" &&
                        dpadTouch.current &&
                        touch.identifier === dpadTouch.current.identifier
                    ) {
                        console.log("D-pad touch ended, cleaning up");

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

                        // Reset dpad touch
                        dpadTouch.current = null;

                        // Reset the virtualMovement state
                        setVirtualMovement({
                            forward: false,
                            backward: false,
                            left: false,
                            right: false,
                        });

                        // Stop continuous movement (this will cancel animation frames)
                        stopContinuousMovement();

                        // Reset all active directions
                        setActiveDirections({
                            up: false,
                            down: false,
                            left: false,
                            right: false,
                        });

                        // Reset all key states
                        lastKeyState.current = {
                            w: false,
                            a: false,
                            s: false,
                            d: false,
                        };

                        // Hide ripple effect
                        setShowRipple(false);
                        if (rippleTimeoutRef.current) {
                            clearTimeout(rippleTimeoutRef.current);
                            rippleTimeoutRef.current = null;
                        }
                    }
                    // Check if joystick touch ended
                    else if (
                        touchType === "joystick" &&
                        joystickTouch.current &&
                        touch.identifier === joystickTouch.current.identifier
                    ) {
                        console.log("Joystick touch ended, resetting");

                        joystickTouch.current = null;

                        // Smoothly reset rotation
                        lastRotation.current = { x: 0, y: 0 };
                        setVirtualRotation({ x: 0, y: 0 });

                        // Reset joystick knob position with animation
                        if (joystickKnobRef.current) {
                            joystickKnobRef.current.style.transition =
                                "transform 0.2s ease-out, box-shadow 0.2s ease-out";
                            joystickKnobRef.current.style.transform =
                                "translate(0px, 0px)";
                            joystickKnobRef.current.style.boxShadow = "none";
                        }
                    }
                }
            },
            [
                setVirtualMovement,
                setVirtualRotation,
                stopContinuousMovement,
                activeTouchIds,
                simulateKeyEvent,
            ]
        );

        // Clean up animation frames and key events on unmount
        useEffect(() => {
            console.log("Setting up touch event listeners");

            // Create stable references to the handlers
            const globalTouchStartHandler = (e: TouchEvent) => {
                // Access the latest version of the handler
                const latestHandleGlobalTouchStart = handleGlobalTouchStart;
                latestHandleGlobalTouchStart(e);
            };

            const touchMoveHandler = (e: TouchEvent) => {
                // Access the latest version of the handler
                const latestHandleTouchMove = handleTouchMove;
                latestHandleTouchMove(e);
            };

            const touchEndHandler = (e: TouchEvent) => {
                // Access the latest version of the handler
                const latestHandleTouchEnd = handleTouchEnd;
                latestHandleTouchEnd(e);
            };

            // Global event listeners
            document.addEventListener("touchstart", globalTouchStartHandler, {
                passive: false,
                capture: true,
            });
            document.addEventListener("touchmove", touchMoveHandler, {
                passive: false,
                capture: true,
            });
            document.addEventListener("touchend", touchEndHandler, {
                passive: false,
                capture: true,
            });
            document.addEventListener("touchcancel", touchEndHandler, {
                passive: false,
                capture: true,
            });

            // Log the d-pad element's position and size
            if (dpadRef.current) {
                const rect = dpadRef.current.getBoundingClientRect();
                console.log("D-pad element position and size:", {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right,
                });
            }

            return () => {
                console.log("Cleaning up touch event listeners");
                // Cancel any animation frames
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                    animationFrameIdRef.current = 0;
                }

                // Reset any active key states if needed
                if (dpadTouch.current?.activeKeys) {
                    const latestSimulateKeyEvent = simulateKeyEvent;
                    if (dpadTouch.current.activeKeys.w)
                        latestSimulateKeyEvent("w", false);
                    if (dpadTouch.current.activeKeys.a)
                        latestSimulateKeyEvent("a", false);
                    if (dpadTouch.current.activeKeys.s)
                        latestSimulateKeyEvent("s", false);
                    if (dpadTouch.current.activeKeys.d)
                        latestSimulateKeyEvent("d", false);
                }

                // Clear any pending ripple timeouts
                if (rippleTimeoutRef.current) {
                    clearTimeout(rippleTimeoutRef.current);
                    rippleTimeoutRef.current = null;
                }

                // Reset touch state
                dpadTouch.current = null;
                joystickTouch.current = null;

                // Reset movement state
                const latestSetVirtualMovement = setVirtualMovement;
                const latestSetVirtualRotation = setVirtualRotation;
                latestSetVirtualMovement({
                    forward: false,
                    backward: false,
                    left: false,
                    right: false,
                });
                latestSetVirtualRotation({ x: 0, y: 0 });

                // Remove all event listeners
                document.removeEventListener(
                    "touchstart",
                    globalTouchStartHandler,
                    { capture: true }
                );
                document.removeEventListener("touchmove", touchMoveHandler, {
                    capture: true,
                });
                document.removeEventListener("touchend", touchEndHandler, {
                    capture: true,
                });
                document.removeEventListener("touchcancel", touchEndHandler, {
                    capture: true,
                });
            };
        }, []);

        // Reset state on initial mount to avoid stale state from previous renders
        useEffect(() => {
            // Reset touch state
            dpadTouch.current = null;
            joystickTouch.current = null;

            // Reset animation frames
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = 0;
            }

            // Reset movement state
            setVirtualMovement({
                forward: false,
                backward: false,
                left: false,
                right: false,
            });
            setVirtualRotation({ x: 0, y: 0 });

            // Reset directions
            setActiveDirections({
                up: false,
                down: false,
                left: false,
                right: false,
            });

            // Reset joystick knob position
            if (joystickKnobRef.current) {
                joystickKnobRef.current.style.transform = "translate(0px, 0px)";
                joystickKnobRef.current.style.boxShadow = "none";
            }

            console.log("VirtualControls initial state reset");
        }, []);

        // Dynamic styles based on performance settings
        const controlAlpha = performance.quality === "low" ? 0.2 : 0.3;
        const controlSize = performance.quality === "low" ? 100 : 120;

        // Only check if mobile - don't check for first person mode to ensure the controls always appear on mobile
        if (!isMobileLocal) return null;

        return (
            <div
                className="virtual-controls"
                style={{ zIndex: 10000, pointerEvents: "all" }}
            >
                {/* D-Pad */}
                <div
                    ref={dpadRef}
                    className="dpad-container"
                    style={{
                        position: "absolute",
                        left: "20px",
                        bottom: "20px",
                        width: `${controlSize}px`,
                        height: `${controlSize}px`,
                        borderRadius: "50%",
                        backgroundColor: Object.values(activeDirections).some(
                            (v) => v
                        )
                            ? "rgba(25, 25, 25, 0.5)"
                            : `rgba(0, 0, 0, ${controlAlpha})`,
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                        boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        transition: "transform 0.2s, background-color 0.2s",
                        transform: Object.values(activeDirections).some(
                            (v) => v
                        )
                            ? "scale(1.1)"
                            : "scale(1)",
                        overflow: "hidden",
                        touchAction: "none", // Prevent browser handling of touch events
                        zIndex: 10000, // Ensure higher than other elements
                        pointerEvents: "auto", // Make sure touch events are received
                    }}
                >
                    {/* Center button */}
                    <div
                        style={{
                            width: `${controlSize * 0.33}px`,
                            height: `${controlSize * 0.33}px`,
                            borderRadius: "50%",
                            transition: "background-color 0.2s, transform 0.2s",
                            backgroundColor: Object.values(
                                activeDirections
                            ).some((v) => v)
                                ? "rgba(255, 255, 255, 0.7)"
                                : "rgba(255, 255, 255, 0.3)",
                            transform: Object.values(activeDirections).some(
                                (v) => v
                            )
                                ? "scale(1.2)"
                                : "scale(1)",
                        }}
                    />

                    {/* Ripple effect */}
                    {showRipple && (
                        <div
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                animation: "ripple 0.6s linear",
                            }}
                        />
                    )}

                    {/* Visual indicators for directions - simplified for performance */}
                    {performance.quality !== "low" && (
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
                                    transform: activeDirections.up
                                        ? "translateX(-50%) translateY(-2px)"
                                        : "translateX(-50%)",
                                    borderLeft: "10px solid transparent",
                                    borderRight: "10px solid transparent",
                                    borderBottom:
                                        "10px solid" +
                                        (activeDirections.up
                                            ? "rgba(255, 255, 255, 0.9)"
                                            : "rgba(255, 255, 255, 0.5)"),
                                    transition:
                                        "border-bottom-color 0.1s ease, transform 0.1s ease",
                                }}
                            ></div>
                            {/* Down arrow */}
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "5px",
                                    left: "50%",
                                    transform: activeDirections.down
                                        ? "translateX(-50%) translateY(2px)"
                                        : "translateX(-50%)",
                                    borderLeft: "10px solid transparent",
                                    borderRight: "10px solid transparent",
                                    borderTop:
                                        "10px solid" +
                                        (activeDirections.down
                                            ? "rgba(255, 255, 255, 0.9)"
                                            : "rgba(255, 255, 255, 0.5)"),
                                    transition:
                                        "border-top-color 0.1s ease, transform 0.1s ease",
                                }}
                            ></div>
                            {/* Left arrow */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: "5px",
                                    top: "50%",
                                    transform: activeDirections.left
                                        ? "translateY(-50%) translateX(-2px)"
                                        : "translateY(-50%)",
                                    borderTop: "10px solid transparent",
                                    borderBottom: "10px solid transparent",
                                    borderRight:
                                        "10px solid" +
                                        (activeDirections.left
                                            ? "rgba(255, 255, 255, 0.9)"
                                            : "rgba(255, 255, 255, 0.5)"),
                                    transition:
                                        "border-right-color 0.1s ease, transform 0.1s ease",
                                }}
                            ></div>
                            {/* Right arrow */}
                            <div
                                style={{
                                    position: "absolute",
                                    right: "5px",
                                    top: "50%",
                                    transform: activeDirections.right
                                        ? "translateY(-50%) translateX(2px)"
                                        : "translateY(-50%)",
                                    borderTop: "10px solid transparent",
                                    borderBottom: "10px solid transparent",
                                    borderLeft:
                                        "10px solid" +
                                        (activeDirections.right
                                            ? "rgba(255, 255, 255, 0.9)"
                                            : "rgba(255, 255, 255, 0.5)"),
                                    transition:
                                        "border-left-color 0.1s ease, transform 0.1s ease",
                                }}
                            ></div>
                        </div>
                    )}
                </div>

                {/* Joystick */}
                <div
                    ref={joystickRef}
                    className="joystick-container"
                    style={{
                        position: "absolute",
                        right: "20px",
                        bottom: "20px",
                        width: `${controlSize}px`,
                        height: `${controlSize}px`,
                        borderRadius: "50%",
                        backgroundColor: `rgba(0, 0, 0, ${controlAlpha})`,
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                        boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        touchAction: "none", // Prevent browser handling of touch events
                        zIndex: 10000, // Ensure higher than other elements
                        pointerEvents: "auto", // Make sure touch events are received
                    }}
                >
                    <div
                        ref={joystickKnobRef}
                        style={{
                            width: `${controlSize * 0.33}px`,
                            height: `${controlSize * 0.33}px`,
                            borderRadius: "50%",
                            backgroundColor: "rgba(255, 255, 255, 0.3)",
                            transition:
                                "transform 0.2s ease-out, box-shadow 0.2s ease-out",
                            boxShadow: "0 0 5px rgba(255, 255, 255, 0.2)",
                        }}
                    />
                    {performance.quality !== "low" && (
                        <div
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                backgroundImage:
                                    "radial-gradient(circle, transparent 60%, rgba(255, 255, 255, 0.1) 70%, transparent 75%)",
                                pointerEvents: "none",
                            }}
                        />
                    )}
                </div>

                {/* CSS for animations */}
                <style>
                    {`
                @keyframes ripple {
                    0% {
                        transform: scale(0.3);
                        opacity: 0.5;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 0;
                    }
                }
                `}
                </style>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render when visibility changes
        return (
            prevProps.isVisible === nextProps.isVisible &&
            prevProps.onMovement === nextProps.onMovement &&
            prevProps.onAction === nextProps.onAction &&
            prevProps.onJump === nextProps.onJump &&
            prevProps.mobileOverride === nextProps.mobileOverride
        );
    }
);
