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

// The chip altar to your left, the opponents' altar to your right, and the
// other visitors' tables (watch or challenge them) behind you on the right.
export const ALTAR_POSITION: [number, number, number] = [-2.75, 0, 1.55];
export const OPPONENT_ALTAR_POSITION: [number, number, number] = [2.75, 0, 1.55];
export const TABLES_POSITION: [number, number, number] = [2.6, 0, 4.4];
// Where you stand to play.
export const PLAY_SPOT: [number, number] = [0, 2.4];
// Yaw that turns something at `position` to face the play spot.
export const facePlaySpot = (position: [number, number, number]) =>
    Math.atan2(PLAY_SPOT[0] - position[0], PLAY_SPOT[1] - position[2]);

// Across the table, beside the board: small opponents stand on the table
// itself, everyone else on the floor behind it.
export const SEAT_ON_TABLE: [number, number, number] = [1.3, TABLE_TOP, -0.45];
export const SEAT_ON_FLOOR: [number, number, number] = [1.5, 0, -1.35];
