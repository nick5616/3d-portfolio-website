import React, { useRef, useEffect, useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";

export const Minimap: React.FC = () => {
    const { currentRoom, minimap, cameraData } = useSceneStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });

    // Track player position
    useEffect(() => {
        setPlayerPosition({
            x: cameraData.position.x,
            z: cameraData.position.z,
        });
    }, [cameraData.position]);

    // Draw minimap
    useEffect(() => {
        if (!minimap.visible || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size - smaller to match FPS indicator height
        const size = 120;
        canvas.width = size;
        canvas.height = size;

        // Clear canvas
        ctx.fillStyle = "rgba(40, 40, 40, 0.8)";
        ctx.fillRect(0, 0, size, size);

        // Draw room layout
        const scale = 1; // Scale factor for minimap - reduced to fit all rooms
        const centerX = size / 2;
        const centerY = size / 2;

        // Define room colors
        const roomColors: { [key: string]: string } = {
            atrium: "#4A90E2",
            gallery: "#D5A6BD",
            projects: "#7ED321",
            about: "#F5A623",
        };

        // Draw rooms at their actual positions
        Object.values(roomConfigs).forEach((room) => {
            const [roomWidth, , roomDepth] = room.dimensions;
            const [roomX, , roomZ] = room.position;

            // Convert room position to minimap coordinates
            const x = centerX + roomX / scale;
            const y = centerY + roomZ / scale;
            const w = roomWidth / scale;
            const h = roomDepth / scale;

            // Draw room background
            ctx.fillStyle =
                room.id === currentRoom?.id
                    ? roomColors[room.id] || "#666666"
                    : "rgba(128, 128, 128, 0.3)";
            ctx.fillRect(x - w / 2, y - h / 2, w, h);

            // Draw room border
            ctx.strokeStyle =
                room.id === currentRoom?.id ? "#FFFFFF" : "#666666";
            ctx.lineWidth = room.id === currentRoom?.id ? 2 : 1;
            ctx.strokeRect(x - w / 2, y - h / 2, w, h);

            // Draw room label
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "7px Arial";
            ctx.textAlign = "center";
            ctx.fillText(room.name, x, y + 1);

            // Draw doors/archways
            room.archways.forEach((archway) => {
                const archX = x + archway.position[0] / scale;
                const archY = y + archway.position[2] / scale;

                ctx.fillStyle = "#FFD700";
                ctx.fillRect(archX - 2, archY - 2, 4, 4);
            });
        });

        // Draw player position relative to current room
        if (currentRoom) {
            const [roomX, , roomZ] = currentRoom.position;
            const relativePlayerX = playerPosition.x - roomX;
            const relativePlayerZ = playerPosition.z - roomZ;

            const playerMapX = centerX + relativePlayerX / scale;
            const playerMapY = centerY + relativePlayerZ / scale;

            // Player dot
            ctx.beginPath();
            ctx.arc(playerMapX, playerMapY, 3, 0, 2 * Math.PI);
            ctx.fillStyle = "#FF0000";
            ctx.fill();

            // Player direction indicator - calculate from rotation
            // cameraData.rotation.y is the Y rotation (left/right)
            const yRotation = cameraData.rotation.y;
            const indicatorLength = 6;

            ctx.beginPath();
            ctx.moveTo(playerMapX, playerMapY);
            ctx.lineTo(
                playerMapX + Math.sin(yRotation) * indicatorLength,
                playerMapY - Math.cos(yRotation) * indicatorLength
            );
            ctx.strokeStyle = "#FF0000";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw coordinates
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`X: ${playerPosition.x.toFixed(1)}`, 5, size - 25);
        ctx.fillText(`Z: ${playerPosition.z.toFixed(1)}`, 5, size - 15);
        ctx.fillText(`Room: ${currentRoom?.name || "None"}`, 5, size - 5);
    }, [minimap.visible, currentRoom, playerPosition, cameraData.rotation.y]);

    if (!minimap.visible) return null;

    return (
        <div className="fixed top-[120px] right-[45px] z-40">
            <div className="bg-black/60 rounded-lg p-2 border border-gray-600">
                <div className="text-white text-xs mb-1 text-center">
                    Minimap
                </div>
                <canvas
                    ref={canvasRef}
                    className="rounded border border-gray-500"
                    style={{
                        maxWidth: "220px",
                        maxHeight: "220px",
                        backgroundColor: "rgba(40, 40, 40, 0.8)",
                    }}
                />
                <div className="text-white text-xs mt-1 text-center">
                    Red dot = You | Gold = Doors
                </div>
            </div>
        </div>
    );
};
