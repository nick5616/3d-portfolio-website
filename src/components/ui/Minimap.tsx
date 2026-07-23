import React, { useRef, useEffect, useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { RoomConfig } from "../../types/scene.types";
import {
  archwayDirection,
  CardinalDirection,
} from "../../utils/archwayDirection";

// Colors per room id. Rooms not listed fall back to a neutral grey.
const roomColors: { [key: string]: string } = {
  atrium: "#4A90E2",
  gallery: "#E8C468",
  projects: "#7ED321",
  about: "#F5A623",
  "gallery-hall-digitalart": "#C77DFF",
  "gallery-hall-paintings": "#FF9F7D",
  "gallery-hall-sketches": "#7DB8FF",
  "gallery-hall-lefthanded": "#FFC97D",
  "gallery-hall-miscellaneous": "#7DFFD4",
  "gallery-hall-notesappart": "#7DFF9F",
};

const DIRECTION_VECTORS: Record<CardinalDirection, { dx: number; dy: number }> =
  {
    north: { dx: 0, dy: -1 },
    south: { dx: 0, dy: 1 },
    east: { dx: 1, dy: 0 },
    west: { dx: -1, dy: 0 },
  };

export const Minimap: React.FC = () => {
  const { currentRoom, minimap, cameraData } = useSceneStore();
  const { isMobile } = useDeviceDetection();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Draw minimap: a schematic "you are here" view of the current room plus
  // whichever rooms it connects to via archways. Rooms in this game are
  // discrete (only one is ever mounted at a time - see Room.tsx), so their
  // `position` fields are just bookkeeping, not a real shared coordinate
  // space; a literal world-position projection breaks down for rooms many
  // hops away (e.g. deep in the gallery wing). Centering on the current
  // room and laying neighbors out by archway direction scales to any wing
  // size and always stays legible.
  useEffect(() => {
    if (!minimap.visible || !canvasRef.current || !currentRoom) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = size.width;
    const height = size.height;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "rgba(40, 26, 40, 0.8)";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const unit = Math.min(width, height);
    const neighborOffset = unit * 0.36;
    const centerRoomSize = unit * 0.34;
    const neighborRoomSize = unit * 0.24;
    const isCircular = (room: RoomConfig | null | undefined) =>
      room?.galleryRoomKind?.kind === "atrium";

    const drawRoomShape = (
      x: number,
      y: number,
      boxSize: number,
      color: string,
      borderColor: string,
      borderWidth: number,
      circular: boolean
    ) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      if (circular) {
        ctx.beginPath();
        ctx.arc(x, y, boxSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize);
        ctx.strokeRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize);
      }
    };

    const drawRoomLabel = (
      x: number,
      y: number,
      boxSize: number,
      name: string,
      emphasize: boolean
    ) => {
      ctx.fillStyle = emphasize ? "#1A1A1A" : "#2E2E2E";
      ctx.font = `${emphasize ? "bold " : ""}${
        isMobile ? 7 : emphasize ? 10 : 8.5
      }px Arial`;
      ctx.textAlign = "center";
      // Wrap onto a second line if the name is long relative to the box
      const words = name.split(" ");
      if (words.length > 1 && name.length > 10) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(" ");
        const line2 = words.slice(mid).join(" ");
        ctx.fillText(line1, x, y - 4);
        ctx.fillText(line2, x, y + 6);
      } else {
        ctx.fillText(name, x, y + boxSize / 2 + 12);
      }
    };

    // Group this room's archways by layout direction, spreading multiple
    // archways on the same side out along that side's perpendicular axis.
    const byDirection = new Map<
      CardinalDirection,
      { targetRoomId: string; archwayPosition: [number, number, number] }[]
    >();
    currentRoom.archways.forEach((archway) => {
      const target = roomConfigs[archway.targetRoomId];
      if (!target) return;
      const dir = archwayDirection(archway.position);
      const list = byDirection.get(dir) || [];
      list.push({
        targetRoomId: archway.targetRoomId,
        archwayPosition: archway.position,
      });
      byDirection.set(dir, list);
    });

    type NeighborLayout = {
      room: (typeof roomConfigs)[string];
      x: number;
      y: number;
      connectorX: number;
      connectorY: number;
    };
    const neighborLayouts: NeighborLayout[] = [];

    byDirection.forEach((entries, dir) => {
      const { dx, dy } = DIRECTION_VECTORS[dir];
      const spread = unit * 0.22;
      entries.forEach((entry, i) => {
        const room = roomConfigs[entry.targetRoomId];
        if (!room) return;
        // Perpendicular offset so multiple doors on the same side
        // (e.g. two archways both roughly "north") don't overlap.
        const perpOffset = (i - (entries.length - 1) / 2) * spread;
        const perpX = dy !== 0 ? perpOffset : 0;
        const perpY = dx !== 0 ? perpOffset : 0;

        const x = centerX + dx * neighborOffset + perpX;
        const y = centerY + dy * neighborOffset + perpY;
        const connectorX =
          centerX + dx * (centerRoomSize / 2 + 4) + perpX * 0.3;
        const connectorY =
          centerY + dy * (centerRoomSize / 2 + 4) + perpY * 0.3;

        neighborLayouts.push({ room, x, y, connectorX, connectorY });
      });
    });

    // Connector lines + door markers first, so room boxes render on top
    neighborLayouts.forEach(({ x, y, connectorX, connectorY }) => {
      ctx.strokeStyle = "rgba(255, 215, 0, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(connectorX, connectorY);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = "#FFD700";
      ctx.fillRect(connectorX - 2, connectorY - 2, 4, 4);
    });

    // Neighbor rooms
    neighborLayouts.forEach(({ room, x, y }) => {
      drawRoomShape(
        x,
        y,
        neighborRoomSize,
        roomColors[room.id] || "#666666",
        "#999999",
        1,
        isCircular(room)
      );
      drawRoomLabel(x, y, neighborRoomSize, room.name, false);
    });

    // Current room, centered and emphasized
    drawRoomShape(
      centerX,
      centerY,
      centerRoomSize,
      roomColors[currentRoom.id] || "#666666",
      "#FFFFFF",
      2,
      isCircular(currentRoom)
    );
    drawRoomLabel(centerX, centerY, centerRoomSize, currentRoom.name, true);

    // Player marker: triangle pointing in the direction the camera faces,
    // always drawn at the center since the map is centered on the player's room.
    const angle = Math.atan2(cameraData.facing.z, cameraData.facing.x);
    const markerSize = isMobile ? 6 : 8;
    const backAngleOffset = (5 * Math.PI) / 6; // 150 degrees from the tip on each side

    const tipX = centerX + Math.cos(angle) * markerSize;
    const tipY = centerY + Math.sin(angle) * markerSize;
    const leftX = centerX + Math.cos(angle + backAngleOffset) * markerSize;
    const leftY = centerY + Math.sin(angle + backAngleOffset) * markerSize;
    const rightX = centerX + Math.cos(angle - backAngleOffset) * markerSize;
    const rightY = centerY + Math.sin(angle - backAngleOffset) * markerSize;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = "#FF0000";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Current room name, bottom-left
    ctx.fillStyle = "#FFFF00";
    ctx.font = isMobile ? "7px monospace" : "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Room: ${currentRoom.name}`, 5, height - 5);
  }, [
    minimap.visible,
    currentRoom,
    size,
    isMobile,
    cameraData.facing.x,
    cameraData.facing.z,
  ]);

  if (!minimap.visible) return null;

  const spacingClass = isMobile ? "top-14" : "bottom-4";

  return (
    <div
      className={`fixed right-3 ${spacingClass} md:top-20 md:bottom-auto z-40`}
    >
      <div
        className={`bg-black/60 rounded-lg ${
          isMobile ? "p-0" : "p-2"
        } border border-gray-600`}
      >
        <div
          className={`text-white text-xs ${
            isMobile ? "mb-0" : "mb-1"
          } text-center hidden sm:block ${isMobile ? "text-xs" : "text-sm"}`}
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
