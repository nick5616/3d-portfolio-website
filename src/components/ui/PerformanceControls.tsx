import React, { useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";

export const PerformanceControls: React.FC = () => {
    const {
        performance,
        minimap,
        setPerformanceQuality,
        toggleStats,
        togglePerformanceMonitoring,
        toggleMinimap,
    } = useSceneStore();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute bottom-4 left-4 z-50 pointer-events-auto">
            {/* Toggle button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white transition-all hover:bg-black/30"
                aria-label="Performance Settings"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>

            {/* Controls panel */}
            {isOpen && (
                <div className="absolute bottom-12 left-0 bg-black/50 backdrop-blur-md text-white p-3 rounded-lg w-56 shadow-lg">
                    <h3 className="text-sm font-bold mb-2">
                        Performance Settings
                    </h3>

                    {/* Quality selector */}
                    <div className="mb-3">
                        <label className="text-xs mb-1 block">Quality</label>
                        <div className="grid grid-cols-3 gap-1">
                            {["low", "medium", "high"].map((quality) => (
                                <button
                                    key={quality}
                                    onClick={() =>
                                        setPerformanceQuality(
                                            quality as "low" | "medium" | "high"
                                        )
                                    }
                                    className={`text-xs py-1 px-2 rounded ${
                                        performance.quality === quality
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    {quality.charAt(0).toUpperCase() +
                                        quality.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggle options */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs">Show Stats</label>
                            <button
                                onClick={toggleStats}
                                className={`w-8 h-4 rounded-full transition-colors ${
                                    performance.showStats
                                        ? "bg-blue-500"
                                        : "bg-gray-600"
                                }`}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full bg-white transform transition-transform ${
                                        performance.showStats
                                            ? "translate-x-4"
                                            : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-xs">FPS Monitoring</label>
                            <button
                                onClick={togglePerformanceMonitoring}
                                className={`w-8 h-4 rounded-full transition-colors ${
                                    performance.monitoring
                                        ? "bg-blue-500"
                                        : "bg-gray-600"
                                }`}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full bg-white transform transition-transform ${
                                        performance.monitoring
                                            ? "translate-x-4"
                                            : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-xs">Minimap</label>
                            <button
                                onClick={toggleMinimap}
                                className={`w-8 h-4 rounded-full transition-colors ${
                                    minimap.visible
                                        ? "bg-blue-500"
                                        : "bg-gray-600"
                                }`}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full bg-white transform transition-transform ${
                                        minimap.visible
                                            ? "translate-x-4"
                                            : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                        Lower quality = better performance
                    </div>
                </div>
            )}
        </div>
    );
};
