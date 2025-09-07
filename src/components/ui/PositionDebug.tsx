// src/components/ui/PositionDebug.tsx
import React from "react";
import { useSceneStore } from "../../stores/sceneStore";

export const PositionDebug: React.FC = () => {
    const { currentRoom, cameraData, playerPosition } = useSceneStore();

    return (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded text-sm font-mono">
            <div className="text-green-400 mb-2">🔍 POSITION DEBUG</div>
            <div>Current Room: {currentRoom?.name || "NONE"}</div>
            <div>
                Room Position:{" "}
                {currentRoom ? `[${currentRoom.position.join(", ")}]` : "N/A"}
            </div>
            <div>
                Room Dimensions:{" "}
                {currentRoom ? `[${currentRoom.dimensions.join(", ")}]` : "N/A"}
            </div>
            <div>Player Store Pos: [{playerPosition.join(", ")}]</div>
            <div>
                Camera Pos: [{cameraData.position.x.toFixed(2)},{" "}
                {cameraData.position.y.toFixed(2)},{" "}
                {cameraData.position.z.toFixed(2)}]
            </div>
            <div>
                Camera Rotation:{" "}
                {((cameraData.rotation.y * 180) / Math.PI).toFixed(0)}°
            </div>
            <div className="mt-2 text-yellow-400">
                {currentRoom ? "✅ Room Loaded" : "❌ No Room"}
            </div>
            <div className="text-yellow-400">
                Expected range: X[-10,10], Z[-10,10]
            </div>
        </div>
    );
};
