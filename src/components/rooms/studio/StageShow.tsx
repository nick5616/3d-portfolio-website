import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Signal } from "./studioSignal";

// Everything the DJ sees from the decks, looking out: a club built the way
// it would be if physics didn't get a vote. An LED dance floor that ripples
// out from the stage on every kick, screens wrapping the side walls and the
// ceiling, aerial beams fanning out
// from behind the decks, and fountains of sparks off the stage lip on every
// drop. All instanced, all driven by the same signal as the visualizer.

const FLOOR_COLS = 14;
const FLOOR_ROWS = 10;
const FLOOR_X: [number, number] = [-7.2, 7.2];
const FLOOR_Z: [number, number] = [-3.6, 6.6];
const SPARKS = 900;
const EMITTERS: [number, number][] = [
    [-3.6, -4.15],
    [-1.9, -4.15],
    [1.9, -4.15],
    [3.6, -4.15],
];

interface StageShowProps {
    signal: React.MutableRefObject<Signal>;
    palette: THREE.Color[];
    screen: THREE.Texture;
    stageTop: number;
    roomHalf: [number, number]; // x, z
    height: number;
}

const additive = (opacity = 1) =>
    new THREE.MeshBasicMaterial({
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
    });

export const StageShow: React.FC<StageShowProps> = ({ signal, palette, screen, stageTop, roomHalf, height }) => {
    // --- LED dance floor ---------------------------------------------------
    const floor = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.9 });
        const mesh = new THREE.InstancedMesh(geometry, material, FLOOR_COLS * FLOOR_ROWS);
        const w = (FLOOR_X[1] - FLOOR_X[0]) / FLOOR_COLS;
        const d = (FLOOR_Z[1] - FLOOR_Z[0]) / FLOOR_ROWS;
        const m = new THREE.Matrix4();
        for (let r = 0; r < FLOOR_ROWS; r++) {
            for (let c = 0; c < FLOOR_COLS; c++) {
                m.makeScale(w * 0.92, 1, d * 0.92);
                m.setPosition(FLOOR_X[0] + (c + 0.5) * w, 0.006, FLOOR_Z[0] + (r + 0.5) * d);
                mesh.setMatrixAt(r * FLOOR_COLS + c, m);
                mesh.setColorAt(r * FLOOR_COLS + c, new THREE.Color(0, 0, 0));
            }
        }
        mesh.frustumCulled = false;
        return mesh;
    }, []);

    // --- Sparks off the stage lip ---------------------------------------------
    const sparks = useMemo(() => {
        const positions = new Float32Array(SPARKS * 3).fill(-100);
        const velocities = new Float32Array(SPARKS * 3);
        const life = new Float32Array(SPARKS);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            size: 0.07,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
            fog: false,
        });
        return { positions, velocities, life, geometry, material, next: 0, lastBurst: 0 };
    }, []);

    // --- Aerial beams from behind the decks ------------------------------------
    const beamMaterials = useMemo(() => Array.from({ length: 6 }, () => additive(0.1)), []);
    const beams = useRef<(THREE.Group | null)[]>([]);

    // --- Wraparound screens -----------------------------------------------------
    const screenMaterial = useMemo(
        () => new THREE.MeshBasicMaterial({ map: screen, toneMapped: false, transparent: true, opacity: 0.85, fog: false }),
        [screen]
    );

    useEffect(
        () => () => {
            floor.geometry.dispose();
            (floor.material as THREE.Material).dispose();
            sparks.geometry.dispose();
            sparks.material.dispose();
            beamMaterials.forEach((m) => m.dispose());
            screenMaterial.dispose();
        },
        [floor, sparks, beamMaterials, screenMaterial]
    );

    const pulse = useRef(0);
    const lastBass = useRef(0);
    const ripples = useRef<number[]>([]);
    const tmp = useMemo(
        () => ({ c: new THREE.Color() }),
        []
    );

    useFrame(({ clock }, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        const t = clock.elapsedTime;
        const b = signal.current;
        const { c } = tmp;

        // A "kick": the bass jumping up since last frame. Each one sends a
        // ring across the floor from the stage.
        if (b.playing && b.bass - lastBass.current > 0.06 && t - (ripples.current[ripples.current.length - 1] ?? -1) > 0.25) {
            ripples.current.push(t);
            pulse.current = 1;
        }
        lastBass.current = b.bass;
        ripples.current = ripples.current.filter((born) => t - born < 2.2);
        pulse.current = Math.max(0, pulse.current - delta * 3);

        // Floor
        const w = (FLOOR_X[1] - FLOOR_X[0]) / FLOOR_COLS;
        const d = (FLOOR_Z[1] - FLOOR_Z[0]) / FLOOR_ROWS;
        for (let r = 0; r < FLOOR_ROWS; r++) {
            for (let col = 0; col < FLOOR_COLS; col++) {
                const x = FLOOR_X[0] + (col + 0.5) * w;
                const z = FLOOR_Z[0] + (r + 0.5) * d;
                const dist = Math.hypot(x, z - FLOOR_Z[0] + 0.6);
                let ring = 0;
                for (const born of ripples.current) {
                    const radius = (t - born) * 6;
                    ring = Math.max(ring, Math.max(0, 1 - Math.abs(dist - radius) / 0.9) * (1 - (t - born) / 2.2));
                }
                const band = b.spectrum[Math.floor(((col + 0.5) / FLOOR_COLS) * 100)] / 255;
                const base = b.playing ? 0.06 + band * 0.25 * (r < 3 ? 1 : 0.6) : 0.03;
                c.copy(palette[(col + r) % palette.length]).multiplyScalar(base + ring * 0.9 + b.drop * 0.25);
                floor.setColorAt(r * FLOOR_COLS + col, c);
            }
        }
        if (floor.instanceColor) floor.instanceColor.needsUpdate = true;

        const hype = b.playing ? Math.min(1, b.total * 1.4 + b.drop) : 0.1;

        // Sparks: a fountain from every emitter on a drop, a trickle on kicks.
        const fire = (count: number, power: number) => {
            for (let n = 0; n < count; n++) {
                const i = sparks.next;
                sparks.next = (sparks.next + 1) % SPARKS;
                const [ex, ez] = EMITTERS[n % EMITTERS.length];
                sparks.positions.set([ex, stageTop + 0.05, ez], i * 3);
                const spread = 0.6;
                sparks.velocities.set(
                    [(Math.random() - 0.5) * spread, power * (0.75 + Math.random() * 0.5), (Math.random() - 0.2) * spread],
                    i * 3
                );
                sparks.life[i] = 1;
            }
        };
        if (b.playing && b.drop > 0.75 && t - sparks.lastBurst > 1.2) {
            sparks.lastBurst = t;
            fire(260, 7.5);
        } else if (pulse.current > 0.95 && b.playing && hype > 0.6) {
            fire(12, 4);
        }
        for (let i = 0; i < SPARKS; i++) {
            if (sparks.life[i] <= 0) continue;
            sparks.life[i] -= delta * 0.7;
            sparks.velocities[i * 3 + 1] -= 9.81 * delta * 0.6;
            for (let k = 0; k < 3; k++) sparks.positions[i * 3 + k] += sparks.velocities[i * 3 + k] * delta;
            if (sparks.life[i] <= 0 || sparks.positions[i * 3 + 1] < 0) {
                sparks.life[i] = 0;
                sparks.positions[i * 3 + 1] = -100;
            }
        }
        sparks.geometry.attributes.position.needsUpdate = true;
        sparks.material.color.copy(palette[1 % palette.length]).lerp(new THREE.Color("#fff4d0"), 0.5);

        // Beams fan out over the dance floor from behind the decks.
        beams.current.forEach((beam, i) => {
            if (!beam) return;
            const sweep = t * (0.5 + i * 0.09) + i * 1.3;
            // Aimed out over the dance floor, a little downward, swinging side to side.
            beam.rotation.set(Math.PI / 2 + 0.22 + Math.sin(sweep) * 0.1, 0, Math.sin(sweep * 0.7 + i) * 0.5);
            beamMaterials[i].opacity = b.playing ? 0.04 + b.total * 0.12 + pulse.current * 0.06 : 0.02;
            beamMaterials[i].color.copy(palette[(i + 1) % palette.length]);
        });

        screenMaterial.opacity = b.playing ? 0.7 + b.bass * 0.3 : 0.35;
    });

    const [halfX, halfZ] = roomHalf;
    const screenY = height - 1.4;
    return (
        <>
            <primitive object={floor} />
            <points geometry={sparks.geometry} material={sparks.material} frustumCulled={false} raycast={() => null} />

            {/* Aerial beams from the back corners and centre of the stage */}
            {[-3.8, -2.2, -0.7, 0.7, 2.2, 3.8].map((x, i) => (
                <group
                    key={x}
                    position={[x, height - 0.75, -6.6]}
                    ref={(g) => {
                        beams.current[i] = g;
                    }}
                >
                    <mesh position={[0, 6.5, 0]} material={beamMaterials[i]} raycast={() => null}>
                        <cylinderGeometry args={[0.6, 0.04, 13, 16, 1, true]} />
                    </mesh>
                </group>
            ))}
            {/* Fixtures they come from */}
            {[-3.8, -2.2, -0.7, 0.7, 2.2, 3.8].map((x) => (
                <mesh key={`f${x}`} position={[x, height - 0.75, -6.75]}>
                    <boxGeometry args={[0.3, 0.22, 0.3]} />
                    <meshStandardMaterial color="#18181e" metalness={0.6} roughness={0.4} />
                </mesh>
            ))}
            {/* Spark emitters on the stage lip */}
            {EMITTERS.map(([x, z]) => (
                <mesh key={`e${x}`} position={[x, stageTop + 0.04, z]}>
                    <cylinderGeometry args={[0.1, 0.12, 0.08, 12]} />
                    <meshStandardMaterial color="#26262e" metalness={0.8} roughness={0.3} />
                </mesh>
            ))}

            {/* Screens high on both side walls and across the ceiling, the
                same picture as the LED wall, facing the stage and the room */}
            {[-1, 1].map((side) => (
                <mesh
                    key={side}
                    position={[side * (halfX - 0.05), screenY, -1.8]}
                    rotation={[0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
                    material={screenMaterial}
                    raycast={() => null}
                >
                    <planeGeometry args={[4.6, 2.0]} />
                </mesh>
            ))}
            <mesh position={[0, height - 0.06, 1.5]} rotation={[Math.PI / 2, 0, Math.PI]} material={screenMaterial} raycast={() => null}>
                <planeGeometry args={[10, halfZ * 1.1]} />
            </mesh>
        </>
    );
};
