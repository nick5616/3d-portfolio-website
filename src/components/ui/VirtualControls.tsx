import React, { useRef, useEffect, useState, useCallback, memo } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { MdGamepad, MdHideSource } from "react-icons/md";

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

export const VirtualControls: React.FC = memo(() => {
    const {
        isMobile,
        setVirtualMovement,
        setVirtualRotation,
        performance,
        controlMode,
    } = useSceneStore();

    // Only check if mobile - don't check for first person mode to ensure the controls always appear on mobile
    if (!isMobile) return null;

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
        if (!dpadTouch.current) return;

        const now = window.performance.now();
        if (now - lastMovementTime.current < movementThrottle) {
            return; // Skip this update if we're throttling
        }
        lastMovementTime.current = now;

        const dx = dpadTouch.current.currentX - dpadTouch.current.startX;
        const dy = dpadTouch.current.currentY - dpadTouch.current.startY;

        // More reliable directional control - determine the dominant direction
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Use a slightly larger deadzone to reduce jitter
        const deadzone = 10; // Increased from 8 to 10 for better stability

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
    }, [showRipple, simulateKeyEvent, movementThrottle]);

    // Continuous movement with animation frame - optimized for performance
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
        const normalizedDistance = Math.min(distance / maxJoystickDistance, 1);
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

            // Only process if we don't already have a dpad touch active
            if (dpadTouch.current) return;

            const touch = e.changedTouches[0];
            if (!touch) return;

            // Verify the touch is within the dpad element
            if (!isTouchInElement(touch, dpadRef.current)) return;

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

            // Start continuous movement with animation frames
            startContinuousMovement();
        },
        [startContinuousMovement, activeTouchIds, isTouchInElement]
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

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const touchType = activeTouchIds[touch.identifier];

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
                    }
                }
                // Check if joystick touch ended
                else if (
                    touchType === "joystick" &&
                    joystickTouch.current &&
                    touch.identifier === joystickTouch.current.identifier
                ) {
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
        // Global event listeners
        document.addEventListener("touchstart", handleGlobalTouchStart, {
            passive: false,
        });
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

            // Clear any pending ripple timeouts
            if (rippleTimeoutRef.current) {
                clearTimeout(rippleTimeoutRef.current);
            }

            // Remove all event listeners
            document.removeEventListener("touchstart", handleGlobalTouchStart);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            document.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [
        handleGlobalTouchStart,
        handleTouchMove,
        handleTouchEnd,
        simulateKeyEvent,
    ]);

    // Dynamic styles based on performance settings
    const controlAlpha = performance.quality === "low" ? 0.2 : 0.3;
    const controlSize = performance.quality === "low" ? 100 : 120;

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
                    backgroundColor: `rgba(0, 0, 0, ${controlAlpha})`,
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    transition: "transform 0.2s, background-color 0.2s",
                    transform: Object.values(activeDirections).some((v) => v)
                        ? "scale(1.05)"
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
                        transition: "background-color 0.2s",
                        backgroundColor: Object.values(activeDirections).some(
                            (v) => v
                        )
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(255, 255, 255, 0.3)",
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
});
