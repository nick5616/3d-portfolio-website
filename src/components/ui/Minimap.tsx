import React, { useRef, useEffect, useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const Minimap: React.FC = () => {
    const { currentRoom, minimap, cameraData } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });
    const [size, setSize] = useState<{ width: number; height: number }>({
        width: 240,
        height: 200,
    });

    // Determine responsive minimap size based on viewport width
    useEffect(() => {
        const computeSize = () => {
            const vw = window.innerWidth;
            if (vw < 360) return { width: 100, height: 80 };
            if (vw < 480) return { width: 120, height: 100 };
            if (vw < 768) return { width: 140, height: 120 };
            if (vw < 1280) return { width: 220, height: 200 };
            return { width: 260, height: 220 };
        };

        const applySize = () => setSize(computeSize());
        applySize();
        window.addEventListener("resize", applySize);
        return () => window.removeEventListener("resize", applySize);
    }, []);

    // Track player position from camera data
    useEffect(() => {
        // Offset camera position by 0 on x and -1.8 on y to get player position
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

        // Set canvas size responsively
        const width = size.width;
        const height = size.height;
        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.fillStyle = "rgba(40, 26, 40, 0.8)";
        ctx.fillRect(0, 0, width, height);

        // Draw room layout
        const scale = isMobile ? 0.5 : 0.25; // Scale factor for minimap
        const centerX = width / 2;
        const centerY = height / 2;

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
            ctx.font = isMobile ? "7px Arial" : "9px Arial";
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

        // Draw player position accounting for room offset
        if (currentRoom) {
            const [roomX, , roomZ] = currentRoom.position;
            // Camera position is relative to room, so add room offset for absolute position
            const absoluteX = cameraData.position.x + roomX;
            const absoluteZ = cameraData.position.z + roomZ;

            const playerMapX = centerX + absoluteX / scale;
            const playerMapY = centerY + absoluteZ / scale;

            // Player dot
            ctx.beginPath();
            ctx.arc(playerMapX, playerMapY, 3, 0, 2 * Math.PI);
            ctx.fillStyle = "#FF0000";
            ctx.fill();
        }

        // Draw coordinates
        ctx.fillStyle = "#FFFF00";
        ctx.font = isMobile ? "7px monospace" : "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`Room: ${currentRoom?.name || "None"}`, 5, height - 5);
    }, [minimap.visible, currentRoom, playerPosition, size]);

    if (!minimap.visible) return null;

    const spacingClass = isMobile ? "top-14" : "bottom-4";

    return (
        <div
            className={`fixed right-4 ${spacingClass} md:top-20 md:bottom-auto z-40`}
        >
            <div
                className={`bg-black/60 rounded-lg ${
                    isMobile ? "p-0" : "p-2"
                } border border-gray-600`}
            >
                <div
                    className={`text-white text-xs ${
                        isMobile ? "mb-0" : "mb-1"
                    } text-center hidden sm:block ${
                        isMobile ? "text-xs" : "text-sm"
                    }`}
                >
                    Minimap
                </div>
                <canvas
                    ref={canvasRef}
                    className="rounded border border-gray-500"
                    style={{
                        width: `${size.width}px`,
                        height: `${size.height}px`,
                        backgroundColor: "rgba(40, 40, 40, 0.8)",
                    }}
                />
            </div>
        </div>
    );
};
