import React, { useMemo } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomEnvironmentReady } from "../core/RoomEnvironmentReady";
import { RoomRupeeSpawner } from "../models/RoomRupeeSpawner";
import { getAtriumMaterials } from "./atrium/atriumMaterials";
import { AtriumAtmosphere } from "./atrium/AtriumAtmosphere";
import { RotundaShell } from "./atrium/RotundaShell";
import { GlassDome } from "./atrium/GlassDome";
import { SpiralStair } from "./atrium/SpiralStair";
import { ReflectingPool } from "./atrium/ReflectingPool";
import { AtriumGarden, URN_SPOTS } from "./atrium/AtriumGarden";
import { FairyLift } from "./atrium/FairyLift";
import { DiscoBall } from "./atrium/DiscoBall";
import {
    BALCONY_INNER,
    COLUMN_COUNT,
    COLUMN_OFFSET,
    COLUMN_RADIUS,
    LEVELS,
    LIFT_CENTER,
    LIFT_PAD_RADIUS,
    RADIUS,
    STAIR_CENTER,
    STAIR_OUTER,
    polar,
} from "./atrium/atriumLayout";

interface AtriumRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

// The hub. Original brief (rooms.ts): "greek pillars, fascinating and
// inspiring rays of light, a major ethereal vibe... lush, deep greens of
// plant life, and the intense blue of pristine waters, with light shining
// through." So: a three-tier marble rotunda under a great glass dome, sun
// falling through dusty air onto a reflecting pool and fountain, columns
// carrying three balconies hung with ivy, a spiral stair and a fairy lift
// climbing to the upper floors, and a door to a different world on every side.
//
// The room builds its own walls, floors and lights (it bypasses BaseRoom),
// and almost everything repeated is instanced or merged, so the whole
// rotunda stays around a hundred draw calls.

const columnSpots = COLUMN_RADIUS.flatMap((radius, tier) =>
    Array.from({ length: COLUMN_COUNT }, (_, k) => ({
        tier,
        position: polar(radius, COLUMN_OFFSET + (k / COLUMN_COUNT) * Math.PI * 2),
    }))
);
const urnSpots = URN_SPOTS.map(({ angle, level, radius }) => ({ level, position: polar(radius, angle) }));

const clearOf = (x: number, z: number, level: number) => {
    const near = ([px, pz]: [number, number], distance: number) => Math.hypot(x - px, z - pz) < distance;
    if (level === 0 && near(STAIR_CENTER, STAIR_OUTER + 0.6)) return false;
    if (near(LIFT_CENTER, LIFT_PAD_RADIUS + 0.6)) return false;
    if (columnSpots.some((c) => c.tier === level && near(c.position, 0.8))) return false;
    if (urnSpots.some((u) => u.level === level && near(u.position, 0.9))) return false;
    return true;
};

// The first rupee waits upstairs as a reward for the climb; the rest are
// scattered around the ground floor.
const pickRupeeSpot = (index: number, rand: () => number): [number, number, number] => {
    const level = index === 0 ? 1 + Math.floor(rand() * (LEVELS.length - 1)) : 0;
    const [minR, maxR] = level === 0 ? [4.7, RADIUS - 0.8] : [BALCONY_INNER[level - 1] + 0.9, RADIUS - 0.5];
    for (let attempt = 0; attempt < 40; attempt++) {
        const r = minR + rand() * (maxR - minR);
        const [x, z] = polar(r, rand() * Math.PI * 2);
        if (clearOf(x, z, level)) return [x, LEVELS[level] + 0.5, z];
    }
    return [0, 0.5, 7];
};

export const AtriumRoom: React.FC<AtriumRoomProps> = ({ config }) => {
    const materials = useMemo(() => getAtriumMaterials(), []);

    return (
        <>
            <RoomEnvironmentReady />
            <AtriumAtmosphere />
            <RotundaShell materials={materials} />
            <GlassDome materials={materials} />
            <SpiralStair materials={materials} />
            <FairyLift materials={materials} />
            <DiscoBall />
            <ReflectingPool materials={materials} />
            <AtriumGarden materials={materials} />
            <RoomRupeeSpawner
                key={`rupee-spawner-${config.id}`}
                roomId={config.id}
                dimensions={config.dimensions}
                position={config.position}
                numRupees={3}
                rupeeScale={0.3}
                pickPosition={pickRupeeSpot}
            />
        </>
    );
};
