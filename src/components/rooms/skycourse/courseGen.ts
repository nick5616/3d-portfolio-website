// Procedural Sky Courses. Course N is grown from seed N, so "Course 3" is
// the same for everyone, and each one is a little harder than the last.
// Pure data (no three.js) so the generator can be checked headless.
//
// The course runs toward -Z from the start island at the origin. A cursor
// tracks the far edge of the last piece you can stand on; each segment
// places its pieces a jumpable gap beyond it. The jump limits come from the
// player's physics: a 4 m/s jump hangs ~0.8 s and rises ~0.8 m, so a
// walking jump clears ~3 m on the flat and ~2 m when climbing 0.5 m.

export type IslandKind = "island" | "stone" | "beam" | "checkpoint" | "goal";

export interface Island {
    kind: IslandKind;
    top: number;
    at: [number, number]; // x, z centre
    size: [number, number]; // width (x), depth (z)
}
export interface Shuttle {
    top: number;
    at: [number, number];
    size: number;
    amplitude: number;
    period: number;
    axis: "x" | "y"; // "y" is a lift that rides up to a ledge
}
export interface Spinner {
    top: number;
    at: [number, number];
    length: number;
    width: number;
    speed: number;
}
export interface Mushroom {
    at: [number, number, number]; // x, top, z
    launch: { x: number; y: number; z: number };
}
export interface Checkpoint {
    at: [number, number, number]; // respawn point (body origin)
    flag: [number, number, number];
}
export interface Course {
    level: number;
    islands: Island[];
    shuttles: Shuttle[];
    spinners: Spinner[];
    mushrooms: Mushroom[];
    checkpoints: Checkpoint[]; // [0] is the start
    goal: Island;
    par: number; // seconds
    segments: string[];
}

export const START_LINE_Z = -3.5;
export const GOAL_DEPTH = 5;
export const GOAL_WIDTH = 7.4;

const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const generateCourse = (level: number): Course => {
    const rand = mulberry32(level * 7919 + 17);
    const range = (lo: number, hi: number) => lo + rand() * (hi - lo);
    const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
    const hard = Math.min(level - 1, 6) / 6; // 0 on course 1 .. 1 from course 7

    const course: Course = {
        level,
        islands: [],
        shuttles: [],
        spinners: [],
        mushrooms: [],
        checkpoints: [],
        goal: { kind: "goal", top: 0, at: [0, 0], size: [GOAL_WIDTH, GOAL_DEPTH] },
        par: 0,
        segments: [],
    };

    // Start island: the door behind you, the start arch at its far edge.
    course.islands.push({ kind: "island", top: 0, at: [0, 1], size: [9, 10] });
    course.checkpoints.push({ at: [0, 1.5, -1.5], flag: [3.6, 0, -3.2] });
    const cursor = { x: 0, z: -4, top: 0, width: 9 };

    // Place an island `gap` beyond the cursor (rising by `rise`), drifting
    // sideways but always overlapping the last piece enough to jump straight.
    const step = (kind: IslandKind, size: [number, number], gap: number, rise: number, drift = 0) => {
        const maxDrift = Math.max(0, (cursor.width + size[0]) / 2 - 0.9);
        const x = cursor.x + Math.max(-maxDrift, Math.min(maxDrift, drift));
        const near = cursor.z - gap;
        const island: Island = { kind, top: cursor.top + rise, at: [x, near - size[1] / 2], size };
        course.islands.push(island);
        cursor.x = x;
        cursor.z = near - size[1];
        cursor.top = island.top;
        cursor.width = size[0];
        return island;
    };
    const flatGap = () => range(1.0, 1.4 + hard * 1.0); // up to 2.4 m
    const climbGap = () => range(0.8, 1.1 + hard * 0.5); // up to 1.6 m with +0.5 m

    const segments = {
        stones: () => {
            const count = 3 + Math.floor(rand() * 2);
            for (let i = 0; i < count; i++) {
                const s = range(2.4 - hard * 0.8, 2.6 - hard * 0.6);
                const climbing = rand() < 0.6;
                step("stone", [s, s], climbing ? climbGap() : flatGap(), climbing ? range(0.3, 0.5) : -range(0, 0.3), range(-1.6, 1.6));
            }
        },
        shuttle: () => {
            const size = 2.6;
            const near = cursor.z - range(0.8, 1.0);
            course.shuttles.push({
                top: cursor.top,
                at: [cursor.x, near - size / 2],
                size,
                amplitude: range(2, 2.4 + hard),
                period: range(4.2 - hard * 1.2, 4.6 - hard),
                axis: "x",
            });
            cursor.z = near - size;
            cursor.width = size;
            step("island", [3, 3], range(1.0, 1.3), 0);
        },
        beam: () => {
            const width = 0.95 - hard * 0.3;
            step("beam", [width, range(5, 7 + hard * 2)], 0.5, 0.2);
            cursor.width = 2.2; // landing off a beam is forgiving in x
            step("island", [3, 3], 0.6, 0);
        },
        spinner: () => {
            const length = 7.5;
            const top = cursor.top + 0.2;
            const centreZ = cursor.z - 0.75 - length / 2;
            course.spinners.push({ top, at: [cursor.x, centreZ], length, width: 1.3 - hard * 0.2, speed: 0.45 + hard * 0.35 });
            cursor.z = centreZ - length / 2;
            cursor.top = top;
            cursor.width = 3;
            step("island", [4, 4], 1.25, 0);
        },
        lift: () => {
            // A platform rides up and down; jump off at the top onto a ledge.
            const size = 2.4;
            const rise = 3;
            const near = cursor.z - range(0.7, 0.9);
            course.shuttles.push({ top: cursor.top, at: [cursor.x, near - size / 2], size, amplitude: rise, period: 6 - hard * 1.5, axis: "y" });
            cursor.z = near - size;
            cursor.width = size;
            step("island", [3.4, 3], range(0.8, 1.0), rise);
        },
        bounce: () => {
            // A mushroom flings you up onto a high ledge (numbers from the
            // jump arc: v = (0, 11, -3.6) lands ~5.6 m on and 5.2 m up).
            const pad = step("island", [4, 4], climbGap(), 0.4);
            const mz = pad.at[1] - 1.1;
            course.mushrooms.push({ at: [pad.at[0], pad.top, mz], launch: { x: 0, y: 11, z: -3.6 } });
            cursor.z = mz;
            cursor.width = 4;
            step("island", [4, 3.4], 2.9, 5.2);
        },
    };
    type SegmentName = keyof typeof segments;

    const checkpoint = () => {
        const island = step("checkpoint", [4.5, 4.5], range(1.0, 1.3), 0);
        course.checkpoints.push({
            at: [island.at[0], island.top + 1.5, island.at[1] + 1],
            flag: [island.at[0] + 1.9, island.top, island.at[1] + 1.9],
        });
    };

    const pool: SegmentName[] = level === 1 ? ["stones", "shuttle", "beam", "lift"] : ["stones", "shuttle", "beam", "spinner", "lift", "bounce"];
    const count = 4 + Math.min(level, 6);
    let previous: SegmentName | null = null;
    for (let i = 0; i < count; i++) {
        let name: SegmentName = i === 0 ? "stones" : pick(pool);
        if (name === previous) name = pick(pool);
        if (level === 1 && i === count - 2) name = "bounce"; // everybody gets one boing
        course.segments.push(name);
        segments[name]();
        previous = name;
        if (i % 2 === 1 && i < count - 1) checkpoint();
    }

    // The goal deck: wide enough for the bell and the three exit portals.
    course.goal = step("goal", [GOAL_WIDTH, GOAL_DEPTH], 1.2, 0);
    course.par = Math.round(8 + course.segments.length * 5.5);
    return course;
};
