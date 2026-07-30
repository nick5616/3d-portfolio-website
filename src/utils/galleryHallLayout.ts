// Shared frame-placement + interior-divider layout for the gallery wing's
// display halls. Every hall uses the "H" floor plan (two vertical dividers
// joined by a crossbar) to maximize how much art each room can hold.

import { CardinalDirection } from "./archwayDirection";

export interface HallFrameSlot {
    index: number;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
}

export interface HallDivider {
    id: string;
    position: [number, number, number];
    size: [number, number, number]; // boxGeometry args: width, height, depth
}

export interface HallLayout {
    frames: HallFrameSlot[];
    dividers: HallDivider[];
}

const CENTER_Y = 2.8; // consistent vertical center for all art pieces
const SMALL_SCALE: [number, number, number] = [1.0, 1.0, 1];
const LARGE_SCALE: [number, number, number] = [1.2, 1.2, 1];
const DOOR_CLEARANCE = 2.5; // keep frames this far from a wall's door-center
const CORNER_MARGIN = 2.5; // keep the outermost frame this far from the wall's corner

// Four slot offsets along a wall of the given span, scaled to that wall's own
// length so frames stay CORNER_MARGIN away from the corner on any room size
// (a fixed absolute offset like 7.5 only avoids the corner on a 20-wide wall;
// on a smaller hall like the 16x16 notes-app room it lands right on top of
// the adjacent wall's frame).
const wallSlotOffsets = (span: number): [number, number, number, number] => {
    const outer = span / 2 - CORNER_MARGIN;
    const inner = outer * 0.4;
    return [-outer, -inner, inner, outer];
};

// Frame slots hung directly on the room's own outer walls. Any wall that has
// a door on it (per doorWalls) has its two centermost slots skipped so
// artwork never overlaps a doorway.
const buildOuterWallSlots = (
    add: (
        position: [number, number, number],
        rotation: [number, number, number],
        scale: [number, number, number]
    ) => void,
    width: number,
    depth: number,
    wallThickness: number,
    doorWalls: Set<CardinalDirection>
) => {
    const outerZ = depth / 2 - wallThickness / 2;
    const outerX = width / 2 - wallThickness / 2;
    const clear = (offset: number) => Math.abs(offset) > DOOR_CLEARANCE;
    const widthSlots = wallSlotOffsets(width);
    const depthSlots = wallSlotOffsets(depth);

    // North wall (z = -outerZ)
    widthSlots
        .filter((x) => !doorWalls.has("north") || clear(x))
        .forEach((x, i) => {
            add(
                [x, CENTER_Y, -outerZ],
                [0, 0, 0],
                i % 2 === 0 ? LARGE_SCALE : SMALL_SCALE
            );
        });

    // South wall (z = outerZ)
    widthSlots
        .filter((x) => !doorWalls.has("south") || clear(x))
        .forEach((x, i) => {
            add(
                [x, CENTER_Y, outerZ],
                [0, Math.PI, 0],
                i % 2 === 1 ? LARGE_SCALE : SMALL_SCALE
            );
        });

    // West wall (x = -outerX)
    depthSlots
        .filter((z) => !doorWalls.has("west") || clear(z))
        .forEach((z, i) => {
            add(
                [-outerX, CENTER_Y, z],
                [0, Math.PI / 2, 0],
                i % 2 === 0 ? LARGE_SCALE : SMALL_SCALE
            );
        });

    // East wall (x = outerX)
    depthSlots
        .filter((z) => !doorWalls.has("east") || clear(z))
        .forEach((z, i) => {
            add(
                [outerX, CENTER_Y, z],
                [0, -Math.PI / 2, 0],
                i % 2 === 1 ? LARGE_SCALE : SMALL_SCALE
            );
        });
};

export const buildHallLayout = (
    count: number,
    width: number,
    height: number,
    depth: number,
    wallThickness: number,
    doorWalls: Set<CardinalDirection>
): HallLayout => {
    const frames: HallFrameSlot[] = [];
    const add = (
        position: [number, number, number],
        rotation: [number, number, number],
        scale: [number, number, number]
    ) => {
        if (frames.length < count) {
            frames.push({ index: frames.length, position, rotation, scale });
        }
    };

    buildOuterWallSlots(add, width, depth, wallThickness, doorWalls);

    // Interior H walls - two vertical dividers joined by a horizontal crossbar
    const leftWallX = -width / 4;
    const rightWallX = width / 4;

    add([leftWallX - wallThickness / 2, CENTER_Y, -4], [0, -Math.PI / 2, 0], LARGE_SCALE);
    add([leftWallX + wallThickness / 2, CENTER_Y, -2], [0, Math.PI / 2, 0], SMALL_SCALE);
    add([leftWallX - wallThickness / 2, CENTER_Y, 4], [0, -Math.PI / 2, 0], LARGE_SCALE);
    add([leftWallX + wallThickness / 2, CENTER_Y, 2], [0, Math.PI / 2, 0], SMALL_SCALE);

    add([rightWallX + wallThickness / 2, CENTER_Y, -4], [0, Math.PI / 2, 0], LARGE_SCALE);
    add([rightWallX - wallThickness / 2, CENTER_Y, -2], [0, -Math.PI / 2, 0], SMALL_SCALE);
    add([rightWallX + wallThickness / 2, CENTER_Y, 4], [0, Math.PI / 2, 0], LARGE_SCALE);
    add([rightWallX - wallThickness / 2, CENTER_Y, 2], [0, -Math.PI / 2, 0], SMALL_SCALE);

    add([-2.5, CENTER_Y, wallThickness / 2], [0, 0, 0], LARGE_SCALE);
    add([2.5, CENTER_Y, wallThickness / 2], [0, 0, 0], LARGE_SCALE);
    add([-2.5, CENTER_Y, -wallThickness / 2], [0, Math.PI, 0], SMALL_SCALE);
    add([2.5, CENTER_Y, -wallThickness / 2], [0, Math.PI, 0], SMALL_SCALE);

    const dividers: HallDivider[] = [
        {
            id: "left",
            position: [leftWallX, height / 2, 0],
            size: [wallThickness, height, depth * 0.6],
        },
        {
            id: "right",
            position: [rightWallX, height / 2, 0],
            size: [wallThickness, height, depth * 0.6],
        },
        {
            id: "crossbar",
            position: [0, height / 2, 0],
            size: [width / 2, height, wallThickness],
        },
    ];

    return { frames: frames.slice(0, count), dividers };
};
