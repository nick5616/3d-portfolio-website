// src/utils/plaqueWallLayout.ts
// Perimeter wall layout for the achievement room's plaques: fills an
// eye-level ring around all four walls first, and only climbs to rows
// above/below eye level once that ring can't fit everything.

import { CardinalDirection } from "./archwayDirection";

export interface PlaqueSlot {
    position: [number, number, number];
    rotation: [number, number, number];
}

const EYE_LEVEL = 1.6;
const ROW_STEP = 1.0; // vertical distance between stacked rows
const CORNER_MARGIN = 1.2; // keep plaques off the corners
const DOOR_CLEARANCE = 2.5; // keep plaques off a wall's doorway
const SPACING = 1.6; // center-to-center spacing along a wall
const FLOOR_CLEARANCE = 0.6; // lowest a plaque's center may sit
const CEILING_CLEARANCE = 0.8; // highest a plaque's center may sit
const MAX_ROWS = 40; // safety valve against infinite loops

const wallSlots = (
    direction: CardinalDirection,
    y: number,
    width: number,
    depth: number,
    wallThickness: number,
    hasDoor: boolean
): PlaqueSlot[] => {
    const outerZ = depth / 2 - wallThickness / 2;
    const outerX = width / 2 - wallThickness / 2;
    const along = direction === "north" || direction === "south" ? width : depth;

    const usable = along - CORNER_MARGIN * 2;
    if (usable <= 0) return [];
    const count = Math.max(1, Math.floor(usable / SPACING) + 1);
    const start = -((count - 1) * SPACING) / 2;

    const coords: number[] = [];
    for (let i = 0; i < count; i++) coords.push(start + i * SPACING);
    const filtered = hasDoor
        ? coords.filter((c) => Math.abs(c) > DOOR_CLEARANCE)
        : coords;

    return filtered.map((c) => {
        switch (direction) {
            case "north":
                return { position: [c, y, -outerZ], rotation: [0, 0, 0] };
            case "south":
                return { position: [c, y, outerZ], rotation: [0, Math.PI, 0] };
            case "west":
                return {
                    position: [-outerX, y, c],
                    rotation: [0, Math.PI / 2, 0],
                };
            case "east":
                return {
                    position: [outerX, y, c],
                    rotation: [0, -Math.PI / 2, 0],
                };
        }
    });
};

const DIRECTIONS: CardinalDirection[] = ["north", "east", "south", "west"];

// Row offsets in fill order: eye level first, then alternating up/down
// (+1, -1, +2, -2, ...) so plaques spread evenly once they spill past a
// single ring.
const rowOffset = (rowIndex: number): number => {
    if (rowIndex === 0) return 0;
    const magnitude = Math.ceil(rowIndex / 2);
    return rowIndex % 2 === 1 ? magnitude : -magnitude;
};

export const buildPlaqueLayout = (
    count: number,
    width: number,
    height: number,
    depth: number,
    wallThickness: number,
    doorWalls: Set<CardinalDirection>
): PlaqueSlot[] => {
    const slots: PlaqueSlot[] = [];
    const minY = FLOOR_CLEARANCE;
    const maxY = height - CEILING_CLEARANCE;

    for (let rowIndex = 0; slots.length < count && rowIndex < MAX_ROWS; rowIndex++) {
        const y = EYE_LEVEL + rowOffset(rowIndex) * ROW_STEP;
        if (y < minY || y > maxY) continue;

        DIRECTIONS.forEach((direction) => {
            slots.push(
                ...wallSlots(
                    direction,
                    y,
                    width,
                    depth,
                    wallThickness,
                    doorWalls.has(direction)
                )
            );
        });
    }

    return slots.slice(0, count);
};
