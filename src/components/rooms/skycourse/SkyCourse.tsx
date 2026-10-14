import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { CosmicPortal } from "../../core/CosmicPortal";
import { useSceneStore } from "../../../stores/sceneStore";
import { useAchievementStore } from "../../../stores/achievementStore";
import { RUPEE_TYPES } from "../../../stores/rupeeStore";
import { carrier } from "../../../stores/carrier";
import { playSound } from "../../../audio/soundManager";
import { roomConfigs } from "../../../configs/rooms";
import { Rupee, RupeeData } from "../../models/Rupee";
import { Course, Island, Shuttle, Spinner, START_LINE_Z, generateCourse } from "./courseGen";

// The Sky Course: what the gym became. Timed runs across islands floating
// above the clouds, grown procedurally (see courseGen.ts): Course 1, 2, 3...
// each a little harder. Walk through the start arch and the clock starts;
// fall and you're back at the last flag. Ring the bell at the end and three
// portals rise out of the goal deck: run this course again, go on to the
// next one, or head back to the atrium. Your best run on each course is
// saved, and a ghost of it races you.

const ROOM_ID = "sky-course";
const FALL_Y = -8;
const GHOST_STEP = 0.1; // seconds between recorded ghost samples
const LEVEL_KEY = "sky-course-level";
const bestKey = (level: number) => `sky-course-best-${level}`;
const BELL_HEIGHT = 4.2; // above the goal deck, well over your head
const PORTAL_RISE_SECONDS = 1.8;

const format = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds - m * 60;
    return `${m}:${s.toFixed(2).padStart(5, "0")}`;
};

interface Best {
    time: number;
    path: number[]; // x, y, z every GHOST_STEP
}
const loadBest = (level: number): Best | null => {
    try {
        return JSON.parse(localStorage.getItem(bestKey(level)) ?? "null");
    } catch {
        return null;
    }
};
const loadLevel = () => {
    try {
        return Math.max(1, Number(localStorage.getItem(LEVEL_KEY)) || 1);
    } catch {
        return 1;
    }
};

// --- Sky ------------------------------------------------------------------------

const skyMaterial = () =>
    new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
                vDir = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
                float h = vDir.y;
                vec3 top = vec3(0.32, 0.58, 0.95);
                vec3 horizon = vec3(0.86, 0.93, 1.0);
                vec3 below = vec3(0.95, 0.97, 1.0);
                vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, below, min(1.0, -h * 3.0));
                vec3 sunDir = normalize(vec3(0.4, 0.55, -0.7));
                float sun = max(dot(normalize(vDir), sunDir), 0.0);
                col += vec3(1.0, 0.95, 0.8) * (pow(sun, 600.0) * 4.0 + pow(sun, 16.0) * 0.25);
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
    });

const cloudTexture = () => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    for (let i = 0; i < 12; i++) {
        const x = size / 2 + (Math.random() - 0.5) * size * 0.5;
        const y = size / 2 + (Math.random() - 0.5) * size * 0.2;
        const r = size * (0.15 + Math.random() * 0.2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
    }
    return new THREE.CanvasTexture(canvas);
};

// --- Pieces ------------------------------------------------------------------------

const ISLAND_COLORS: Record<Island["kind"], string> = {
    island: "#7ac46a",
    checkpoint: "#8fd47a",
    goal: "#f4e6b8",
    stone: "#cfc6d8",
    beam: "#d9c8a8",
};

const IslandMesh: React.FC<{ island: Island; tint: string }> = ({ island, tint }) => {
    const [w, d] = island.size;
    const [x, z] = island.at;
    const grassy = island.kind === "island" || island.kind === "checkpoint" || island.kind === "goal";
    return (
        <group position={[x, island.top, z]}>
            <mesh position={[0, -0.3, 0]}>
                <boxGeometry args={[w, 0.6, d]} />
                <meshStandardMaterial color={island.kind === "stone" ? tint : ISLAND_COLORS[island.kind]} roughness={0.85} />
            </mesh>
            {grassy && (
                <mesh position={[0, -0.62 - Math.min(w, d) * 0.35, 0]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[Math.min(w, d) * 0.62, Math.min(w, d) * 0.7, 7]} />
                    <meshStandardMaterial color="#8a7058" roughness={1} flatShading />
                </mesh>
            )}
        </group>
    );
};

const MovingPlatform: React.FC<{ shuttle: Shuttle }> = ({ shuttle }) => {
    const body = useRef<RapierRigidBody>(null);
    const [x, z] = shuttle.at;
    useFrame(({ clock }) => {
        const phase = (clock.elapsedTime / shuttle.period) * Math.PI * 2;
        if (shuttle.axis === "x") {
            body.current?.setNextKinematicTranslation({ x: x + Math.sin(phase) * shuttle.amplitude, y: shuttle.top - 0.2, z });
        } else {
            // A lift: from its floor up `amplitude` metres and back down.
            body.current?.setNextKinematicTranslation({ x, y: shuttle.top - 0.2 + shuttle.amplitude * (0.5 - 0.5 * Math.cos(phase)), z });
        }
    });
    const color = shuttle.axis === "x" ? "#8fd3ff" : "#c8a8ff";
    return (
        <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[x, shuttle.top - 0.2, z]}>
            <CuboidCollider args={[shuttle.size / 2, 0.2, shuttle.size / 2]} friction={2} />
            <mesh>
                <boxGeometry args={[shuttle.size, 0.4, shuttle.size]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.4} />
            </mesh>
        </RigidBody>
    );
};

const SpinningCross: React.FC<{ spinner: Spinner }> = ({ spinner }) => {
    const body = useRef<RapierRigidBody>(null);
    const quat = useMemo(() => new THREE.Quaternion(), []);
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    useFrame(({ clock }) => body.current?.setNextKinematicRotation(quat.setFromAxisAngle(up, clock.elapsedTime * spinner.speed)));
    return (
        <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spinner.at[0], spinner.top - 0.2, spinner.at[1]]}>
            {[0, Math.PI / 2].map((angle) => (
                <group key={angle} rotation={[0, angle, 0]}>
                    <CuboidCollider args={[spinner.length / 2, 0.2, spinner.width / 2]} friction={2} />
                    <mesh>
                        <boxGeometry args={[spinner.length, 0.4, spinner.width]} />
                        <meshStandardMaterial color="#ffb347" roughness={0.5} />
                    </mesh>
                </group>
            ))}
            <CylinderCollider args={[0.2, 1.2]} />
            <mesh>
                <cylinderGeometry args={[1.2, 1.2, 0.42, 24]} />
                <meshStandardMaterial color="#ff8a5a" roughness={0.5} />
            </mesh>
        </RigidBody>
    );
};

const Flag: React.FC<{ position: [number, number, number]; reached: boolean }> = ({ position, reached }) => {
    const cloth = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25;
    });
    return (
        <group position={position}>
            <mesh position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
                <meshStandardMaterial color="#eeeeee" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh ref={cloth} position={[0, 2.1, 0]}>
                <boxGeometry args={[0.02, 0.5, 0.8]} />
                <meshStandardMaterial
                    color={reached ? "#ffd23c" : "#ff6a6a"}
                    emissive={reached ? "#ffd23c" : "#000000"}
                    emissiveIntensity={reached ? 0.5 : 0}
                />
            </mesh>
        </group>
    );
};

// The whole course: colliders and looks for one generated layout.
const CourseBody: React.FC<{ course: Course; reached: number; squash: React.MutableRefObject<number> }> = ({ course, reached, squash }) => {
    const tint = useMemo(() => new THREE.Color().setHSL((course.level * 0.13) % 1, 0.35, 0.82).getStyle(), [course.level]);
    const mushrooms = useRef<(THREE.Group | null)[]>([]);
    useFrame(() => {
        const s = squash.current;
        mushrooms.current.forEach((m) => m?.scale.set(1 + s * 0.25, 1 - s * 0.4, 1 + s * 0.25));
    });
    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                {course.islands.map((island, i) => (
                    <CuboidCollider
                        key={i}
                        args={[island.size[0] / 2, 0.3, island.size[1] / 2]}
                        position={[island.at[0], island.top - 0.3, island.at[1]]}
                    />
                ))}
                {course.mushrooms.map((m, i) => (
                    <CylinderCollider key={`m${i}`} args={[0.2, 0.25]} position={[m.at[0], m.at[1] + 0.2, m.at[2]]} />
                ))}
            </RigidBody>
            {course.islands.map((island, i) => (
                <IslandMesh key={i} island={island} tint={tint} />
            ))}
            {course.shuttles.map((s, i) => (
                <MovingPlatform key={`s${i}`} shuttle={s} />
            ))}
            {course.spinners.map((s, i) => (
                <SpinningCross key={`x${i}`} spinner={s} />
            ))}
            {course.mushrooms.map((m, i) => (
                <group key={`m${i}`}>
                    <group
                        ref={(g) => {
                            mushrooms.current[i] = g;
                        }}
                        position={m.at}
                    >
                        <mesh position={[0, 0.2, 0]}>
                            <cylinderGeometry args={[0.2, 0.25, 0.4, 16]} />
                            <meshStandardMaterial color="#f4ead8" />
                        </mesh>
                        <mesh position={[0, 0.38, 0]} scale={[1, 0.45, 1]}>
                            <sphereGeometry args={[0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                            <meshStandardMaterial color="#ff4d6d" emissive="#ff4d6d" emissiveIntensity={0.25} />
                        </mesh>
                    </group>
                    <Text position={[m.at[0], m.at[1] + 1.4, m.at[2]]} fontSize={0.25} color="#ffffff" outlineWidth={0.02} outlineColor="#ff4d6d" anchorX="center">
                        BOING
                    </Text>
                </group>
            ))}
            {course.checkpoints.slice(1).map((cp, i) => (
                <Flag key={i} position={cp.flag} reached={reached >= i + 1} />
            ))}
        </>
    );
};

// --- Exit portals ----------------------------------------------------------------

type PortalAction = "again" | "next" | "leave";
const PORTALS: { action: PortalAction; label: string; offset: number }[] = [
    { action: "again", label: "Again", offset: -2.4 },
    { action: "next", label: "Next course", offset: 0 },
    { action: "leave", label: "Atrium", offset: 2.4 },
];

// They rise out of the goal deck after you ring the bell; walk into one.
const ExitPortals: React.FC<{ course: Course; onEnter: (action: PortalAction) => void }> = ({ course, onEnter }) => {
    const group = useRef<THREE.Group>(null);
    const born = useRef<number | null>(null);
    const used = useRef(false);
    const goal = course.goal;
    const backZ = goal.at[1] - goal.size[1] / 2 + 0.6;
    useFrame(({ clock }) => {
        born.current ??= clock.elapsedTime;
        const t = Math.min(1, (clock.elapsedTime - born.current) / PORTAL_RISE_SECONDS);
        const ease = 1 - Math.pow(1 - t, 3);
        if (group.current) group.current.position.y = goal.top - 3.6 * (1 - ease);
        if (t < 0.9 || used.current) return;
        const [px, py, pz] = useSceneStore.getState().playerPosition;
        if (Math.abs(py + 0.2 - goal.top) > 1) return;
        const hit = PORTALS.find((p) => Math.abs(px - (goal.at[0] + p.offset)) < 0.8 && Math.abs(pz - backZ) < 0.45);
        if (hit) {
            used.current = true;
            onEnter(hit.action);
        }
    });
    return (
        <group ref={group} position={[0, goal.top - 3.6, 0]}>
            {PORTALS.map((p) => (
                <CosmicPortal
                    key={p.action}
                    position={[goal.at[0] + p.offset, 0, backZ]}
                    rotationY={0}
                    width={1.6}
                    height={2.9}
                    hovering={p.action === "next"}
                    frame
                    label={p.label}
                />
            ))}
        </group>
    );
};

// --- The room ------------------------------------------------------------------------

export const SkyCourse: React.FC = () => {
    const { scene, camera } = useThree();
    const [level, setLevel] = useState(loadLevel);
    const course = useMemo(() => generateCourse(level), [level]);
    const [best, setBest] = useState<Best | null>(() => loadBest(level));
    const [hud, setHud] = useState({ time: 0, running: false, finished: null as number | null, message: "" });
    const [reached, setReached] = useState(0); // highest checkpoint index reached this run
    const [reward, setReward] = useState<RupeeData | null>(null);
    const [portalsOpen, setPortalsOpen] = useState(false);
    const run = useRef({ running: false, start: 0, checkpoint: 0, path: [] as number[], lastSample: 0, lastZ: 10, bounced: -10 });
    const squash = useRef(0);
    const ghost = useRef<THREE.Group>(null);
    const bell = useRef<THREE.Group>(null);
    const sky = useRef<THREE.Mesh>(null);
    const material = useMemo(skyMaterial, []);
    const clouds = useMemo(() => {
        const texture = cloudTexture();
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.9 });
        const spots = Array.from({ length: 50 }, () => ({
            position: [(Math.random() - 0.5) * 70, -9 - Math.random() * 10, 10 - Math.random() * 160] as [number, number, number],
            scale: 10 + Math.random() * 14,
        }));
        return { texture, spriteMaterial, spots };
    }, []);
    const fog = useMemo(() => new THREE.Fog("#d8ecff", 28, 70), []);
    useEffect(() => {
        const previous = scene.fog;
        return () => {
            if (scene.fog === fog) scene.fog = previous;
            material.dispose();
            clouds.texture.dispose();
            clouds.spriteMaterial.dispose();
        };
    }, [scene, fog, material, clouds]);

    const resetRun = () => {
        run.current = { ...run.current, running: false, checkpoint: 0, path: [], lastSample: -1, lastZ: 10 };
        setReached(0);
        setPortalsOpen(false);
        setReward(null);
        setHud({ time: 0, running: false, finished: null, message: "" });
    };

    const respawn = (index: number) => {
        useSceneStore.getState().teleportToRoom(ROOM_ID, course.checkpoints[index].at, [0, 0, 0]);
    };

    const enterPortal = (action: PortalAction) => {
        playSound("door-enter");
        if (action === "leave") {
            const way = roomConfigs[ROOM_ID].archways[0];
            const target = way.entrancePoint!.position;
            const store = useSceneStore.getState();
            store.setRoomTransitionLoading(true, ROOM_ID, "atrium");
            window.setTimeout(
                () => useSceneStore.getState().teleportToRoom("atrium", target, [0, Math.atan2(target[0], target[2]), 0]),
                100
            );
            return;
        }
        if (action === "next") {
            const next = course.level + 1;
            try {
                localStorage.setItem(LEVEL_KEY, String(next));
            } catch {
                // ignore
            }
            setLevel(next);
            setBest(loadBest(next));
        }
        resetRun();
        useSceneStore.getState().teleportToRoom(ROOM_ID, course.checkpoints[0].at, [0, 0, 0]);
    };

    const finish = (time: number) => {
        const r = run.current;
        r.running = false;
        const isBest = !best || time < best.time;
        if (isBest) {
            const record = { time, path: r.path.slice() };
            try {
                localStorage.setItem(bestKey(course.level), JSON.stringify(record));
            } catch {
                // ignore
            }
            setBest(record);
        }
        setHud({ time, running: false, finished: time, message: isBest ? "New best! Pick a portal." : `Best is ${format(best!.time)}. Pick a portal.` });
        setPortalsOpen(true);
        playSound("achievement-unlock");
        playSound("lift-rise");
        useAchievementStore.getState().unlock("sky-course-finish");
        if (time < course.par) useAchievementStore.getState().unlock("sky-course-par");
        // A rupee on the goal deck: red for beating par, blue otherwise.
        const type = RUPEE_TYPES.find((t) => t.name === (time < course.par ? "Red" : "Blue"))!;
        setReward({
            position: new THREE.Vector3(course.goal.at[0], course.goal.top + 0.6, course.goal.at[1] + 1.2),
            initialRotation: new THREE.Euler(),
            scale: 0.12,
            color: new THREE.Color(type.color),
            value: type.value,
            type: type.name,
        });
    };

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        if (scene.fog !== fog) scene.fog = fog;
        sky.current?.position.copy(camera.position);
        if (bell.current) {
            bell.current.rotation.y = t * 0.8;
            bell.current.position.y = course.goal.top + BELL_HEIGHT + Math.sin(t * 2) * 0.12;
        }
        squash.current = Math.max(0, squash.current - delta * 4);

        const r = run.current;
        const [px, py, pz] = useSceneStore.getState().playerPosition;
        const feet = py + 0.2;

        // Start line: walking through the arch (re)starts the clock.
        if (r.lastZ > START_LINE_Z && pz <= START_LINE_Z && Math.abs(px) < 4.5 && feet < 1) {
            r.running = true;
            r.start = t;
            r.checkpoint = 0;
            r.path = [];
            r.lastSample = -1;
            setReached(0);
            setReward(null);
            setPortalsOpen(false);
            playSound("lift-chime");
        }
        r.lastZ = pz;

        // Flags
        course.checkpoints.forEach((cp, i) => {
            if (i <= r.checkpoint) return;
            if (Math.hypot(px - cp.at[0], pz - cp.at[2]) < 2.8 && Math.abs(feet - (cp.at[1] - 1.5)) < 0.8) {
                r.checkpoint = i;
                setReached(i);
                playSound("lift-chime");
                setHud((h) => ({ ...h, message: "Checkpoint!" }));
            }
        });

        if (py < FALL_Y) respawn(r.checkpoint);

        // Bounce mushrooms
        course.mushrooms.forEach((m) => {
            if (Math.hypot(px - m.at[0], pz - m.at[2]) < 0.9 && Math.abs(feet - (m.at[1] + 0.35)) < 0.4 && t - r.bounced > 0.6) {
                r.bounced = t;
                squash.current = 1;
                carrier.launch = { ...m.launch };
                playSound("jump");
            }
        });

        // Goal: anywhere on the deck.
        const g = course.goal;
        if (
            r.running &&
            Math.abs(px - g.at[0]) < g.size[0] / 2 &&
            Math.abs(pz - g.at[1]) < g.size[1] / 2 &&
            feet > g.top - 0.3
        ) {
            finish(t - r.start);
        }

        // Clock, ghost recording and the ghost itself
        if (r.running) {
            const elapsed = t - r.start;
            const sample = Math.floor(elapsed / GHOST_STEP);
            if (sample !== r.lastSample) {
                r.lastSample = sample;
                r.path.push(px, py, pz);
            }
            if (Math.floor(elapsed * 10) !== Math.floor(hud.time * 10)) {
                setHud((h) => ({ ...h, time: elapsed, running: true, finished: null }));
            }
        }
        if (ghost.current) {
            const path = best?.path;
            ghost.current.visible = Boolean(r.running && path && path.length > 6);
            if (ghost.current.visible && path) {
                const at = (t - r.start) / GHOST_STEP;
                const i = Math.min(Math.floor(at), path.length / 3 - 2);
                const f = Math.min(1, at - i);
                ghost.current.position.set(
                    path[i * 3] + (path[i * 3 + 3] - path[i * 3]) * f,
                    path[i * 3 + 1] + (path[i * 3 + 4] - path[i * 3 + 1]) * f,
                    path[i * 3 + 2] + (path[i * 3 + 5] - path[i * 3 + 2]) * f
                );
            }
        }
    });

    // Fade the checkpoint message.
    useEffect(() => {
        if (!hud.message || hud.finished !== null) return;
        const timer = window.setTimeout(() => setHud((h) => ({ ...h, message: "" })), 1500);
        return () => window.clearTimeout(timer);
    }, [hud.message, hud.finished]);

    const g = course.goal;

    return (
        <>
            <RoomEnvironmentReady />
            <mesh ref={sky} material={material} renderOrder={-10} frustumCulled={false} raycast={() => null}>
                <sphereGeometry args={[45, 32, 16]} />
            </mesh>
            <hemisphereLight intensity={1.1} color="#eaf4ff" groundColor="#a8b8a0" />
            <directionalLight position={[12, 20, -14]} intensity={1.8} color="#fff6e0" />
            {clouds.spots.map((c, i) => (
                <sprite key={i} material={clouds.spriteMaterial} position={c.position} scale={[c.scale, c.scale * 0.45, 1]} />
            ))}

            <CourseBody key={course.level} course={course} reached={reached} squash={squash} />

            {/* Start arch */}
            <group position={[0, 0, START_LINE_Z]}>
                {[-3.4, 3.4].map((x) => (
                    <mesh key={x} position={[x, 1.6, 0]}>
                        <boxGeometry args={[0.35, 3.2, 0.35]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.5} />
                    </mesh>
                ))}
                <mesh position={[0, 3.35, 0]}>
                    <boxGeometry args={[7.2, 0.4, 0.4]} />
                    <meshStandardMaterial color="#ff6a6a" />
                </mesh>
                <Text position={[0, 3.35, 0.22]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
                    START
                </Text>
                <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[6.8, 0.2]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            </group>
            <group position={[0, 2.2, -1]}>
                <Text fontSize={0.4} color="#ffffff" outlineWidth={0.02} outlineColor="#2a4a7a" anchorX="center" fontWeight="bold">
                    {`SKY COURSE ${course.level}`}
                </Text>
                <Text position={[0, -0.42, 0]} fontSize={0.16} color="#ffffff" outlineWidth={0.012} outlineColor="#2a4a7a" anchorX="center">
                    {best ? `Your best: ${format(best.time)}  ·  par ${format(course.par)}` : `Run through the arch to start · par ${format(course.par)}`}
                </Text>
            </group>

            {/* The bell, high over the goal deck */}
            <group ref={bell} position={[g.at[0], g.top + BELL_HEIGHT, g.at[1]]}>
                <mesh>
                    <cylinderGeometry args={[0.25, 0.6, 0.8, 24, 1, true]} />
                    <meshStandardMaterial color="#ffd23c" metalness={1} roughness={0.2} emissive="#ffb000" emissiveIntensity={0.3} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.45, 0]}>
                    <sphereGeometry args={[0.26, 16, 12]} />
                    <meshStandardMaterial color="#ffd23c" metalness={1} roughness={0.2} />
                </mesh>
            </group>
            <pointLight position={[g.at[0], g.top + BELL_HEIGHT - 0.6, g.at[1]]} intensity={8} distance={9} color="#ffd88a" />
            <Text position={[g.at[0], g.top + 0.02, g.at[1] + g.size[1] / 2 - 0.6]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.3} color="#8a6a2a" anchorX="center">
                FINISH
            </Text>

            {portalsOpen && <ExitPortals key={`portals-${course.level}`} course={course} onEnter={enterPortal} />}

            {/* Your ghost */}
            <group ref={ghost} visible={false}>
                <mesh position={[0, 1, 0]}>
                    <capsuleGeometry args={[0.3, 1, 6, 12]} />
                    <meshBasicMaterial color="#8ff0ff" transparent opacity={0.35} depthWrite={false} />
                </mesh>
            </group>

            {reward && <Rupee rupee={reward} animationType="rotating" />}

            {/* Clock */}
            <Html fullscreen zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                {(hud.running || hud.finished !== null || hud.message) && (
                    <div
                        style={{
                            position: "absolute",
                            top: 18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            padding: "8px 18px",
                            borderRadius: 14,
                            background: "rgba(12, 18, 36, 0.45)",
                            backdropFilter: "blur(8px)",
                            color: "#fff",
                            fontFamily: "Manrope, sans-serif",
                            textAlign: "center",
                            border: "1px solid rgba(255,255,255,0.25)",
                        }}
                    >
                        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7 }}>{`COURSE ${course.level}`}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                            {format(hud.finished ?? hud.time)}
                        </div>
                        {hud.message && <div style={{ fontSize: 13, opacity: 0.85 }}>{hud.message}</div>}
                    </div>
                )}
            </Html>
        </>
    );
};
