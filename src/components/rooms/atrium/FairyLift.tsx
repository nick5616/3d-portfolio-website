import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { AtriumMaterials } from "./atriumMaterials";
import {
    BALCONY_INNER,
    BALUSTRADE_RADIUS,
    BRIDGE_WIDTH,
    LEVELS,
    LIFT_ANGLE,
    LIFT_CENTER,
    LIFT_DISTANCE,
    LIFT_PAD_RADIUS,
    TOP,
    polar,
    radialX,
} from "./atriumLayout";
import { getBalusterGeometry, makeInstanced, mergeGeometries, place } from "./atriumParts";
import { carrier } from "../../../stores/carrier";
import { useSceneStore } from "../../../stores/sceneStore";
import { playSound } from "../../../audio/soundManager";
import { GemPrompt } from "../../ui/GemPrompt";

// The fairy lift. Opposite the stair, a column of warm air spirals up
// through the rotunda, thick with petals and motes and wound with ribbons
// of light. Step into the glowing ring on any floor and it lifts you in a
// slow loop of air to the next floor, hangs there a moment, and carries on.
// Stand still to keep riding; walk to step off. At the top (or bottom) it
// turns around. On a middle floor, look down before stepping in to go down.
//
// While riding, the player has no collisions (see stores/carrier.ts), so
// the ride passes cleanly up through each floor's landing pad.

const [LX, LZ] = LIFT_CENTER;
const OUTWARD = LIFT_ANGLE; // from the lift's axis toward its bridges
const BOARD_RADIUS = 1.1; // the glowing ring you step into
const REARM_RADIUS = 1.45; // step out past this to ride again
const PATH_RADIUS = 0.95; // where the rider waits, toward the bridge
const MOVE_SECONDS = 2.6; // one floor
const PAUSE_SECONDS = 1.0; // at each floor on the way
const END_PAUSE_SECONDS = 1.6; // at the top or bottom, before turning
const GATHER_SECONDS = 0.5;
const COLUMN_HEIGHT = LEVELS[TOP] + 4;
const BODY_OFFSET = -0.2 + 0.02; // body origin below the floor it stands on
const PAD_THICKNESS = 0.24;
const RAIL_HEIGHT = 0.95;

type Phase = "gather" | "move" | "pause";
interface Ride {
    phase: Phase;
    floor: number; // the floor we're at, or leaving
    dir: 1 | -1;
    t: number;
    from: THREE.Vector3;
}

const waitPoint = (floor: number, target: THREE.Vector3) => {
    const [ox, oz] = polar(PATH_RADIUS, OUTWARD);
    return target.set(LX + ox, LEVELS[floor] + BODY_OFFSET, LZ + oz);
};

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// --- Shaders --------------------------------------------------------------

const columnMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uRide: { value: 0 } },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            void main() {
                vUv = uv;
                vec4 world = modelMatrix * vec4(position, 1.0);
                vNormalW = normalize(mat3(modelMatrix) * normal);
                vViewDir = normalize(cameraPosition - world.xyz);
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uRide;
            varying vec2 vUv;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            void main() {
                // Streaks of air rising and twisting around the column.
                float u = vUv.x * 6.2831853;
                float y = vUv.y * ${COLUMN_HEIGHT.toFixed(1)};
                float streaks = 0.5 + 0.5 * sin(u * 7.0 + y * 1.1 - uTime * 2.4);
                streaks *= 0.5 + 0.5 * sin(u * 3.0 - y * 0.6 - uTime * 1.3);
                float soft = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 1.5);
                float fade = smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                float a = (0.05 + streaks * 0.16 + uRide * 0.08) * soft * fade;
                vec3 col = mix(vec3(1.0, 0.86, 0.62), vec3(0.62, 0.95, 1.0), 0.5 + 0.5 * sin(y * 0.3 + uTime * 0.4));
                gl_FragColor = vec4(col * a, a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
    });

const ribbonMaterial = (color: string, phase: number) =>
    new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uPhase: { value: phase } },
        vertexShader: /* glsl */ `
            varying float vAlong;
            void main() {
                vAlong = uv.x;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uColor;
            uniform float uPhase;
            varying float vAlong;
            void main() {
                // Bright pulses running up the ribbon.
                float pulse = pow(0.5 + 0.5 * sin(vAlong * 90.0 - uTime * 3.0 + uPhase), 6.0);
                float a = 0.18 + pulse * 0.8;
                a *= smoothstep(0.0, 0.03, vAlong) * smoothstep(1.0, 0.92, vAlong);
                gl_FragColor = vec4(mix(uColor, vec3(1.0), pulse * 0.5) * a, a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });

const motesMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(2, window.devicePixelRatio) } },
        vertexShader: /* glsl */ `
            attribute vec3 aSeed;
            attribute vec3 aColor;
            uniform float uTime;
            uniform float uPixelRatio;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                float h = ${COLUMN_HEIGHT.toFixed(1)};
                float life = fract(uTime * (0.025 + aSeed.x * 0.03) + aSeed.y);
                float y = life * h;
                float angle = aSeed.z * 6.2831853 + y * 0.9 + uTime * (0.5 + aSeed.x * 0.5);
                float r = 0.35 + aSeed.y * 1.35 + sin(uTime + aSeed.z * 20.0) * 0.08;
                vec3 p = vec3(cos(angle) * r, y, sin(angle) * r);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = (2.0 + aSeed.x * 5.0) * uPixelRatio * (12.0 / -mv.z);
                vColor = aColor;
                vAlpha = smoothstep(0.0, 0.05, life) * smoothstep(1.0, 0.85, life)
                    * (0.55 + 0.45 * sin(uTime * 4.0 + aSeed.z * 50.0));
            }
        `,
        fragmentShader: /* glsl */ `
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = (smoothstep(0.5, 0.0, d) * 0.6 + smoothstep(0.15, 0.0, d)) * vAlpha;
                gl_FragColor = vec4(vColor * a, a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });

// A landing pad: frosted glowing glass with slow rings rolling outward, and
// the boarding ring brighter in the middle.
const padMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uBoard: { value: BOARD_RADIUS }, uRadius: { value: LIFT_PAD_RADIUS } },
        vertexShader: /* glsl */ `
            varying vec2 vP;
            void main() {
                vP = position.xy;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uBoard;
            uniform float uRadius;
            varying vec2 vP;
            void main() {
                float r = length(vP);
                float rings = 0.5 + 0.5 * sin(r * 14.0 - uTime * 1.6);
                float board = smoothstep(0.05, 0.0, abs(r - uBoard)) * (0.7 + 0.3 * sin(uTime * 3.0));
                float rim = smoothstep(uRadius - 0.12, uRadius, r);
                vec3 col = vec3(0.98, 0.9, 0.75) * (0.18 + rings * 0.1) + vec3(0.7, 1.0, 0.95) * board + vec3(1.0, 0.85, 0.6) * rim * 0.4;
                float a = 0.55 + board * 0.4;
                gl_FragColor = vec4(col, a);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
    });

// --- Static pieces ----------------------------------------------------------

const RIBBONS = [
    { color: "#ffb3e6", phase: 0 },
    { color: "#8ff0ff", phase: 2.1 },
    { color: "#ffe28a", phase: 4.2 },
];

class Helix extends THREE.Curve<THREE.Vector3> {
    constructor(private radius: number, private turns: number, private phase: number) {
        super();
    }
    getPoint(t: number, target = new THREE.Vector3()) {
        const a = this.phase + t * this.turns * Math.PI * 2;
        const wobble = 1 + Math.sin(t * 40) * 0.05;
        return target.set(Math.cos(a) * this.radius * wobble, t * COLUMN_HEIGHT, Math.sin(a) * this.radius * wobble);
    }
}

const bridgeSpan = () => {
    const start = LIFT_DISTANCE + LIFT_PAD_RADIUS;
    const end = Math.max(BALCONY_INNER[0], BALUSTRADE_RADIUS) + 0.2;
    return { start, end, length: end - start, mid: (start + end) / 2 };
};

export const FairyLift: React.FC<{ materials: AtriumMaterials }> = ({ materials }) => {
    const camera = useThree((s) => s.camera);
    const ride = useRef<Ride | null>(null);
    const armed = useRef(true);
    const [hint, setHint] = useState<{ floor: number; text: string } | null>(null);
    const target = useMemo(() => new THREE.Vector3(), []);

    const shaders = useMemo(
        () => ({
            column: columnMaterial(),
            ribbons: RIBBONS.map((r) => ribbonMaterial(r.color, r.phase)),
            motes: motesMaterial(),
            pad: padMaterial(),
        }),
        []
    );

    const geometry = useMemo(() => {
        const column = new THREE.CylinderGeometry(1.75, 1.75, COLUMN_HEIGHT, 48, 1, true);
        column.translate(0, COLUMN_HEIGHT / 2, 0);
        const ribbons = RIBBONS.map(
            (r, i) => new THREE.TubeGeometry(new Helix(1.5 - i * 0.12, TOP * 1.5 + i * 0.25, r.phase), 600, 0.025, 6)
        );

        const count = 900;
        const seeds = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const palette = ["#ffd1f0", "#a8f4ff", "#fff0b0", "#c8ffb8", "#ffffff"].map((c) => new THREE.Color(c));
        for (let i = 0; i < count; i++) {
            seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
            palette[i % palette.length].toArray(colors, i * 3);
        }
        const motes = new THREE.BufferGeometry();
        motes.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        motes.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
        motes.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

        const pad = new THREE.CircleGeometry(LIFT_PAD_RADIUS, 64);
        pad.rotateX(-Math.PI / 2);
        pad.translate(0, 0.004, 0);

        // Brass rims, and hoop rails around each pad except toward its bridge.
        const gap = BRIDGE_WIDTH / 2 / LIFT_PAD_RADIUS + 0.05;
        const brassParts: THREE.BufferGeometry[] = [];
        const balusterMatrices: THREE.Matrix4[] = [];
        LEVELS.forEach((level, floor) => {
            const rim = new THREE.TorusGeometry(LIFT_PAD_RADIUS, floor === 0 ? 0.03 : 0.06, 8, 96);
            rim.rotateX(Math.PI / 2);
            rim.translate(LX, level + (floor === 0 ? 0.01 : -0.02), LZ);
            brassParts.push(rim);
            if (floor === 0) return;
            const arc = Math.PI * 2 - 2 * gap;
            const rail = new THREE.TorusGeometry(LIFT_PAD_RADIUS - 0.08, 0.04, 8, 96, arc);
            rail.rotateX(Math.PI / 2);
            rail.rotateY(-(OUTWARD + gap));
            rail.translate(LX, level + RAIL_HEIGHT, LZ);
            brassParts.push(rail);
            const posts = 22;
            for (let k = 0; k <= posts; k++) {
                const a = OUTWARD + gap + (arc * k) / posts;
                const [x, z] = polar(LIFT_PAD_RADIUS - 0.08, a);
                balusterMatrices.push(place(LX + x, level, LZ + z, 0, [0.8, RAIL_HEIGHT, 0.8]));
            }
        });
        const brass = mergeGeometries(brassParts)!;
        brassParts.forEach((g) => g.dispose());

        // Bridges from each pad to its balcony, like the stair's.
        const { start, length, mid } = bridgeSpan();
        const deckParts: THREE.BufferGeometry[] = [];
        const railParts: THREE.BufferGeometry[] = [];
        const runnerParts: THREE.BufferGeometry[] = [];
        const toBridge = (g: THREE.BufferGeometry) => g.rotateY(radialX(OUTWARD));
        LEVELS.slice(1).forEach((y) => {
            const deck = new THREE.BoxGeometry(length, 0.35, BRIDGE_WIDTH);
            deck.translate(mid, y - 0.175, 0);
            deckParts.push(toBridge(deck));
            const runner = new THREE.PlaneGeometry(length, BRIDGE_WIDTH * 0.42);
            runner.rotateX(-Math.PI / 2);
            runner.translate(mid, y + 0.004, 0);
            runnerParts.push(toBridge(runner));
            [-1, 1].forEach((side) => {
                const lateral = side * (BRIDGE_WIDTH / 2 - 0.07);
                const rail = new THREE.BoxGeometry(length, 0.07, 0.14);
                rail.translate(mid, y + RAIL_HEIGHT + 0.02, lateral);
                railParts.push(toBridge(rail));
                const posts = Math.max(2, Math.floor(length / 0.24));
                for (let k = 0; k <= posts; k++) {
                    const along = start + 0.12 + ((length - 0.24) * k) / posts;
                    const [x, z] = polar(along, OUTWARD);
                    const tx = -Math.sin(OUTWARD) * lateral;
                    const tz = Math.cos(OUTWARD) * lateral;
                    balusterMatrices.push(place(x + tx, y, z + tz, 0, [1, RAIL_HEIGHT, 1]));
                }
            });
        });
        const merge = (parts: THREE.BufferGeometry[]) => {
            const merged = mergeGeometries(parts)!;
            parts.forEach((g) => g.dispose());
            return merged;
        };

        return {
            column,
            ribbons,
            motes,
            pad,
            brass,
            decks: merge(deckParts),
            rails: merge(railParts),
            runners: merge(runnerParts),
            balusters: makeInstanced(getBalusterGeometry(), materials.trim, balusterMatrices),
        };
    }, [materials]);

    useEffect(
        () => () => {
            const { balusters, ribbons, ...rest } = geometry;
            Object.values(rest).forEach((g) => g.dispose());
            ribbons.forEach((g) => g.dispose());
            balusters.dispose();
            shaders.column.dispose();
            shaders.motes.dispose();
            shaders.pad.dispose();
            shaders.ribbons.forEach((m) => m.dispose());
            // Never leave the player stuck mid-air if the atrium unloads.
            carrier.active = false;
            carrier.releasable = false;
        },
        [geometry, shaders]
    );

    const colliders = useMemo(() => {
        const boxes: { position: [number, number, number]; rotationY: number; half: [number, number, number] }[] = [];
        const gap = BRIDGE_WIDTH / 2 / LIFT_PAD_RADIUS + 0.05;
        const { start, end } = bridgeSpan();
        LEVELS.slice(1).forEach((y) => {
            // Hoop rail around the pad
            const segments = 20;
            const arc = Math.PI * 2 - 2 * gap;
            const step = arc / segments;
            for (let k = 0; k < segments; k++) {
                const a = OUTWARD + gap + (k + 0.5) * step;
                const [x, z] = polar(LIFT_PAD_RADIUS, a);
                boxes.push({
                    position: [LX + x, y + 0.85, LZ + z],
                    rotationY: radialX(a),
                    half: [0.08, 0.85, LIFT_PAD_RADIUS * Math.sin(step / 2) * 1.1],
                });
            }
            // Bridge deck, reaching a little under the pad so the seam is flush
            const deckStart = start - 0.12;
            const [dx, dz] = polar((deckStart + end + 0.05) / 2, OUTWARD);
            boxes.push({
                position: [dx, y - 0.175, dz],
                rotationY: radialX(OUTWARD),
                half: [(end + 0.05 - deckStart) / 2, 0.175, BRIDGE_WIDTH / 2],
            });
            [-1, 1].forEach((side) => {
                const [mx, mz] = polar((start + end) / 2, OUTWARD);
                const lateral = side * (BRIDGE_WIDTH / 2);
                boxes.push({
                    position: [mx - Math.sin(OUTWARD) * lateral, y + 0.9, mz + Math.cos(OUTWARD) * lateral],
                    rotationY: radialX(OUTWARD),
                    half: [(end - start) / 2, 0.9, 0.06],
                });
            });
        });
        return boxes;
    }, []);

    const lastHint = useRef<string | null>(null);
    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        shaders.column.uniforms.uTime.value = t;
        shaders.motes.uniforms.uTime.value = t;
        shaders.pad.uniforms.uTime.value = t;
        shaders.ribbons.forEach((m) => (m.uniforms.uTime.value = t));
        shaders.column.uniforms.uRide.value += ((ride.current ? 1 : 0) - shaders.column.uniforms.uRide.value) * Math.min(1, delta * 3);

        const [px, py, pz] = useSceneStore.getState().playerPosition;
        const feet = py + 0.2;
        const horizontal = Math.hypot(px - LX, pz - LZ);
        const floorHere = LEVELS.findIndex((level) => Math.abs(feet - level) < 0.6);

        // A hint near the lift, and while waiting at a floor mid-ride.
        let nextHint: { floor: number; text: string } | null = null;
        if (ride.current?.phase === "pause") {
            nextHint = { floor: ride.current.floor, text: "Walk to step off, or stay to keep riding" };
        } else if (!ride.current && floorHere >= 0 && horizontal < LIFT_PAD_RADIUS + 1.2) {
            nextHint = {
                floor: floorHere,
                text:
                    floorHere === 0
                        ? "Step into the ring to ride up"
                        : floorHere === TOP
                        ? "Step into the ring to ride down"
                        : "Step in to ride (look down to go down)",
            };
        }
        const key = nextHint ? `${nextHint.floor}:${nextHint.text}` : null;
        if (key !== lastHint.current) {
            lastHint.current = key;
            setHint(nextHint);
        }

        const current = ride.current;
        if (!current) {
            if (horizontal > REARM_RADIUS) armed.current = true;
            if (!armed.current || floorHere < 0 || horizontal > BOARD_RADIUS) return;
            // Board: drift to the waiting point, then go. Up from the bottom,
            // down from the top, and in between, whichever way you look.
            const lookingDown = camera.getWorldDirection(target).y < -0.3;
            const dir: 1 | -1 = floorHere === 0 ? 1 : floorHere === TOP ? -1 : lookingDown ? -1 : 1;
            ride.current = { phase: "gather", floor: floorHere, dir, t: 0, from: new THREE.Vector3(px, py, pz) };
            carrier.active = true;
            carrier.releasable = false;
            carrier.releaseRequested = false;
            carrier.position.set(px, py, pz);
            armed.current = false;
            playSound("lift-rise");
            return;
        }

        current.t += delta;
        if (current.phase === "gather") {
            const k = smootherstep(Math.min(1, current.t / GATHER_SECONDS));
            carrier.position.lerpVectors(current.from, waitPoint(current.floor, target), k);
            if (current.t >= GATHER_SECONDS) {
                current.phase = "move";
                current.t = 0;
            }
        } else if (current.phase === "move") {
            const k = Math.min(1, current.t / MOVE_SECONDS);
            const e = smootherstep(k);
            const from = LEVELS[current.floor];
            const to = LEVELS[current.floor + current.dir];
            // One slow loop of air per floor, swelling outward mid-flight.
            const a = OUTWARD + e * Math.PI * 2 * current.dir;
            const r = PATH_RADIUS + Math.sin(k * Math.PI) * 0.3;
            const [ox, oz] = polar(r, a);
            carrier.position.set(LX + ox, from + (to - from) * e + BODY_OFFSET + Math.sin(k * Math.PI) * 0.15, LZ + oz);
            if (k >= 1) {
                current.floor += current.dir;
                current.phase = "pause";
                current.t = 0;
                carrier.releasable = true;
                carrier.releaseRequested = false;
                waitPoint(current.floor, carrier.position);
                playSound("lift-chime");
            }
        } else {
            waitPoint(current.floor, carrier.position);
            carrier.position.y += Math.sin(current.t * 3) * 0.02;
            if (carrier.releaseRequested) {
                // Step off: the player walks away from the waiting point.
                waitPoint(current.floor, carrier.position);
                carrier.active = false;
                carrier.releasable = false;
                carrier.releaseRequested = false;
                ride.current = null;
                return;
            }
            const atEnd = current.floor === 0 || current.floor === TOP;
            if (current.t >= (atEnd ? END_PAUSE_SECONDS : PAUSE_SECONDS)) {
                if (atEnd) current.dir = current.floor === 0 ? 1 : -1;
                current.phase = "move";
                current.t = 0;
                carrier.releasable = false;
                playSound("lift-rise");
            }
        }
    });

    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                {LEVELS.slice(1).map((y, i) => (
                    <CylinderCollider
                        key={`pad-${i}`}
                        args={[PAD_THICKNESS / 2, LIFT_PAD_RADIUS]}
                        position={[LX, y - PAD_THICKNESS / 2, LZ]}
                    />
                ))}
                {colliders.map((box, i) => (
                    <CuboidCollider key={i} args={box.half} position={box.position} rotation={[0, box.rotationY, 0]} />
                ))}
            </RigidBody>

            <group position={[LX, 0, LZ]}>
                <mesh geometry={geometry.column} material={shaders.column} raycast={() => null} />
                {geometry.ribbons.map((g, i) => (
                    <mesh key={i} geometry={g} material={shaders.ribbons[i]} raycast={() => null} />
                ))}
                <points geometry={geometry.motes} material={shaders.motes} frustumCulled={false} />
                {LEVELS.map((level, floor) => (
                    <mesh
                        key={floor}
                        geometry={geometry.pad}
                        material={shaders.pad}
                        position={[0, level + (floor === 0 ? 0.002 : 0), 0]}
                        raycast={() => null}
                    />
                ))}
                {LEVELS.slice(1).map((level) => (
                    <mesh key={level} position={[0, level - PAD_THICKNESS / 2, 0]} material={materials.trim}>
                        <cylinderGeometry args={[LIFT_PAD_RADIUS, LIFT_PAD_RADIUS * 0.82, PAD_THICKNESS - 0.02, 64, 1, true]} />
                    </mesh>
                ))}
                {LEVELS.map((level) => level + 3).map((y) => (
                    <pointLight key={y} position={[0, y, 0]} intensity={2.2} distance={6} decay={2} color="#ffd9f0" />
                ))}
            </group>

            <mesh geometry={geometry.brass} material={materials.brass} />
            <primitive object={geometry.balusters} />
            <mesh geometry={geometry.decks} material={materials.stairMarble} />
            <mesh geometry={geometry.rails} material={materials.trim} />
            <mesh geometry={geometry.runners} material={materials.kintsugi} />

            {hint && (
                <Html
                    position={[LX, LEVELS[hint.floor] + 2.6, LZ]}
                    center
                    zIndexRange={[20, 0]}
                    style={{ pointerEvents: "none" }}
                >
                    <GemPrompt accent="gold" keyLabel={null} action={hint.text} />
                </Html>
            )}
        </>
    );
};
