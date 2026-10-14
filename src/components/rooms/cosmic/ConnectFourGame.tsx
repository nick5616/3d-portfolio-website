import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { InteractionRaycaster } from "../../core/InteractionRaycaster";
import { GemPrompt } from "../../ui/GemPrompt";
import { playSound } from "../../../audio/soundManager";
import { useAchievementStore } from "../../../stores/achievementStore";
import {
    COLS,
    ROWS,
    Board,
    CellRef,
    Player,
    cloneBoard,
    emptyBoard,
    findWin,
    isFull,
    landingRow,
} from "./connectFour";
import { Chip, ChipSim } from "./chipSim";
import {
    BOARD_POSITION,
    BORDER,
    CHIP_RADIUS,
    COL_PITCH,
    DIVIDER,
    HOLD_Y,
    HOLE_RADIUS,
    INNER_HEIGHT,
    INNER_WIDTH,
    NOTHING_RECLAIM,
    PANEL_DEPTH,
    PANEL_Z,
    REPLICA_POSITION,
    REPLICA_SCALE,
    colX,
    rowY,
} from "./cosmicLayout";
import {
    ChipDesignId,
    NOTHING_GLOW,
    designById,
    getChipLook,
    getGlowTexture,
    getNothingChipLook,
} from "./chipDesigns";
import { useCosmicStore } from "./cosmicStore";
import { thinkFor } from "./nothingMind";
import { LINES, pickLine } from "./nothingLines";

// The table's game. The rules own the truth (which row a chip lands in,
// who won); ChipSim makes the chips get there physically; this component
// draws both the real board and the giant replica in the sky from the very
// same chip states every frame, so the replica is never a frame behind.

const MAX_CHIPS = Math.ceil((COLS * ROWS) / 2); // per side
const SWAP_SECONDS = 0.55;

// The opening lines are said in order.
const pickLineAt = (kind: keyof typeof LINES, index: number) => LINES[kind][index % LINES[kind].length];
const RAIL_DEPTH = 2 * (PANEL_Z + PANEL_DEPTH / 2) + 0.03;

// --- The board's structure --------------------------------------------------

const panelGeometry = () => {
    const shape = new THREE.Shape();
    shape.moveTo(-INNER_WIDTH / 2, 0);
    shape.lineTo(INNER_WIDTH / 2, 0);
    shape.lineTo(INNER_WIDTH / 2, INNER_HEIGHT);
    shape.lineTo(-INNER_WIDTH / 2, INNER_HEIGHT);
    shape.lineTo(-INNER_WIDTH / 2, 0);
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            const hole = new THREE.Path();
            hole.absarc(colX(c), rowY(r), HOLE_RADIUS, 0, Math.PI * 2, true);
            shape.holes.push(hole);
        }
    }
    return new THREE.ExtrudeGeometry(shape, { depth: PANEL_DEPTH, bevelEnabled: false, curveSegments: 20 });
};

// Midnight star-metal for the real board's faces.
const starTexture = () => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1c1450";
    ctx.fillRect(0, 0, size, size);
    let seed = 3;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    for (let i = 0; i < 420; i++) {
        const r = Math.pow(rand(), 3) * 2.2 + 0.3;
        ctx.fillStyle = `rgba(${200 + rand() * 55}, ${190 + rand() * 50}, 255, ${0.3 + rand() * 0.7})`;
        ctx.beginPath();
        ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Faint constellation lines.
    ctx.strokeStyle = "rgba(255, 210, 140, 0.25)";
    ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
        ctx.beginPath();
        let x = rand() * size;
        let y = rand() * size;
        ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
            x += (rand() - 0.5) * 120;
            y += (rand() - 0.5) * 120;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.55, 0.55);
    return texture;
};

interface FrameMaterials {
    panel: THREE.Material;
    frame: THREE.Material;
    gold: THREE.Material;
}

const BoardFrame: React.FC<{ materials: FrameMaterials; geometry: THREE.BufferGeometry }> = ({
    materials,
    geometry,
}) => {
    const sideX = INNER_WIDTH / 2 + BORDER / 2;
    const railHeight = INNER_HEIGHT + BORDER + 0.1;
    const rims = useMemo(() => {
        const ring = new THREE.RingGeometry(HOLE_RADIUS, HOLE_RADIUS + 0.011, 32);
        const mesh = new THREE.InstancedMesh(ring, materials.gold, COLS * ROWS * 2);
        const m = new THREE.Matrix4();
        let i = 0;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                [1, -1].forEach((side) => {
                    m.makeRotationY(side > 0 ? 0 : Math.PI);
                    m.setPosition(colX(c), rowY(r), side * (PANEL_Z + PANEL_DEPTH / 2 + 0.001));
                    mesh.setMatrixAt(i++, m);
                });
            }
        }
        return mesh;
    }, [materials.gold]);
    useEffect(() => () => rims.geometry.dispose(), [rims]);

    return (
        <group>
            <mesh geometry={geometry} material={materials.panel} position={[0, 0, PANEL_Z - PANEL_DEPTH / 2]} />
            <mesh geometry={geometry} material={materials.panel} position={[0, 0, -PANEL_Z - PANEL_DEPTH / 2]} />
            <primitive object={rims} />
            {[-1, 1].map((side) => (
                <group key={side}>
                    <mesh position={[side * sideX, (INNER_HEIGHT + BORDER - 0.1) / 2, 0]} material={materials.frame}>
                        <boxGeometry args={[BORDER, railHeight, RAIL_DEPTH]} />
                    </mesh>
                    {/* Gold edging up each rail's face, and a finial */}
                    {[1, -1].map((face) => (
                        <mesh
                            key={face}
                            position={[side * (INNER_WIDTH / 2 + 0.006), INNER_HEIGHT / 2, face * (RAIL_DEPTH / 2 + 0.002)]}
                            material={materials.gold}
                        >
                            <boxGeometry args={[0.012, INNER_HEIGHT, 0.004]} />
                        </mesh>
                    ))}
                    <mesh position={[side * sideX, INNER_HEIGHT + BORDER + 0.04, 0]} material={materials.gold}>
                        <octahedronGeometry args={[0.05, 0]} />
                    </mesh>
                    {/* Feet */}
                    <mesh position={[side * sideX, -0.075, 0]} material={materials.frame}>
                        <boxGeometry args={[BORDER + 0.06, 0.05, 0.6]} />
                    </mesh>
                </group>
            ))}
            <mesh position={[0, -0.05, 0]} material={materials.frame}>
                <boxGeometry args={[INNER_WIDTH, 0.1, RAIL_DEPTH]} />
            </mesh>
            {[1, -1].map((face) => (
                <mesh key={face} position={[0, INNER_HEIGHT, face * (PANEL_Z + PANEL_DEPTH / 2 + 0.002)]} material={materials.gold}>
                    <boxGeometry args={[INNER_WIDTH, 0.012, 0.004]} />
                </mesh>
            ))}
            {Array.from({ length: COLS - 1 }, (_, c) => (
                <mesh key={c} position={[colX(c) + COL_PITCH / 2, INNER_HEIGHT / 2, 0]} material={materials.frame}>
                    <boxGeometry args={[DIVIDER, INNER_HEIGHT, 2 * PANEL_Z - PANEL_DEPTH]} />
                </mesh>
            ))}
        </group>
    );
};

// --- Helpers ----------------------------------------------------------------

const chipMatrix = (chip: Chip, out: THREE.Matrix4, pulse: number) => {
    const scale = chip.scale * (chip.phase === "held" ? 0.2 + 0.8 * chip.appear : 1) * (chip.winning ? pulse : 1);
    out.compose(
        _pos.set(colX(chip.col) + chip.x, chip.y, chip.z),
        _quat.setFromEuler(_euler.set(0, chip.tilt, chip.spin)),
        _scale.setScalar(Math.max(scale, 0.0001))
    );
    return out;
};
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _matrix = new THREE.Matrix4();

const haloMaterialFor = (color: string, opacity: number) =>
    new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
    });

// --- The game ---------------------------------------------------------------

export const ConnectFourGame: React.FC = () => {
    const { design, phase, hoverCol, winner } = useCosmicStore(
        useShallow((s) => ({ design: s.design, phase: s.phase, hoverCol: s.hoverCol, winner: s.winner }))
    );
    const designInfo = designById(design);
    const look = getChipLook(design);
    const nothingLook = getNothingChipLook();

    // --- Mutable game state (refs, so timers never see stale values) -------
    const board = useRef<Board>(emptyBoard());
    const starter = useRef<Player>(1);
    const moves = useRef(0);
    const winLine = useRef<CellRef[] | null>(null);
    const awaiting = useRef<{ chip: Chip; then: () => void } | null>(null);
    const alive = useRef(true);
    const timers = useRef<number[]>([]);
    const lastClack = useRef(0);
    const lastNag = useRef(0);

    const later = (ms: number, fn: () => void) => {
        const id = window.setTimeout(() => {
            if (alive.current) fn();
        }, ms);
        timers.current.push(id);
    };

    const sim = useMemo(
        () =>
            new ChipSim({
                onImpact: (chip, speed) => {
                    const now = performance.now();
                    if (speed < 0.45 || now - lastClack.current < 45) return;
                    lastClack.current = now;
                    playSound(chip.owner === 2 ? "c4-chip-clack-gold" : "c4-chip-clack", {
                        volume: Math.min(1, 0.2 + speed / 4.5),
                    });
                },
                onSettled: (chip) => {
                    if (awaiting.current?.chip === chip) {
                        const { then } = awaiting.current;
                        awaiting.current = null;
                        then();
                    }
                },
            }),
        []
    );

    const store = useCosmicStore.getState;

    // Wait for a dropped chip to come to rest, but never forever.
    const whenSettled = (chip: Chip, then: () => void) => {
        awaiting.current = { chip, then };
        later(3500, () => {
            if (awaiting.current?.chip === chip) {
                awaiting.current = null;
                then();
            }
        });
    };

    const updateTension = () => {
        store().setIntensity(Math.min(0.75, 0.1 + moves.current / 34));
    };

    const finish = (result: 0 | 1 | 2, line: CellRef[] | null) => {
        const s = store();
        s.setPhase("over");
        s.setWinner(result);
        s.recordResult(result);
        winLine.current = line;
        if (line) {
            sim.chips.forEach((chip) => {
                chip.winning = line.some(([c, r]) => c === chip.col && r === chip.row);
            });
        }
        const achievements = useAchievementStore.getState();
        if (result === 1) {
            s.setIntensity(0.85);
            s.say(pickLine("youWin"));
            playSound("c4-win");
            achievements.unlock("c4-win");
        } else if (result === 2) {
            s.setIntensity(1);
            s.say(pickLine("nothingWins"));
            playSound("c4-lose");
        } else {
            s.setIntensity(0.5);
            s.say(pickLine("draw"));
            playSound("c4-draw");
        }
        later(5200, () => {
            if (store().phase === "over") store().say(pickLine("again"));
        });
    };

    // After any chip settles: did that end it? Otherwise, the other side.
    const resolve = (who: Player, col: number, row: number) => {
        const line = findWin(board.current, col, row);
        if (line) return finish(who, line);
        if (isFull(board.current)) return finish(0, null);
        updateTension();
        if (who === 1) {
            nothingsTurn();
        } else {
            store().setPhase("yourTurn");
        }
    };

    const nothingsTurn = async () => {
        const s = store();
        s.setPhase("nothingThinking");
        if (moves.current > 0 && Math.random() < 0.55) s.say(pickLine("afterYourMove"));
        s.setIntensity(Math.min(0.85, s.intensity + 0.1));
        const startedAt = performance.now();
        const choice = await thinkFor(cloneBoard(board.current), 2);
        if (!alive.current) return;
        const thinking = performance.now() - startedAt;
        const pause = Math.max(0, 900 + Math.random() * 900 - thinking);

        later(pause, () => {
            const row = landingRow(board.current, choice.col);
            if (row < 0) return;
            if (choice.sparedYou) {
                store().say(pickLine("spared"));
                useAchievementStore.getState().unlock("c4-spared");
            } else if (Math.random() < 0.3) {
                store().say(pickLine("afterNothingMove"));
            }
            board.current[choice.col][row] = 2;
            moves.current++;
            // The chip forms out of nothing above the column, then falls.
            const chip = sim.spawn(2, choice.col, row, 0.6);
            playSound("c4-nothing-chip");
            store().setPhase("nothingChipFalling");
            whenSettled(chip, () => resolve(2, choice.col, row));
        });
    };

    const startGame = () => {
        board.current = emptyBoard();
        moves.current = 0;
        winLine.current = null;
        const s = store();
        s.setWinner(null);
        s.setIntensity(0.1);
        if (starter.current === 1) {
            s.setPhase("yourTurn");
        } else {
            s.say(pickLine("nothingOpens"));
            nothingsTurn();
        }
    };

    const dropYours = (col: number) => {
        const s = store();
        const row = landingRow(board.current, col);
        if (row < 0) {
            s.say(pickLine("columnFull"));
            playSound("ui-back");
            return;
        }
        // Your first chip of a game (you or Nothing may have opened).
        if (moves.current <= 1) {
            s.countGame();
            useAchievementStore.getState().unlock("c4-first-game");
        }
        board.current[col][row] = 1;
        moves.current++;
        const chip = sim.spawn(1, col, row, 0);
        playSound("c4-drop");
        s.setPhase("yourChipFalling");
        whenSettled(chip, () => resolve(1, col, row));
    };

    const clearBoard = () => {
        store().setPhase("clearing");
        store().setWinner(null);
        winLine.current = null;
        sim.reclaimAll(NOTHING_RECLAIM);
        playSound("c4-reclaim");
        starter.current = starter.current === 1 ? 2 : 1;
    };

    const handleTrigger = () => {
        const s = store();
        if (s.phase === "yourTurn" && s.hoverCol !== null) {
            dropYours(s.hoverCol);
        } else if (s.phase === "over") {
            clearBoard();
        } else if (s.phase === "nothingThinking" || s.phase === "nothingChipFalling") {
            const now = performance.now();
            if (now - lastNag.current > 6000) {
                lastNag.current = now;
                s.say(pickLine("notYourTurn"));
            }
        }
    };

    // First words, and a fresh board, on arrival.
    useEffect(() => {
        alive.current = true;
        const s = store();
        s.setPhase("yourTurn");
        s.setWinner(null);
        s.setHoverCol(null);
        s.setIntensity(0.1);
        if (s.gamesStarted === 0) {
            const [a, b, c] = [0, 1, 2].map((i) => pickLineAt("firstMeeting", i));
            later(900, () => store().say(a));
            later(5200, () => store().say(b));
            later(10200, () => store().say(c));
        } else {
            later(900, () => store().say(pickLine("returning")));
        }
        return () => {
            alive.current = false;
            timers.current.forEach((id) => clearTimeout(id));
            timers.current = [];
            store().setIntensity(0);
            store().setHoverCol(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Materials ------------------------------------------------------------
    const frameGeometry = useMemo(panelGeometry, []);
    const realMaterials = useMemo<FrameMaterials>(() => {
        const stars = starTexture();
        return {
            panel: new THREE.MeshPhysicalMaterial({
                color: "#ffffff",
                map: stars,
                emissive: "#ffffff",
                emissiveMap: stars,
                emissiveIntensity: 0.4,
                roughness: 0.3,
                metalness: 0.35,
                clearcoat: 1,
                clearcoatRoughness: 0.08,
                envMapIntensity: 1.3,
            }),
            frame: new THREE.MeshPhysicalMaterial({
                color: "#110b22",
                roughness: 0.28,
                metalness: 0.75,
                clearcoat: 0.6,
                envMapIntensity: 1.4,
            }),
            gold: new THREE.MeshStandardMaterial({
                color: "#e2b456",
                roughness: 0.22,
                metalness: 1,
                emissive: "#6a4810",
                emissiveIntensity: 0.7,
                side: THREE.DoubleSide,
            }),
        };
    }, []);
    // The replica is made of light: it has to read from 30 m away in the dark.
    const replicaMaterials = useMemo<FrameMaterials>(
        () => ({
            panel: new THREE.MeshBasicMaterial({
                color: "#4b33b0",
                transparent: true,
                opacity: 0.2,
                depthWrite: false,
                side: THREE.DoubleSide,
                fog: false,
            }),
            frame: new THREE.MeshBasicMaterial({ color: "#ffcf73", toneMapped: false, fog: false }),
            gold: new THREE.MeshBasicMaterial({ color: "#ffe2a0", toneMapped: false, side: THREE.DoubleSide, fog: false }),
        }),
        []
    );
    const replicaChipMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: new THREE.Color(designInfo.glow).multiplyScalar(0.35),
                emissive: designInfo.glow,
                emissiveIntensity: 1.1,
                metalness: 0.5,
                roughness: 0.25,
                flatShading: true,
                toneMapped: false,
                fog: false,
            }),
        [designInfo.glow]
    );
    const nothingHalo = useMemo(() => haloMaterialFor(NOTHING_GLOW, 0.9), []);
    const markerMaterial = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: designInfo.glow,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            }),
        [designInfo.glow]
    );
    const beamMaterial = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: "#ffffff",
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
                fog: false,
            }),
        []
    );
    useEffect(
        () => () => {
            frameGeometry.dispose();
            [...Object.values(realMaterials), ...Object.values(replicaMaterials), nothingHalo, beamMaterial].forEach((m) =>
                m.dispose()
            );
            (realMaterials.panel as THREE.MeshPhysicalMaterial).map?.dispose();
        },
        [frameGeometry, realMaterials, replicaMaterials, nothingHalo, beamMaterial]
    );
    useEffect(() => () => replicaChipMaterial.dispose(), [replicaChipMaterial]);
    // The giant replica switches stones along with the board.
    useEffect(() => {
        const replica = yourReplica.current;
        if (!replica) return;
        replica.geometry = look.geometry;
        replica.material = replicaChipMaterial;
    }, [look, replicaChipMaterial]);
    useEffect(() => () => markerMaterial.dispose(), [markerMaterial]);

    // --- Scene refs --------------------------------------------------------------
    const boardGroup = useRef<THREE.Group>(null);
    const replicaGroup = useRef<THREE.Group>(null);
    // Your chips are long-lived objects rather than React-rendered meshes:
    // switching stones at the altar swaps each placed chip's gem in place
    // (shrink, swap, pop back) instead of remounting anything.
    const yourChips = useMemo(() => {
        const root = new THREE.Group();
        const slots = Array.from({ length: MAX_CHIPS }, () => {
            const group = new THREE.Group();
            group.visible = false;
            const main = new THREE.Mesh();
            const core = new THREE.Mesh();
            const halo = new THREE.Sprite(haloMaterialFor("#ffffff", 0.85));
            group.add(main, core, halo);
            root.add(group);
            return { group, main, core, halo, shown: null as ChipDesignId | null, swapAt: null as number | null };
        });
        return { root, slots };
    }, []);
    useEffect(
        () => () => yourChips.slots.forEach((slot) => (slot.halo.material as THREE.Material).dispose()),
        [yourChips]
    );
    const dress = (slot: (typeof yourChips.slots)[number], id: ChipDesignId) => {
        const chosen = getChipLook(id);
        slot.main.geometry = chosen.geometry;
        slot.main.material = chosen.material;
        slot.core.visible = Boolean(chosen.core);
        if (chosen.core) {
            slot.core.geometry = chosen.core.geometry;
            slot.core.material = chosen.core.material;
        }
        (slot.halo.material as THREE.SpriteMaterial).color.set(designById(id).glow);
        slot.shown = id;
    };
    const nothingSlots = useRef<(THREE.Group | null)[]>([]);
    const yourReplica = useRef<THREE.InstancedMesh>(null);
    const nothingReplica = useRef<THREE.InstancedMesh>(null);
    const held = useRef<THREE.Group>(null);
    const heldReplica = useRef<THREE.Mesh>(null);
    const marker = useRef<THREE.Mesh>(null);
    const beams = useRef<(THREE.Mesh | null)[]>([]);
    const targets = useRef<THREE.Group>(null);

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        sim.update(Math.min(delta, 0.1));
        nothingLook.uniforms.uTime.value = t;
        const s = store();

        // When the board is empty again after clearing, begin the next game.
        if (s.phase === "clearing" && sim.chips.length === 0) startGame();

        const pulse = 1 + Math.sin(t * 7) * 0.09;
        let yours = 0;
        let theirs = 0;
        for (const chip of sim.chips) {
            chipMatrix(chip, _matrix, pulse);
            const index = chip.owner === 1 ? yours++ : theirs++;
            if (chip.owner === 1) {
                const slot = yourChips.slots[index];
                slot.group.visible = true;
                _matrix.decompose(slot.group.position, slot.group.quaternion, slot.group.scale);
                // A new stone chosen: each chip in turn shrinks away
                // spinning, swaps its gem at the bottom of the dip, and pops
                // back with a little overshoot.
                if (slot.shown === null) dress(slot, s.design);
                if (slot.shown !== s.design && slot.swapAt === null) slot.swapAt = t + index * 0.07;
                let swapGlow = 0;
                if (slot.swapAt !== null && t >= slot.swapAt) {
                    const p = (t - slot.swapAt) / SWAP_SECONDS;
                    if (p >= 0.5 && slot.shown !== s.design) {
                        dress(slot, s.design);
                        playSound("c4-chip-clack", { volume: 0.25, rate: 1.3 + Math.random() * 0.2 });
                    }
                    let k: number;
                    if (p < 0.5) {
                        const d = p / 0.5;
                        k = 1 - d * d * (3 - 2 * d);
                    } else {
                        // Ease out with an overshoot ("back").
                        const u = Math.min(1, (p - 0.5) / 0.5) - 1;
                        k = 1 + 2.4 * u * u * u + 1.4 * u * u;
                    }
                    slot.group.scale.multiplyScalar(Math.max(0.001, k));
                    slot.group.rotateZ(Math.sin(Math.min(1, p) * Math.PI) * 2.5);
                    swapGlow = Math.sin(Math.min(1, p) * Math.PI);
                    if (p >= 1) slot.swapAt = null;
                    // (A second change mid-swap just runs again.)
                    if (p >= 1 && slot.shown !== s.design) slot.swapAt = t;
                }
                slot.halo.visible = chip.winning || swapGlow > 0.02;
                slot.halo.scale.setScalar(CHIP_RADIUS * 6 * (chip.winning ? pulse : 0.6 + swapGlow));
                slot.group.updateMatrix();
                yourReplica.current?.setMatrixAt(index, slot.group.matrix);
                continue;
            }
            const slot = nothingSlots.current[index];
            if (slot) {
                slot.visible = true;
                _matrix.decompose(slot.position, slot.quaternion, slot.scale);
                const halo = slot.children[slot.children.length - 1] as THREE.Sprite;
                halo.visible = true;
                halo.scale.setScalar(CHIP_RADIUS * 5 * (chip.winning ? pulse : 1));
            }
            nothingReplica.current?.setMatrixAt(index, _matrix);
        }
        // Unused slots wear the current stone, so a new chip appears in it.
        for (let i = yours; i < MAX_CHIPS; i++) {
            const slot = yourChips.slots[i];
            slot.group.visible = false;
            slot.swapAt = null;
            if (slot.shown !== s.design) dress(slot, s.design);
        }
        for (let i = theirs; i < MAX_CHIPS; i++) if (nothingSlots.current[i]) nothingSlots.current[i]!.visible = false;
        if (yourReplica.current) {
            yourReplica.current.count = yours;
            yourReplica.current.instanceMatrix.needsUpdate = true;
        }
        if (nothingReplica.current) {
            nothingReplica.current.count = theirs;
            nothingReplica.current.instanceMatrix.needsUpdate = true;
        }
        nothingLook.uniforms.uFlare.value = s.phase === "nothingChipFalling" ? 0.4 : 0;

        // Your chip, held over the column you're aiming at.
        const col = s.hoverCol;
        const landing = col !== null ? landingRow(board.current, col) : -1;
        const holding = s.phase === "yourTurn" && col !== null && landing >= 0;
        if (held.current) {
            held.current.visible = holding;
            if (holding) {
                held.current.position.set(colX(col!), HOLD_Y + Math.sin(t * 2.4) * 0.015, 0);
                held.current.rotation.set(0, Math.sin(t * 1.3) * 0.25, t * 0.8);
            }
        }
        if (heldReplica.current && held.current) {
            heldReplica.current.visible = holding;
            heldReplica.current.position.copy(held.current.position);
            heldReplica.current.rotation.copy(held.current.rotation);
        }
        if (marker.current) {
            marker.current.visible = holding;
            if (holding) {
                marker.current.position.set(colX(col!), rowY(landing), PANEL_Z + PANEL_DEPTH / 2 + 0.004);
                markerMaterial.opacity = 0.45 + Math.sin(t * 5) * 0.3;
            }
        }

        // The winning line, burning across both boards.
        const line = winLine.current;
        beams.current.forEach((beam) => {
            if (!beam) return;
            beam.visible = Boolean(line) && s.phase === "over";
            if (!line || !beam.visible) return;
            const [c0, r0] = line[0];
            const [c1, r1] = line[line.length - 1];
            const x0 = colX(c0);
            const y0 = rowY(r0);
            const x1 = colX(c1);
            const y1 = rowY(r1);
            const length = Math.hypot(x1 - x0, y1 - y0) + CHIP_RADIUS * 1.6;
            beam.position.set((x0 + x1) / 2, (y0 + y1) / 2, PANEL_Z + PANEL_DEPTH + 0.01);
            beam.rotation.set(0, 0, Math.atan2(y1 - y0, x1 - x0));
            beam.scale.set(length, 1 + Math.sin(t * 9) * 0.25, 1);
        });
        beamMaterial.color.set(s.winner === 2 ? NOTHING_GLOW : designById(s.design).glow);
        beamMaterial.opacity = 0.65 + Math.sin(t * 6) * 0.2;

        // Impacts shake the board a hair; the replica feels it too.
        const shake = sim.shake;
        if (boardGroup.current) {
            boardGroup.current.rotation.x = Math.sin(t * 71) * shake * 0.006;
            boardGroup.current.position.y = BOARD_POSITION[1] + Math.sin(t * 93) * shake * 0.002;
        }
        if (replicaGroup.current) {
            replicaGroup.current.rotation.x = Math.sin(t * 71) * shake * 0.006;
            replicaGroup.current.rotation.z = Math.sin(t * 0.1) * 0.015;
        }
    });

    // --- Prompt ----------------------------------------------------------------
    const prompt = (() => {
        switch (phase) {
            case "yourTurn":
                return hoverCol !== null && landingRow(board.current, hoverCol) < 0 ? (
                    <GemPrompt accent="red" keyLabel={null} action="That column is full" />
                ) : (
                    <GemPrompt accent="gold" action={`Drop your ${designInfo.name}`} />
                );
            case "over":
                return <GemPrompt accent="gold" action={winner === 1 ? "Play again (Nothing is waiting)" : "Play again"} />;
            default:
                return null;
        }
    })();

    const nothingChips = Array.from({ length: MAX_CHIPS }, (_, i) => (
        <group
            key={i}
            visible={false}
            ref={(g) => {
                nothingSlots.current[i] = g;
            }}
        >
            <mesh geometry={nothingLook.geometry} material={nothingLook.material} />
            <sprite material={nothingHalo} />
        </group>
    ));

    return (
        <>
            <group ref={boardGroup} position={BOARD_POSITION}>
                <BoardFrame materials={realMaterials} geometry={frameGeometry} />
                <primitive object={yourChips.root} />
                {nothingChips}

                <group ref={held} visible={false}>
                    <mesh geometry={look.geometry} material={look.material} />
                    {look.core && <mesh geometry={look.core.geometry} material={look.core.material} />}
                </group>
                <mesh ref={marker} material={markerMaterial} visible={false}>
                    <ringGeometry args={[HOLE_RADIUS * 0.8, HOLE_RADIUS * 1.05, 32]} />
                </mesh>
                <mesh ref={(m) => (beams.current[0] = m)} material={beamMaterial} visible={false}>
                    <planeGeometry args={[1, 0.035]} />
                </mesh>

                {/* One aim target per column, from the slot floor up to where
                    a held chip waits. */}
                <group ref={targets}>
                    {Array.from({ length: COLS }, (_, c) => (
                        <mesh
                            key={c}
                            visible={false}
                            userData={{ col: c }}
                            position={[colX(c), (HOLD_Y + CHIP_RADIUS + 0.1) / 2, 0]}
                        >
                            <boxGeometry args={[COL_PITCH, HOLD_Y + CHIP_RADIUS + 0.1, 0.3]} />
                        </mesh>
                    ))}
                </group>
                <InteractionRaycaster
                    target={targets}
                    config={{
                        maxDistance: 6,
                        includeChildren: true,
                        rayOrigin: "center",
                        triggerActions: [
                            { type: "click", cooldown: 350 },
                            { type: "keypress", key: "e", cooldown: 350 },
                        ],
                    }}
                    callbacks={{
                        onRayStay: (hit) => {
                            const c = hit.object.userData.col as number | undefined;
                            if (c !== undefined && c !== store().hoverCol) store().setHoverCol(c);
                        },
                        onRayExit: () => store().setHoverCol(null),
                        onTrigger: handleTrigger,
                    }}
                    visual={{
                        prompt: {
                            content: prompt ?? "",
                            offset: [0, HOLD_Y + 0.32, 0],
                            visible: prompt !== null,
                            distanceScale: true,
                        },
                    }}
                />
            </group>

            {/* The same game, ten times larger, hanging in the sky. */}
            <group ref={replicaGroup} position={REPLICA_POSITION} scale={REPLICA_SCALE}>
                <BoardFrame materials={replicaMaterials} geometry={frameGeometry} />
                <instancedMesh
                    ref={yourReplica}
                    args={[look.geometry, replicaChipMaterial, MAX_CHIPS]}
                    count={0}
                    frustumCulled={false}
                />
                <instancedMesh
                    ref={nothingReplica}
                    args={[nothingLook.geometry, nothingLook.material, MAX_CHIPS]}
                    count={0}
                    frustumCulled={false}
                />
                <mesh ref={heldReplica} geometry={look.geometry} material={replicaChipMaterial} visible={false} />
                <mesh ref={(m) => (beams.current[1] = m)} material={beamMaterial} visible={false}>
                    <planeGeometry args={[1, 0.035]} />
                </mesh>
                <pointLight position={[0, INNER_HEIGHT / 2, 1.2]} intensity={15} distance={18} decay={1} color="#b48cff" />
            </group>
        </>
    );
};
