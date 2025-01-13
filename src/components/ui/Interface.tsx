// src/components/ui/Interface.tsx
import { useSceneStore } from "../../stores/sceneStore";
import { PerformanceOverlay } from "./PerformanceOverlay";

export const Interface: React.FC = () => {
    const {
        controlMode,
        setControlMode,
        performance,
        spotlightsEnabled,
        toggleSpotlights,
    } = useSceneStore();

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Control mode switcher */}
            <div className="absolute bottom-4 left-4 pointer-events-auto flex items-center gap-3">
                <button
                    onClick={() =>
                        setControlMode(
                            controlMode === "firstPerson"
                                ? "pointAndClick"
                                : "firstPerson"
                        )
                    }
                    className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm px-4 py-2 rounded-lg text-white flex items-center gap-2"
                >
                    <span>Control Mode:</span>
                    <span className="font-medium">
                        {controlMode === "firstPerson"
                            ? "WASD + Mouse"
                            : "Point & Click"}
                    </span>
                </button>

                {/* Mode indicator pill */}
                <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                        controlMode === "firstPerson"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-blue-500/20 text-blue-300"
                    }`}
                >
                    {controlMode === "firstPerson"
                        ? "First Person"
                        : "Point & Click"}
                </div>
            </div>

            {/* Spotlight toggle */}
            <div className="absolute bottom-4 right-4 pointer-events-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleSpotlights();
                    }}
                    className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm px-4 py-2 rounded-lg text-white flex items-center gap-2"
                >
                    <span>Spotlights:</span>
                    <span className="font-medium">
                        {spotlightsEnabled ? "ON" : "OFF"}
                    </span>
                </button>
            </div>

            {/* Performance overlay */}
            {performance.monitoring && <PerformanceOverlay />}
        </div>
    );
};
