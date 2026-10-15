import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { BallCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import type { CollisionEnterPayload, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { GemPrompt } from "../../ui/GemPrompt";
import { useAimTargets } from "../../core/useAimTargets";
import { useSceneStore } from "../../../stores/sceneStore";
import { useAchievementStore } from "../../../stores/achievementStore";
import { playSound } from "../../../audio/soundManager";
import { playInstrument } from "../jam/jamAudio";
import { COLS, PieceKind, ROWS, cellKey, useMarbleStore } from "./marbleStore";
import { getEnhancedRoomMaterials } from "../../../configs/enhancedMaterials";
import {
    BOARD_BOTTOM,
    BOARD_LEFT,
    BOARD_RIGHT,
    BOARD_TOP,
    BOARD_WIDTH,
    CELL,
    MARBLE_RADIUS,
    PLANE_Z,
    SPINNER_SPEED,
    TRAY_Y,
    cellX,
    cellY,
    frameShapes,
    pieceShapes,
} from "./marbleGeometry";

// The Marble Machine: a giant pegboard on the far wall. Take a piece from
// the bin (ramps, bells, bumpers, spinners), put it on the board, then look
// along the top rail and press E to drop a marble from there. Every piece
// plays a note when a marble lands on it, so every run is a little tune.
// The marbles are real Rapier bodies, held to the board's plane.

const HALF = 7;
const HEIGHT = 8;
const MAX_MARBLES = 30;
const TRAY_SECONDS = 2.5;
const PENTATONIC = [0, 2, 4, 7, 9];
const noteFor = (row: number, col = 0) => {
    const step = row + Math.floor(col / 5);
    return 55 + 12 * Math.floor(step / 5) + PENTATONIC[step % 5];
};
const MARBLE_COLORS = ["#ff4d5e", "#4da6ff", "#3ee58f", "#ffd23c", "#b06bff", "#ff9a4d", "#f4f1ea"];

const PIECES: { kind: PieceKind; name: string; color: string }[] = [
    { kind: "rampRight", name: "Ramp →", color: "#ffb347" },
    { kind: "rampLeft", name: "← Ramp", color: "#ffb347" },
    { kind: "bell", name: "Bell", color: "#ffd23c" },
    { kind: "bumper", name: "Bumper", color: "#ff4d8a" },
    { kind: "spinner", name: "Spinner", color: "#3ee5c8" },
];
const pieceInfo = (kind: PieceKind) => PIECES.find((p) => p.kind === kind)!;

// --- Piece visuals -----------------------------------------------------------

const PieceModel: React.FC<{ kind: PieceKind; ghost?: boolean }> = ({ kind, ghost }) => {
    const color = pieceInfo(kind).color;
    const material = (
        <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={kind === "bell" ? 0.9 : 0.1}
            transparent={ghost}
            opacity={ghost ? 0.45 : 1}
            emissive={color}
            emissiveIntensity={ghost ? 0.5 : 0.08}
        />
    );
    return (
        <group>
            {pieceShapes(kind).map((shape, i) =>
                shape.kind === "box" ? (
                    <mesh key={i} rotation={[0, 0, shape.angle]} position={[shape.offset[0], shape.offset[1], 0]}>
                        <boxGeometry args={[shape.half[0] * 2, shape.half[1] * 2, 0.2]} />
                        {material}
                    </mesh>
                ) : kind === "bell" ? (
                    <group key={i}>
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[shape.radius * 0.55, shape.radius, 0.2, 20, 1, true]} />
                            {material}
                        </mesh>
                        <mesh>
                            <sphereGeometry args={[shape.radius * 0.95, 16, 12]} />
                            {material}
                        </mesh>
                    </group>
                ) : (
                    <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[shape.radius, shape.radius, 0.2, 24]} />
                        {material}
                    </mesh>
                )
            )}
            {/* The peg it hangs on */}
            <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.12, 8]} />
                <meshStandardMaterial color="#c8b088" />
            </mesh>
        </group>
    );
};

// A placed piece: its colliders, its look, and its note.
const PlacedPiece: React.FC<{ kind: PieceKind; col: number; row: number; onHit: (kind: PieceKind, col: number, row: number) => void }> = ({
    kind,
    col,
    row,
    onHit,
}) => {
    const body = useRef<RapierRigidBody>(null);
    const visual = useRef<THREE.Group>(null);
    const lastHit = useRef(0);
    const flash = useRef(0);
    const spinner = kind === "spinner";
    const quat = useMemo(() => new THREE.Quaternion(), []);
    useFrame(({ clock }, delta) => {
        if (spinner && body.current) {
            body.current.setNextKinematicRotation(quat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), clock.elapsedTime * SPINNER_SPEED));
        }
        flash.current = Math.max(0, flash.current - delta * 5);
        if (visual.current) visual.current.scale.setScalar(1 + flash.current * (kind === "bell" ? 0.15 : 0.06));
    });
    const hit = (payload: CollisionEnterPayload) => {
        const now = performance.now();
        let speed = 1;
        try {
            const v = payload.other.rigidBody?.linvel();
            if (v) speed = Math.hypot(v.x, v.y);
        } catch {
            return; // the other body is being torn down this step
        }
        if (now - lastHit.current < 90 || speed < 0.5) return;
        lastHit.current = now;
        flash.current = 1;
        onHit(kind, col, row);
    };
    return (
        <RigidBody
            ref={body}
            type={spinner ? "kinematicPosition" : "fixed"}
            colliders={false}
            position={[cellX(col), cellY(row), PLANE_Z]}
            onCollisionEnter={hit}
        >
            {pieceShapes(kind).map((shape, i) =>
                shape.kind === "box" ? (
                    <CuboidCollider
                        key={i}
                        args={[shape.half[0], shape.half[1], 0.12]}
                        position={[shape.offset[0], shape.offset[1], 0]}
                        rotation={[0, 0, shape.angle]}
                        restitution={shape.restitution}
                        friction={0.3}
                    />
                ) : (
                    <BallCollider key={i} args={[shape.radius]} restitution={shape.restitution} friction={0.3} />
                )
            )}
            <group ref={visual}>
                <PieceModel kind={kind} />
            </group>
        </RigidBody>
    );
};

// Marbles are a fixed pool, mounted once. Dropping one moves a parked
// marble onto the rail; finishing in the tray parks it again. Creating and
// destroying physics bodies on the fly (auto mode drops one every 1.5 s)
// let collision events arrive for bodies that were already gone, which
// crashed the physics engine.
const parkingSpot = (index: number) => ({ x: 200 + index * 2, y: -60, z: PLANE_Z });

const Marble: React.FC<{ index: number; register: (index: number, body: RapierRigidBody | null) => void }> = ({ index, register }) => (
    <RigidBody
        ref={(b) => register(index, b)}
        position={[parkingSpot(index).x, parkingSpot(index).y, PLANE_Z]}
        colliders={false}
        enabledTranslations={[true, true, false]}
        enabledRotations={[false, false, true]}
        gravityScale={0}
        ccd
    >
        <BallCollider args={[MARBLE_RADIUS]} restitution={0.45} friction={0.3} density={2} />
        <mesh>
            <sphereGeometry args={[MARBLE_RADIUS, 24, 16]} />
            <meshPhysicalMaterial
                color={MARBLE_COLORS[index % MARBLE_COLORS.length]}
                roughness={0.05}
                clearcoat={1}
                metalness={0.1}
                envMapIntensity={1.6}
            />
        </mesh>
        <mesh position={[MARBLE_RADIUS * 0.3, MARBLE_RADIUS * 0.3, MARBLE_RADIUS * 0.6]}>
            <sphereGeometry args={[MARBLE_RADIUS * 0.25, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
    </RigidBody>
);

// --- The room ------------------------------------------------------------------

type BoardTarget = { kind: "cell"; col: number; row: number } | { kind: "rail"; x: number } | null;

export const MarbleMachine: React.FC = () => {
    const { camera, raycaster } = useThree();
    const layout = useMarbleStore((s) => s.layout);
    const held = useMarbleStore((s) => s.held);
    const auto = useMarbleStore((s) => s.auto);
    const aim = useAimTargets();
    const aimHovered = useRef<string | null>(null);
    aimHovered.current = aim.hovered;

    const bodies = useRef(new Map<number, RapierRigidBody>());
    // Per pool slot: in play, and since when it's been sitting in the tray.
    const live = useRef(Array.from({ length: MAX_MARBLES }, () => ({ active: false, traySince: -1, droppedAt: 0 })));
    const [board, setBoard] = useState<BoardTarget>(null);
    const boardRef = useRef<BoardTarget>(null);
    const dispenser = useRef<THREE.Group>(null);
    const dispenserX = useRef(cellX(6) - 0.12);
    const heldVisual = useRef<THREE.Group>(null);
    const dropped = useRef(0);

    useEffect(() => () => useMarbleStore.getState().setHeld(null), []);

    const park = (index: number) => {
        const body = bodies.current.get(index);
        const slot = live.current[index];
        slot.active = false;
        slot.traySince = -1;
        if (!body) return;
        body.setGravityScale(0, false);
        body.setLinvel({ x: 0, y: 0, z: 0 }, false);
        body.setAngvel({ x: 0, y: 0, z: 0 }, false);
        body.setTranslation(parkingSpot(index), false);
    };

    const drop = (x: number) => {
        const clamped = Math.max(BOARD_LEFT + 0.15, Math.min(BOARD_RIGHT - 0.15, x)) + (Math.random() - 0.5) * 0.04;
        dispenserX.current = clamped;
        // A parked marble if there is one, otherwise the one dropped longest ago.
        const slots = live.current;
        let index = slots.findIndex((s, i) => !s.active && bodies.current.has(i));
        if (index < 0) index = slots.reduce((oldest, s, i) => (s.droppedAt < slots[oldest].droppedAt ? i : oldest), 0);
        const body = bodies.current.get(index);
        if (!body) return;
        slots[index] = { active: true, traySince: -1, droppedAt: performance.now() };
        body.setTranslation({ x: clamped, y: BOARD_TOP + 0.25, z: PLANE_Z }, true);
        body.setLinvel({ x: (Math.random() - 0.5) * 0.3, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setGravityScale(1, true);
        playSound("ui-select", { volume: 0.6 });
        dropped.current++;
        if (dropped.current >= 10) useAchievementStore.getState().unlock("marble-machine");
    };

    const onHit = (kind: PieceKind, col: number, row: number) => {
        switch (kind) {
            case "rampRight":
            case "rampLeft":
                playInstrument("piano", undefined, noteFor(row), 0.6);
                break;
            case "bell":
                playInstrument("bells", undefined, noteFor(row, col), 1);
                break;
            case "bumper":
                playInstrument("synth", undefined, noteFor(row + 2), 0.8);
                break;
            case "spinner":
                playInstrument("hat", undefined, 60, 0.7);
                break;
        }
    };

    // E / click on the board or the rail (pieces and buttons go through aim).
    useEffect(() => {
        const use = () => {
            if (aimHovered.current || useSceneStore.getState().showStartPrompt) return;
            const target = boardRef.current;
            const store = useMarbleStore.getState();
            if (!target) {
                if (store.held) store.setHeld(null); // put it back
                return;
            }
            if (target.kind === "rail") {
                drop(target.x);
                return;
            }
            const existing = store.layout[cellKey(target.col, target.row)];
            if (store.held) {
                store.set(target.col, target.row, store.held);
                playSound("ui-select");
            } else if (existing) {
                store.set(target.col, target.row, null);
                store.setHeld(existing);
                playSound("ui-back");
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat) use();
        };
        const onClick = () => {
            if (document.pointerLockElement || "ontouchstart" in window) use();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("click", onClick);
        window.addEventListener("virtualtap", onClick);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("click", onClick);
            window.removeEventListener("virtualtap", onClick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -(PLANE_Z + 0.25)), []);
    const hitPoint = useMemo(() => new THREE.Vector3(), []);
    const forward = useMemo(() => new THREE.Vector3(), []);
    const lastAuto = useRef(0);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        // What part of the board is under the crosshair?
        let target: BoardTarget = null;
        if (!aimHovered.current && !useSceneStore.getState().showStartPrompt) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            if (raycaster.ray.intersectPlane(plane, hitPoint) && hitPoint.distanceTo(camera.position) < 9) {
                const { x, y } = hitPoint;
                if (x > BOARD_LEFT && x < BOARD_RIGHT) {
                    if (y > BOARD_TOP && y < BOARD_TOP + 0.8) target = { kind: "rail", x };
                    else if (y > BOARD_BOTTOM - CELL / 2 && y < BOARD_TOP) {
                        const col = Math.floor((x - BOARD_LEFT) / CELL);
                        const row = Math.floor((y - (BOARD_BOTTOM - CELL / 2)) / CELL);
                        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) target = { kind: "cell", col, row };
                    }
                }
            }
        }
        if (JSON.stringify(target) !== JSON.stringify(boardRef.current)) {
            boardRef.current = target;
            setBoard(target);
        }

        // Dispenser glides to wherever you're aiming along the rail.
        if (dispenser.current) {
            const want = target?.kind === "rail" ? target.x : dispenserX.current;
            dispenser.current.position.x += (want - dispenser.current.position.x) * 0.2;
        }

        // Auto-drop: a marble every second and a half from the dispenser.
        if (useMarbleStore.getState().auto && t - lastAuto.current > 1.5) {
            lastAuto.current = t;
            drop(dispenserX.current);
        }

        // Marbles that have settled in the tray go back to the pool after a
        // moment (and any that somehow escape the board, straight away).
        live.current.forEach((slot, index) => {
            if (!slot.active) return;
            const body = bodies.current.get(index);
            if (!body) return;
            const p = body.translation();
            const escaped = p.y < -2 || p.x < BOARD_LEFT - 1 || p.x > BOARD_RIGHT + 1;
            if (escaped) {
                park(index);
                return;
            }
            if (p.y < BOARD_BOTTOM - 0.2) {
                if (slot.traySince < 0) slot.traySince = t;
                if (t - slot.traySince > TRAY_SECONDS) park(index);
            } else {
                slot.traySince = -1;
            }
        });

        // The piece you're carrying floats in front of you.
        if (heldVisual.current) {
            camera.getWorldDirection(forward);
            heldVisual.current.position.copy(camera.position).addScaledVector(forward, 0.9);
            heldVisual.current.position.y -= 0.3;
            heldVisual.current.quaternion.copy(camera.quaternion);
        }
    });

    const register = (index: number, body: RapierRigidBody | null) => {
        if (body) bodies.current.set(index, body);
    };
    const pool = useMemo(
        () => Array.from({ length: MAX_MARBLES }, (_, i) => <Marble key={i} index={i} register={register} />),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const boardPrompt = (() => {
        if (!board) return null;
        if (board.kind === "rail") return <GemPrompt accent="gold" action="Drop a marble here" />;
        const existing = layout[cellKey(board.col, board.row)];
        if (held) return <GemPrompt accent="gold" action={existing ? `Swap for the ${pieceInfo(held).name}` : `Hang the ${pieceInfo(held).name} here`} />;
        if (existing) return <GemPrompt action={`Take the ${pieceInfo(existing).name}`} />;
        return null;
    })();

    const pegboard = useMemo(() => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#c9a67a";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#6a4a2a";
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                ctx.beginPath();
                ctx.arc(x * 64 + 32, y * 64 + 32, 7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(COLS / 8 * 2, ROWS / 8 * 2);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }, []);
    useEffect(() => () => pegboard.dispose(), [pegboard]);
    // Shared, cached materials - not ours to dispose.
    const shell = useMemo(() => getEnhancedRoomMaterials("marble-machine"), []);

    const boardCenterY = (BOARD_TOP + TRAY_Y) / 2;
    const boardHeight = BOARD_TOP - TRAY_Y + 0.9;

    return (
        <>
            <RoomEnvironmentReady />
            <ambientLight intensity={0.4} color="#fff1d6" />
            <hemisphereLight intensity={0.5} color="#fff6e6" groundColor="#3a2a1a" />
            <pointLight position={[0, 6.5, -3]} intensity={10} distance={14} decay={1.6} color="#ffe2b0" />
            <pointLight position={[0, 4, 3]} intensity={4} distance={12} decay={1.6} color="#ffd9a0" />

            {/* Shell */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[HALF, 0.25, HALF]} position={[0, -0.25, 0]} />
                <CuboidCollider args={[HALF, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, -HALF - 0.2]} />
                <CuboidCollider args={[HALF, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, HALF + 0.2]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF]} position={[-HALF - 0.2, HEIGHT / 2, 0]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF]} position={[HALF + 0.2, HEIGHT / 2, 0]} />
                {/* The glass in front of the board keeps people out of the run */}
                <CuboidCollider args={[BOARD_WIDTH / 2 + 0.3, 3.5, 0.05]} position={[0, 3.5, PLANE_Z + 0.3]} />
                {/* Bin table */}
                <CuboidCollider args={[1.6, 0.45, 0.5]} position={[0, 0.45, -1.6]} />
                {/* Board frame */}
                {frameShapes().map((f, i) => (
                    <CuboidCollider
                        key={i}
                        args={[f.half[0], f.half[1], 0.12]}
                        position={[f.at[0], f.at[1], PLANE_Z]}
                        rotation={[0, 0, f.angle]}
                        restitution={f.restitution}
                    />
                ))}
            </RigidBody>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={shell.floor}>
                <planeGeometry args={[HALF * 2, HALF * 2]} />
            </mesh>
            {[
                { p: [0, HEIGHT / 2, -HALF], r: [0, 0, 0] },
                { p: [0, HEIGHT / 2, HALF], r: [0, Math.PI, 0] },
                { p: [-HALF, HEIGHT / 2, 0], r: [0, Math.PI / 2, 0] },
                { p: [HALF, HEIGHT / 2, 0], r: [0, -Math.PI / 2, 0] },
            ].map((w, i) => (
                <mesh key={i} position={w.p as [number, number, number]} rotation={w.r as [number, number, number]} material={shell.walls}>
                    <planeGeometry args={[HALF * 2, HEIGHT]} />
                </mesh>
            ))}
            <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} material={shell.ceiling}>
                <planeGeometry args={[HALF * 2, HALF * 2]} />
            </mesh>

            {/* The board: pegboard, frame, glass, tray */}
            <mesh position={[0, boardCenterY, PLANE_Z - 0.14]}>
                <planeGeometry args={[BOARD_WIDTH + 0.4, boardHeight]} />
                <meshStandardMaterial map={pegboard} roughness={0.8} />
            </mesh>
            {frameShapes().map((f, i) => (
                <mesh key={i} position={[f.at[0], f.at[1], PLANE_Z]} rotation={[0, 0, f.angle]}>
                    <boxGeometry args={[f.half[0] * 2, f.half[1] * 2, 0.26]} />
                    <meshStandardMaterial color="#5a3a22" roughness={0.6} />
                </mesh>
            ))}
            <mesh position={[0, boardCenterY, PLANE_Z + 0.16]}>
                <planeGeometry args={[BOARD_WIDTH + 0.4, boardHeight]} />
                <meshPhysicalMaterial color="#ffffff" transparent opacity={0.07} roughness={0} clearcoat={1} depthWrite={false} />
            </mesh>
            {/* Rail and the dispenser riding on it */}
            <mesh position={[0, BOARD_TOP + 0.6, PLANE_Z]}>
                <boxGeometry args={[BOARD_WIDTH, 0.06, 0.06]} />
                <meshStandardMaterial color="#c39a55" metalness={1} roughness={0.3} />
            </mesh>
            <group ref={dispenser} position={[dispenserX.current, BOARD_TOP + 0.38, PLANE_Z]}>
                <mesh>
                    <cylinderGeometry args={[0.16, 0.07, 0.3, 16, 1, true]} />
                    <meshStandardMaterial color="#d24a3a" side={THREE.DoubleSide} />
                </mesh>
            </group>
            <Text position={[0, BOARD_TOP + 1.1, PLANE_Z + 0.2]} fontSize={0.36} color="#5a3a22" anchorX="center" fontWeight="bold">
                MARBLE MACHINE
            </Text>
            <Text position={[0, BOARD_TOP + 0.82, PLANE_Z + 0.2]} fontSize={0.14} color="#7a5a3a" anchorX="center">
                Look along the top rail and press E to drop a marble
            </Text>

            {Object.entries(layout).map(([key, kind]) => {
                const [col, row] = key.split(",").map(Number);
                return <PlacedPiece key={`${key}-${kind}`} kind={kind} col={col} row={row} onHit={onHit} />;
            })}
            {board?.kind === "cell" && held && (
                <group position={[cellX(board.col), cellY(board.row), PLANE_Z]}>
                    <PieceModel kind={held} ghost />
                </group>
            )}
            {pool}

            {/* The bin: one of each piece, take as many as you like */}
            <group position={[0, 0, -1.6]}>
                <mesh position={[0, 0.45, 0]}>
                    <boxGeometry args={[3.2, 0.9, 1]} />
                    <meshStandardMaterial color="#8a5a32" roughness={0.6} />
                </mesh>
                <Text position={[0, 0.5, 0.52]} fontSize={0.15} color="#fff1d6" anchorX="center" fontWeight="bold">
                    PIECES · TAKE ONE
                </Text>
                {PIECES.map((piece, i) => (
                    <group
                        key={piece.kind}
                        position={[-1.2 + i * 0.6, 1.15, 0]}
                        ref={aim.bind(`piece-${piece.kind}`, {
                            reach: 3.5,
                            prompt: () =>
                                held === piece.kind ? (
                                    <GemPrompt action={`Put the ${piece.name} back`} />
                                ) : (
                                    <GemPrompt accent="gold" action={`Take a ${piece.name}`} />
                                ),
                            use: () => {
                                const store = useMarbleStore.getState();
                                store.setHeld(store.held === piece.kind ? null : piece.kind);
                                playSound("ui-select");
                            },
                        })}
                    >
                        <PieceModel kind={piece.kind} />
                        <mesh visible={false}>
                            <boxGeometry args={[0.55, 0.5, 0.4]} />
                        </mesh>
                    </group>
                ))}
            </group>

            {/* Buttons on the east wall */}
            <group position={[HALF - 0.05, 0, -2]} rotation={[0, -Math.PI / 2, 0]}>
                {[
                    {
                        id: "auto",
                        label: auto ? "AUTO: ON" : "AUTO: OFF",
                        color: auto ? "#3ee58f" : "#7a7a88",
                        z: -1,
                        prompt: auto ? "Stop dropping marbles" : "Drop marbles by themselves",
                        use: () => useMarbleStore.getState().toggleAuto(),
                    },
                    {
                        id: "reset",
                        label: "RESET BOARD",
                        color: "#ff4d5e",
                        z: 1,
                        prompt: "Put the starter run back",
                        use: () => {
                            useMarbleStore.getState().reset();
                            live.current.forEach((_, i) => park(i));
                        },
                    },
                ].map((button) => (
                    <group key={button.id} position={[button.z, 1.5, 0]}>
                        <mesh
                            rotation={[Math.PI / 2, 0, 0]}
                            ref={aim.bind(button.id, {
                                reach: 4,
                                prompt: () => <GemPrompt accent="gold" action={button.prompt} />,
                                use: () => {
                                    button.use();
                                    playSound("light-switch");
                                },
                            })}
                        >
                            <cylinderGeometry args={[0.3, 0.3, 0.12, 32]} />
                            <meshStandardMaterial color={button.color} emissive={button.color} emissiveIntensity={0.4} />
                        </mesh>
                        <Text position={[0, -0.5, 0]} fontSize={0.14} color="#5a3a22" anchorX="center" fontWeight="bold">
                            {button.label}
                        </Text>
                    </group>
                ))}
            </group>

            {/* What you're carrying */}
            {held && (
                <group ref={heldVisual} scale={0.7}>
                    <PieceModel kind={held} />
                </group>
            )}

            {boardPrompt && (
                <group position={board?.kind === "cell" ? [cellX(board.col), cellY(board.row) + 0.4, PLANE_Z + 0.3] : [board?.kind === "rail" ? board.x : 0, BOARD_TOP + 0.9, PLANE_Z + 0.3]}>
                    <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                        {boardPrompt}
                    </Html>
                </group>
            )}
            <aim.Prompt />
        </>
    );
};
