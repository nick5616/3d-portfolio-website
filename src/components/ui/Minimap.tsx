import { useShallow } from "zustand/react/shallow";
import React, { useRef, useEffect, useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { roomColors } from "../../configs/roomColors";
import { floorIndexAt, playerFloorIndex } from "../../utils/roomFloors";

// "#rrggbb" -> rgba() with the given alpha.
const withAlpha = (hex: string, alpha: number) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

// Shorten text with an ellipsis until it fits.
const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
};

// Word-wrap into at most `maxLines` lines no wider than `maxWidth`.
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !line) line = attempt;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`, maxWidth);
    return kept;
  }
  return lines.map((l) => fitText(ctx, l, maxWidth));
};

export const Minimap: React.FC = () => {
  const { currentRoom, minimap, cameraData, playerPosition } = useSceneStore(
    useShallow((s) => ({ currentRoom: s.currentRoom, minimap: s.minimap, cameraData: s.cameraData, playerPosition: s.playerPosition }))
  );
  const { isMobile } = useDeviceDetection();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 250,
    height: 220,
  });

  // Determine responsive minimap size based on viewport width
  useEffect(() => {
    const computeSize = () => {
      const vw = window.innerWidth;
      if (vw < 360) return { width: 120, height: 100 };
      if (vw < 480) return { width: 140, height: 120 };
      if (vw < 768) return { width: 170, height: 145 };
      if (vw < 1280) return { width: 250, height: 220 };
      return { width: 290, height: 250 };
    };

    const applySize = () => setSize(computeSize());
    applySize();
    window.addEventListener("resize", applySize);
    return () => window.removeEventListener("resize", applySize);
  }, []);

  // Draw minimap: the room you're in, big, with a coloured dot on its wall
  // for every door on your floor and that door's destination written in
  // white on a dark pill just outside it. (Neighbouring rooms used to be
  // drawn as their own little shapes with names squeezed inside, which
  // didn't read.) Rooms are discrete - only one is ever mounted - so this
  // is a "you are here" schematic, not a world map.
  useEffect(() => {
    if (!minimap.visible || !canvasRef.current || !currentRoom) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw at the screen's real pixel density so text is crisp.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = size.width;
    const height = size.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const small = isMobile || width < 200;
    const font = (weight: number, px: number) => `${weight} ${px}px Manrope, system-ui, sans-serif`;
    const labelPx = small ? 9 : 11;

    const floors = currentRoom.floors;
    const multiFloor = Boolean(floors && floors.length > 1);
    const floorIndex = floors ? playerFloorIndex(floors, playerPosition[1]) : 0;
    const floor = floors?.[floorIndex];
    const onThisFloor = (y: number) => !floors || floorIndexAt(floors, y) === floorIndex;
    const [roomHalfWidth, , roomHalfDepth] = currentRoom.dimensions.map((d) => d / 2);
    const circular = Boolean(currentRoom.circular);

    // --- Header: where you are ---------------------------------------------
    const header = small ? 16 : 22;
    ctx.fillStyle = "#ffffff";
    ctx.font = font(700, small ? 10 : 12);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const title = multiFloor && floor ? `${currentRoom.name} · ${floor.label}` : currentRoom.name;
    ctx.fillText(fitText(ctx, title, width - 12), 6, header / 2 + 1);

    // --- Floor stack on the right, top floor first --------------------------
    const column = multiFloor ? (small ? 22 : 30) : 0;
    if (multiFloor && floors) {
      const pillW = column - 6;
      const pillH = small ? 12 : 16;
      const gap = 3;
      const left = width - column;
      floors
        .map((_, i) => i)
        .reverse()
        .forEach((i, row) => {
          const y = header + 4 + row * (pillH + gap);
          const active = i === floorIndex;
          ctx.fillStyle = active ? "#3ee58f" : "rgba(255, 255, 255, 0.12)";
          ctx.beginPath();
          ctx.roundRect(left, y, pillW, pillH, 4);
          ctx.fill();
          ctx.fillStyle = active ? "#06210f" : "rgba(255, 255, 255, 0.75)";
          ctx.font = font(700, small ? 8 : 10);
          ctx.textAlign = "center";
          ctx.fillText(`${i + 1}F`, left + pillW / 2, y + pillH / 2 + 0.5);
        });
      const elevation = Math.max(0, playerPosition[1] + 0.2 - floors[0].y);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = font(600, small ? 8 : 9);
      ctx.fillText(`${elevation.toFixed(1)}m`, left + pillW / 2, header + 4 + floors.length * (pillH + gap) + 6);
    }

    // --- The room ------------------------------------------------------------
    const areaLeft = 0;
    const areaRight = width - column;
    const areaTop = header;
    const areaBottom = height;
    const centerX = (areaLeft + areaRight) / 2;
    const centerY = (areaTop + areaBottom) / 2;
    // Leave a margin round the room for the door labels.
    const span = Math.min(areaRight - areaLeft, areaBottom - areaTop) * (small ? 0.62 : 0.56);
    const aspect = roomHalfDepth > 0 ? roomHalfWidth / roomHalfDepth : 1;
    const halfW = circular ? span / 2 : (span / 2) * Math.min(1, aspect);
    const halfH = circular ? span / 2 : (span / 2) * Math.min(1, 1 / aspect);
    const toMapX = (x: number) => centerX + (roomHalfWidth > 0 ? x / roomHalfWidth : 0) * halfW;
    const toMapY = (z: number) => centerY + (roomHalfDepth > 0 ? z / roomHalfDepth : 0) * halfH;
    const roomColor = roomColors[currentRoom.id] || "#8a8aa0";

    ctx.beginPath();
    if (circular) {
      ctx.arc(centerX, centerY, halfW, 0, Math.PI * 2);
      const hole = floor?.innerRadius && roomHalfWidth > 0 ? floor.innerRadius / roomHalfWidth : 0;
      if (hole > 0) {
        // A balcony: a ring around the open well below.
        ctx.moveTo(centerX + halfW * hole, centerY);
        ctx.arc(centerX, centerY, halfW * hole, 0, Math.PI * 2, true);
      }
    } else {
      ctx.rect(centerX - halfW, centerY - halfH, halfW * 2, halfH * 2);
    }
    ctx.fillStyle = withAlpha(roomColor, 0.28);
    ctx.fill("evenodd");
    ctx.strokeStyle = roomColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pools, stairs, lifts and tables on this floor
    const mapScale = roomHalfWidth > 0 ? halfW / roomHalfWidth : 0;
    currentRoom.mapFeatures?.forEach((feature) => {
      if (feature.floors && !feature.floors.includes(floorIndex)) return;
      const fx = toMapX(feature.position[0]);
      const fy = toMapY(feature.position[1]);
      const r = Math.max(3, feature.radius * mapScale);
      ctx.beginPath();
      if (feature.kind === "pool") {
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(79, 195, 230, 0.85)";
        ctx.fill();
      } else if (feature.kind === "lift") {
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 190, 240, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(fx, fy, Math.max(1.5, r * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(170, 245, 255, 0.95)";
        ctx.fill();
      } else if (feature.kind === "stair") {
        for (let t = 0; t <= 1; t += 0.05) {
          const a = t * Math.PI * 4;
          const rr = r * (0.25 + 0.75 * t);
          const px = fx + Math.cos(a) * rr;
          const py = fy + Math.sin(a) * rr;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(255, 244, 214, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.rect(fx - r, fy - r * 0.45, r * 2, r * 0.9);
        ctx.fillStyle = "rgba(255, 215, 120, 0.85)";
        ctx.fill();
      }
    });

    // --- Doors: a dot on the wall, the destination on a pill outside ----------
    const pills: { x: number; y: number; w: number; h: number }[] = [];
    currentRoom.archways.forEach((archway) => {
      const target = roomConfigs[archway.targetRoomId];
      if (!target || !onThisFloor(archway.position[1])) return;
      const nx = roomHalfWidth > 0 ? archway.position[0] / roomHalfWidth : 0;
      const nz = roomHalfDepth > 0 ? archway.position[2] / roomHalfDepth : 0;
      let ox: number;
      let oy: number;
      let dotX: number;
      let dotY: number;
      if (circular) {
        const a = Math.atan2(nz, nx);
        ox = Math.cos(a);
        oy = Math.sin(a);
        dotX = centerX + ox * halfW;
        dotY = centerY + oy * halfH;
      } else if (Math.abs(nx) > Math.abs(nz)) {
        ox = Math.sign(nx);
        oy = 0;
        dotX = centerX + ox * halfW;
        dotY = centerY + Math.max(-1, Math.min(1, nz)) * halfH;
      } else {
        ox = 0;
        oy = Math.sign(nz) || 1;
        dotX = centerX + Math.max(-1, Math.min(1, nx)) * halfW;
        dotY = centerY + oy * halfH;
      }
      const color = roomColors[target.id] || "#cfcfe0";

      // The pill, hung off the side its door faces, kept on the canvas
      ctx.font = font(700, labelPx);
      const lines = wrapText(ctx, target.name, small ? 64 : 92, 2);
      const lineH = labelPx + 2;
      const padX = 5;
      const padY = 3;
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
      const h = lines.length * lineH + padY * 2;
      const reach = small ? 7 : 10;
      let x = dotX + ox * reach;
      let y = dotY + oy * reach;
      if (ox < -0.4) x -= w;
      else if (ox <= 0.4) x -= w / 2;
      if (oy < -0.4) y -= h;
      else if (oy <= 0.4) y -= h / 2;
      x = Math.max(areaLeft + 2, Math.min(areaRight - w - 2, x));
      y = Math.max(areaTop + 2, Math.min(areaBottom - h - 2, y));
      // Nudge down past any pill already there.
      for (const p of pills) {
        if (x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y) y = p.y + p.h + 2;
      }
      pills.push({ x, y, w, h });

      // Leader from the dot to its pill
      ctx.strokeStyle = withAlpha(color, 0.9);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dotX, dotY);
      ctx.lineTo(Math.max(x, Math.min(x + w, dotX)), Math.max(y, Math.min(y + h, dotY)));
      ctx.stroke();

      ctx.fillStyle = "rgba(10, 8, 22, 0.88)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + padY + lineH * (i + 0.5)));

      // The door itself
      ctx.beginPath();
      ctx.arc(dotX, dotY, small ? 3.5 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // --- You -------------------------------------------------------------------
    // Clamped to the room, but allowed to press a little past the wall so
    // actually leaving the floor still shows.
    const normX = Math.max(-1.15, Math.min(1.15, roomHalfWidth > 0 ? playerPosition[0] / roomHalfWidth : 0));
    const normZ = Math.max(-1.15, Math.min(1.15, roomHalfDepth > 0 ? playerPosition[2] / roomHalfDepth : 0));
    const playerX = centerX + normX * halfW;
    const playerY = centerY + normZ * halfH;
    const angle = Math.atan2(cameraData.facing.z, cameraData.facing.x);
    const markerSize = small ? 6 : 8;
    const back = (5 * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(playerX + Math.cos(angle) * markerSize, playerY + Math.sin(angle) * markerSize);
    ctx.lineTo(playerX + Math.cos(angle + back) * markerSize, playerY + Math.sin(angle + back) * markerSize);
    ctx.lineTo(playerX + Math.cos(angle - back) * markerSize, playerY + Math.sin(angle - back) * markerSize);
    ctx.closePath();
    ctx.fillStyle = "#3ee58f";
    ctx.fill();
    ctx.strokeStyle = "#06210f";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [
    minimap.visible,
    currentRoom,
    size,
    isMobile,
    cameraData.facing.x,
    cameraData.facing.z,
    playerPosition,
  ]);

  if (!minimap.visible) return null;

  // On mobile, sit top-left below the FPS stats panel (top:8px, 48px tall) so they don't
  // overlap, using the same 8px edge spacing as the FPS panel. Desktop keeps its previous
  // top-right placement.
  const positionClass = isMobile
    ? "left-2 top-16"
    : "right-3 bottom-4 md:top-20 md:bottom-auto";

  return (
    <div className={`fixed ${positionClass} z-40`}>
      <div className={`gem gem--blue ${isMobile ? "p-1" : "p-2"}`}>
        <div className="gem-label text-center mb-1 hidden sm:block">Map</div>
        <canvas
          ref={canvasRef}
          className="gem-shape gem--sm"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            backgroundColor: "rgba(8, 7, 20, 0.72)",
          }}
        />
      </div>
    </div>
  );
};
