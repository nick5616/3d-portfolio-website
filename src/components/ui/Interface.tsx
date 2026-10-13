import { useShallow } from "zustand/react/shallow";
import { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { VirtualControls } from "./VirtualControls";
import { PerformanceControls } from "./PerformanceControls";
import { WorldGuide } from "./WorldGuide";
import { Minimap } from "./Minimap";
import { DebugInfo } from "./DebugInfo";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useHardwareAcceleration } from "../../hooks/useHardwareAcceleration";
import { Archway } from "../../types/scene.types";
import { ConsoleInputManager } from "./ConsoleInputManager";
import { HudToasts } from "./HudToasts";
import { useArtInspectStore } from "../../stores/artInspectStore";
import { useSketchbookStore } from "../sketchbook/sketchbookStore";

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

    const {
        console: consoleState,
        isInteracting,
        isEducationalModalOpen,
        showStartPrompt,
    } = useSceneStore(
        useShallow((s) => ({ console: s.console, isInteracting: s.isInteracting, isEducationalModalOpen: s.isEducationalModalOpen, showStartPrompt: s.showStartPrompt }))
    );

    const aimingAtArt = useArtInspectStore((s) => Boolean(s.aimed));
    const aimingAtBook = useSketchbookStore((s) => s.aimed);

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
        <div className="hud-layer fixed inset-0 pointer-events-none">
            {/* Manager for console keystrokes */}
            <ConsoleInputManager />

            {/* Welcome / pause / cursor hints */}
            <WorldGuide />

            {/* Crosshair - hidden while interacting or on the start prompt */}
            {!isInteracting && !showStartPrompt && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div
                        className={`gem-crosshair ${
                            isHoveringDoor || aimingAtArt || aimingAtBook
                                ? "gem-crosshair--active"
                                : ""
                        }`}
                    />
                </div>
            )}

            {/* Console badge */}
            {consoleState.isActive && (
                <div className="fixed top-3 left-3 z-50 pointer-events-none">
                    <div className="gem gem--sm gem--blue px-3 py-1.5 text-[13px] font-semibold flex items-center gap-2">
                        <span className="gem-kbd">Esc</span> leave the console
                    </div>
                </div>
            )}

            {/* Achievement + now-playing cards */}
            <HudToasts />

            {/* Virtual controls (hide when educational modal is open on mobile) */}
            {isMobile && !isEducationalModalOpen && <VirtualControls />}

            {/* Settings live in the pause card on desktop; touch devices have
                no pause screen, so they keep the gear button. */}
            {isMobile && <PerformanceControls />}

            {/* Minimap */}
            <Minimap />

            {/* Debug info */}
            <DebugInfo />

            {/* Temporary Position Debug */}
            {/* <PositionDebug /> */}
        </div>
    );
}
