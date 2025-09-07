import React from "react";
import { useSceneStore } from "../../stores/sceneStore";

export const DebugInfo: React.FC = () => {
    const { currentRoom, performance, cameraData, sceneData } = useSceneStore();

    if (!performance.showStats) return null;

    return (
        <div className="fixed bottom-2 right-2 z-40 pointer-events-none">
            <div className="bg-black/80 text-white text-xs p-2 rounded font-mono">
                <div>
                    Camera: ({cameraData.position.x.toFixed(2)},{" "}
                    {cameraData.position.y.toFixed(2)},{" "}
                    {cameraData.position.z.toFixed(2)})
                </div>
                <div>
                    Rotation:{" "}
                    {((cameraData.rotation.y * 180) / Math.PI).toFixed(0)}°
                </div>
                <div>Room: {currentRoom?.name || "None"}</div>
                <div>Scene Objects: {sceneData.objectCount}</div>
                <div>Lights: {sceneData.lightCount}</div>
            </div>
        </div>
    );
};
