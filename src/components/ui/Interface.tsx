import { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { VirtualControls } from "./VirtualControls";
import { PerformanceControls } from "./PerformanceControls";
import { EducationalModal } from "./EducationalModal";
import { MouseStateIndicator } from "./MouseStateIndicator";
import { Minimap } from "./Minimap";
import { DebugInfo } from "./DebugInfo";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export default function Interface() {
    const { isMobile } = useDeviceDetection();
    const [isHoveringDoor, setIsHoveringDoor] = useState(false);

    // Listen for door hover events
    useEffect(() => {
        const handleDoorHover = (event: CustomEvent) => {
            setIsHoveringDoor(event.detail.hovering);
        };

        window.addEventListener("doorHover", handleDoorHover as EventListener);
        return () => {
            window.removeEventListener(
                "doorHover",
                handleDoorHover as EventListener
            );
        };
    }, []);

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
                    <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm font-medium">
                        [Click] Open
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
        </div>
    );
}
