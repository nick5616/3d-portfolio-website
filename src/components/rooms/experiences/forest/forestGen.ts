// Procedural layout for the forest room. Deterministic per seed, so a
// given forest is the same every time it's generated (and cheap to rebuild).

export const FOREST_RADIUS = 46; // walkable radius
export const SPAWN_CLEARING = 7.5; // open space around the fairy stone home

export const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// Cheap smooth 2D value noise, for ground color and density variation.
const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
};
export const noise2 = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

export interface Clearing {
    x: number;
    z: number;
    r: number;
}

export interface ForestLayout {
    paths: [number, number][][]; // polylines
    clearings: Clearing[];
    trees: { x: number; z: number; height: number; radius: number; ancient: boolean }[];
    bushes: { x: number; z: number; s: number }[];
    rocks: { x: number; z: number; s: number; rot: number }[];
    mushrooms: { x: number; z: number; s: number; hue: number }[];
    rupees: { x: number; z: number }[];
    shafts: { x: number; z: number; r: number }[];
    fogBanks: { x: number; z: number; s: number }[];
}

// Distance from a point to the nearest path segment.
export const distanceToPaths = (x: number, z: number, paths: [number, number][][]) => {
    let best = Infinity;
    for (const path of paths) {
        for (let i = 1; i < path.length; i++) {
            const [ax, az] = path[i - 1];
            const [bx, bz] = path[i];
            const dx = bx - ax;
            const dz = bz - az;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
            const px = ax + dx * t - x;
            const pz = az + dz * t - z;
            best = Math.min(best, px * px + pz * pz);
        }
    }
    return Math.sqrt(best);
};

export const generateForest = (seed: number): ForestLayout => {
    const rand = mulberry32(seed);
    const range = (a: number, b: number) => a + rand() * (b - a);

    // Clearings: a few sunny glades off the paths.
    const clearings: Clearing[] = [];
    while (clearings.length < 6) {
        const angle = rand() * Math.PI * 2;
        const dist = range(14, FOREST_RADIUS - 8);
        const c = { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, r: range(4.5, 7.5) };
        if (clearings.every((o) => Math.hypot(o.x - c.x, o.z - c.z) > o.r + c.r + 8)) clearings.push(c);
    }

    // Paths: meandering trails from the spawn clearing out to each glade,
    // plus a loose loop connecting them.
    const wander = (ax: number, az: number, bx: number, bz: number) => {
        const points: [number, number][] = [];
        const steps = Math.max(8, Math.round(Math.hypot(bx - ax, bz - az) / 2.5));
        const phase = rand() * 10;
        const amp = range(1.5, 4);
        const nx = -(bz - az);
        const nz = bx - ax;
        const nl = Math.hypot(nx, nz) || 1;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const bend = Math.sin(t * Math.PI * 2 + phase) * amp * Math.sin(t * Math.PI);
            points.push([ax + (bx - ax) * t + (nx / nl) * bend, az + (bz - az) * t + (nz / nl) * bend]);
        }
        return points;
    };
    const paths: [number, number][][] = [];
    clearings.forEach((c) => {
        const angle = Math.atan2(c.z, c.x);
        paths.push(wander(Math.cos(angle) * 3, Math.sin(angle) * 3, c.x, c.z));
    });
    const ordered = [...clearings].sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
    ordered.forEach((c, i) => {
        const next = ordered[(i + 1) % ordered.length];
        if (rand() < 0.65) paths.push(wander(c.x, c.z, next.x, next.z));
    });

    const inClearing = (x: number, z: number, pad = 0) =>
        Math.hypot(x, z) < SPAWN_CLEARING + pad ||
        clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + pad);

    // Trees on a jittered grid, thinned by noise so there are thickets and
    // airier stands, never on a path or in a clearing.
    const trees: ForestLayout["trees"] = [];
    const cell = 3.1;
    for (let gx = -FOREST_RADIUS - 6; gx <= FOREST_RADIUS + 6; gx += cell) {
        for (let gz = -FOREST_RADIUS - 6; gz <= FOREST_RADIUS + 6; gz += cell) {
            const x = gx + range(-1.2, 1.2);
            const z = gz + range(-1.2, 1.2);
            const r = Math.hypot(x, z);
            if (r > FOREST_RADIUS + 6) continue;
            if (inClearing(x, z, 1.2)) continue;
            if (distanceToPaths(x, z, paths) < 2.0) continue;
            // Edge of the world: always dense, so the boundary reads as forest.
            const density = r > FOREST_RADIUS - 3 ? 1 : 0.35 + noise2(x * 0.07, z * 0.07) * 0.6;
            if (rand() > density) continue;
            const ancient = rand() < 0.04 && r < FOREST_RADIUS - 4;
            trees.push({
                x,
                z,
                ancient,
                height: ancient ? range(13, 16) : range(7, 11.5),
                radius: ancient ? range(0.9, 1.2) : range(0.22, 0.45),
            });
        }
    }

    const bushes: ForestLayout["bushes"] = [];
    const rocks: ForestLayout["rocks"] = [];
    const mushrooms: ForestLayout["mushrooms"] = [];
    trees.forEach((t) => {
        if (rand() < 0.45) {
            const a = rand() * Math.PI * 2;
            bushes.push({ x: t.x + Math.cos(a) * (t.radius + 0.7), z: t.z + Math.sin(a) * (t.radius + 0.7), s: range(0.5, 1.1) });
        }
        if (rand() < 0.22) {
            // Little rings of glowing mushrooms at the roots
            const count = 2 + Math.floor(rand() * 4);
            const hue = rand();
            for (let i = 0; i < count; i++) {
                const a = rand() * Math.PI * 2;
                const d = t.radius + range(0.15, 0.6);
                mushrooms.push({ x: t.x + Math.cos(a) * d, z: t.z + Math.sin(a) * d, s: range(0.6, 1.3), hue });
            }
        }
    });
    for (let i = 0; i < 90; i++) {
        const a = rand() * Math.PI * 2;
        const d = range(SPAWN_CLEARING, FOREST_RADIUS);
        rocks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: range(0.25, 0.9), rot: rand() * Math.PI });
    }
    // Fairy rings in every clearing
    clearings.forEach((c) => {
        const count = 10 + Math.floor(rand() * 6);
        const hue = rand();
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            mushrooms.push({ x: c.x + Math.cos(a) * c.r * 0.55, z: c.z + Math.sin(a) * c.r * 0.55, s: range(0.8, 1.4), hue });
        }
    });

    // Rupees: along paths and in clearings, the way Zelda rewards wandering.
    const rupees: ForestLayout["rupees"] = [];
    paths.forEach((path) => {
        for (let i = 2; i < path.length; i += 3 + Math.floor(rand() * 3)) {
            if (rand() < 0.55) rupees.push({ x: path[i][0] + range(-0.6, 0.6), z: path[i][1] + range(-0.6, 0.6) });
        }
    });
    clearings.forEach((c) => {
        for (let i = 0; i < 2; i++) rupees.push({ x: c.x + range(-1.5, 1.5), z: c.z + range(-1.5, 1.5) });
    });

    // Light shafts: every glade gets one, plus a few stray gaps in the canopy.
    const shafts: ForestLayout["shafts"] = clearings.map((c) => ({ x: c.x, z: c.z, r: c.r * 0.55 }));
    for (let i = 0; i < 8; i++) {
        const a = rand() * Math.PI * 2;
        const d = range(9, FOREST_RADIUS - 6);
        shafts.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: range(0.9, 1.8) });
    }

    // Fog banks pool in a few low, dense parts of the woods.
    const fogBanks: ForestLayout["fogBanks"] = [];
    for (let i = 0; i < 30; i++) {
        const a = rand() * Math.PI * 2;
        const d = range(10, FOREST_RADIUS + 2);
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (noise2(x * 0.07 + 40, z * 0.07) < 0.45) continue; // only in the "low" areas
        fogBanks.push({ x, z, s: range(7, 13) });
    }

    return { paths, clearings, trees, bushes, rocks, mushrooms, rupees, shafts, fogBanks };
};
