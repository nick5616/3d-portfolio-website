import React, { useEffect, useMemo } from "react";
import {
    CoefficientCombineRule,
    CuboidCollider,
    CylinderCollider,
    RigidBody,
    TrimeshCollider,
} from "@react-three/rapier";
import * as THREE from "three";
import { AtriumMaterials } from "./atriumMaterials";
import {
    BALCONY_INNER,
    BALUSTRADE_RADIUS,
    BRIDGE_WIDTH,
    LEVELS,
    RISER,
    STAIR_ANGLE,
    STAIR_CENTER,
    STAIR_DISTANCE,
    STAIR_NEWEL,
    STAIR_OUTER,
    STAIR_START,
    STEP_ANGLE,
    STEP_COUNT,
    polar,
    radialX,
} from "./atriumLayout";
import {
    getBalusterGeometry,
    makeInstanced,
    mergeGeometries,
    place,
    ribbonGeometry,
    wedgeGeometry,
} from "./atriumParts";

// A freestanding marble spiral: 80 cantilevered treads around a fluted
// newel, two full turns per storey, with a brass handrail on turned
// balusters. Marble bridges at 6.5 m and 13 m cross to the balconies.
//
// Physics walks on a smooth helical ramp (a trimesh ribbon through the
// tread centers) rather than the visual steps: the player is a dynamic
// capsule, and capsules snag on step edges but glide up a ramp.

const [CX, CZ] = STAIR_CENTER;
// One extra, level "landing" tread past the last step, so the top bridge's
// mouth has floor on both sides.
const STAIR_END = STAIR_START + (STEP_COUNT + 1) * STEP_ANGLE;
const TREAD_DEPTH = 0.42;
const RAIL_HEIGHT = 0.95;

const stepCenter = (i: number) => STAIR_START + (i + 0.5) * STEP_ANGLE;
const stepTop = (i: number) => Math.min(LEVELS[2], (i + 1) * RISER);
// Walking surface: passes through every tread's top at its center.
const rampY = (phi: number) =>
    Math.min(LEVELS[2], Math.max(0, RISER * ((phi - STAIR_START) / STEP_ANGLE + 0.5)));
const handrailY = (phi: number) => rampY(phi) + RISER * 0.5 + RAIL_HEIGHT;
const soffitY = (phi: number) => RISER * ((phi - STAIR_START) / STEP_ANGLE) - TREAD_DEPTH - 0.01;
const around = (radius: number, phi: number): [number, number] => [
    CX + Math.cos(phi) * radius,
    CZ + Math.sin(phi) * radius,
];

// Outer rail runs (inclusive step indices). Open: step 0 (the way in), and
// the steps meeting each bridge (38-40 at L2, 78-79 at L3).
const RAIL_RUNS: [number, number][] = [
    [1, 37],
    [41, 77],
];
const hasRail = (i: number) => RAIL_RUNS.some(([a, b]) => i >= a && i <= b);
// The first turn's rail reaches the floor so nobody wanders in under the
// treads; the entrance gap (steps 18, 19, 0) stays open at head height.
const GROUND_RAIL_LAST = 17;

class HelixCurve extends THREE.Curve<THREE.Vector3> {
    constructor(
        private from: number,
        private to: number,
        private radius: number,
        private height: (phi: number) => number
    ) {
        super();
    }
    getPoint(t: number, target = new THREE.Vector3()) {
        const phi = this.from + (this.to - this.from) * t;
        const [x, z] = around(this.radius, phi);
        return target.set(x, this.height(phi), z);
    }
}

const bridges = [1, 2].map((level) => {
    const y = LEVELS[level];
    const start = STAIR_DISTANCE + STAIR_OUTER;
    const end = Math.max(BALCONY_INNER[level - 1], BALUSTRADE_RADIUS) + 0.2;
    return { y, start, end, length: end - start, mid: (start + end) / 2 };
});

export const SpiralStair: React.FC<{ materials: AtriumMaterials }> = ({ materials }) => {
    const visuals = useMemo(() => {
        const disposables: THREE.BufferGeometry[] = [];
        const own = <T extends THREE.BufferGeometry>(g: T) => {
            disposables.push(g);
            return g;
        };
        const range = (n: number) => Array.from({ length: n }, (_, i) => i);

        // Treads
        const treads = makeInstanced(
            own(wedgeGeometry(STAIR_OUTER, (STEP_ANGLE / 2) * 1.04, TREAD_DEPTH)),
            materials.stairMarble,
            range(STEP_COUNT + 1).map((i) => place(CX, stepTop(i), CZ, radialX(stepCenter(i))))
        );

        // Brass nosing on each tread's leading edge
        const nosingLength = STAIR_OUTER - STAIR_NEWEL - 0.05;
        const nosings = makeInstanced(
            own(new THREE.BoxGeometry(nosingLength, 0.03, 0.045)),
            materials.brass,
            range(STEP_COUNT).map((i) => {
                const phi = stepCenter(i) - (STEP_ANGLE / 2) * 1.04 + 0.02;
                const [x, z] = around(STAIR_NEWEL + 0.05 + nosingLength / 2, phi);
                return place(x, stepTop(i) + 0.006, z, radialX(phi));
            })
        );

        // Smooth helicoid under the treads, and a green stringer band that
        // hides the sawtooth from the side.
        const samples = (STEP_COUNT + 1) * 4;
        const phiAt = (t: number) => STAIR_START + (STAIR_END - STAIR_START) * t;
        const soffit = own(
            ribbonGeometry(
                samples,
                (t, v) => {
                    const phi = phiAt(t);
                    const [x, z] = around(STAIR_NEWEL, phi);
                    return v.set(x, soffitY(phi), z);
                },
                (t, v) => {
                    const phi = phiAt(t);
                    const [x, z] = around(STAIR_OUTER, phi);
                    return v.set(x, soffitY(phi), z);
                }
            )
        );
        const stringer = own(
            ribbonGeometry(
                samples,
                (t, v) => {
                    const phi = phiAt(t);
                    const [x, z] = around(STAIR_OUTER + 0.005, phi);
                    return v.set(x, soffitY(phi) - 0.02, z);
                },
                (t, v) => {
                    const phi = phiAt(t);
                    const [x, z] = around(STAIR_OUTER + 0.005, phi);
                    return v.set(x, rampY(phi) + RISER * 0.5 + 0.08, z);
                }
            )
        );

        // Handrail runs with ball ends, and the newel's brass rings + finial
        const brassParts: THREE.BufferGeometry[] = [];
        RAIL_RUNS.forEach(([a, b]) => {
            const from = STAIR_START + a * STEP_ANGLE;
            const to = STAIR_START + (b + 1) * STEP_ANGLE;
            const curve = new HelixCurve(from, to, STAIR_OUTER - 0.07, handrailY);
            brassParts.push(new THREE.TubeGeometry(curve, Math.ceil((to - from) / 0.04), 0.045, 8, false));
            [from, to].forEach((phi) => {
                const ball = new THREE.SphereGeometry(0.075, 12, 8);
                const [x, z] = around(STAIR_OUTER - 0.07, phi);
                ball.translate(x, handrailY(phi), z);
                brassParts.push(ball);
            });
        });
        const newelTop = LEVELS[2] + 1.4;
        [0.42, LEVELS[1] + 1.1, LEVELS[2] + 1.1, newelTop].forEach((y) => {
            const ring = new THREE.TorusGeometry(STAIR_NEWEL + 0.01, 0.035, 8, 32);
            ring.rotateX(Math.PI / 2);
            ring.translate(CX, y, CZ);
            brassParts.push(ring);
        });
        const orb = new THREE.SphereGeometry(0.22, 20, 14);
        orb.translate(CX, newelTop + 0.24, CZ);
        const spire = new THREE.ConeGeometry(0.07, 0.34, 12);
        spire.translate(CX, newelTop + 0.6, CZ);
        brassParts.push(orb, spire);
        const brass = own(mergeGeometries(brassParts)!);
        brassParts.forEach((g) => g.dispose());

        const newel = own(new THREE.CylinderGeometry(STAIR_NEWEL, STAIR_NEWEL, newelTop, 24, 1, true));
        newel.translate(CX, newelTop / 2, CZ);
        const plinth = own(new THREE.CylinderGeometry(0.5, 0.56, 0.38, 24));
        plinth.translate(CX, 0.19, CZ);

        // Bridges: marble decks with a kintsugi runner, a brass band, and
        // rails on both sides.
        const deckParts: THREE.BufferGeometry[] = [];
        const railParts: THREE.BufferGeometry[] = [];
        const bandParts: THREE.BufferGeometry[] = [];
        const runnerParts: THREE.BufferGeometry[] = [];
        const toBridge = (g: THREE.BufferGeometry) => g.rotateY(radialX(STAIR_ANGLE));
        const balusterMatrices: THREE.Matrix4[] = [];
        bridges.forEach(({ y, length, mid, start }) => {
            const deck = new THREE.BoxGeometry(length, 0.35, BRIDGE_WIDTH);
            deck.translate(mid, y - 0.175, 0);
            deckParts.push(toBridge(deck));
            const band = new THREE.BoxGeometry(length, 0.06, BRIDGE_WIDTH + 0.03);
            band.translate(mid, y - 0.27, 0);
            bandParts.push(toBridge(band));
            const runner = new THREE.PlaneGeometry(length, BRIDGE_WIDTH * 0.42);
            runner.rotateX(-Math.PI / 2);
            runner.translate(mid, y + 0.004, 0);
            runnerParts.push(toBridge(runner));
            [-1, 1].forEach((side) => {
                const lateral = side * (BRIDGE_WIDTH / 2 - 0.07);
                const rail = new THREE.BoxGeometry(length, 0.07, 0.14);
                rail.translate(mid, y + RAIL_HEIGHT + 0.02, lateral);
                railParts.push(toBridge(rail));
                const count = Math.max(2, Math.floor(length / 0.24));
                for (let k = 0; k <= count; k++) {
                    const along = start + 0.12 + ((length - 0.24) * k) / count;
                    const [x, z] = polar(along, STAIR_ANGLE);
                    const tx = -Math.sin(STAIR_ANGLE) * lateral;
                    const tz = Math.cos(STAIR_ANGLE) * lateral;
                    balusterMatrices.push(place(x + tx, y, z + tz, 0, [1, RAIL_HEIGHT, 1]));
                }
            });
        });
        const merge = (parts: THREE.BufferGeometry[]) => {
            const merged = own(mergeGeometries(parts)!);
            parts.forEach((g) => g.dispose());
            return merged;
        };

        // Stair balusters: three per tread under the handrail
        for (let i = 0; i < STEP_COUNT; i++) {
            if (!hasRail(i)) continue;
            for (const k of [-1, 0, 1]) {
                const phi = stepCenter(i) + (k * STEP_ANGLE) / 3;
                const [x, z] = around(STAIR_OUTER - 0.07, phi);
                const height = handrailY(phi) - stepTop(i) - 0.02;
                balusterMatrices.push(place(x, stepTop(i), z, 0, [1, height, 1]));
            }
        }
        const balusters = makeInstanced(getBalusterGeometry(), materials.trim, balusterMatrices);

        return {
            treads,
            nosings,
            balusters,
            soffit,
            stringer,
            brass,
            newel,
            plinth,
            decks: merge(deckParts),
            rails: merge(railParts),
            bands: merge(bandParts),
            runners: merge(runnerParts),
            dispose: () => {
                disposables.forEach((g) => g.dispose());
                [treads, nosings, balusters].forEach((m) => m.dispose());
            },
        };
    }, [materials]);
    useEffect(() => () => visuals.dispose(), [visuals]);

    const physics = useMemo(() => {
        // Helical ramp, from flush with the floor to the top landing.
        const from = STAIR_START - 0.5 * STEP_ANGLE;
        const to = STAIR_END;
        const samples = Math.ceil((to - from) / 0.04);
        const vertices = new Float32Array((samples + 1) * 6);
        const indices: number[] = [];
        for (let i = 0; i <= samples; i++) {
            const phi = from + ((to - from) * i) / samples;
            const y = rampY(phi);
            const [ix, iz] = around(0.3, phi);
            const [ox, oz] = around(STAIR_OUTER + 0.02, phi);
            vertices.set([ix, y, iz, ox, y, oz], i * 6);
            if (i < samples) {
                const k = i * 2;
                indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
            }
        }

        const rails: { position: [number, number, number]; rotationY: number; half: [number, number, number] }[] = [];
        const halfChord = STAIR_OUTER * Math.sin(STEP_ANGLE / 2) * 1.15;
        for (let i = 0; i < STEP_COUNT; i++) {
            if (!hasRail(i)) continue;
            const phi = stepCenter(i);
            const [x, z] = around(STAIR_OUTER + 0.07, phi);
            const bottom = i <= GROUND_RAIL_LAST ? 0 : stepTop(i) - 0.45;
            const top = stepTop(i) + 1.3;
            rails.push({
                position: [x, (top + bottom) / 2, z],
                rotationY: radialX(phi),
                half: [0.07, (top - bottom) / 2, halfChord],
            });
        }
        // Wall across the very top so nobody walks off the end of the spiral.
        const [ex, ez] = around((STAIR_NEWEL + STAIR_OUTER) / 2, STAIR_END);
        rails.push({
            position: [ex, LEVELS[2] + 0.9, ez],
            rotationY: radialX(STAIR_END),
            half: [(STAIR_OUTER - STAIR_NEWEL) / 2, 0.9, 0.06],
        });

        bridges.forEach(({ y, end }) => {
            // Deck (reaching into the stair a little so the seam is flush)
            const deckStart = STAIR_DISTANCE + STAIR_OUTER - 0.12;
            const deckMid = (deckStart + end + 0.05) / 2;
            const [dx, dz] = polar(deckMid, STAIR_ANGLE);
            rails.push({
                position: [dx, y - 0.175, dz],
                rotationY: radialX(STAIR_ANGLE),
                half: [(end + 0.05 - deckStart) / 2, 0.175, BRIDGE_WIDTH / 2],
            });
            // Side rails
            const railStart = STAIR_DISTANCE + STAIR_OUTER;
            const railMid = (railStart + end) / 2;
            [-1, 1].forEach((side) => {
                const [mx, mz] = polar(railMid, STAIR_ANGLE);
                const lateral = side * (BRIDGE_WIDTH / 2);
                rails.push({
                    position: [mx - Math.sin(STAIR_ANGLE) * lateral, y + 0.9, mz + Math.cos(STAIR_ANGLE) * lateral],
                    rotationY: radialX(STAIR_ANGLE),
                    half: [(end - railStart) / 2, 0.9, 0.06],
                });
            });
        });

        return { vertices, indices: new Uint32Array(indices), boxes: rails };
    }, []);

    const newelHalf = (LEVELS[2] + 1.6) / 2;
    // Frictionless (and Min wins over the player's Average rule), so the
    // capsule's high friction can't pin it to the slope; PlayerBody holds
    // the player still on slippery ground when idle.
    const slick = { friction: 0, frictionCombineRule: CoefficientCombineRule.Min };

    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                <TrimeshCollider args={[physics.vertices, physics.indices]} {...slick} />
                <CylinderCollider args={[newelHalf, STAIR_NEWEL]} position={[CX, newelHalf, CZ]} {...slick} />
                {physics.boxes.map((box, i) => (
                    <CuboidCollider
                        key={i}
                        args={box.half}
                        position={box.position}
                        rotation={[0, box.rotationY, 0]}
                        {...slick}
                    />
                ))}
            </RigidBody>

            <primitive object={visuals.treads} />
            <primitive object={visuals.nosings} />
            <primitive object={visuals.balusters} />
            <mesh geometry={visuals.soffit} material={materials.trim} />
            <mesh geometry={visuals.stringer} material={materials.inlay} />
            <mesh geometry={visuals.brass} material={materials.brass} />
            <mesh geometry={visuals.newel} material={materials.newel} />
            <mesh geometry={visuals.plinth} material={materials.trim} />
            <mesh geometry={visuals.decks} material={materials.stairMarble} />
            <mesh geometry={visuals.rails} material={materials.trim} />
            <mesh geometry={visuals.bands} material={materials.brass} />
            <mesh geometry={visuals.runners} material={materials.kintsugi} />
        </>
    );
};
