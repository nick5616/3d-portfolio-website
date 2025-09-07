import { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { VirtualControls } from "./VirtualControls";
import { PerformanceControls } from "./PerformanceControls";
import { EducationalModal } from "./EducationalModal";
import { MouseStateIndicator } from "./MouseStateIndicator";
import { Minimap } from "./Minimap";
import { DebugInfo } from "./DebugInfo";
import { MathGameOverlay } from "./MathGameOverlay";
import { PositionDebug } from "./PositionDebug";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useHardwareAcceleration } from "../../hooks/useHardwareAcceleration";
import { Archway } from "../../types/scene.types";
import { ConsoleInputManager } from "./ConsoleInputManager";

export default function Interface() {
    const { isMobile } = useDeviceDetection();
    const { isHardwareAccelerationDisabled, isDetecting } =
        useHardwareAcceleration();
    const [isHoveringDoor, setIsHoveringDoor] = useState(false);
    const [currentDoorData, setCurrentDoorData] = useState<{
        archway: Archway;
        doorId: string;
        targetRoomId: string;
    } | null>(null);

    const { console: consoleState, isInteracting } = useSceneStore();

    // Listen for door hover events
    useEffect(() => {
        const handleDoorHover = (event: CustomEvent) => {
            setIsHoveringDoor(event.detail.hovering);
            setCurrentDoorData(event.detail.doorData);
        };

        window.addEventListener("doorHover", handleDoorHover as EventListener);
        return () => {
            window.removeEventListener(
                "doorHover",
                handleDoorHover as EventListener
            );
        };
    }, []);

    // Handle door interaction click
    const handleDoorClick = (event?: React.MouseEvent | React.TouchEvent) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (currentDoorData) {
            console.log(
                `🖱️ UI dispatching click event for door: ${currentDoorData.doorId}`
            );
            // Dispatch event that Door component will listen for
            window.dispatchEvent(
                new CustomEvent("doorUIClick", {
                    detail: {
                        doorId: currentDoorData.doorId,
                        targetRoomId: currentDoorData.targetRoomId,
                    },
                })
            );
        }
    };

    // Handle touch start specifically for mobile
    const handleDoorTouchStart = (event: React.TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (currentDoorData) {
            console.log(
                `📱 UI dispatching touch event for door: ${currentDoorData.doorId}`
            );
            // Dispatch event that Door component will listen for
            window.dispatchEvent(
                new CustomEvent("doorUIClick", {
                    detail: {
                        doorId: currentDoorData.doorId,
                        targetRoomId: currentDoorData.targetRoomId,
                    },
                })
            );
        }
    };

    // Hide all UI when hardware acceleration is disabled or still detecting
    if (isDetecting || isHardwareAccelerationDisabled) {
        return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Manager for console keystrokes */}
            <ConsoleInputManager />

            {/* Educational/Instructional Modal */}
            <EducationalModal />

            {/* Mouse state indicator for desktop users */}
            <MouseStateIndicator />

            {/* Crosshair - hide when interacting (console or other) */}
            {!isInteracting && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="w-2 h-2 bg-white rounded-full opacity-80 shadow-lg"></div>
                </div>
            )}

            {/* Door interaction prompt */}
            {isHoveringDoor && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8 z-50">
                    <div
                        className={`bg-black bg-opacity-70 text-white rounded font-medium pointer-events-auto cursor-pointer hover:bg-opacity-90 active:bg-opacity-100 active:scale-95 transition-all duration-150 select-none ${
                            isMobile
                                ? "px-4 py-2 text-base min-h-[44px] flex items-center justify-center"
                                : "px-3 py-1 text-sm"
                        }`}
                        onClick={handleDoorClick}
                        onTouchStart={handleDoorTouchStart}
                        style={{ touchAction: "manipulation" }}
                    >
                        {`Move Forward or ${isMobile ? "Tap" : "Click"}`}
                    </div>
                </div>
            )}

            {/* Console badge */}
            {consoleState.isActive && (
                <div className="fixed top-4 left-4 z-50 pointer-events-none">
                    <div
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 bg-blue-900/90 border-2 border-blue-400/80 text-blue-100`}
                        style={{
                            backdropFilter: "blur(16px)",
                            boxShadow:
                                "0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full" />
                            <span>Console Mode (Esc to exit)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Virtual controls (always show on mobile) */}
            {isMobile && <VirtualControls />}

            {/* Performance quality controls */}
            <PerformanceControls />

            {/* Minimap */}
            <Minimap />

            {/* Debug info */}
            <DebugInfo />

            {/* Math Game Overlay */}
            <MathGameOverlay />

            {/* Temporary Position Debug
            <PositionDebug /> */}
        </div>
    );
}
