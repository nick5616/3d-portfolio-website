import React, { useRef, useEffect, useState, useCallback, memo } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { MdGamepad, MdHideSource } from "react-icons/md";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

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
            setVirtualMovement,
            setVirtualRotation,
            setMovementJoystickIntensity,
            setCameraJoystickIntensity,
            performance,
        } = useSceneStore();

        const { isMobile } = useDeviceDetection();
        const isMobileLocal = mobileOverride ?? isMobile;

        // Track active touch ids
        const [activeTouchIds, setActiveTouchIds] = useState<{
            [key: number]: "movement" | "camera";
        }>({});
        const [showRipple, setShowRipple] = useState(false);
        const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        // Create refs for touch controls
        const movementTouchAreaRef = useRef<HTMLDivElement>(null);
        const cameraTouchAreaRef = useRef<HTMLDivElement>(null);
        const movementJoystickRef = useRef<HTMLDivElement>(null);
        const cameraJoystickRef = useRef<HTMLDivElement>(null);
        const movementJoystickKnobRef = useRef<HTMLDivElement>(null);
        const cameraJoystickKnobRef = useRef<HTMLDivElement>(null);
        const animationFrameIdRef = useRef<number>(0);

        // Track touch positions
        const movementTouch = useRef<TouchPosition | null>(null);
        const cameraTouch = useRef<TouchPosition | null>(null);
        
        // Track joystick positions (where they spawn)
        const [movementJoystickPosition, setMovementJoystickPosition] = useState<{ x: number; y: number } | null>(null);
        const [cameraJoystickPosition, setCameraJoystickPosition] = useState<{ x: number; y: number } | null>(null);

        // Configure joystick based on performance
        const maxJoystickDistance = performance.quality === "low" ? 30 : 40;
        const joystickSize = performance.quality === "low" ? 100 : 120;

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
        // Reduced throttling on mobile for smoother movement
        const movementThrottle = isMobileLocal
            ? 8 // ~120fps updates on mobile for smooth movement
            : performance.quality === "low"
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

        // Stop continuous movement - declare it before use
        const stopContinuousMovement = useCallback(() => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = 0;
            }
        }, []);

        // Update movement based on movement joystick touch - with throttling
        const updateDpadMovement = useCallback(() => {
            if (!movementTouch.current || !movementJoystickKnobRef.current) {
                return false; // Return false to indicate no movement
            }

            const now = window.performance.now();
            if (now - lastMovementTime.current < movementThrottle) {
                return true; // Keep animation going
            }
            lastMovementTime.current = now;

            const centerX = movementTouch.current.startX;
            const centerY = movementTouch.current.startY;
            const dx = movementTouch.current.currentX - centerX;
            const dy = movementTouch.current.currentY - centerY;

            // Calculate the distance from the center
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Update the joystick knob position visually
            let normalizedDx = dx;
            let normalizedDy = dy;

            // If the distance is greater than the max, normalize the deltas
            if (distance > maxJoystickDistance) {
                const scale = maxJoystickDistance / distance;
                normalizedDx = dx * scale;
                normalizedDy = dy * scale;
            }

            // Check if there's no significant movement - use smaller deadzone for more responsiveness
            const movementDeadzone = 1;
            if (
                Math.abs(dx) < movementDeadzone &&
                Math.abs(dy) < movementDeadzone
            ) {
                // No movement, set intensity to 0 and reset visual
                setMovementJoystickIntensity(0);
                if (movementJoystickKnobRef.current) {
                    movementJoystickKnobRef.current.style.transform = "translate(0px, 0px)";
                    movementJoystickKnobRef.current.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
                    movementJoystickKnobRef.current.style.boxShadow = "none";
                }
                return true; // Continue animation to check for movement
            }

            // Update knob position
            movementJoystickKnobRef.current.style.transition = "none";
            movementJoystickKnobRef.current.style.transform = `translate(${normalizedDx}px, ${normalizedDy}px)`;

            // Calculate normalized distance (0 to 1)
            const normalizedDistance = Math.min(
                distance / maxJoystickDistance,
                1
            );

            // Update intensity in store for speed scaling
            setMovementJoystickIntensity(normalizedDistance);

            // Add a light glow effect based on displacement
            const glowIntensity = Math.floor(normalizedDistance * 10);
            movementJoystickKnobRef.current.style.boxShadow = `0 0 ${glowIntensity}px ${glowIntensity}px rgba(255, 0, 0, 0.3)`;

            // Update brightness based on distance - brighter when pushed farther
            const brightness = 0.3 + normalizedDistance * 0.7; // 0.3 to 1.0
            movementJoystickKnobRef.current.style.backgroundColor = `rgba(255, 0, 0, ${brightness})`;

            // More reliable directional control - determine the dominant direction
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Use an even smaller deadzone for more responsive feel
            const deadzone = 1;

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

            // Determine directions based on touch position - allow diagonal movement
            if (absDx > deadzone || absDy > deadzone) {
                // Check horizontal movement
                if (absDx > deadzone) {
                    if (dx > 0) {
                        // Right
                        keysToPress.d = true;
                        newActiveDirections.right = true;
                    } else {
                        // Left
                        keysToPress.a = true;
                        newActiveDirections.left = true;
                    }
                }

                // Check vertical movement (allow both horizontal and vertical simultaneously)
                if (absDy > deadzone) {
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
                running: false, // Virtual controls don't support running
                jumping: false, // Virtual controls don't support jumping
            });

            // Simulate keyboard events based on current state
            simulateKeyEvent("w", keysToPress.w);
            simulateKeyEvent("a", keysToPress.a);
            simulateKeyEvent("s", keysToPress.s);
            simulateKeyEvent("d", keysToPress.d);

            // Store the current key state for cleaning up later
            movementTouch.current.activeKeys = keysToPress;

            return true; // Return true to indicate movement should continue
        }, [
            movementThrottle,
            simulateKeyEvent,
            setVirtualMovement,
            setMovementJoystickIntensity,
            maxJoystickDistance,
            showRipple,
        ]);

        // Continuous movement with animation frame - optimized for performance
        const startContinuousMovement = useCallback(() => {
            // Cancel any existing animation first
            stopContinuousMovement();

            let frameCount = 0;
            // Animation function for continuous updates
            const animate = () => {
                frameCount++;
                // First check if we still have an active movement touch
                if (!movementTouch.current) {
                    stopContinuousMovement();
                    return;
                }

                // Call the update function and check if we should continue
                const shouldContinue = updateDpadMovement();

                // Continue the animation if we should and still have a touch
                // Give it a few frames to start detecting movement
                if ((shouldContinue || frameCount < 5) && movementTouch.current) {
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

        // Update camera joystick position and rotation - with smoothing
        const lastRotation = useRef({ x: 0, y: 0 });
        const updateCameraJoystickPosition = useCallback(() => {
            if (
                !cameraTouch.current ||
                !cameraJoystickKnobRef.current
            )
                return;

            const centerX = cameraTouch.current.startX;
            const centerY = cameraTouch.current.startY;

            // Calculate the offset from the center
            let deltaX = cameraTouch.current.currentX - centerX;
            let deltaY = cameraTouch.current.currentY - centerY;

            // Calculate the distance from the center
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // If the distance is greater than the max, normalize the deltas
            if (distance > maxJoystickDistance) {
                const scale = maxJoystickDistance / distance;
                deltaX *= scale;
                deltaY *= scale;
            }

            // Update the joystick knob position visually
            cameraJoystickKnobRef.current.style.transition = "none";
            cameraJoystickKnobRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            // Calculate normalized distance (0 to 1)
            const normalizedDistance = Math.min(
                distance / maxJoystickDistance,
                1
            );

            // Update intensity in store for speed scaling
            setCameraJoystickIntensity(normalizedDistance);

            // Add a light glow effect based on displacement
            const glowIntensity = Math.floor(normalizedDistance * 10);
            cameraJoystickKnobRef.current.style.boxShadow = `0 0 ${glowIntensity}px ${glowIntensity}px rgba(0, 0, 255, 0.3)`;

            // Update brightness based on distance - brighter when pushed farther
            const brightness = 0.3 + normalizedDistance * 0.7; // 0.3 to 1.0
            cameraJoystickKnobRef.current.style.backgroundColor = `rgba(0, 0, 255, ${brightness})`;

            // Calculate rotation values - scale sensitivity based on distance
            const baseSensitivity = 0.001;
            const sensitivity = baseSensitivity * (0.75 + normalizedDistance * 0.75); // 0.75x to 1.5x base sensitivity (half the scaling range)

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
        }, [
            setVirtualRotation,
            setCameraJoystickIntensity,
            maxJoystickDistance,
            smoothFactor,
        ]);

        // Handle movement joystick touch start
        const handleMovementTouchStart = useCallback(
            (e: TouchEvent) => {
                // Only process if we don't already have a movement touch active
                if (movementTouch.current) {
                    return;
                }

                const touch = e.changedTouches[0];
                if (!touch) {
                    return;
                }

                // Verify the touch is within the movement touch area
                if (!isTouchInElement(touch, movementTouchAreaRef.current)) {
                    return;
                }

                // Check if touch is on a higher priority element (like modal buttons)
                // We do this by checking if the element at the touch point has a higher z-index
                const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
                if (elementAtPoint) {
                    const computedStyle = window.getComputedStyle(elementAtPoint);
                    const zIndex = parseInt(computedStyle.zIndex || "0", 10);
                    // If z-index is 50 or higher (modals are 60), don't handle this touch
                    if (zIndex >= 50) {
                        return;
                    }
                }

                // NOW prevent default since we're handling this touch
                e.preventDefault();
                e.stopPropagation();

                // Register this touch as a movement touch
                setActiveTouchIds((prev) => ({
                    ...prev,
                    [touch.identifier]: "movement",
                }));

                // Spawn joystick at touch position
                setMovementJoystickPosition({
                    x: touch.clientX,
                    y: touch.clientY,
                });

                movementTouch.current = {
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

                // Start the continuous movement tracking
                startContinuousMovement();
            },
            [isTouchInElement, startContinuousMovement]
        );

        // Handle camera joystick touch start
        const handleCameraTouchStart = useCallback(
            (e: TouchEvent) => {
                // Only process if we don't already have a camera touch active
                if (cameraTouch.current) {
                    return;
                }

                const touch = e.changedTouches[0];
                if (!touch) return;

                if (!isTouchInElement(touch, cameraTouchAreaRef.current)) {
                    return;
                }

                // Check if touch is on a higher priority element (like modal buttons)
                const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
                if (elementAtPoint) {
                    const computedStyle = window.getComputedStyle(elementAtPoint);
                    const zIndex = parseInt(computedStyle.zIndex || "0", 10);
                    // If z-index is 50 or higher (modals are 60), don't handle this touch
                    if (zIndex >= 50) {
                        return;
                    }
                }

                // NOW prevent default since we're handling this touch
                e.preventDefault();
                e.stopPropagation();

                // Register this touch as a camera touch
                setActiveTouchIds((prev) => ({
                    ...prev,
                    [touch.identifier]: "camera",
                }));

                // Spawn joystick at touch position
                setCameraJoystickPosition({
                    x: touch.clientX,
                    y: touch.clientY,
                });

                cameraTouch.current = {
                    identifier: touch.identifier,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                };

                // Clear any previous rotation
                lastRotation.current = { x: 0, y: 0 };
            },
            [isTouchInElement]
        );

        // Handle global touch starts - route to appropriate handler
        const handleGlobalTouchStart = useCallback(
            (e: TouchEvent) => {
                // Only process touches if they're actually in our control areas
                let handledTouch = false;

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];

                    // Check if touch is in movement area (left half of bottom screen)
                    if (isTouchInElement(touch, movementTouchAreaRef.current)) {
                        handleMovementTouchStart(e);
                        handledTouch = true;
                        return; // Only handle one touch at a time
                    }
                    // Check if touch is in camera area (right half of bottom screen)
                    else if (isTouchInElement(touch, cameraTouchAreaRef.current)) {
                        handleCameraTouchStart(e);
                        handledTouch = true;
                        return; // Only handle one touch at a time
                    }
                }

                // If touch wasn't in our controls, don't prevent default or stop propagation
                if (!handledTouch) {
                    return;
                }
            },
            [handleMovementTouchStart, handleCameraTouchStart, isTouchInElement]
        );

        // Handle touch move - with improved multi-touch handling and performance optimization
        const handleTouchMove = useCallback(
            (e: TouchEvent) => {
                let handledTouch = false;

                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    const touchType = activeTouchIds[touch.identifier];

                    // Only process touches that we've already classified
                    if (
                        touchType === "movement" &&
                        movementTouch.current &&
                        touch.identifier === movementTouch.current.identifier
                    ) {
                        e.preventDefault();
                        e.stopPropagation();

                        // Update current position
                        movementTouch.current.currentX = touch.clientX;
                        movementTouch.current.currentY = touch.clientY;

                        handledTouch = true;

                        // Restart continuous movement if not already running
                        if (!animationFrameIdRef.current) {
                            startContinuousMovement();
                        }
                    } else if (
                        touchType === "camera" &&
                        cameraTouch.current &&
                        touch.identifier === cameraTouch.current.identifier
                    ) {
                        e.preventDefault();
                        e.stopPropagation();
                        cameraTouch.current.currentX = touch.clientX;
                        cameraTouch.current.currentY = touch.clientY;

                        updateCameraJoystickPosition();
                        handledTouch = true;
                    }
                }

                // Only prevent default if we actually handled a touch
                if (!handledTouch) {
                    return;
                }
            },
            [updateCameraJoystickPosition, activeTouchIds, startContinuousMovement]
        );

        // Handle touch end - with complete cleanup
        const handleTouchEnd = useCallback(
            (e: TouchEvent) => {
                let handledTouch = false;

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    const touchType = activeTouchIds[touch.identifier];

                    // Only handle touches that we've been tracking
                    if (touchType) {
                        e.preventDefault();
                        e.stopPropagation();
                        handledTouch = true;

                        // Remove this touch from our tracking
                        setActiveTouchIds((prev) => {
                            const newIds = { ...prev };
                            delete newIds[touch.identifier];
                            return newIds;
                        });

                        // Check if movement touch ended
                        if (
                            touchType === "movement" &&
                            movementTouch.current &&
                            touch.identifier === movementTouch.current.identifier
                        ) {
                            // Clean up any active key presses
                            if (movementTouch.current.activeKeys) {
                                if (movementTouch.current.activeKeys.w)
                                    simulateKeyEvent("w", false);
                                if (movementTouch.current.activeKeys.a)
                                    simulateKeyEvent("a", false);
                                if (movementTouch.current.activeKeys.s)
                                    simulateKeyEvent("s", false);
                                if (movementTouch.current.activeKeys.d)
                                    simulateKeyEvent("d", false);
                            }

                            // Reset movement touch
                            movementTouch.current = null;
                            setMovementJoystickPosition(null);
                            setMovementJoystickIntensity(0);

                            // Reset the virtualMovement state
                            setVirtualMovement({
                                forward: false,
                                backward: false,
                                left: false,
                                right: false,
                                running: false,
                                jumping: false,
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

                            // Reset movement joystick knob position with animation
                            if (movementJoystickKnobRef.current) {
                                movementJoystickKnobRef.current.style.transition =
                                    "background-color 0.2s, transform 0.2s ease-out, box-shadow 0.2s ease-out";
                                movementJoystickKnobRef.current.style.transform =
                                    "translate(0px, 0px)";
                                movementJoystickKnobRef.current.style.boxShadow =
                                    "none";
                                movementJoystickKnobRef.current.style.backgroundColor =
                                    "rgba(255, 0, 0, 0.3)";
                            }
                        }
                        // Check if camera touch ended
                        else if (
                            touchType === "camera" &&
                            cameraTouch.current &&
                            touch.identifier === cameraTouch.current.identifier
                        ) {
                            cameraTouch.current = null;
                            setCameraJoystickPosition(null);
                            setCameraJoystickIntensity(0);

                            // Smoothly reset rotation
                            lastRotation.current = { x: 0, y: 0 };
                            setVirtualRotation({ x: 0, y: 0 });

                            // Reset joystick knob position with animation
                            if (cameraJoystickKnobRef.current) {
                                cameraJoystickKnobRef.current.style.transition =
                                    "background-color 0.2s, transform 0.2s ease-out, box-shadow 0.2s ease-out";
                                cameraJoystickKnobRef.current.style.transform =
                                    "translate(0px, 0px)";
                                cameraJoystickKnobRef.current.style.boxShadow =
                                    "none";
                                cameraJoystickKnobRef.current.style.backgroundColor =
                                    "rgba(0, 0, 255, 0.3)";
                            }
                        }
                    }
                }

                // Only prevent default if we actually handled a touch
                if (!handledTouch) {
                    return;
                }
            },
            [
                activeTouchIds,
                simulateKeyEvent,
                setVirtualMovement,
                setVirtualRotation,
                stopContinuousMovement,
            ]
        );

        // Store handler refs to avoid infinite re-renders
        const handlersRef = useRef({
            globalTouchStart: handleGlobalTouchStart,
            touchMove: handleTouchMove,
            touchEnd: handleTouchEnd,
        });

        // Update refs when handlers change
        useEffect(() => {
            handlersRef.current.globalTouchStart = handleGlobalTouchStart;
            handlersRef.current.touchMove = handleTouchMove;
            handlersRef.current.touchEnd = handleTouchEnd;
        }, [handleGlobalTouchStart, handleTouchMove, handleTouchEnd]);

        // Clean up animation frames and key events on unmount - FIXED to prevent infinite re-renders
        useEffect(() => {
            // Store reference to simulateKeyEvent for cleanup
            const currentSimulateKeyEvent = simulateKeyEvent;

            // Wrapper functions that call the current handlers
            const globalTouchStartWrapper = (e: TouchEvent) => {
                handlersRef.current.globalTouchStart(e);
            };
            const touchMoveWrapper = (e: TouchEvent) => {
                handlersRef.current.touchMove(e);
            };
            const touchEndWrapper = (e: TouchEvent) => {
                handlersRef.current.touchEnd(e);
            };

            // Use passive: false so we can preventDefault when needed
            document.addEventListener("touchstart", globalTouchStartWrapper, {
                passive: false,
                capture: false,
            });
            document.addEventListener("touchmove", touchMoveWrapper, {
                passive: false,
                capture: false,
            });
            document.addEventListener("touchend", touchEndWrapper, {
                passive: false,
                capture: false,
            });
            document.addEventListener("touchcancel", touchEndWrapper, {
                passive: false,
                capture: false,
            });

            return () => {
                // Cancel any animation frames
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                    animationFrameIdRef.current = 0;
                }

                // Reset any active key states if needed
                if (movementTouch.current?.activeKeys) {
                    if (movementTouch.current.activeKeys.w)
                        currentSimulateKeyEvent("w", false);
                    if (movementTouch.current.activeKeys.a)
                        currentSimulateKeyEvent("a", false);
                    if (movementTouch.current.activeKeys.s)
                        currentSimulateKeyEvent("s", false);
                    if (movementTouch.current.activeKeys.d)
                        currentSimulateKeyEvent("d", false);
                }

                // Clear any pending ripple timeouts
                if (rippleTimeoutRef.current) {
                    clearTimeout(rippleTimeoutRef.current);
                    rippleTimeoutRef.current = null;
                }

                // Reset touch state
                movementTouch.current = null;
                cameraTouch.current = null;
                setMovementJoystickPosition(null);
                setCameraJoystickPosition(null);
                setMovementJoystickIntensity(0);
                setCameraJoystickIntensity(0);

                // Reset movement state
                setVirtualMovement({
                    forward: false,
                    backward: false,
                    left: false,
                    right: false,
                    running: false,
                    jumping: false,
                });
                setVirtualRotation({ x: 0, y: 0 });

                // Remove all event listeners
                document.removeEventListener(
                    "touchstart",
                    globalTouchStartWrapper,
                    {
                        capture: false,
                    }
                );
                document.removeEventListener("touchmove", touchMoveWrapper, {
                    capture: false,
                });
                document.removeEventListener("touchend", touchEndWrapper, {
                    capture: false,
                });
                document.removeEventListener("touchcancel", touchEndWrapper, {
                    capture: false,
                });
            };
        }, [simulateKeyEvent, setVirtualMovement, setVirtualRotation]); // Include essential dependencies only

        // Reset state on initial mount to avoid stale state from previous renders
        useEffect(() => {
            // Reset touch state
            movementTouch.current = null;
            cameraTouch.current = null;
            setMovementJoystickPosition(null);
            setCameraJoystickPosition(null);
            setMovementJoystickIntensity(0);
            setCameraJoystickIntensity(0);

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
                running: false,
                jumping: false,
            });
            setVirtualRotation({ x: 0, y: 0 });

            // Reset directions
            setActiveDirections({
                up: false,
                down: false,
                left: false,
                right: false,
            });

            // Reset joystick knob positions
            if (movementJoystickKnobRef.current) {
                movementJoystickKnobRef.current.style.transform = "translate(0px, 0px)";
                movementJoystickKnobRef.current.style.boxShadow = "none";
                movementJoystickKnobRef.current.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
            }
            if (cameraJoystickKnobRef.current) {
                cameraJoystickKnobRef.current.style.transform = "translate(0px, 0px)";
                cameraJoystickKnobRef.current.style.boxShadow = "none";
                cameraJoystickKnobRef.current.style.backgroundColor = "rgba(0, 0, 255, 0.3)";
            }
        }, [
            setVirtualMovement,
            setVirtualRotation,
            setMovementJoystickIntensity,
            setCameraJoystickIntensity,
        ]);

        // Dynamic styles based on performance settings
        const controlAlpha = performance.quality === "low" ? 0.2 : 0.3;

        // Only check if mobile - don't check for first person mode to ensure the controls always appear on mobile
        if (!isMobileLocal) return null;

        return (
            <>
                {/* Touch Areas - Bottom 65% of screen, divided left and right */}
                {/* Left half - Movement */}
                <div
                    ref={movementTouchAreaRef}
                    style={{
                        position: "fixed",
                        left: 0,
                        bottom: 0,
                        width: "50%",
                        height: "65%",
                        zIndex: 30, // Lower than modals (60) but above canvas
                        pointerEvents: "auto",
                        touchAction: "none",
                    }}
                />

                {/* Right half - Camera */}
                <div
                    ref={cameraTouchAreaRef}
                    style={{
                        position: "fixed",
                        right: 0,
                        bottom: 0,
                        width: "50%",
                        height: "65%",
                        zIndex: 30, // Lower than modals (60) but above canvas
                        pointerEvents: "auto",
                        touchAction: "none",
                    }}
                />

                {/* Movement Joystick - appears where user touches */}
                {movementJoystickPosition && (
                    <div
                        ref={movementJoystickRef}
                        className="movement-joystick-container"
                        style={{
                            position: "fixed",
                            left: `${movementJoystickPosition.x - joystickSize / 2}px`,
                            top: `${movementJoystickPosition.y - joystickSize / 2}px`,
                            width: `${joystickSize}px`,
                            height: `${joystickSize}px`,
                            borderRadius: "50%",
                            backgroundColor: Object.values(activeDirections).some(
                                (v) => v
                            )
                                ? "rgba(25, 25, 25, 0.5)"
                                : `rgba(0, 0, 0, ${controlAlpha})`,
                            border: "2px solid rgba(255, 0, 0, 0.3)",
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
                            touchAction: "none",
                            zIndex: 45, // Above debug info (40) but below modals (60)
                            pointerEvents: "auto",
                        }}
                    >
                        {/* Center button / Knob */}
                        <div
                            ref={movementJoystickKnobRef}
                            style={{
                                width: `${joystickSize * 0.33}px`,
                                height: `${joystickSize * 0.33}px`,
                                borderRadius: "50%",
                                transition: "background-color 0.1s, transform 0.2s ease-out, box-shadow 0.2s ease-out",
                                backgroundColor: "rgba(255, 0, 0, 0.3)", // Will be updated dynamically
                                boxShadow: "0 0 5px rgba(255, 0, 0, 0.2)",
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
                                    backgroundColor: "rgba(255, 0, 0, 0.1)",
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
                                                ? "rgba(255, 0, 0, 0.9)"
                                                : "rgba(255, 0, 0, 0.5)"),
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
                                                ? "rgba(255, 0, 0, 0.9)"
                                                : "rgba(255, 0, 0, 0.5)"),
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
                                                ? "rgba(255, 0, 0, 0.9)"
                                                : "rgba(255, 0, 0, 0.5)"),
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
                                                ? "rgba(255, 0, 0, 0.9)"
                                                : "rgba(255, 0, 0, 0.5)"),
                                        transition:
                                            "border-left-color 0.1s ease, transform 0.1s ease",
                                    }}
                                ></div>
                            </div>
                        )}
                    </div>
                )}

                {/* Camera Joystick - appears where user touches */}
                {cameraJoystickPosition && (
                    <div
                        ref={cameraJoystickRef}
                        className="camera-joystick-container"
                        style={{
                            position: "fixed",
                            left: `${cameraJoystickPosition.x - joystickSize / 2}px`,
                            top: `${cameraJoystickPosition.y - joystickSize / 2}px`,
                            width: `${joystickSize}px`,
                            height: `${joystickSize}px`,
                            borderRadius: "50%",
                            backgroundColor: `rgba(0, 0, 0, ${controlAlpha})`,
                            border: "2px solid rgba(0, 0, 255, 0.3)",
                            boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            touchAction: "none",
                            zIndex: 45, // Above debug info (40) but below modals (60)
                            pointerEvents: "auto",
                        }}
                    >
                        <div
                            ref={cameraJoystickKnobRef}
                            style={{
                                width: `${joystickSize * 0.33}px`,
                                height: `${joystickSize * 0.33}px`,
                                borderRadius: "50%",
                                backgroundColor: "rgba(0, 0, 255, 0.3)", // Will be updated dynamically
                                transition:
                                    "background-color 0.1s, transform 0.2s ease-out, box-shadow 0.2s ease-out",
                                boxShadow: "0 0 5px rgba(0, 0, 255, 0.2)",
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
                                        "radial-gradient(circle, transparent 60%, rgba(0, 0, 255, 0.1) 70%, transparent 75%)",
                                    pointerEvents: "none",
                                }}
                            />
                        )}
                    </div>
                )}

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
            </>
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
