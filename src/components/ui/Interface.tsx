import { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { VirtualControls } from "./VirtualControls";
import { PerformanceControls } from "./PerformanceControls";
import { EducationalModal } from "./EducationalModal";
import { MouseStateIndicator } from "./MouseStateIndicator";
import { Minimap } from "./Minimap";
import { DebugInfo } from "./DebugInfo";
import { MathGameOverlay } from "./MathGameOverlay";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useHardwareAcceleration } from "../../hooks/useHardwareAcceleration";
import { Archway } from "../../types/scene.types";

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
            {/* Educational/Instructional Modal */}
            <EducationalModal />

            {/* Mouse state indicator for desktop users */}
            <MouseStateIndicator />

            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                <div className="w-2 h-2 bg-white rounded-full opacity-80 shadow-lg"></div>
            </div>

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
                        {isMobile ? "Tap to Open" : "[Click] Open"}
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
        </div>
    );
}
