import { useSceneStore } from "../../stores/sceneStore";
import { PerformanceOverlay } from "./PerformanceOverlay";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import VirtualControls from "./VirtualControls";

export default function Interface() {
    const {
        controlMode,
        setControlMode,
        performance,
        spotlightsEnabled,
        toggleSpotlights,
        flyMode,
        toggleFlyMode,
    } = useSceneStore();

    const { isMobile } = useDeviceDetection();

    return (
        <div
            className={`fixed inset-0 pointer-events-none ${
                isMobile
                    ? "landscape:rotate-90 landscape:w-screen landscape:h-screen landscape:origin-top-left landscape:fixed landscape:top-0 landscape:left-0"
                    : ""
            }`}
        >
            {/* Left controls group */}
            <div
                className={`absolute bottom-4 left-4 pointer-events-auto flex flex-col gap-2 ${
                    isMobile
                        ? "landscape:bottom-auto landscape:left-auto landscape:top-4 landscape:right-4"
                        : ""
                }`}
            >
                {/* Control mode switcher */}
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
                    <span>Mode:</span>
                    <span className="font-medium">
                        {controlMode === "firstPerson"
                            ? "WASD + Mouse"
                            : "Point & Click"}
                    </span>
                </button>

                {/* Fly mode toggle (only in first person) */}
                {controlMode === "firstPerson" && (
                    <button
                        onClick={toggleFlyMode}
                        className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm px-4 py-2 rounded-lg text-white flex items-center gap-2"
                    >
                        <span>Movement:</span>
                        <span className="font-medium">
                            {flyMode ? "Flying" : "Walking"}
                        </span>
                    </button>
                )}
            </div>

            {/* Right controls */}
            <div
                className={`absolute bottom-4 right-4 pointer-events-auto ${
                    isMobile
                        ? "landscape:bottom-auto landscape:right-auto landscape:top-4 landscape:left-4"
                        : ""
                }`}
            >
                <button
                    onClick={toggleSpotlights}
                    className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm px-4 py-2 rounded-lg text-white flex items-center gap-2"
                >
                    <span>Spotlights:</span>
                    <span className="font-medium">
                        {spotlightsEnabled ? "ON" : "OFF"}
                    </span>
                </button>
            </div>

            {/* Mode indicator pill */}
            <div
                className={`absolute top-4 left-4 ${
                    isMobile
                        ? "landscape:top-auto landscape:left-auto landscape:bottom-4 landscape:right-4"
                        : ""
                }`}
            >
                <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                        controlMode === "firstPerson"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-blue-500/20 text-blue-300"
                    }`}
                >
                    {controlMode === "firstPerson"
                        ? `${flyMode ? "Flying" : "Walking"} Mode`
                        : "Point & Click"}
                </div>
            </div>

            {/* Controls help */}
            <div
                className={`absolute top-4 right-4 text-right text-white/50 text-sm ${
                    isMobile
                        ? "landscape:top-auto landscape:right-auto landscape:bottom-4 landscape:left-4 landscape:hidden"
                        : ""
                }`}
            >
                {controlMode === "firstPerson" && (
                    <div className="space-y-1">
                        <p>WASD - Move</p>
                        <p>Shift - Sprint</p>
                        {flyMode && (
                            <>
                                <p>Space - Fly Up</p>
                                <p>C - Fly Down</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Virtual controls for mobile */}
            {isMobile && controlMode === "firstPerson" && <VirtualControls />}

            {/* Performance overlay */}
            {performance.monitoring && <PerformanceOverlay />}
        </div>
    );
}
