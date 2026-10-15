import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import {
    CuboidCollider,
    RigidBody,
    interactionGroups,
    useRapier,
} from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { GemPrompt } from "../../ui/GemPrompt";
import { useSceneStore } from "../../../stores/sceneStore";
import { useAchievementStore } from "../../../stores/achievementStore";
import { getAudioContext } from "../../../audio/soundManager";
import {
    InstrumentId,
    JamTransport,
    LoopId,
    TickEvent,
    playInstrument,
    previewInstrument,
} from "./jamAudio";
import { BPB_RANGE, BPM_RANGE, MAX_STEPS, ROWS, useJamStore } from "./jamStore";
import { INSTRUMENTS, InstrumentModel, instrumentInfo } from "./jamInstruments";
import { getEnhancedRoomMaterials } from "../../../configs/enhancedMaterials";

// The Jam Room. Everything here makes a sound, and nothing needs explaining:
//  - Step on a glowing floor pad to start (or stop) a loop.
//  - The far wall is the song: four rows of cells, two bars long. Look at a
//    cell and press E to light it; lit cells play when the light sweeps by.
//  - Each row plays whatever instrument sits on its little shelf. Pick an
//    instrument off the rack (E), carry it - it floats along in front of
//    you - and put it on a shelf (E) to give that row its sound.
//  - On the left wall: tempo, beats in a bar, and a button to clear the wall.

const HALF = 7;
const HEIGHT = 7;
const WALL_Z = -HALF + 0.08;
const ROW_Y = [3.2, 2.55, 1.9, 1.25]; // row 0 at the top
const CELL = 0.5;
const PITCH = 0.6;
const BAR_GAP = 0.28;
const GRID_CENTER_X = 0.7;
const SHELF_X = -5.95;
const REACH_WALL = 10; // aiming at the wall works from anywhere in the room
const REACH_HANDS = 4.2; // picking up and placing has to be closer
const INSTRUMENT_GROUP = interactionGroups(2, [0, 2]); // collide with the room, never the player

const LOOPS: { id: LoopId; name: string; color: string; position: [number, number] }[] = [
    { id: "beat", name: "BEAT", color: "#ff4d5e", position: [-2.6, 0.6] },
    { id: "bass", name: "BASS", color: "#b06bff", position: [0, 0.6] },
    { id: "chords", name: "CHORDS", color: "#4da6ff", position: [2.6, 0.6] },
    { id: "melody", name: "MELODY", color: "#3ee58f", position: [-2.6, 3.0] },
    { id: "sparkle", name: "SPARKLE", color: "#ffd23c", position: [0, 3.0] },
    { id: "shaker", name: "SHAKER", color: "#ffa64d", position: [2.6, 3.0] },
];
const PAD_RADIUS = 0.8;

// Rack: two shelves on the east wall, drums below and tunes above.
const RACK_X = HALF - 0.36;
const RACK_SHELF_Y = [0.75, 1.6];
const RACK_SLOTS: Record<InstrumentId, [number, number, number]> = (() => {
    const order: InstrumentId[] = ["drum", "snare", "hat", "clap", "bass", "piano", "bells", "synth"];
    const slots = {} as Record<InstrumentId, [number, number, number]>;
    order.forEach((id, i) => {
        const shelf = Math.floor(i / 4);
        const z = -2.1 + (i % 4) * 1.4;
        slots[id] = [RACK_X, RACK_SHELF_Y[shelf] + 0.03 + instrumentInfo(id).half[1] + 0.02, z];
    });
    return slots;
})();

const shelfTopY = (row: number) => ROW_Y[row] - 0.3;
const shelfSpot = (row: number, id: InstrumentId): [number, number, number] => [
    SHELF_X,
    shelfTopY(row) + instrumentInfo(id).half[1] + 0.01,
    -HALF + 0.38,
];

const cellX = (step: number, steps: number, beatsPerBar: number) => {
    const width = steps * PITCH - (PITCH - CELL) + BAR_GAP;
    return GRID_CENTER_X - width / 2 + CELL / 2 + step * PITCH + (step >= beatsPerBar ? BAR_GAP : 0);
};

type Target =
    | { kind: "cell"; row: number; step: number }
    | { kind: "shelf"; row: number }
    | { kind: "instrument"; id: InstrumentId }
    | { kind: "button"; action: "bpm-" | "bpm+" | "bpb-" | "bpb+" | "clear" };

type Mode = { mode: "free" } | { mode: "held" } | { mode: "placed"; row: number };

// --- Small parts -------------------------------------------------------------

const RoundButton: React.FC<{
    position: [number, number, number];
    label: string;
    color: string;
    action: Target & { kind: "button" };
    register: (mesh: THREE.Object3D | null, target: Target) => void;
    hovered: boolean;
    size?: number;
}> = ({ position, label, color, action, register, hovered, size = 0.32 }) => (
    <group position={position}>
        <mesh rotation={[Math.PI / 2, 0, 0]} ref={(m) => register(m, action)}>
            <cylinderGeometry args={[size, size, 0.12, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.9 : 0.35} roughness={0.4} />
        </mesh>
        <Text position={[0, 0, 0.07]} fontSize={size * 1.1} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            {label}
        </Text>
    </group>
);

// --- The room ------------------------------------------------------------------

export const JamRoom: React.FC = () => {
    const { camera, raycaster } = useThree();
    const { rapier } = useRapier();
    const bpm = useJamStore((s) => s.bpm);
    const beatsPerBar = useJamStore((s) => s.beatsPerBar);
    const rows = useJamStore((s) => s.rows);
    const loops = useJamStore((s) => s.loops);
    const steps = beatsPerBar * 2;

    // --- Transport, and the visual beat that follows it ----------------------
    const transport = useMemo(() => new JamTransport(() => useJamStore.getState()), []);
    const pending = useRef<TickEvent[]>([]);
    const beat = useRef({ playhead: -1, lastBeat: 0, pulse: 0, rowFlash: [0, 0, 0, 0], sixteenthPulse: 0 });
    useEffect(() => {
        const off = transport.onTick((event) => pending.current.push(event));
        transport.start();
        return () => {
            off();
            transport.stop();
        };
    }, [transport]);

    // --- Interaction ---------------------------------------------------------
    const targets = useRef(new Map<THREE.Object3D, Target>());
    const register = (mesh: THREE.Object3D | null, target: Target) => {
        if (mesh) targets.current.set(mesh, target);
    };
    const [hover, setHover] = useState<Target | null>(null);
    const hoverRef = useRef<Target | null>(null);
    const promptAnchor = useRef<THREE.Group>(null);
    const hoverPoint = useMemo(() => new THREE.Vector3(), []);

    // --- Instruments ---------------------------------------------------------
    const bodies = useRef(new Map<InstrumentId, RapierRigidBody>());
    const instrumentMeshes = useRef(new Map<InstrumentId, THREE.Group>());
    const initialModes = useMemo(() => {
        const modes = new Map<InstrumentId, Mode>();
        INSTRUMENTS.forEach(({ id }) => modes.set(id, { mode: "free" }));
        useJamStore.getState().rows.forEach((row, i) => {
            if (row.instrument) modes.set(row.instrument, { mode: "placed", row: i });
        });
        return modes;
    }, []);
    const modes = useRef(new Map(initialModes));
    const [held, setHeld] = useState<InstrumentId | null>(null);
    const heldRef = useRef<InstrumentId | null>(null);
    useEffect(() => useJamStore.getState().setHeld(held), [held]);

    const setMode = (id: InstrumentId, mode: Mode) => {
        const body = bodies.current.get(id);
        const previous = modes.current.get(id);
        modes.current.set(id, mode);
        if (!body) return;
        if (mode.mode === "placed") {
            body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
        } else if (previous?.mode === "placed") {
            body.setBodyType(rapier.RigidBodyType.Dynamic, true);
        }
        body.setGravityScale(mode.mode === "held" ? 0 : 1, true);
        body.setLinearDamping(mode.mode === "held" ? 4 : 0.2);
        body.setAngularDamping(mode.mode === "held" ? 6 : 0.4);
        body.wakeUp();
    };

    const grab = (id: InstrumentId) => {
        const mode = modes.current.get(id);
        if (mode?.mode === "placed") useJamStore.getState().place(mode.row, null);
        if (heldRef.current && heldRef.current !== id) setMode(heldRef.current, { mode: "free" });
        setMode(id, { mode: "held" });
        heldRef.current = id;
        setHeld(id);
        previewInstrument(id);
    };

    const placeOn = (row: number) => {
        const id = heldRef.current;
        if (!id) return;
        // Whatever was on that shelf hops off.
        const occupant = useJamStore.getState().rows[row].instrument;
        if (occupant && occupant !== id) {
            setMode(occupant, { mode: "free" });
            bodies.current.get(occupant)?.setLinvel({ x: 0.6, y: 1.5, z: 1.6 }, true);
        }
        useJamStore.getState().place(row, id);
        setMode(id, { mode: "placed", row });
        heldRef.current = null;
        setHeld(null);
        playInstrument(id, undefined, 60);
        useAchievementStore.getState().unlock("jam-bandleader");
    };

    const drop = () => {
        const id = heldRef.current;
        if (!id) return;
        setMode(id, { mode: "free" });
        heldRef.current = null;
        setHeld(null);
    };

    const act = () => {
        if (useSceneStore.getState().showStartPrompt) return;
        const target = hoverRef.current;
        const jam = useJamStore.getState();
        if (!target) {
            drop();
            return;
        }
        switch (target.kind) {
            case "cell": {
                const instrument = jam.rows[target.row].instrument;
                if (!instrument) return;
                const turningOn = !jam.rows[target.row].cells[target.step];
                jam.toggleCell(target.row, target.step);
                if (turningOn) previewInstrument(instrument);
                break;
            }
            case "shelf":
                if (heldRef.current) placeOn(target.row);
                else if (jam.rows[target.row].instrument) grab(jam.rows[target.row].instrument!);
                break;
            case "instrument":
                if (heldRef.current === target.id) drop();
                else grab(target.id);
                break;
            case "button":
                if (target.action === "bpm-") jam.nudgeBpm(-10);
                if (target.action === "bpm+") jam.nudgeBpm(10);
                if (target.action === "bpb-") jam.nudgeBeatsPerBar(-1);
                if (target.action === "bpb+") jam.nudgeBeatsPerBar(1);
                if (target.action === "clear") jam.clearGrid();
                playInstrument("hat", undefined, 60, 0.8);
                break;
        }
    };
    const actRef = useRef(act);
    actRef.current = act;
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat) actRef.current();
        };
        const onClick = () => {
            if (document.pointerLockElement || "ontouchstart" in window) actRef.current();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("click", onClick);
        window.addEventListener("virtualtap", onClick);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("click", onClick);
            window.removeEventListener("virtualtap", onClick);
        };
    }, []);
    useEffect(
        () => () => {
            useJamStore.getState().setHeld(null);
        },
        []
    );

    // --- The grid wall (one instanced mesh for every cell) ------------------
    const cells = useMemo(() => {
        const geometry = new THREE.BoxGeometry(CELL, CELL, 0.06);
        const material = new THREE.MeshBasicMaterial({ toneMapped: false });
        const mesh = new THREE.InstancedMesh(geometry, material, ROWS * MAX_STEPS);
        mesh.setColorAt(0, new THREE.Color());
        mesh.frustumCulled = false;
        return mesh;
    }, []);
    useEffect(() => () => {
        cells.geometry.dispose();
        (cells.material as THREE.Material).dispose();
    }, [cells]);
    useEffect(() => {
        const m = new THREE.Matrix4();
        for (let row = 0; row < ROWS; row++) {
            for (let step = 0; step < MAX_STEPS; step++) {
                const visible = step < steps;
                m.makeScale(visible ? 1 : 0, visible ? 1 : 0, visible ? 1 : 0);
                m.setPosition(visible ? cellX(step, steps, beatsPerBar) : 0, ROW_Y[row], WALL_Z + 0.06);
                cells.setMatrixAt(row * MAX_STEPS + step, m);
            }
        }
        cells.instanceMatrix.needsUpdate = true;
        cells.computeBoundingSphere();
    }, [cells, steps, beatsPerBar]);

    // --- Per frame -------------------------------------------------------------
    const color = useMemo(() => new THREE.Color(), []);
    const white = useMemo(() => new THREE.Color("#ffffff"), []);
    const grey = useMemo(() => new THREE.Color("#3a3446"), []);
    const pads = useRef<(THREE.Mesh | null)[]>([]);
    const padInside = useRef<boolean[]>(LOOPS.map(() => false));
    const pendulum = useRef<THREE.Group>(null);
    const lights = useRef<(THREE.PointLight | null)[]>([]);
    const tmp = useMemo(
        () => ({ dir: new THREE.Vector3(), target: new THREE.Vector3(), q: new THREE.Quaternion(), qe: new THREE.Quaternion(), e: new THREE.Euler() }),
        []
    );

    useFrame((_, delta) => {
        const jam = useJamStore.getState();
        const ctx = getAudioContext();
        const b = beat.current;

        // Catch up with the beats that have actually sounded by now.
        if (ctx) {
            while (pending.current.length && pending.current[0].time <= ctx.currentTime) {
                const event = pending.current.shift()!;
                if (event.sixteenth % 4 === 0) {
                    b.lastBeat = event.time;
                    b.pulse = 1;
                }
                if (event.step !== null) {
                    b.playhead = event.step;
                    jam.rows.forEach((row, i) => {
                        if (row.instrument && row.cells[event.step!]) b.rowFlash[i] = 1;
                    });
                }
            }
        }
        b.pulse = Math.max(0, b.pulse - delta * 4);
        b.rowFlash = b.rowFlash.map((f) => Math.max(0, f - delta * 5));

        // Cells
        for (let row = 0; row < ROWS; row++) {
            const instrument = jam.rows[row].instrument;
            const base = instrument ? instrumentInfo(instrument).color : null;
            for (let step = 0; step < MAX_STEPS; step++) {
                const on = jam.rows[row].cells[step];
                if (base) color.set(base).multiplyScalar(on ? 1.3 : 0.18);
                else color.copy(grey).multiplyScalar(on ? 1.6 : 1);
                if (step === b.playhead) color.lerp(white, on ? 0.55 * (0.4 + b.rowFlash[row]) : 0.18);
                const hovered = hoverRef.current?.kind === "cell" && hoverRef.current.row === row && hoverRef.current.step === step;
                if (hovered) color.lerp(white, 0.35);
                cells.setColorAt(row * MAX_STEPS + step, color);
            }
        }
        if (cells.instanceColor) cells.instanceColor.needsUpdate = true;

        // Floor pads: step on to toggle.
        const [px, , pz] = useSceneStore.getState().playerPosition;
        LOOPS.forEach((loop, i) => {
            const inside = Math.hypot(px - loop.position[0], pz - loop.position[1]) < PAD_RADIUS - 0.1;
            if (inside && !padInside.current[i]) {
                jam.toggleLoop(loop.id);
            }
            padInside.current[i] = inside;
            const pad = pads.current[i];
            if (pad) {
                const active = jam.loops[loop.id];
                const material = pad.material as THREE.MeshStandardMaterial;
                material.emissiveIntensity = active ? 0.9 + b.pulse * 1.2 : 0.12;
                pad.position.y = inside ? 0.015 : 0.04;
                pad.scale.setScalar(active ? 1 + b.pulse * 0.05 : 1);
            }
        });

        // Metronome pendulum: one swing per beat.
        if (pendulum.current && ctx) {
            const beatLength = 60 / jam.bpm;
            const phase = Math.min(1, (ctx.currentTime - b.lastBeat) / beatLength);
            const swing = Math.floor((b.lastBeat / beatLength) % 2) === 0 ? 1 : -1;
            pendulum.current.rotation.z = Math.cos(phase * Math.PI) * 0.45 * swing;
        }
        lights.current.forEach((light, i) => {
            if (light) light.intensity = 3 + b.pulse * (i % 2 ? 2.5 : 1.5);
        });

        // Aim: what's under the crosshair?
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        // (Skip anything React has since unmounted: it has no parent.)
        const objects = [...targets.current.keys()].filter((o) => o.parent);
        objects.push(cells);
        let found: Target | null = null;
        const heldId = heldRef.current;
        for (const hit of raycaster.intersectObjects(objects, true)) {
            let target: Target | null = null;
            if (hit.object === cells && hit.instanceId !== undefined) {
                const row = Math.floor(hit.instanceId / MAX_STEPS);
                const step = hit.instanceId % MAX_STEPS;
                if (step < jam.beatsPerBar * 2) target = { kind: "cell", row, step };
            } else {
                let o: THREE.Object3D | null = hit.object;
                while (o && !targets.current.has(o)) o = o.parent;
                if (o) target = targets.current.get(o)!;
            }
            if (!target) continue;
            if (target.kind === "instrument" && target.id === heldId) continue; // see past what you carry
            const reach = target.kind === "cell" || target.kind === "button" ? REACH_WALL : REACH_HANDS;
            if (hit.distance > reach) break;
            found = target;
            hoverPoint.copy(hit.point);
            break;
        }
        if (useSceneStore.getState().showStartPrompt) found = null;
        if (JSON.stringify(found) !== JSON.stringify(hoverRef.current)) {
            hoverRef.current = found;
            setHover(found);
        }
        if (promptAnchor.current) {
            if (found) promptAnchor.current.position.copy(hoverPoint).y += 0.3;
            else if (heldId) {
                const body = bodies.current.get(heldId);
                if (body) {
                    const p = body.translation();
                    promptAnchor.current.position.set(p.x, p.y + 0.35, p.z);
                }
            }
        }

        // Instruments: carried ones float after you, placed ones sit on their
        // shelf and hop when their row plays.
        modes.current.forEach((mode, id) => {
            const body = bodies.current.get(id);
            if (!body) return;
            if (mode.mode === "held") {
                camera.getWorldDirection(tmp.dir);
                tmp.target.copy(camera.position).addScaledVector(tmp.dir, 1.2);
                tmp.target.y = Math.max(0.35, tmp.target.y - 0.35);
                const p = body.translation();
                const v = tmp.target.sub(p as THREE.Vector3).multiplyScalar(10);
                if (v.length() > 14) v.setLength(14);
                body.setLinvel(v, true);
                // Turn to face you, with a little lag and sway.
                const yaw = Math.atan2(tmp.dir.x, tmp.dir.z) + Math.PI;
                tmp.q.setFromEuler(tmp.e.set(0.15, yaw, 0));
                const r = body.rotation();
                tmp.qe.set(r.x, r.y, r.z, r.w).invert().premultiply(tmp.q);
                if (tmp.qe.w < 0) tmp.qe.set(-tmp.qe.x, -tmp.qe.y, -tmp.qe.z, -tmp.qe.w);
                const angle = 2 * Math.acos(Math.min(1, tmp.qe.w));
                const s = Math.sqrt(1 - tmp.qe.w * tmp.qe.w) || 1;
                body.setAngvel({ x: (tmp.qe.x / s) * angle * 6, y: (tmp.qe.y / s) * angle * 6, z: (tmp.qe.z / s) * angle * 6 }, true);
            } else if (mode.mode === "placed") {
                const [x, y, z] = shelfSpot(mode.row, id);
                const hop = b.rowFlash[mode.row] * 0.06;
                body.setNextKinematicTranslation({ x, y: y + hop, z });
                body.setNextKinematicRotation(tmp.q.setFromEuler(tmp.e.set(0, 0, b.rowFlash[mode.row] * 0.08)));
            } else if (body.translation().y < -3) {
                // Fell out of the world somehow: back to the rack.
                const [x, y, z] = RACK_SLOTS[id];
                body.setTranslation({ x, y, z }, true);
                body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
            const group = instrumentMeshes.current.get(id);
            if (group) {
                const hovered = hoverRef.current?.kind === "instrument" && hoverRef.current.id === id;
                group.scale.setScalar(hovered || mode.mode === "held" ? 1.08 : 1);
            }
        });
    });

    // --- Prompt text -------------------------------------------------------------
    const jamRows = rows;
    const prompt = (() => {
        if (hover) {
            switch (hover.kind) {
                case "cell": {
                    const instrument = jamRows[hover.row].instrument;
                    if (!instrument) {
                        return <GemPrompt accent="red" keyLabel={null} action="Put an instrument on this row's shelf first" />;
                    }
                    const on = jamRows[hover.row].cells[hover.step];
                    return <GemPrompt accent="gold" action={on ? "Turn off" : "Light it up"} />;
                }
                case "shelf": {
                    const occupant = jamRows[hover.row].instrument;
                    if (held) return <GemPrompt accent="gold" action={`Put the ${instrumentInfo(held).name} here`} />;
                    if (occupant) return <GemPrompt action={`Pick up the ${instrumentInfo(occupant).name}`} />;
                    return <GemPrompt accent="silver" keyLabel={null} action="Bring an instrument to this shelf" />;
                }
                case "instrument":
                    return <GemPrompt action={`Pick up the ${instrumentInfo(hover.id).name}`} />;
                case "button":
                    return (
                        <GemPrompt
                            accent="gold"
                            action={
                                {
                                    "bpm-": "Slower",
                                    "bpm+": "Faster",
                                    "bpb-": "Fewer beats in a bar",
                                    "bpb+": "More beats in a bar",
                                    clear: "Clear the wall",
                                }[hover.action]
                            }
                        />
                    );
            }
        }
        if (held) return <GemPrompt action={`Drop the ${instrumentInfo(held).name} (or put it on a shelf)`} />;
        return null;
    })();

    // --- Static geometry ---------------------------------------------------------
    const cables = useMemo(
        () =>
            ROW_Y.map((y, row) => {
                const curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(SHELF_X + 0.42, shelfTopY(row) + 0.05, WALL_Z + 0.03),
                    new THREE.Vector3(SHELF_X + 0.9, y - 0.05, WALL_Z + 0.03),
                    new THREE.Vector3(cellX(0, steps, beatsPerBar) - CELL / 2 - 0.05, y, WALL_Z + 0.03),
                ]);
                return new THREE.TubeGeometry(curve, 24, 0.02, 6);
            }),
        [steps, beatsPerBar]
    );
    useEffect(() => () => cables.forEach((c) => c.dispose()), [cables]);

    // Shared, cached materials - not ours to dispose.
    const shell = useMemo(() => getEnhancedRoomMaterials("jam-room"), []);
    const feltMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4b3474", roughness: 1 }), []);
    useEffect(() => () => feltMaterial.dispose(), [feltMaterial]);

    const isHover = (t: Target) => JSON.stringify(hover) === JSON.stringify(t);

    return (
        <>
            <RoomEnvironmentReady />

            {/* Lights: warm, colourful, breathing with the beat */}
            <ambientLight intensity={0.35} color="#ffe6fb" />
            <hemisphereLight intensity={0.5} color="#ffd6f5" groundColor="#2a1a40" />
            {[
                [-4, HEIGHT - 0.6, -3, "#ff8ad8"],
                [4, HEIGHT - 0.6, -3, "#8ff0ff"],
                [-4, HEIGHT - 0.6, 3.5, "#ffd23c"],
                [4, HEIGHT - 0.6, 3.5, "#b06bff"],
            ].map(([x, y, z, c], i) => (
                <pointLight
                    key={i}
                    ref={(l) => {
                        lights.current[i] = l;
                    }}
                    position={[x as number, y as number, z as number]}
                    intensity={3}
                    distance={12}
                    decay={1.5}
                    color={c as string}
                />
            ))}

            {/* Room shell */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[HALF, 0.25, HALF]} position={[0, -0.25, 0]} />
                <CuboidCollider args={[HALF, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, -HALF - 0.2]} />
                <CuboidCollider args={[HALF, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, HALF + 0.2]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF]} position={[-HALF - 0.2, HEIGHT / 2, 0]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF]} position={[HALF + 0.2, HEIGHT / 2, 0]} />
                <CuboidCollider args={[HALF, 0.2, HALF]} position={[0, HEIGHT + 0.2, 0]} />
                {/* Rack shelves */}
                {RACK_SHELF_Y.map((y) => (
                    <CuboidCollider key={y} args={[0.33, 0.03, 2.9]} position={[RACK_X, y, 0]} />
                ))}
                {/* Row shelves */}
                {ROW_Y.map((_, row) => (
                    <CuboidCollider key={row} args={[0.42, 0.025, 0.3]} position={[SHELF_X, shelfTopY(row) - 0.025, -HALF + 0.3]} />
                ))}
            </RigidBody>
            {/* Floor: soft patterned carpet */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={shell.floor}>
                <planeGeometry args={[HALF * 2, HALF * 2]} />
            </mesh>
            {/* Walls and ceiling (seen from inside) */}
            {[
                { p: [0, HEIGHT / 2, -HALF], r: [0, 0, 0], w: HALF * 2 },
                { p: [0, HEIGHT / 2, HALF], r: [0, Math.PI, 0], w: HALF * 2 },
                { p: [-HALF, HEIGHT / 2, 0], r: [0, Math.PI / 2, 0], w: HALF * 2 },
                { p: [HALF, HEIGHT / 2, 0], r: [0, -Math.PI / 2, 0], w: HALF * 2 },
            ].map((wall, i) => (
                <mesh key={i} position={wall.p as [number, number, number]} rotation={wall.r as [number, number, number]} material={shell.walls}>
                    <planeGeometry args={[wall.w, HEIGHT]} />
                </mesh>
            ))}
            <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} material={shell.ceiling}>
                <planeGeometry args={[HALF * 2, HALF * 2]} />
            </mesh>
            {/* Felt dado band around the room */}
            {[0, 1, 2, 3].map((side) => (
                <mesh
                    key={side}
                    position={[
                        side === 2 ? -HALF + 0.01 : side === 3 ? HALF - 0.01 : 0,
                        0.6,
                        side === 0 ? -HALF + 0.01 : side === 1 ? HALF - 0.01 : 0,
                    ]}
                    rotation={[0, [0, Math.PI, Math.PI / 2, -Math.PI / 2][side], 0]}
                    material={feltMaterial}
                >
                    <planeGeometry args={[HALF * 2, 1.2]} />
                </mesh>
            ))}

            {/* ---- The song wall ---- */}
            <mesh position={[GRID_CENTER_X - 0.6, 2.2, WALL_Z]}>
                <boxGeometry args={[12.2, 3.2, 0.04]} />
                <meshStandardMaterial color="#1a1428" roughness={0.6} />
            </mesh>
            <primitive object={cells} />
            {/* Bar line between the two bars */}
            <mesh position={[cellX(beatsPerBar, steps, beatsPerBar) - CELL / 2 - BAR_GAP / 2 - (PITCH - CELL) / 2, 2.2, WALL_Z + 0.05]}>
                <boxGeometry args={[0.04, 2.8, 0.02]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.35} />
            </mesh>
            <Text position={[GRID_CENTER_X, 4.1, WALL_Z + 0.05]} fontSize={0.42} color="#ffe6fb" anchorX="center" anchorY="middle" fontWeight="bold">
                YOUR SONG
            </Text>
            <Text position={[GRID_CENTER_X, 3.72, WALL_Z + 0.05]} fontSize={0.17} color="#cbb8ef" anchorX="center" anchorY="middle">
                Look at a square and press E to light it up
            </Text>
            {/* Row shelves, each wired to its row */}
            {ROW_Y.map((_, row) => {
                const instrument = rows[row].instrument;
                const tint = instrument ? instrumentInfo(instrument).color : "#6a5a88";
                return (
                    <group key={row}>
                        <mesh
                            position={[SHELF_X, shelfTopY(row) - 0.025, -HALF + 0.3]}
                            ref={(m) => register(m, { kind: "shelf", row })}
                        >
                            <boxGeometry args={[0.84, 0.05, 0.6]} />
                            <meshStandardMaterial
                                color={tint}
                                emissive={tint}
                                emissiveIntensity={isHover({ kind: "shelf", row }) ? 0.9 : held ? 0.5 : 0.2}
                                roughness={0.5}
                            />
                        </mesh>
                        {/* An invisible, taller box so aiming at a shelf is easy */}
                        <mesh
                            position={[SHELF_X, shelfTopY(row) + 0.22, -HALF + 0.35]}
                            visible={false}
                            ref={(m) => register(m, { kind: "shelf", row })}
                        >
                            <boxGeometry args={[0.84, 0.45, 0.55]} />
                        </mesh>
                        <mesh geometry={cables[row]}>
                            <meshBasicMaterial color={tint} toneMapped={false} />
                        </mesh>
                        {!instrument && (
                            <Text position={[SHELF_X, shelfTopY(row) + 0.2, -HALF + 0.12]} fontSize={0.22} color="#cbb8ef" anchorX="center" anchorY="middle">
                                ?
                            </Text>
                        )}
                    </group>
                );
            })}

            {/* ---- Left wall: tempo, beats per bar, clear ---- */}
            <group position={[-HALF + 0.06, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 2.3, -0.02]}>
                    <boxGeometry args={[6.4, 3.4, 0.04]} />
                    <meshStandardMaterial color="#1a1428" roughness={0.6} />
                </mesh>
                {/* Tempo */}
                <group position={[1.6, 0, 0]}>
                    <Text position={[0, 3.5, 0.03]} fontSize={0.26} color="#ffe6fb" anchorX="center" fontWeight="bold">
                        TEMPO
                    </Text>
                    <Text position={[0, 2.35, 0.03]} fontSize={0.62} color="#ffd23c" anchorX="center" anchorY="middle" fontWeight="bold">
                        {String(bpm)}
                    </Text>
                    <Text position={[0, 1.85, 0.03]} fontSize={0.15} color="#cbb8ef" anchorX="center">
                        {bpm <= BPM_RANGE[0] ? "slowest" : bpm >= BPM_RANGE[1] ? "fastest" : "beats a minute"}
                    </Text>
                    <RoundButton position={[-1.0, 2.35, 0.06]} label="−" color="#4da6ff" action={{ kind: "button", action: "bpm-" }} register={register} hovered={isHover({ kind: "button", action: "bpm-" })} />
                    <RoundButton position={[1.0, 2.35, 0.06]} label="+" color="#ff4d5e" action={{ kind: "button", action: "bpm+" }} register={register} hovered={isHover({ kind: "button", action: "bpm+" })} />
                    {/* Metronome */}
                    <group position={[0, 3.25, 0.05]}>
                        <group ref={pendulum}>
                            <mesh position={[0, -0.32, 0]}>
                                <boxGeometry args={[0.025, 0.6, 0.02]} />
                                <meshStandardMaterial color="#e8c25a" metalness={0.8} roughness={0.3} />
                            </mesh>
                            <mesh position={[0, -0.5, 0.01]}>
                                <boxGeometry args={[0.09, 0.07, 0.03]} />
                                <meshStandardMaterial color="#ffd23c" emissive="#ffd23c" emissiveIntensity={0.4} />
                            </mesh>
                        </group>
                    </group>
                </group>
                {/* Beats in a bar */}
                <group position={[-1.6, 0, 0]}>
                    <Text position={[0, 3.5, 0.03]} fontSize={0.22} color="#ffe6fb" anchorX="center" fontWeight="bold">
                        BEATS IN A BAR
                    </Text>
                    <Text position={[0, 2.35, 0.03]} fontSize={0.62} color="#3ee5c8" anchorX="center" anchorY="middle" fontWeight="bold">
                        {String(beatsPerBar)}
                    </Text>
                    <Text position={[0, 1.85, 0.03]} fontSize={0.15} color="#cbb8ef" anchorX="center">
                        {`${beatsPerBar * 2} squares in each row`}
                    </Text>
                    <RoundButton position={[-1.0, 2.35, 0.06]} label="−" color="#4da6ff" action={{ kind: "button", action: "bpb-" }} register={register} hovered={isHover({ kind: "button", action: "bpb-" })} />
                    <RoundButton position={[1.0, 2.35, 0.06]} label="+" color="#ff4d5e" action={{ kind: "button", action: "bpb+" }} register={register} hovered={isHover({ kind: "button", action: "bpb+" })} />
                    {/* Little beat dots */}
                    {Array.from({ length: BPB_RANGE[1] }, (_, k) => (
                        <mesh key={k} position={[(k - (beatsPerBar - 1) / 2) * 0.16, 3.1, 0.03]} visible={k < beatsPerBar}>
                            <circleGeometry args={[0.05, 16]} />
                            <meshBasicMaterial color="#3ee5c8" toneMapped={false} />
                        </mesh>
                    ))}
                </group>
                <RoundButton position={[0, 1.1, 0.06]} label="CLEAR" color="#7a5aa8" size={0.42} action={{ kind: "button", action: "clear" }} register={register} hovered={isHover({ kind: "button", action: "clear" })} />
            </group>

            {/* ---- Right wall: the instrument rack ---- */}
            <group>
                {RACK_SHELF_Y.map((y) => (
                    <mesh key={y} position={[RACK_X, y, 0]}>
                        <boxGeometry args={[0.66, 0.06, 5.8]} />
                        <meshStandardMaterial color="#c98a5a" roughness={0.7} />
                    </mesh>
                ))}
                <mesh position={[HALF - 0.03, 1.25, 0]}>
                    <boxGeometry args={[0.04, 1.9, 6]} />
                    <meshStandardMaterial color="#a86e46" roughness={0.8} />
                </mesh>
                <Text position={[HALF - 0.06, 2.55, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.34} color="#ffe6fb" anchorX="center" fontWeight="bold">
                    INSTRUMENTS
                </Text>
                <Text position={[HALF - 0.06, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.16} color="#cbb8ef" anchorX="center">
                    Press E to pick one up. Put it on a shelf by your song.
                </Text>
            </group>

            {INSTRUMENTS.map((info) => {
                const mode = initialModes.get(info.id)!;
                const start = mode.mode === "placed" ? shelfSpot(mode.row, info.id) : RACK_SLOTS[info.id];
                return (
                    <RigidBody
                        key={info.id}
                        ref={(b) => {
                            if (b) bodies.current.set(info.id, b);
                        }}
                        type={mode.mode === "placed" ? "kinematicPosition" : "dynamic"}
                        position={start}
                        colliders={false}
                        canSleep
                        ccd
                    >
                        <CuboidCollider args={info.half} collisionGroups={INSTRUMENT_GROUP} friction={0.8} restitution={0.25} mass={0.6} />
                        <group
                            ref={(g) => {
                                if (g) {
                                    instrumentMeshes.current.set(info.id, g);
                                    register(g, { kind: "instrument", id: info.id });
                                }
                            }}
                        >
                            <InstrumentModel id={info.id} glow={held === info.id ? 0.4 : 0.08} />
                        </group>
                    </RigidBody>
                );
            })}

            {/* ---- Floor pads ---- */}
            <Text position={[0, 0.02, 4.7]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color="#ffe6fb" anchorX="center" fontWeight="bold">
                STEP ON A PAD
            </Text>
            {LOOPS.map((loop, i) => (
                <group key={loop.id} position={[loop.position[0], 0, loop.position[1]]}>
                    <mesh
                        ref={(m) => {
                            pads.current[i] = m;
                        }}
                        position={[0, 0.04, 0]}
                    >
                        <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS * 1.04, 0.08, 40]} />
                        <meshStandardMaterial color={loop.color} emissive={loop.color} emissiveIntensity={0.12} roughness={0.35} />
                    </mesh>
                    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[PAD_RADIUS * 1.05, PAD_RADIUS * 1.14, 48]} />
                        <meshBasicMaterial color={loop.color} toneMapped={false} />
                    </mesh>
                    <Text position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color={loops[loop.id] ? "#ffffff" : "#1a1428"} anchorX="center" anchorY="middle" fontWeight="bold">
                        {loop.name}
                    </Text>
                </group>
            ))}

            {/* The one prompt, wherever you're looking */}
            <group ref={promptAnchor}>
                {prompt && (
                    <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                        {prompt}
                    </Html>
                )}
            </group>
        </>
    );
};
