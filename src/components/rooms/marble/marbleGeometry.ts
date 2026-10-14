import { COLS, PieceKind, ROWS } from "./marbleStore";

// Where things are on the marble wall, and each piece's physical shape.
// Plain data (no three.js) so it can be exercised headless with Rapier.

export const CELL = 0.6;
export const BOARD_BOTTOM = 1.0; // centre of row 0
export const PLANE_Z = -6.68; // the slot the marbles roll in
export const MARBLE_RADIUS = 0.085;
export const RAMP_TILT = 0.36; // radians, about 20 degrees
export const RAMP_LENGTH = 0.68;
export const SPINNER_SPEED = 2.2; // rad/s

export const cellX = (col: number) => (col - (COLS - 1) / 2) * CELL;
export const cellY = (row: number) => BOARD_BOTTOM + row * CELL;
export const BOARD_WIDTH = COLS * CELL;
export const BOARD_TOP = cellY(ROWS - 1) + CELL / 2;
export const BOARD_LEFT = cellX(0) - CELL / 2;
export const BOARD_RIGHT = cellX(COLS - 1) + CELL / 2;
export const TRAY_Y = BOARD_BOTTOM - CELL / 2 - 0.1;

export interface BoxShape {
    kind: "box";
    half: [number, number]; // x, y half-extents in the board plane
    angle: number; // about Z
    offset: [number, number];
    restitution: number;
}
export interface BallShape {
    kind: "ball";
    radius: number;
    offset: [number, number];
    restitution: number;
}
export type Shape = BoxShape | BallShape;

// Shapes relative to the cell centre. Ramps slope down toward the side
// they're named for.
export const pieceShapes = (kind: PieceKind): Shape[] => {
    switch (kind) {
        case "rampRight":
            return [{ kind: "box", half: [RAMP_LENGTH / 2, 0.025], angle: -RAMP_TILT, offset: [0, 0], restitution: 0.15 }];
        case "rampLeft":
            return [{ kind: "box", half: [RAMP_LENGTH / 2, 0.025], angle: RAMP_TILT, offset: [0, 0], restitution: 0.15 }];
        case "bell":
            return [{ kind: "ball", radius: 0.13, offset: [0, 0], restitution: 0.55 }];
        case "bumper":
            return [{ kind: "ball", radius: 0.14, offset: [0, 0], restitution: 1.15 }];
        case "spinner":
            // Two paddles in a cross; the body itself turns.
            return [
                { kind: "box", half: [0.26, 0.025], angle: 0, offset: [0, 0], restitution: 0.3 },
                { kind: "box", half: [0.025, 0.26], angle: 0, offset: [0, 0], restitution: 0.3 },
            ];
    }
};

// The frame: side walls, the tray along the bottom (sloping to the middle)
// and a lid so nothing leaves over the top.
export const frameShapes = (): (BoxShape & { at: [number, number] })[] => [
    { kind: "box", half: [0.06, (BOARD_TOP - TRAY_Y) / 2 + 0.3], angle: 0, offset: [0, 0], restitution: 0.3, at: [BOARD_LEFT - 0.06, (BOARD_TOP + TRAY_Y) / 2] },
    { kind: "box", half: [0.06, (BOARD_TOP - TRAY_Y) / 2 + 0.3], angle: 0, offset: [0, 0], restitution: 0.3, at: [BOARD_RIGHT + 0.06, (BOARD_TOP + TRAY_Y) / 2] },
    { kind: "box", half: [BOARD_WIDTH / 4 + 0.05, 0.04], angle: 0.06, offset: [0, 0], restitution: 0.1, at: [BOARD_LEFT + BOARD_WIDTH / 4, TRAY_Y + 0.12] },
    { kind: "box", half: [BOARD_WIDTH / 4 + 0.05, 0.04], angle: -0.06, offset: [0, 0], restitution: 0.1, at: [BOARD_RIGHT - BOARD_WIDTH / 4, TRAY_Y + 0.12] },
    { kind: "box", half: [BOARD_WIDTH / 2 + 0.2, 0.05], angle: 0, offset: [0, 0], restitution: 0.1, at: [0, BOARD_TOP + 0.45] },
];
