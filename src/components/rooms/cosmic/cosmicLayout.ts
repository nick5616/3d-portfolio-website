import { COLS, ROWS } from "./connectFour";

// The platform: a disc floating in space, the door at +Z, Nothing at -Z.
export const PLATFORM_RADIUS = 8;
export const DOOR_Z = 7.6;

// The table between you and Nothing.
export const TABLE_TOP = 0.85;
export const TABLE_SIZE: [number, number] = [3.4, 1.8]; // x, z
export const TABLE_THICKNESS = 0.12;

// Chips and the board, in metres. A chip is a disc standing on its rim;
// rows stack chip on chip, so the row pitch is exactly one diameter.
export const CHIP_RADIUS = 0.11;
export const CHIP_THICKNESS = 0.05;
export const ROW_PITCH = CHIP_RADIUS * 2;
export const COL_PITCH = 0.27;
export const DIVIDER = 0.026;
// How far a chip can shuffle sideways inside its slot.
export const SLOT_PLAY = (COL_PITCH - DIVIDER) / 2 - CHIP_RADIUS;
export const INNER_WIDTH = COLS * COL_PITCH;
export const INNER_HEIGHT = ROWS * ROW_PITCH + 0.05;
export const BORDER = 0.08;
export const PANEL_DEPTH = 0.014;
export const PANEL_Z = CHIP_THICKNESS / 2 + 0.006 + PANEL_DEPTH / 2;
export const HOLE_RADIUS = CHIP_RADIUS * 0.84;

// Board-local origin: centre of the slot floor, mid-thickness.
export const BOARD_POSITION: [number, number, number] = [0, TABLE_TOP + 0.1, 0];
export const colX = (col: number) => (col - (COLS - 1) / 2) * COL_PITCH;
export const rowY = (row: number) => CHIP_RADIUS + row * ROW_PITCH;
// Where a held chip waits above a column before it's let go.
export const HOLD_Y = INNER_HEIGHT + BORDER + CHIP_RADIUS + 0.08;

// Where Nothing is, across the table, and where its chips go back to
// between games: the empty middle of its wheels (board-local).
export const NOTHING_POSITION: [number, number, number] = [0, 0, -2.7];
export const NOTHING_RECLAIM: [number, number, number] = [0, 2.95, -2.7];

// The giant replica hangs far behind Nothing, high enough to clear its head.
export const REPLICA_SCALE = 10;
export const REPLICA_POSITION: [number, number, number] = [
    0,
    13 - (INNER_HEIGHT / 2) * REPLICA_SCALE,
    -30,
];

// The chip altar to your left.
export const ALTAR_POSITION: [number, number, number] = [-2.75, 0, 1.55];
