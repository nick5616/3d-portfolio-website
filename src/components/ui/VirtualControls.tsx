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

    // D-pad configuration
    const dPadSize = 150;
    const joystickSize = 150;
    const dPadButtonSize = 50;
    const joystickHandleSize = 40;
    const deadZone = 10;
    const maxJoystickDistance = joystickSize / 2 - joystickHandleSize / 2;

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

    // Update movement and rotation based on touch positions
    useEffect(() => {
        // Handle D-pad movement
        if (movementTouch) {
            const deltaX = movementTouch.currentX - movementTouch.startX;
            const deltaY = movementTouch.currentY - movementTouch.startY;

            const forward = deltaY < -deadZone;
            const backward = deltaY > deadZone;
            const left = deltaX < -deadZone;
            const right = deltaX > deadZone;

            setVirtualMovement({ forward, backward, left, right });
        }

        // Handle joystick rotation
        if (lookTouch) {
            const deltaX = lookTouch.currentX - lookTouch.startX;
            const deltaY = lookTouch.currentY - lookTouch.startY;

            // Scale rotation based on joystick movement
            // Limit to maximum joystick distance
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const scaleFactor =
                Math.min(distance, maxJoystickDistance) / maxJoystickDistance;

            // Apply deadzone
            if (distance > deadZone) {
                const sensitivity = 0.02;
                const normalizedX =
                    (deltaX / distance) * scaleFactor * sensitivity;
                const normalizedY =
                    (deltaY / distance) * scaleFactor * sensitivity;

                setVirtualRotation({ x: normalizedX, y: normalizedY });
            } else {
                setVirtualRotation({ x: 0, y: 0 });
            }
        }
    }, [
        movementTouch,
        lookTouch,
        setVirtualMovement,
        setVirtualRotation,
        maxJoystickDistance,
    ]);

    // Add global touch event listeners
    useEffect(() => {
        document.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        });
        document.addEventListener("touchend", handleTouchEnd);
        document.addEventListener("touchcancel", handleTouchEnd);

        return () => {
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            document.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [handleTouchMove, handleTouchEnd]);

    // Calculate D-pad button positions
    const dPadCenterX = dPadSize / 2;
    const dPadCenterY = dPadSize / 2;

    // Calculate joystick handle position
    const joystickHandlePosition = lookTouch
        ? {
              left: Math.min(
                  Math.max(
                      joystickSize / 2 -
                          joystickHandleSize / 2 +
                          (lookTouch.currentX - lookTouch.startX),
                      joystickHandleSize / 2
                  ),
                  joystickSize - joystickHandleSize / 2
              ),
              top: Math.min(
                  Math.max(
                      joystickSize / 2 -
                          joystickHandleSize / 2 +
                          (lookTouch.currentY - lookTouch.startY),
                      joystickHandleSize / 2
                  ),
                  joystickSize - joystickHandleSize / 2
              ),
          }
        : {
              left: joystickSize / 2 - joystickHandleSize / 2,
              top: joystickSize / 2 - joystickHandleSize / 2,
          };

    return (
        <div className="fixed bottom-0 inset-x-0 h-[30vh] pointer-events-none">
            <div className="w-full h-full flex justify-between items-center px-6">
                {/* D-pad for movement */}
                <div
                    className="relative w-[150px] h-[150px] rounded-full bg-black/30 pointer-events-auto"
                    onTouchStart={handleDPadTouchStart}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50px] h-[50px] flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[20px] border-b-white/50" />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50px] h-[50px] flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-white/50" />
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50px] h-[50px] flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[20px] border-r-white/50" />
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50px] h-[50px] flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[20px] border-l-white/50" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className={`w-[30px] h-[30px] rounded-full ${
                                movementTouch ? "bg-white/70" : "bg-white/30"
                            }`}
                        />
                    </div>
                </div>

                {/* Joystick for camera */}
                <div
                    className="relative w-[150px] h-[150px] rounded-full bg-black/30 pointer-events-auto"
                    onTouchStart={handleJoystickTouchStart}
                >
                    <div
                        className="absolute w-[40px] h-[40px] rounded-full bg-white/70 transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: joystickHandlePosition.left,
                            top: joystickHandlePosition.top,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
