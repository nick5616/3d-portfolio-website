import * as THREE from "three";

// One source of truth for the rotunda's proportions. Angles are measured in
// the floor plane from +X toward +Z, so a point at angle a and radius r sits
// at (r cos a, r sin a) in (x, z). Doors sit at 0 / 90 / 180 / 270 degrees.

export const RADIUS = 12;
export const WALL_HEIGHT = 26; // where the dome springs
export const LEVELS = [0, 6.5, 13, 19.5] as const; // walkable floor tops
export const TOP = LEVELS.length - 1; // index of the highest floor
export const SLAB = 0.5; // balcony slab thickness
export const BALCONY_INNER = [9.3, 9.3, 9.3]; // inner edge of each balcony (L2 up)

export const POOL_RADIUS = 3;
export const POOL_RIM = 3.35;
export const BED_OUTER = 4.15; // planter ring around the pool

// Columns under each balcony, aligned between the doors. The upper tier
// stands directly on the lower one, at the balcony's edge, with the
// balustrade running between the columns - so the walkway behind them
// (9.75 m to the wall) is completely open.
export const COLUMN_COUNT = 16;
export const COLUMN_OFFSET = Math.PI / 16; // 11.25 degrees
export const COLUMN_RADIUS = [9.65, 9.65, 9.65]; // one tier under each balcony
export const BALUSTRADE_RADIUS = 9.65;
export const COLUMN_HEIGHT = LEVELS[1] - SLAB; // 6.0, same on every tier

// The spiral stair stands in the quadrant between the east and south doors
// and connects to every balcony with short bridges pointing straight out.
export const STAIR_ANGLE = Math.PI / 4;
export const STAIR_DISTANCE = 6.5;
export const STAIR_CENTER: [number, number] = [
    Math.cos(STAIR_ANGLE) * STAIR_DISTANCE,
    Math.sin(STAIR_ANGLE) * STAIR_DISTANCE,
];
export const STAIR_OUTER = 1.95;
export const STAIR_NEWEL = 0.36;
export const STEPS_PER_TURN = 20;
export const STEP_COUNT = 40 * TOP; // two turns per storey
export const RISER = LEVELS[TOP] / STEP_COUNT; // 0.1625
export const STEP_ANGLE = (Math.PI * 2) / STEPS_PER_TURN;
// Steps 39, 79 and 119 land at L2, L3 and L4, each centered on its bridge.
export const STAIR_START = STAIR_ANGLE + 0.5 * STEP_ANGLE - (STEP_COUNT / STEPS_PER_TURN) * Math.PI;
export const BRIDGE_WIDTH = 1.5;

// The fairy lift: a spiralling updraft opposite the stair, with a hovering
// landing pad on every upper floor and a bridge from each pad to the
// balcony, exactly like the stair's.
export const LIFT_ANGLE = STAIR_ANGLE + Math.PI;
export const LIFT_DISTANCE = STAIR_DISTANCE;
export const LIFT_CENTER: [number, number] = [
    Math.cos(LIFT_ANGLE) * LIFT_DISTANCE,
    Math.sin(LIFT_ANGLE) * LIFT_DISTANCE,
];
export const LIFT_PAD_RADIUS = STAIR_OUTER;

// Where the balustrades break for a bridge.
export const BRIDGE_ANGLES = [STAIR_ANGLE, LIFT_ANGLE];
// The arcs of balustrade between the bridges, at a given radius.
export const balustradeArcs = (radius: number) => {
    const gap = BRIDGE_WIDTH / 2 / radius;
    const sorted = [...BRIDGE_ANGLES].sort((a, b) => a - b);
    return sorted.map((angle, i) => {
        const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
        return { start: angle + gap, length: next - angle - 2 * gap };
    });
};

// Sunlight leans toward -X/-Z on its way up to the glass.
export const SUN_LEAN: [number, number] = [-0.22, -0.1];
export const SUN_DIRECTION = new THREE.Vector3(SUN_LEAN[0], 1, SUN_LEAN[1]).normalize();

// Upstairs doorways (0 / 90 / 180 / 270 degrees on every upper floor).
// Each one is sealed with bronze leaves until a room is wired to it in
// rooms.ts, which adds an archway with appearance "portal" at the same spot.
export const DOOR_ANGLES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
export const DOOR_HALF_WIDTH = 0.95;
export const DOOR_JAMB_HEIGHT = 2.3;
const [EAST, SOUTH, WEST, NORTH] = DOOR_ANGLES;
export const OPEN_DOORS: { level: number; angle: number; plaque: string }[] = [
    // Second floor: games
    { level: 1, angle: EAST, plaque: "COSMIC CONNECT FOUR" },
    { level: 1, angle: SOUTH, plaque: "METEOR MATH" },
    { level: 1, angle: WEST, plaque: "COURAGE'S FARMHOUSE ATTIC" },
    { level: 1, angle: NORTH, plaque: "SKY COURSE" },
    // Third floor: making things
    { level: 2, angle: EAST, plaque: "ART STUDIO" },
    { level: 2, angle: SOUTH, plaque: "JAM ROOM" },
    { level: 2, angle: WEST, plaque: "BIRD DOG STUDIO" },
    { level: 2, angle: NORTH, plaque: "MARBLE MACHINE" },
    // Fourth floor: wonder (and two doors still sealed)
    { level: 3, angle: EAST, plaque: "THE FOREST" },
    { level: 3, angle: SOUTH, plaque: "OBSERVATORY" },
];

export const DOME_GLASS = 0.95; // polar angle where the coffers stop and the glass begins

export const polar = (radius: number, angle: number): [number, number] => [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
];

// Rotation about Y that turns local +X to point outward along a floor angle
// (local +Z is then the tangent, pointing toward increasing angle).
export const radialX = (angle: number) => -angle;
// Rotation about Y that turns local +Z to face the room's center from a
// point on the wall at the given angle.
export const faceCenter = (angle: number) => -angle - Math.PI / 2;

// Smallest absolute difference between two angles.
export const angleGap = (a: number, b: number) =>
    Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// Deterministic noise so the layout (plants, ivy) is identical every visit.
export const seeded = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
};
