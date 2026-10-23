import React, { useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { getLightPoolMaterial } from "../../models/artFrameParts";
import { AtriumMaterials } from "./atriumMaterials";
import {
    BALCONY_INNER,
    BALUSTRADE_RADIUS,
    COLUMN_COUNT,
    COLUMN_HEIGHT,
    COLUMN_OFFSET,
    COLUMN_RADIUS,
    DOOR_ANGLES,
    DOOR_HALF_WIDTH,
    DOOR_JAMB_HEIGHT,
    LEVELS,
    OPEN_DOORS,
    RADIUS,
    SLAB,
    TOP,
    balustradeArcs,
    WALL_HEIGHT,
    faceCenter,
    polar,
    radialX,
} from "./atriumLayout";
import { getBalusterGeometry, makeInstanced, mergeGeometries, place } from "./atriumParts";

// Everything structural: floors, the three wall tiers, both balconies
// (coffered soffits, dentilled fascias, balustrades), the two colonnades,
// sconces, and the doors upstairs - sealed until a room is wired to them.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TAU = Math.PI * 2;
const SCONCE_ANGLES = Array.from({ length: 8 }, (_, i) => Math.PI / 8 + (i * Math.PI) / 4);
const RAIL_HEIGHT = 0.95;

// A torus lying in the floor plane, covering floor angles [start, start+arc].
const ringArc = (radius: number, tube: number, start: number, arc: number, y: number) => {
    const ring = new THREE.TorusGeometry(radius, tube, 8, Math.max(16, Math.ceil(arc * radius * 4)), arc);
    ring.rotateX(Math.PI / 2);
    ring.rotateY(-start);
    ring.translate(0, y, 0);
    return ring;
};

const openCylinder = (radiusTop: number, radiusBottom: number, height: number, y: number) => {
    const cylinder = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 128, 1, true);
    cylinder.translate(0, y + height / 2, 0);
    return cylinder;
};

const flatRing = (inner: number, outer: number, y: number, facingDown = false) => {
    const ring = new THREE.RingGeometry(inner, outer, 128, 1);
    ring.rotateX(facingDown ? Math.PI / 2 : -Math.PI / 2);
    ring.translate(0, y, 0);
    return ring;
};

// One classical column, base at y = 0, split by material.
const columnParts = () => {
    const shaft = new THREE.CylinderGeometry(0.27, 0.31, 5.0, 20, 1, true);
    shaft.translate(0, 0.45 + 2.5, 0);

    const plinth = new THREE.BoxGeometry(0.82, 0.2, 0.82);
    plinth.translate(0, 0.1, 0);
    const torus = new THREE.TorusGeometry(0.33, 0.075, 8, 24);
    torus.rotateX(Math.PI / 2);
    torus.translate(0, 0.28, 0);
    const scotia = new THREE.CylinderGeometry(0.31, 0.37, 0.1, 24);
    scotia.translate(0, 0.4, 0);
    const echinus = new THREE.CylinderGeometry(0.46, 0.29, 0.3, 24);
    echinus.translate(0, 5.6, 0);
    const abacus = new THREE.BoxGeometry(0.98, 0.25, 0.98);
    abacus.translate(0, COLUMN_HEIGHT - 0.125, 0);
    const marble = mergeGeometries([plinth, torus, scotia, echinus, abacus])!;

    const astragal = new THREE.TorusGeometry(0.285, 0.035, 8, 24);
    astragal.rotateX(Math.PI / 2);
    astragal.translate(0, 5.45, 0);
    const foot = new THREE.TorusGeometry(0.315, 0.025, 8, 24);
    foot.rotateX(Math.PI / 2);
    foot.translate(0, 0.46, 0);
    const brass = mergeGeometries([astragal, foot])!;

    [plinth, torus, scotia, echinus, abacus, astragal, foot].forEach((g) => g.dispose());
    return { shaft, marble, brass };
};

// A moulding profile swept round a doorway: up the left jamb, over the
// arch, down the right. `profile` is [out, z] pairs from the opening
// outward (out = metres beyond the opening's edge, z toward the viewer);
// repeat a point to make a sharp edge there.
const sweptMoulding = (half: number, jamb: number, profile: [number, number][], arcSteps = 40) => {
    const path: { x: number; y: number; nx: number; ny: number }[] = [
        { x: -half, y: 0, nx: -1, ny: 0 },
        { x: -half, y: jamb, nx: -1, ny: 0 },
    ];
    for (let i = 1; i < arcSteps; i++) {
        const t = Math.PI - (i / arcSteps) * Math.PI;
        path.push({ x: Math.cos(t) * half, y: jamb + Math.sin(t) * half, nx: Math.cos(t), ny: Math.sin(t) });
    }
    path.push({ x: half, y: jamb, nx: 1, ny: 0 }, { x: half, y: 0, nx: 1, ny: 0 });
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let along = 0;
    path.forEach((p, i) => {
        if (i > 0) along += Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y);
        profile.forEach(([out, z], j) => {
            positions.push(p.x + p.nx * out, p.y + p.ny * out, z);
            uvs.push(along, j / (profile.length - 1));
        });
    });
    const n = profile.length;
    for (let i = 0; i < path.length - 1; i++) {
        for (let j = 0; j < n - 1; j++) {
            const a = i * n + j;
            const b = (i + 1) * n + j;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
};

// A classical architrave: a reveal, two stepped fascias, a band, and a
// cyma curving back to the wall. The brass bead sits between fascia and band.
const ARCHITRAVE: [number, number][] = [
    [0, -0.05], [0, 0.08],
    [0, 0.08], [0.025, 0.105],
    [0.025, 0.105], [0.1, 0.105],
    [0.1, 0.105], [0.1, 0.13],
    [0.1, 0.13], [0.24, 0.13],
    [0.24, 0.13], [0.24, 0.16],
    [0.24, 0.16], [0.3, 0.16],
    [0.31, 0.155], [0.325, 0.13], [0.34, 0.09], [0.36, 0.05], [0.38, 0.03],
    [0.38, 0.03], [0.38, -0.05],
];
const BEAD: [number, number][] = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI - (i / 8) * Math.PI;
    return [0.215 + Math.cos(a) * 0.026, 0.13 + Math.sin(a) * 0.026];
});

// A sealed arched door, built facing local +Z, threshold at y = 0.
const sealedDoorParts = () => {
    const half = DOOR_HALF_WIDTH;
    const jambHeight = DOOR_JAMB_HEIGHT;
    const top = jambHeight + half;
    const frame: THREE.BufferGeometry[] = [sweptMoulding(half, jambHeight, ARCHITRAVE)];
    [-1, 1].forEach((side) => {
        const plinth = new THREE.BoxGeometry(0.42, 0.34, 0.25);
        plinth.translate(side * (half + 0.2), 0.17, 0.075);
        frame.push(plinth);
    });
    // A keystone that widens as it rises, proud of the moulding
    const keystone = new THREE.BoxGeometry(0.24, 0.44, 0.26);
    const kp = keystone.attributes.position;
    for (let i = 0; i < kp.count; i++) if (kp.getY(i) > 0) kp.setX(i, kp.getX(i) * 1.35);
    keystone.computeVertexNormals();
    keystone.translate(0, top + 0.22, 0.07);
    const threshold = new THREE.BoxGeometry(2.5, 0.06, 0.45);
    threshold.translate(0, 0.03, 0.15);
    const bed = new THREE.BoxGeometry(2.7, 0.06, 0.24);
    bed.translate(0, top + 0.45, 0.06);
    const crown = new THREE.BoxGeometry(3.0, 0.1, 0.32);
    crown.translate(0, top + 0.52, 0.08);
    frame.push(keystone, threshold, bed, crown);
    const frameBrass = sweptMoulding(half, jambHeight, BEAD);

    const leaf = new THREE.BoxGeometry(half * 2, jambHeight, 0.08);
    leaf.translate(0, jambHeight / 2, -0.02);
    const lunette = new THREE.CylinderGeometry(half, half, 0.08, 24, 1, false, Math.PI / 2, Math.PI);
    lunette.rotateX(Math.PI / 2);
    lunette.translate(0, jambHeight, -0.02);
    const bronze = [leaf, lunette];

    const trim: THREE.BufferGeometry[] = [];
    const seam = new THREE.BoxGeometry(0.03, jambHeight + half - 0.1, 0.03);
    seam.translate(0, (jambHeight + half - 0.1) / 2, 0.03);
    trim.push(seam);
    [-1, 1].forEach((side) => {
        const panel = new THREE.BoxGeometry(0.62, 1.5, 0.02);
        panel.translate(side * 0.47, 1.25, 0.03);
        trim.push(panel);
        const pull = new THREE.TorusGeometry(0.07, 0.014, 6, 16);
        pull.translate(side * 0.12, 1.15, 0.07);
        trim.push(pull);
    });

    const glow = new THREE.PlaneGeometry(half * 2 - 0.1, 0.05);
    glow.translate(0, 0.085, 0.031);

    const merge = (parts: THREE.BufferGeometry[]) => {
        const merged = mergeGeometries(parts)!;
        parts.forEach((p) => p.dispose());
        return merged;
    };
    return {
        frame: merge(frame),
        frameBrass,
        bronze: merge(bronze),
        trim: merge(trim),
        glow,
        plaqueY: jambHeight + half + 0.68,
    };
};

// Copies `local` to each placement and merges the copies.
const replicate = (local: THREE.BufferGeometry, matrices: THREE.Matrix4[]) => {
    const copies = matrices.map((m) => local.clone().applyMatrix4(m));
    const merged = mergeGeometries(copies)!;
    copies.forEach((c) => c.dispose());
    return merged;
};

export const RotundaShell: React.FC<{ materials: AtriumMaterials }> = ({ materials }) => {
    const shell = useMemo(() => {
        const owned: THREE.BufferGeometry[] = [];
        const own = (g: THREE.BufferGeometry) => {
            owned.push(g);
            return g;
        };
        const mergeOwn = (parts: THREE.BufferGeometry[]) => {
            const merged = own(mergeGeometries(parts)!);
            parts.forEach((p) => p.dispose());
            return merged;
        };
        const instanced: THREE.InstancedMesh[] = [];
        const inst = (g: THREE.BufferGeometry, m: THREE.Material, matrices: THREE.Matrix4[]) => {
            const mesh = makeInstanced(g, m, matrices);
            instanced.push(mesh);
            return mesh;
        };

        // --- Floors -------------------------------------------------------
        const floor = own(new THREE.CircleGeometry(RADIUS, 128));
        floor.rotateX(-Math.PI / 2);
        floor.translate(0, 0.002, 0);
        const ambulatory = own(flatRing(COLUMN_RADIUS[0] + 0.42, RADIUS, 0.004));
        const kintsugiBand = own(flatRing(5.0, 5.7, 0.004));
        const inlayParts: THREE.BufferGeometry[] = [
            ringArc(5.0, 0.03, 0, TAU, 0.0),
            ringArc(5.7, 0.03, 0, TAU, 0.0),
            ringArc(COLUMN_RADIUS[0] + 0.42, 0.035, 0, TAU, 0.0),
        ];
        inlayParts.forEach((g) => g.scale(1, 0.25, 1));
        for (let i = 0; i < 16; i++) {
            const ray = new THREE.PlaneGeometry(3.9, i % 2 ? 0.025 : 0.05);
            ray.rotateX(-Math.PI / 2);
            ray.translate(5.7 + 3.9 / 2 + 0.05, 0.006, 0);
            ray.rotateY(radialX((i / 16) * TAU));
            inlayParts.push(ray);
        }
        const floorBrass = mergeOwn(inlayParts);

        // --- Walls --------------------------------------------------------
        // One band per storey; the top one runs on up to the dome.
        const wallBands = LEVELS.map((level, i) =>
            own(openCylinder(RADIUS, RADIUS, (i < TOP ? LEVELS[i + 1] : WALL_HEIGHT) - level, level))
        );
        const trimParts: THREE.BufferGeometry[] = [];
        LEVELS.forEach((level) => {
            trimParts.push(openCylinder(RADIUS - 0.03, RADIUS - 0.03, 0.32, level)); // skirting
            trimParts.push(openCylinder(RADIUS - 0.02, RADIUS - 0.02, 0.07, level + 1.05)); // dado rail
        });
        // Coves where each tier meets the slab above, and the big drum cornice
        LEVELS.slice(1).map((level) => level - SLAB).forEach((y) =>
            trimParts.push(openCylinder(RADIUS - 0.28, RADIUS - 0.02, 0.28, y - 0.28))
        );
        trimParts.push(openCylinder(RADIUS - 0.7, RADIUS - 0.02, 0.7, WALL_HEIGHT - 0.7));
        trimParts.push(ringArc(RADIUS - 0.72, 0.09, 0, TAU, WALL_HEIGHT - 0.02));
        trimParts.push(ringArc(RADIUS - 0.06, 0.08, 0, TAU, WALL_HEIGHT - 0.95));

        // --- Balconies ----------------------------------------------------
        const balconyFloors: THREE.BufferGeometry[] = [];
        const soffits: THREE.BufferGeometry[] = [];
        const brassParts: THREE.BufferGeometry[] = [];
        const dentilMatrices: THREE.Matrix4[] = [];
        const balusterMatrices: THREE.Matrix4[] = [];
        BALCONY_INNER.forEach((inner, i) => {
            const level = LEVELS[i + 1];
            balconyFloors.push(flatRing(inner, RADIUS, level + 0.003));
            soffits.push(flatRing(inner, RADIUS, level - SLAB, true));
            trimParts.push(openCylinder(inner, inner, SLAB, level - SLAB)); // fascia
            trimParts.push(ringArc(inner, 0.06, 0, TAU, level - SLAB)); // bead under the fascia
            trimParts.push(ringArc(inner, 0.04, 0, TAU, level - 0.02)); // nosing on top
            brassParts.push(ringArc(inner - 0.005, 0.028, 0, TAU, level - 0.3));
            const dentils = Math.floor((TAU * inner) / 0.26);
            for (let k = 0; k < dentils; k++) {
                const a = (k / dentils) * TAU;
                const [x, z] = polar(inner - 0.04, a);
                dentilMatrices.push(place(x, level - SLAB + 0.11, z, radialX(a)));
            }
            // Balustrade broken where the stair's and the lift's bridges land.
            // Where the next tier of columns stands on this balcony, it runs
            // between them, so no baluster inside one.
            const rb = BALUSTRADE_RADIUS;
            const hasColumns = i + 1 < COLUMN_RADIUS.length;
            balustradeArcs(rb).forEach(({ start, length }) => {
                trimParts.push(ringArc(rb, 0.085, start, length, level + 0.07));
                trimParts.push(ringArc(rb, 0.075, start, length, level + RAIL_HEIGHT + 0.04));
                const count = Math.floor((length * rb) / 0.3);
                for (let k = 0; k <= count; k++) {
                    const a = start + (length * k) / count;
                    const nearColumn = (a - COLUMN_OFFSET) * COLUMN_COUNT / TAU;
                    if (hasColumns && Math.abs(nearColumn - Math.round(nearColumn)) * (TAU / COLUMN_COUNT) * rb < 0.42) {
                        continue;
                    }
                    const [x, z] = polar(rb, a);
                    balusterMatrices.push(place(x, level + 0.1, z, 0, [1, RAIL_HEIGHT - 0.1, 1]));
                }
            });
        });
        const dentilGeometry = own(new THREE.BoxGeometry(0.09, 0.1, 0.12));

        // --- Colonnades ---------------------------------------------------
        const column = columnParts();
        owned.push(column.shaft, column.marble, column.brass);
        const columnMatrices: THREE.Matrix4[] = [];
        COLUMN_RADIUS.forEach((radius, tier) => {
            for (let k = 0; k < COLUMN_COUNT; k++) {
                const a = COLUMN_OFFSET + (k / COLUMN_COUNT) * TAU;
                const [x, z] = polar(radius, a);
                columnMatrices.push(place(x, LEVELS[tier], z, radialX(a)));
            }
        });

        // --- Sconces (8 per tier, between the doors) -----------------------
        const sconceMatrices: THREE.Matrix4[] = [];
        LEVELS.forEach((level) =>
            SCONCE_ANGLES.forEach((a) => {
                const [x, z] = polar(RADIUS - 0.02, a);
                sconceMatrices.push(place(x, level + 3.3, z, faceCenter(a)));
            })
        );
        const plate = new THREE.BoxGeometry(0.18, 0.42, 0.04);
        plate.translate(0, 0, 0.02);
        const arm = new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6);
        arm.rotateX(Math.PI / 2);
        arm.translate(0, -0.04, 0.12);
        const cup = new THREE.CylinderGeometry(0.1, 0.05, 0.12, 12, 1, true);
        cup.translate(0, 0.02, 0.22);
        const sconceBody = mergeOwn([plate, arm, cup]);
        const bulb = own(new THREE.SphereGeometry(0.065, 12, 8));
        bulb.translate(0, 0.11, 0.22);
        const pool = own(new THREE.PlaneGeometry(1.9, 2.5));
        pool.translate(0, 0.35, 0.012);

        // --- Doors upstairs ----------------------------------------------
        // Every doorway gets the marble frame; only the sealed ones get
        // bronze leaves. Open ones are filled by the Door's portal.
        const door = sealedDoorParts();
        const doorMatrices: THREE.Matrix4[] = [];
        const leafMatrices: THREE.Matrix4[] = [];
        const plaques: { position: [number, number, number]; rotationY: number; text: string }[] = [];
        LEVELS.slice(1).forEach((_, k) => {
            const tier = k + 1;
            DOOR_ANGLES.forEach((a) => {
                const level = LEVELS[tier];
                const [x, z] = polar(RADIUS - 0.04, a);
                const matrix = place(x, level, z, faceCenter(a));
                const open = OPEN_DOORS.find((d) => d.level === tier && d.angle === a);
                // a door with a frame of its own (a painted one) skips ours
                if (open?.ownFrame) return;
                doorMatrices.push(matrix);
                if (!open) leafMatrices.push(matrix);
                const [px, pz] = polar(RADIUS - 0.2, a);
                plaques.push({
                    position: [px, level + door.plaqueY, pz],
                    rotationY: faceCenter(a),
                    text: open ? open.plaque : "COMING SOON",
                });
            });
        });
        const doors = {
            frame: own(replicate(door.frame, doorMatrices)),
            frameBrass: own(replicate(door.frameBrass, doorMatrices)),
            bronze: own(replicate(door.bronze, leafMatrices)),
            trim: own(replicate(door.trim, leafMatrices)),
            glow: own(replicate(door.glow, leafMatrices)),
        };
        [door.frame, door.frameBrass, door.bronze, door.trim, door.glow].forEach((g) => g.dispose());
        const bulbMaterial = new THREE.MeshBasicMaterial({ color: "#ffe2b0", toneMapped: false });

        return {
            floor,
            ambulatory,
            kintsugiBand,
            floorBrass,
            wallBands,
            trim: mergeOwn(trimParts),
            brass: mergeOwn(brassParts),
            balconyFloors: mergeOwn(balconyFloors),
            soffits: mergeOwn(soffits),
            dentils: inst(dentilGeometry, materials.trim, dentilMatrices),
            balusters: inst(getBalusterGeometry(), materials.trim, balusterMatrices),
            columnShafts: inst(column.shaft, materials.columnShaft, columnMatrices),
            columnMarble: inst(column.marble, materials.trim, columnMatrices),
            columnBrass: inst(column.brass, materials.brass, columnMatrices),
            sconces: inst(sconceBody, materials.brass, sconceMatrices),
            bulbs: inst(bulb, bulbMaterial, sconceMatrices),
            pools: inst(pool, getLightPoolMaterial("#ffd49a", 0.2), sconceMatrices),
            doors,
            plaques,
            dispose: () => {
                owned.forEach((g) => g.dispose());
                instanced.forEach((m) => m.dispose());
                bulbMaterial.dispose();
            },
        };
    }, [materials]);
    useEffect(() => () => shell.dispose(), [shell]);

    const colliders = useMemo(() => {
        const boxes: { position: [number, number, number]; rotationY: number; half: [number, number, number] }[] = [];
        // Outer wall: a ring of boxes (never a cylinder hull - that's a solid disc)
        const wallSegments = 40;
        for (let k = 0; k < wallSegments; k++) {
            const a = (k / wallSegments) * TAU;
            const [x, z] = polar(RADIUS + 0.2, a);
            boxes.push({
                position: [x, WALL_HEIGHT / 2, z],
                rotationY: radialX(a),
                half: [0.2, WALL_HEIGHT / 2 + 1, RADIUS * Math.sin(Math.PI / wallSegments) * 1.12],
            });
        }
        BALCONY_INNER.forEach((inner, i) => {
            const level = LEVELS[i + 1];
            // Slab
            const slabSegments = 40;
            for (let k = 0; k < slabSegments; k++) {
                const a = (k / slabSegments) * TAU;
                const [x, z] = polar((inner + RADIUS) / 2, a);
                boxes.push({
                    position: [x, level - SLAB / 2, z],
                    rotationY: radialX(a),
                    half: [(RADIUS - inner) / 2 + 0.05, SLAB / 2, RADIUS * Math.sin(Math.PI / slabSegments) * 1.1],
                });
            }
            // Balustrade, tall enough that a jump can't clear it
            const rb = BALUSTRADE_RADIUS;
            balustradeArcs(rb).forEach(({ start, length }) => {
                const segments = Math.ceil(length / (TAU / 44));
                const step = length / segments;
                for (let k = 0; k < segments; k++) {
                    const a = start + (k + 0.5) * step;
                    const [x, z] = polar(rb, a);
                    boxes.push({
                        position: [x, level + 0.85, z],
                        rotationY: radialX(a),
                        half: [0.1, 0.85, rb * Math.sin(step / 2) * 1.04],
                    });
                }
            });
        });
        const columns: [number, number, number][] = [];
        COLUMN_RADIUS.forEach((radius, tier) => {
            for (let k = 0; k < COLUMN_COUNT; k++) {
                const [x, z] = polar(radius, COLUMN_OFFSET + (k / COLUMN_COUNT) * TAU);
                columns.push([x, LEVELS[tier] + COLUMN_HEIGHT / 2, z]);
            }
        });
        return { boxes, columns };
    }, []);

    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[RADIUS + 0.6, 0.1, RADIUS + 0.6]} position={[0, -0.1, 0]} />
                {colliders.boxes.map((box, i) => (
                    <CuboidCollider key={i} args={box.half} position={box.position} rotation={[0, box.rotationY, 0]} />
                ))}
                {colliders.columns.map((position, i) => (
                    <CylinderCollider key={`c${i}`} args={[COLUMN_HEIGHT / 2, 0.36]} position={position} />
                ))}
            </RigidBody>

            <mesh geometry={shell.floor} material={materials.floor} />
            <mesh geometry={shell.ambulatory} material={materials.ambulatoryFloor} />
            <mesh geometry={shell.kintsugiBand} material={materials.kintsugi} />
            <mesh geometry={shell.floorBrass} material={materials.brass} />

            {shell.wallBands.map((band, i) => (
                <mesh
                    key={i}
                    geometry={band}
                    material={i === 0 ? materials.wallStone : i === TOP ? materials.wallMarble : materials.wallGreen}
                />
            ))}
            <mesh geometry={shell.trim} material={materials.trim} />
            <mesh geometry={shell.brass} material={materials.brass} />

            <mesh geometry={shell.balconyFloors} material={materials.balconyFloor} />
            <mesh geometry={shell.soffits} material={materials.soffit} />
            <primitive object={shell.dentils} />
            <primitive object={shell.balusters} />

            <primitive object={shell.columnShafts} />
            <primitive object={shell.columnMarble} />
            <primitive object={shell.columnBrass} />

            <primitive object={shell.sconces} />
            <primitive object={shell.bulbs} />
            <primitive object={shell.pools} />

            <mesh geometry={shell.doors.frame} material={materials.trim} />
            <mesh geometry={shell.doors.frameBrass} material={materials.brass} />
            <mesh geometry={shell.doors.bronze} material={materials.bronze} />
            <mesh geometry={shell.doors.trim} material={materials.brass} />
            <mesh geometry={shell.doors.glow}>
                <meshBasicMaterial color="#ffcf8a" toneMapped={false} />
            </mesh>
            {shell.plaques.map((plaque, i) => (
                <Text
                    key={i}
                    font={DISPLAY_FONT}
                    position={plaque.position}
                    rotation={[0, plaque.rotationY, 0]}
                    fontSize={plaque.text.length > 20 ? 0.088 : plaque.text.length > 12 ? 0.115 : 0.17}
                    letterSpacing={0.18}
                    color="#d8b46a"
                    outlineWidth={0.004}
                    outlineColor="#3a2a14"
                    anchorX="center"
                    anchorY="middle"
                >
                    {plaque.text}
                </Text>
            ))}
        </>
    );
};
