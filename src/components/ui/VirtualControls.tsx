import { useState, useEffect, useCallback } from "react";
import { useSceneStore } from "../../stores/sceneStore";

interface TouchPosition {
    identifier: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export default function VirtualControls() {
    const { setVirtualMovement, setVirtualRotation } = useSceneStore();

    // Track touch positions for both controls
    const [movementTouch, setMovementTouch] = useState<TouchPosition | null>(
        null
    );
    const [lookTouch, setLookTouch] = useState<TouchPosition | null>(null);

    // Track button presses for direct input
    const [directInput, setDirectInput] = useState({
        forward: false,
        backward: false,
        left: false,
        right: false,
    });

    // D-pad configuration
    const dPadSize = 150;
    const joystickSize = 150;
    const deadZone = 5; // Even smaller deadzone for more responsive controls
    const maxJoystickDistance = joystickSize / 2 - 20;

    // Handle D-pad touch start
    const handleDPadTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        setMovementTouch({
            identifier: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
        });
        e.preventDefault();
    }, []);

    // Handle joystick touch start
    const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        setLookTouch({
            identifier: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
        });
        e.preventDefault();
    }, []);

    // Handle touch move for both controls
    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            const touches = Array.from(e.touches);

            // Update movement touch
            if (movementTouch) {
                const dPadTouch = touches.find(
                    (t) => t.identifier === movementTouch.identifier
                );
                if (dPadTouch) {
                    setMovementTouch((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  currentX: dPadTouch.clientX,
                                  currentY: dPadTouch.clientY,
                              }
                            : null
                    );
                }
            }

            // Update look touch
            if (lookTouch) {
                const joystickTouch = touches.find(
                    (t) => t.identifier === lookTouch.identifier
                );
                if (joystickTouch) {
                    setLookTouch((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  currentX: joystickTouch.clientX,
                                  currentY: joystickTouch.clientY,
                              }
                            : null
                    );
                }
            }

            // Prevent default to avoid page scrolling while using controls
            e.preventDefault();
        },
        [movementTouch, lookTouch]
    );

    // Handle touch end for both controls
    const handleTouchEnd = useCallback(
        (e: TouchEvent) => {
            const remainingTouches = Array.from(e.touches);

            // Check if movement touch was removed
            if (
                movementTouch &&
                !remainingTouches.some(
                    (t) => t.identifier === movementTouch.identifier
                )
            ) {
                setMovementTouch(null);
                setVirtualMovement({
                    forward: false,
                    backward: false,
                    left: false,
                    right: false,
                });
            }

            // Check if look touch was removed
            if (
                lookTouch &&
                !remainingTouches.some(
                    (t) => t.identifier === lookTouch.identifier
                )
            ) {
                setLookTouch(null);
                setVirtualRotation({ x: 0, y: 0 });
            }
        },
        [movementTouch, lookTouch, setVirtualMovement, setVirtualRotation]
    );

    // Direct touch of dpad area to set movement immediately
    const handleDPadAreaStart = useCallback(
        (e: React.TouchEvent, direction: "up" | "down" | "left" | "right") => {
            e.stopPropagation();
            e.preventDefault();

            // Set the specific direction
            setDirectInput((prev) => {
                const newState = { ...prev };
                switch (direction) {
                    case "up":
                        newState.forward = true;
                        break;
                    case "down":
                        newState.backward = true;
                        break;
                    case "left":
                        newState.left = true;
                        break;
                    case "right":
                        newState.right = true;
                        break;
                }
                return newState;
            });
        },
        []
    );

    // Handle ending of direct input
    const handleDPadAreaEnd = useCallback(
        (e: React.TouchEvent, direction: "up" | "down" | "left" | "right") => {
            e.stopPropagation();
            e.preventDefault();

            // Clear the specific direction
            setDirectInput((prev) => {
                const newState = { ...prev };
                switch (direction) {
                    case "up":
                        newState.forward = false;
                        break;
                    case "down":
                        newState.backward = false;
                        break;
                    case "left":
                        newState.left = false;
                        break;
                    case "right":
                        newState.right = false;
                        break;
                }
                return newState;
            });
        },
        []
    );

    // Update movement and rotation based on touch positions
    useEffect(() => {
        // Handle D-pad movement - prioritize direct input over joystick
        if (
            directInput.forward ||
            directInput.backward ||
            directInput.left ||
            directInput.right
        ) {
            // Use direct input buttons
            setVirtualMovement(directInput);
        } else if (movementTouch) {
            // Use joystick-like input
            const deltaX = movementTouch.currentX - movementTouch.startX;
            const deltaY = movementTouch.currentY - movementTouch.startY;

            // Use more sensitive deadzone for better responsiveness
            const forward = deltaY < -deadZone;
            const backward = deltaY > deadZone;
            const left = deltaX < -deadZone;
            const right = deltaX > deadZone;

            setVirtualMovement({ forward, backward, left, right });
        } else {
            // Reset movement when not touching
            setVirtualMovement({
                forward: false,
                backward: false,
                left: false,
                right: false,
            });
        }

        // Handle joystick rotation
        if (lookTouch) {
            const deltaX = lookTouch.currentX - lookTouch.startX;
            const deltaY = lookTouch.currentY - lookTouch.startY;

            // Scale rotation based on joystick movement
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const scaleFactor =
                Math.min(distance, maxJoystickDistance) / maxJoystickDistance;

            // Apply deadzone
            if (distance > deadZone) {
                // Increase sensitivity for more responsive rotation
                const sensitivity = 0.03;
                const normalizedX =
                    (deltaX / distance) * scaleFactor * sensitivity;
                const normalizedY =
                    (deltaY / distance) * scaleFactor * sensitivity;

                setVirtualRotation({ x: normalizedX, y: normalizedY });
            } else {
                setVirtualRotation({ x: 0, y: 0 });
            }
        } else {
            // Ensure rotation is reset when not touching
            setVirtualRotation({ x: 0, y: 0 });
        }
    }, [
        movementTouch,
        lookTouch,
        directInput,
        setVirtualMovement,
        setVirtualRotation,
        maxJoystickDistance,
        deadZone,
    ]);

    // Add global touch event listeners
    useEffect(() => {
        document.addEventListener("touchmove", handleTouchMove, {
            passive: false, // Important to prevent scrolling
        });
        document.addEventListener("touchend", handleTouchEnd);
        document.addEventListener("touchcancel", handleTouchEnd);

        return () => {
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            document.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [handleTouchMove, handleTouchEnd]);

    // Calculate joystick handle position
    const joystickHandlePosition = lookTouch
        ? {
              left: Math.min(
                  Math.max(
                      joystickSize / 2 -
                          20 +
                          (lookTouch.currentX - lookTouch.startX),
                      20
                  ),
                  joystickSize - 20
              ),
              top: Math.min(
                  Math.max(
                      joystickSize / 2 -
                          20 +
                          (lookTouch.currentY - lookTouch.startY),
                      20
                  ),
                  joystickSize - 20
              ),
          }
        : {
              left: joystickSize / 2 - 20,
              top: joystickSize / 2 - 20,
          };

    return (
        <div className="fixed bottom-0 inset-x-0 h-[30vh] pointer-events-none z-10 virtual-controls">
            <div className="w-full h-full flex justify-between items-center px-6">
                {/* D-pad for movement - with direction buttons */}
                <div className="relative w-[150px] h-[150px] rounded-full backdrop-blur-sm bg-black/20 pointer-events-auto border border-white/10">
                    {/* Center area for general movement */}
                    <div
                        className="absolute inset-0 cursor-pointer"
                        onTouchStart={handleDPadTouchStart}
                    />

                    {/* Up/Forward direction */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-[50px] h-[50px] flex items-center justify-center"
                        onTouchStart={(e) => handleDPadAreaStart(e, "up")}
                        onTouchEnd={(e) => handleDPadAreaEnd(e, "up")}
                    >
                        <div
                            className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] ${
                                directInput.forward
                                    ? "border-b-white/70"
                                    : "border-b-white/30"
                            }`}
                        />
                    </div>

                    {/* Down/Backward direction */}
                    <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50px] h-[50px] flex items-center justify-center"
                        onTouchStart={(e) => handleDPadAreaStart(e, "down")}
                        onTouchEnd={(e) => handleDPadAreaEnd(e, "down")}
                    >
                        <div
                            className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] ${
                                directInput.backward
                                    ? "border-t-white/70"
                                    : "border-t-white/30"
                            }`}
                        />
                    </div>

                    {/* Left direction */}
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[50px] h-[50px] flex items-center justify-center"
                        onTouchStart={(e) => handleDPadAreaStart(e, "left")}
                        onTouchEnd={(e) => handleDPadAreaEnd(e, "left")}
                    >
                        <div
                            className={`w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] ${
                                directInput.left
                                    ? "border-r-white/70"
                                    : "border-r-white/30"
                            }`}
                        />
                    </div>

                    {/* Right direction */}
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-[50px] h-[50px] flex items-center justify-center"
                        onTouchStart={(e) => handleDPadAreaStart(e, "right")}
                        onTouchEnd={(e) => handleDPadAreaEnd(e, "right")}
                    >
                        <div
                            className={`w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[15px] ${
                                directInput.right
                                    ? "border-l-white/70"
                                    : "border-l-white/30"
                            }`}
                        />
                    </div>

                    {/* Movement indicator */}
                    {movementTouch && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[30px] h-[30px] rounded-full bg-white/30" />
                        </div>
                    )}
                </div>

                {/* Joystick for camera */}
                <div
                    className="relative w-[150px] h-[150px] rounded-full backdrop-blur-sm bg-black/20 pointer-events-auto border border-white/10"
                    onTouchStart={handleJoystickTouchStart}
                >
                    {lookTouch && (
                        <div
                            className="absolute w-[40px] h-[40px] rounded-full bg-white/30 transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: joystickHandlePosition.left,
                                top: joystickHandlePosition.top,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
