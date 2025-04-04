import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { VirtualControls } from "./VirtualControls";
import { PerformanceControls } from "./PerformanceControls";

export default function Interface() {
    const { isMobile } = useDeviceDetection();

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Virtual controls (always show on mobile) */}
            {isMobile && <VirtualControls />}

            {/* Performance quality controls */}
            <PerformanceControls />
        </div>
    );
}
