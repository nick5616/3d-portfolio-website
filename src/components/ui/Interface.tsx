import { useSceneStore } from "../../stores/sceneStore";
import { VirtualControls } from "./VirtualControls";
import { PerformanceControls } from "./PerformanceControls";
import { EducationalModal } from "./EducationalModal";
import { MouseStateIndicator } from "./MouseStateIndicator";

export default function Interface() {
    const { isMobile } = useSceneStore();

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Educational/Instructional Modal */}
            <EducationalModal />

            {/* Mouse state indicator for desktop users */}
            <MouseStateIndicator />

            {/* Virtual controls (always show on mobile) */}
            {isMobile && <VirtualControls />}

            {/* Performance quality controls */}
            <PerformanceControls />
        </div>
    );
}
