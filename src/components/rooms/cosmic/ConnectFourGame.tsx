import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { InteractionRaycaster } from "../../core/InteractionRaycaster";
import { GemPrompt } from "../../ui/GemPrompt";
import { announce } from "../../ui/announce";
import { playSound } from "../../../audio/soundManager";
import { useAchievementStore } from "../../../stores/achievementStore";
import { useCharacterStore } from "../../../stores/characterStore";
import { lookFor } from "../../../multiplayer/characters";
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
    CHIP_DESIGNS,
    ChipDesignId,
    ChipLook,
    NOTHING_GLOW,
    designById,
    getChipLook,
    getGlowTexture,
    getNothingChipLook,
} from "./chipDesigns";
import { Seat, TableMode, useCosmicStore } from "./cosmicStore";
import { thinkFor } from "./nothingMind";
import { LINES, LineKind, pickFrom, pickLine } from "./nothingLines";
import {
    BotId,
    BotLines,
    LADDER,
    OPPONENTS,
    SideLook,
    botChips,
    isUnlocked,
    previousOnLadder,
} from "./opponents";
import { CosmicSync, TableState, connectCosmic } from "./cosmicSync";
import { cosmicControl } from "./cosmicControl";

// The table's game. The rules own the truth (which row a chip lands in,
// who won); ChipSim makes the chips get there physically; this component
// draws both the real board and the giant replica in the sky from the very
// same chip states every frame, so the replica is never a frame behind.
//
// The board shows one of three things (TableMode): your own game against
// whoever you picked from the ladder, a game against another visitor, or
// someone else's game as it happens. A game is just who went first and the
// columns played, so any of them can be rebuilt chip by chip, and the
// one you parked to go and watch comes back where you left it.

const MAX_CHIPS = Math.ceil((COLS * ROWS) / 2); // per side
const SWAP_SECONDS = 0.55;
// A challenge accepted, but the other side never turned up.
const PARTNER_TIMEOUT = 15000;

// The opening lines are said in order.
const pickLineAt = (kind: LineKind, index: number) => LINES[kind][index % LINES[kind].length];
const RAIL_DEPTH = 2 * (PANEL_Z + PANEL_DEPTH / 2) + 0.03;

interface Game {
    key: string;
    first: Player;
    moves: number[];
    result: 0 | 1 | 2 | null;
}

const other = (p: Player): Player => (p === 1 ? 2 : 1);
const ownerAt = (game: { first: Player }, index: number): Player => (index % 2 === 0 ? game.first : other(game.first));
const newKey = () => Math.random().toString(36).slice(2, 10);
const IDLE: Game = { key: "idle", first: 1, moves: [], result: null };

const lookOf = (id: SideLook): ChipLook => (id === "void" ? getNothingChipLook() : getChipLook(id));
const glowOf = (id: SideLook) => (id === "void" ? NOTHING_GLOW : designById(id).glow);

// Another visitor's stone, unless it's yours too.
const peerChips = (theirs: ChipDesignId, yours: ChipDesignId): SideLook => {
    if (theirs !== yours) return theirs;
    const i = CHIP_DESIGNS.findIndex((d) => d.id === theirs);
    return CHIP_DESIGNS[(i + 1) % CHIP_DESIGNS.length].id;
};

const seatFor = (opponent: TableState["opponent"]): Seat =>
    opponent.kind === "bot"
        ? opponent.bot === "void"
            ? null
            : { kind: "bot", bot: opponent.bot }
        : { kind: "avatar", character: opponent.character, look: opponent.look };

const sameSeat = (a: Seat, b: Seat) => JSON.stringify(a) === JSON.stringify(b);

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

// Each side's chips are long-lived objects rather than React-rendered
// meshes: a new stone (yours from the altar, or a different opponent's)
// swaps each placed chip's gem in place (shrink, swap, pop back) instead of
// remounting anything.
const makeSideSlots = () => {
    const root = new THREE.Group();
    const slots = Array.from({ length: MAX_CHIPS }, () => {
        const group = new THREE.Group();
        group.visible = false;
        const main = new THREE.Mesh();
        const core = new THREE.Mesh();
        const halo = new THREE.Sprite(haloMaterialFor("#ffffff", 0.85));
        group.add(main, core, halo);
        root.add(group);
        return { group, main, core, halo, shown: null as SideLook | null, swapAt: null as number | null };
    });
    return { root, slots };
};
type Slot = ReturnType<typeof makeSideSlots>["slots"][number];

const dress = (slot: Slot, id: SideLook) => {
    const chosen = lookOf(id);
    slot.main.geometry = chosen.geometry;
    slot.main.material = chosen.material;
    slot.core.visible = Boolean(chosen.core);
    if (chosen.core) {
        slot.core.geometry = chosen.core.geometry;
        slot.core.material = chosen.core.material;
    }
    const halo = slot.halo.material as THREE.SpriteMaterial;
    halo.color.set(glowOf(id));
    halo.opacity = id === "void" ? 0.9 : 0.85;
    slot.shown = id;
};

// --- The game ---------------------------------------------------------------

export const ConnectFourGame: React.FC = () => {
    const { design, phase, hoverCol, winner, mode, sides } = useCosmicStore(
        useShallow((s) => ({
            design: s.design,
            phase: s.phase,
            hoverCol: s.hoverCol,
            winner: s.winner,
            mode: s.mode,
            sides: s.sides,
        }))
    );
    const designInfo = designById(design);
    const nearLook = lookOf(sides[0]);
    const nothingLook = getNothingChipLook();

    // --- Mutable game state (refs, so timers never see stale values) -------
    const board = useRef<Board>(emptyBoard());
    const game = useRef<Game>({ ...IDLE, moves: [] });
    // Your game against the ladder, set aside while you watch or play
    // someone, so it's there when you come back.
    const own = useRef<Game | null>(null);
    const starter = useRef<Player>(1);
    const activeBot = useRef<BotId>(useCosmicStore.getState().opponent);
    const winLine = useRef<CellRef[] | null>(null);
    const awaiting = useRef<{ chip: Chip; then: () => void } | null>(null);
    const afterClear = useRef<(() => void) | null>(null);
    // Bumped whenever the board is cleared: thoughts and timers from the
    // game before are dropped.
    const epoch = useRef(0);
    const alive = useRef(true);
    const timers = useRef<number[]>([]);
    const lastClack = useRef(0);
    const lastNag = useRef(0);
    const sync = useRef<CosmicSync | null>(null);
    const partnerSeen = useRef(false);
    // Until you start a game of your own, you watch whoever's playing.
    const optedOwn = useRef(false);

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
                    const light = useCosmicStore.getState().sides[chip.owner - 1] === "void";
                    playSound(light ? "c4-chip-clack-gold" : "c4-chip-clack", {
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

    // --- Talking ----------------------------------------------------------------

    // Whoever you're playing from the ladder. Everyone watching your game
    // hears it say the same thing.
    const speak = (kind: keyof BotLines) => {
        const bot = activeBot.current;
        const line = { text: pickFrom(`${bot}:${kind}`, OPPONENTS[bot].lines[kind]), by: bot === "void" ? "void" : "seat" } as const;
        store().say(line.text, line.by);
        sync.current?.say(line);
    };
    const voidSays = (kind: LineKind) => store().say(pickLine(kind));

    // --- Your table, as everyone else sees it ------------------------------------

    const tableNow = (): TableState => {
        const s = store();
        const m = s.mode;
        const g = m.kind === "watch" ? own.current ?? IDLE : game.current;
        const { character, color } = useCharacterStore.getState();
        const partner = m.kind === "versus" ? s.tables[m.peer] : undefined;
        return {
            character,
            look: lookFor(character, color),
            design: s.design,
            opponent:
                m.kind === "versus"
                    ? { kind: "peer", peer: m.peer, character: partner?.character ?? 0, look: partner?.look ?? 0xffffff }
                    : { kind: "bot", bot: activeBot.current },
            opponentChips: m.kind === "versus" ? s.sides[1] : botChips(activeBot.current, s.design),
            key: g.key,
            first: g.first,
            moves: [...g.moves],
            result: g.result,
            watching: m.kind === "watch",
        };
    };
    // (Mid-clear the board is between games; whatever starts next sends.)
    const publishTable = () => {
        if (store().phase !== "clearing") sync.current?.publish(tableNow());
    };

    // Which stones each side plays, and who sits across the table.
    const refreshLooks = () => {
        const s = store();
        const m = s.mode;
        let sides: [SideLook, SideLook];
        let seat: Seat;
        if (m.kind === "watch") {
            const t = s.tables[m.peer];
            if (!t) return;
            sides = [t.design, t.opponentChips];
            seat = seatFor(t.opponent);
        } else if (m.kind === "versus") {
            const t = s.tables[m.peer];
            sides = [s.design, peerChips(t?.design ?? s.design, s.design)];
            seat = t ? { kind: "avatar", character: t.character, look: t.look } : null;
        } else {
            const bot = activeBot.current;
            sides = [s.design, botChips(bot, s.design)];
            seat = bot === "void" ? null : { kind: "bot", bot };
        }
        if (sides[0] !== s.sides[0] || sides[1] !== s.sides[1]) s.setSides(sides);
        if (!sameSeat(seat, s.seat)) s.setSeat(seat);
    };

    // --- Chips -------------------------------------------------------------------

    const place = (who: Player, col: number, holdTime: number) => {
        const row = landingRow(board.current, col);
        if (row < 0) return null;
        board.current[col][row] = who;
        game.current.moves.push(col);
        store().setLastMove(col);
        return { chip: sim.spawn(who, col, row, holdTime), row };
    };

    const markWinning = (line: CellRef[] | null) => {
        winLine.current = line;
        sim.chips.forEach((chip) => {
            chip.winning = Boolean(line?.some(([c, r]) => c === chip.col && r === chip.row));
        });
    };

    // Rebuild a game chip by chip, each falling in a moment after the last.
    const loadRecord = (record: Game) => {
        board.current = emptyBoard();
        game.current = { key: record.key, first: record.first, moves: [], result: record.result };
        let last: CellRef | null = null;
        for (let i = 0; i < record.moves.length; i++) {
            const placed = place(ownerAt(record, i), record.moves[i], 0.15 + i * 0.05);
            if (placed) last = [record.moves[i], placed.row];
        }
        markWinning(last ? findWin(board.current, last[0], last[1]) : null);
        store().setWinner(record.result);
    };

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

    // Every chip lifts away; once the board is empty, `then` sets up what
    // it shows next.
    const clearBoard = (then: () => void) => {
        epoch.current++;
        awaiting.current = null;
        const s = store();
        s.setPhase("clearing");
        s.setWinner(null);
        markWinning(null);
        if (sim.chips.length) {
            sim.reclaimAll(NOTHING_RECLAIM);
            playSound("c4-reclaim");
        }
        afterClear.current = then;
    };

    // --- Playing -------------------------------------------------------------------

    const updateTension = () => {
        store().setIntensity(Math.min(0.75, 0.1 + game.current.moves.length / 34));
    };

    // Beat someone on the ladder: the next one steps up.
    const beat = (bot: BotId) => {
        const s = store();
        const firstTime = !s.beaten[bot];
        s.markBeaten(bot);
        const achievements = useAchievementStore.getState();
        if (bot === "void") achievements.unlock("c4-win");
        const all = LADDER.every((b) => store().beaten[b]);
        if (all) achievements.unlock("c4-all");
        if (!firstTime) return;
        const beaten = OPPONENTS[bot].beaten;
        if (beaten) later(2600, () => announce({ line: beaten.line, detail: beaten.unlocks }));
        if (all) later(7000, () => voidSays("allBeaten"));
    };

    const finish = (result: 0 | 1 | 2, line: CellRef[] | null) => {
        const s = store();
        s.setPhase("over");
        s.setWinner(result);
        game.current.result = result;
        markWinning(line);
        publishTable();
        s.setIntensity(result === 2 ? 1 : result === 1 ? 0.85 : 0.5);
        playSound(result === 1 ? "c4-win" : result === 2 ? "c4-lose" : "c4-draw");
        if (s.mode.kind === "versus") {
            voidSays(result === 1 ? "versusYouWin" : result === 2 ? "versusYouLose" : "versusDraw");
            return;
        }
        const bot = activeBot.current;
        s.recordResult(bot, result);
        speak(result === 1 ? "youWin" : result === 2 ? "theyWin" : "draw");
        if (result === 1) beat(bot);
        later(5200, () => {
            if (store().phase === "over" && store().mode.kind === "bot") speak("again");
        });
    };

    // After any chip settles: did that end it? Otherwise, the other side.
    const resolve = (who: Player, col: number, row: number) => {
        const line = findWin(board.current, col, row);
        if (line) return finish(who, line);
        if (isFull(board.current)) return finish(0, null);
        updateTension();
        if (who === 2) return store().setPhase("yourTurn");
        if (store().mode.kind === "versus") {
            store().setPhase("theirTurn");
            pullRemote();
        } else {
            botTurn();
        }
    };

    const botTurn = async () => {
        const e = epoch.current;
        const s = store();
        const bot = OPPONENTS[activeBot.current];
        s.setPhase("theirTurn");
        if (game.current.moves.length > 0 && Math.random() < 0.55) speak("afterYourMove");
        s.setIntensity(Math.min(0.85, s.intensity + 0.1));
        const startedAt = performance.now();
        const choice = await thinkFor(cloneBoard(board.current), 2, bot.style);
        if (!alive.current || e !== epoch.current) return;
        const thinking = performance.now() - startedAt;
        const pause = Math.max(0, 900 + Math.random() * 900 - thinking);

        later(pause, () => {
            if (e !== epoch.current) return;
            if (choice.sparedYou) {
                speak("spared");
                if (bot.id === "void") useAchievementStore.getState().unlock("c4-spared");
            } else if (Math.random() < 0.3) {
                speak("afterTheirMove");
            }
            // The chip forms out of nothing above the column, then falls.
            const placed = place(2, choice.col, 0.6);
            if (!placed) return;
            publishTable();
            playSound(bot.id === "void" ? "c4-nothing-chip" : "c4-drop");
            store().setPhase("theirChipFalling");
            whenSettled(placed.chip, () => resolve(2, choice.col, placed.row));
        });
    };

    // Against another visitor: their move arrives on their table.
    const pullRemote = () => {
        const s = store();
        const m = s.mode;
        if (m.kind !== "versus" || s.phase !== "theirTurn") return;
        const t = s.tables[m.peer];
        const g = game.current;
        if (!t || t.key !== g.key || t.moves.length <= g.moves.length) return;
        if (g.moves.some((c, i) => t.moves[i] !== c)) return;
        const col = t.moves[g.moves.length];
        const placed = place(2, col, 0.35);
        if (!placed) return;
        publishTable();
        playSound("c4-drop");
        s.setPhase("theirChipFalling");
        whenSettled(placed.chip, () => resolve(2, col, placed.row));
    };

    const startGame = () => {
        const s = store();
        activeBot.current = s.opponent;
        game.current = { key: newKey(), first: starter.current, moves: [], result: null };
        board.current = emptyBoard();
        markWinning(null);
        s.setWinner(null);
        s.setIntensity(0.1);
        refreshLooks();
        if (starter.current === 1) {
            s.setPhase("yourTurn");
        } else {
            speak("opens");
            botTurn();
        }
        publishTable();
    };

    const startVersusRound = () => {
        const s = store();
        const m = s.mode;
        if (m.kind !== "versus") return restoreOwn();
        // The challenger opens the first game; after that, turn about.
        const first: Player = m.challenger === (m.round % 2 === 0) ? 1 : 2;
        game.current = { key: `${m.game}:${m.round}`, first, moves: [], result: null };
        board.current = emptyBoard();
        markWinning(null);
        s.setWinner(null);
        s.setIntensity(0.2);
        refreshLooks();
        s.setPhase(first === 1 ? "yourTurn" : "theirTurn");
        publishTable();
        pullRemote();
    };

    // Back to your game against the ladder, where you left it.
    const restoreOwn = () => {
        const saved = own.current;
        own.current = null;
        const s = store();
        s.setMode({ kind: "bot" });
        if (!saved || saved.result !== null || saved.moves.length === 0 || activeBot.current !== s.opponent) {
            return startGame();
        }
        refreshLooks();
        loadRecord(saved);
        const next = ownerAt(saved, saved.moves.length);
        if (next === 1) s.setPhase("yourTurn");
        else botTurn();
        publishTable();
    };
    const backToOwn = () => {
        restoreOwn();
        maybeAutoWatch();
    };

    // Set your game aside before the board shows anything else.
    const parkOwn = () => {
        if (store().mode.kind !== "bot") return;
        const g = game.current;
        own.current = g.result === null && g.moves.length > 0 ? { ...g, moves: [...g.moves] } : null;
    };

    const loadWatched = () => {
        const s = store();
        const m = s.mode;
        const t = m.kind === "watch" ? s.tables[m.peer] : undefined;
        if (!t) return restoreOwn();
        refreshLooks();
        loadRecord(t);
        s.setPhase("watching");
    };

    const dropYours = (col: number) => {
        const s = store();
        const row = landingRow(board.current, col);
        if (row < 0) {
            if (s.mode.kind === "versus") voidSays("columnFull");
            else speak("columnFull");
            playSound("ui-back");
            return;
        }
        optedOwn.current = true;
        // Your first chip of a game (you or they may have opened).
        if (game.current.moves.length <= 1) {
            s.countGame();
            useAchievementStore.getState().unlock("c4-first-game");
        }
        const placed = place(1, col, 0)!;
        publishTable();
        playSound("c4-drop");
        s.setPhase("yourChipFalling");
        whenSettled(placed.chip, () => resolve(1, col, row));
    };

    // --- Everyone else -------------------------------------------------------------

    const partnerLeft = () => {
        voidSays("partnerLeft");
        store().setMode({ kind: "bot" });
        clearBoard(restoreOwn);
    };

    const startVersus = (peer: string, gameId: string, challenger: boolean) => {
        const s = store();
        optedOwn.current = true;
        parkOwn();
        const out = s.outgoing;
        if (out && out.peer !== peer) sync.current?.challenge(out.peer, { kind: "cancel", game: out.game });
        s.setOutgoing(null);
        s.setMode({ kind: "versus", peer, game: gameId, round: 0, challenger });
        partnerSeen.current = false;
        voidSays("versusStart");
        playSound("c4-chip-select");
        clearBoard(startVersusRound);
        later(PARTNER_TIMEOUT, () => {
            const m = store().mode;
            if (m.kind === "versus" && m.game === gameId && !partnerSeen.current) partnerLeft();
        });
    };

    const onTable = (peer: string, t: TableState) => {
        const s = store();
        s.setTable(peer, t);
        const m: TableMode = s.mode;

        if (m.kind === "watch" && m.peer === peer) {
            if (s.phase === "clearing") return; // it'll load the latest
            if (t.watching) {
                // They've gone to watch someone else; so do we, or play.
                s.setMode({ kind: "bot" });
                return clearBoard(backToOwn);
            }
            refreshLooks();
            const g = game.current;
            const continues =
                t.key === g.key && t.moves.length >= g.moves.length && g.moves.every((c, i) => t.moves[i] === c);
            if (!continues) return clearBoard(loadWatched);
            for (let i = g.moves.length; i < t.moves.length; i++) {
                const who = ownerAt(t, i);
                if (!place(who, t.moves[i], 0.1)) break;
                playSound(t.opponentChips === "void" && who === 2 ? "c4-nothing-chip" : "c4-drop");
            }
            if (t.result !== null && g.result === null && g.moves.length) {
                const col = g.moves[g.moves.length - 1];
                const top = landingRow(board.current, col);
                markWinning(findWin(board.current, col, top < 0 ? ROWS - 1 : top - 1));
            }
            g.result = t.result;
            s.setWinner(t.result);
            return;
        }

        if (m.kind === "versus" && m.peer === peer) {
            const pointsAtUs =
                t.opponent.kind === "peer" && t.opponent.peer === sync.current?.selfId && t.key.startsWith(`${m.game}:`);
            if (!pointsAtUs) {
                if (partnerSeen.current) partnerLeft();
                return;
            }
            partnerSeen.current = true;
            refreshLooks();
            const round = Number(t.key.slice(m.game.length + 1));
            if (round > m.round) {
                // They asked for a rematch.
                s.setMode({ ...m, round });
                if (s.phase !== "clearing") clearBoard(startVersusRound);
                return;
            }
            pullRemote();
            return;
        }

        maybeAutoWatch();
    };

    const onLeave = (peer: string) => {
        const s = store();
        s.setTable(peer, null);
        s.setInvite(peer, null);
        if (s.outgoing?.peer === peer) s.setOutgoing(null);
        const m = s.mode;
        if (m.kind === "watch" && m.peer === peer) {
            voidSays("watchedLeft");
            s.setMode({ kind: "bot" });
            clearBoard(backToOwn);
        } else if (m.kind === "versus" && m.peer === peer) {
            partnerLeft();
        }
    };

    const control = {
        chooseOpponent: (bot: BotId) => {
            const s = store();
            if (!isUnlocked(bot, s.beaten)) {
                const before = previousOnLadder(bot);
                s.say(before ? `Not yet. Beat ${OPPONENTS[before].name} first.` : pickLine("locked"));
                playSound("ui-back");
                return;
            }
            optedOwn.current = true;
            if (s.mode.kind === "bot" && s.opponent === bot && s.phase !== "clearing") return;
            s.setOpponent(bot);
            own.current = null;
            s.setMode({ kind: "bot" });
            starter.current = 1;
            playSound("c4-chip-select");
            clearBoard(() => {
                startGame();
                speak("greet");
            });
        },
        watch: (peer: string) => {
            const s = store();
            if (!s.tables[peer]) return;
            if (s.mode.kind === "watch" && s.mode.peer === peer) return control.stopWatching();
            parkOwn();
            s.setMode({ kind: "watch", peer });
            voidSays("watching");
            playSound("c4-chip-select");
            clearBoard(loadWatched);
        },
        stopWatching: () => {
            if (store().mode.kind !== "watch") return;
            optedOwn.current = true;
            voidSays("stopWatching");
            store().setMode({ kind: "bot" });
            clearBoard(restoreOwn);
        },
        challenge: (peer: string) => {
            const s = store();
            const out = s.outgoing;
            if (out) sync.current?.challenge(out.peer, { kind: "cancel", game: out.game });
            if (out?.peer === peer) {
                s.setOutgoing(null);
                return;
            }
            const gameId = newKey();
            s.setOutgoing({ peer, game: gameId });
            sync.current?.challenge(peer, { kind: "invite", game: gameId });
            voidSays("challengeSent");
            playSound("c4-chip-select");
        },
        accept: (peer: string) => {
            const s = store();
            const gameId = s.invites[peer];
            if (!gameId) return;
            s.setInvite(peer, null);
            sync.current?.challenge(peer, { kind: "accept", game: gameId });
            startVersus(peer, gameId, false);
        },
    };

    // Someone's mid-game and you haven't started one of your own: their
    // game is what your board shows.
    const isPlaying = (t: TableState) => !t.watching && t.moves.length > 0 && t.result === null;
    const maybeAutoWatch = () => {
        const s = store();
        if (optedOwn.current || s.mode.kind !== "bot" || s.phase === "clearing") return;
        if (game.current.moves.length > 0 && game.current.result === null) return;
        const playing = Object.keys(s.tables)
            .sort()
            .filter((id) => isPlaying(s.tables[id]));
        // A game between two visitors is the better show.
        const peer = playing.find((id) => s.tables[id].opponent.kind === "peer") ?? playing[0];
        if (peer) control.watch(peer);
    };

    const handleTrigger = () => {
        const s = store();
        if (s.phase === "yourTurn" && s.hoverCol !== null) {
            dropYours(s.hoverCol);
        } else if (s.phase === "watching") {
            control.stopWatching();
        } else if (s.phase === "over") {
            const m = s.mode;
            if (m.kind === "versus") {
                s.setMode({ ...m, round: m.round + 1 });
                clearBoard(startVersusRound);
            } else {
                starter.current = other(starter.current);
                clearBoard(startGame);
            }
        } else if (s.phase === "theirTurn" || s.phase === "theirChipFalling") {
            const now = performance.now();
            if (now - lastNag.current > 6000) {
                lastNag.current = now;
                if (s.mode.kind === "versus") voidSays("versusTheirTurn");
                else speak("notYourTurn");
            }
        }
    };

    // First words, a fresh board, and the rest of the room, on arrival.
    useEffect(() => {
        alive.current = true;
        const s = store();
        // Other tables from a previous visit are long gone.
        useCosmicStore.setState({
            tables: {},
            invites: {},
            outgoing: null,
            mode: { kind: "bot" },
            seat: null,
            phase: "yourTurn",
            winner: null,
        });
        s.setHoverCol(null);
        // Someone locked out of their pick (an old save) starts at the bottom.
        if (!isUnlocked(s.opponent, s.beaten)) s.setOpponent(LADDER[0]);
        activeBot.current = store().opponent;

        sync.current = connectCosmic(tableNow(), {
            onTable,
            onLeave,
            onChallenge: (peer, message) => {
                const st = store();
                if (message.kind === "invite") {
                    st.setInvite(peer, message.game);
                    voidSays("challenged");
                    playSound("c4-chip-select");
                } else if (message.kind === "cancel") {
                    if (st.invites[peer] === message.game) st.setInvite(peer, null);
                } else if (st.outgoing?.peer === peer && st.outgoing.game === message.game) {
                    startVersus(peer, message.game, true);
                }
            },
            // The opponent at the table you're watching, speaking.
            onSay: (peer, line) => {
                const m = store().mode;
                if (m.kind === "watch" && m.peer === peer) store().say(line.text, line.by);
            },
        });
        cosmicControl.current = control;
        startGame();

        if (s.gamesStarted === 0) {
            const [a, b, c] = [0, 1, 2].map((i) => pickLineAt("firstMeeting", i));
            later(900, () => store().say(a));
            later(5200, () => store().say(b));
            later(10200, () => store().say(c));
            later(14500, () => store().mode.kind === "bot" && speak("greet"));
        } else {
            later(900, () => store().say(pickLine("returning")));
            if (activeBot.current !== "void") later(4600, () => store().mode.kind === "bot" && speak("greet"));
        }

        // Others see your traveler and your stones change.
        const unsubscribeCharacter = useCharacterStore.subscribe((st, prev) => {
            if (st.character !== prev.character || st.color !== prev.color) publishTable();
        });
        const unsubscribeDesign = useCosmicStore.subscribe((st, prev) => {
            if (st.design === prev.design) return;
            refreshLooks();
            publishTable();
        });
        return () => {
            alive.current = false;
            timers.current.forEach((id) => clearTimeout(id));
            timers.current = [];
            unsubscribeCharacter();
            unsubscribeDesign();
            cosmicControl.current = null;
            sync.current?.leave();
            sync.current = null;
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
    // Replica stones glow in their own color, one material per color.
    const replicaChipMaterials = useMemo(() => new Map<string, THREE.Material>(), []);
    const replicaMaterialFor = (id: SideLook) => {
        if (id === "void") return nothingLook.material;
        const glow = glowOf(id);
        let material = replicaChipMaterials.get(glow);
        if (!material) {
            material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(glow).multiplyScalar(0.35),
                emissive: glow,
                emissiveIntensity: 1.1,
                metalness: 0.5,
                roughness: 0.25,
                flatShading: true,
                toneMapped: false,
                fog: false,
            });
            replicaChipMaterials.set(glow, material);
        }
        return material;
    };
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
            [...Object.values(realMaterials), ...Object.values(replicaMaterials), beamMaterial].forEach((m) => m.dispose());
            replicaChipMaterials.forEach((m) => m.dispose());
            (realMaterials.panel as THREE.MeshPhysicalMaterial).map?.dispose();
        },
        [frameGeometry, realMaterials, replicaMaterials, replicaChipMaterials, beamMaterial]
    );
    useEffect(() => () => markerMaterial.dispose(), [markerMaterial]);

    // --- Scene refs --------------------------------------------------------------
    const boardGroup = useRef<THREE.Group>(null);
    const replicaGroup = useRef<THREE.Group>(null);
    const sideChips = useMemo(() => [makeSideSlots(), makeSideSlots()], []);
    useEffect(
        () => () =>
            sideChips.forEach((side) => side.slots.forEach((slot) => (slot.halo.material as THREE.Material).dispose())),
        [sideChips]
    );
    const replicas = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
    const held = useRef<THREE.Group>(null);
    const heldReplica = useRef<THREE.Mesh>(null);
    const marker = useRef<THREE.Mesh>(null);
    const beams = useRef<(THREE.Mesh | null)[]>([]);
    const targets = useRef<THREE.Group>(null);

    // The giant replica's stones change along with the board's.
    useEffect(() => {
        sides.forEach((id, i) => {
            const replica = replicas[i].current;
            if (!replica) return;
            replica.geometry = lookOf(id).geometry;
            replica.material = replicaMaterialFor(id);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sides]);

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        sim.update(Math.min(delta, 0.1));
        nothingLook.uniforms.uTime.value = t;
        const s = store();

        // Once the board is empty after clearing, set up what comes next.
        if (s.phase === "clearing" && sim.chips.length === 0) {
            const then = afterClear.current ?? startGame;
            afterClear.current = null;
            then();
        }

        const pulse = 1 + Math.sin(t * 7) * 0.09;
        const counts = [0, 0];
        for (const chip of sim.chips) {
            chipMatrix(chip, _matrix, pulse);
            const side = chip.owner - 1;
            const index = counts[side]++;
            const slot = sideChips[side].slots[index];
            if (!slot) continue;
            const want = s.sides[side];
            slot.group.visible = true;
            _matrix.decompose(slot.group.position, slot.group.quaternion, slot.group.scale);
            // A new stone: each chip in turn shrinks away spinning, swaps
            // its gem at the bottom of the dip, and pops back with a little
            // overshoot.
            if (slot.shown === null) dress(slot, want);
            if (slot.shown !== want && slot.swapAt === null) slot.swapAt = t + index * 0.07;
            let swapGlow = 0;
            if (slot.swapAt !== null && t >= slot.swapAt) {
                const p = (t - slot.swapAt) / SWAP_SECONDS;
                if (p >= 0.5 && slot.shown !== want) {
                    dress(slot, want);
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
                if (p >= 1 && slot.shown !== want) slot.swapAt = t;
            }
            // The Void's light always glows; stones only when they win or change.
            const light = slot.shown === "void";
            slot.halo.visible = light || chip.winning || swapGlow > 0.02;
            slot.halo.scale.setScalar(
                CHIP_RADIUS * (light ? 5 * (chip.winning ? pulse : 1) : 6 * (chip.winning ? pulse : 0.6 + swapGlow))
            );
            slot.group.updateMatrix();
            replicas[side].current?.setMatrixAt(index, slot.group.matrix);
        }
        // Unused slots wear their side's current stone, so a new chip appears in it.
        sideChips.forEach((chips, side) => {
            for (let i = counts[side]; i < MAX_CHIPS; i++) {
                const slot = chips.slots[i];
                slot.group.visible = false;
                slot.swapAt = null;
                if (slot.shown !== s.sides[side]) dress(slot, s.sides[side]);
            }
            const replica = replicas[side].current;
            if (replica) {
                replica.count = counts[side];
                replica.instanceMatrix.needsUpdate = true;
            }
        });
        nothingLook.uniforms.uFlare.value = s.phase === "theirChipFalling" && s.sides[1] === "void" ? 0.4 : 0;

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
            beam.visible = Boolean(line) && (s.phase === "over" || s.phase === "watching");
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
        beamMaterial.color.set(glowOf(s.sides[s.winner === 2 ? 1 : 0]));
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
                if (mode.kind === "versus") return <GemPrompt accent="gold" action="Rematch" />;
                return (
                    <GemPrompt
                        accent="gold"
                        action={winner === 1 ? `Play again (${OPPONENTS[activeBot.current].name} is waiting)` : "Play again"}
                    />
                );
            case "watching":
                return <GemPrompt accent="gold" action="Play your own game" />;
            default:
                return null;
        }
    })();

    return (
        <>
            <group ref={boardGroup} position={BOARD_POSITION}>
                <BoardFrame materials={realMaterials} geometry={frameGeometry} />
                <primitive object={sideChips[0].root} />
                <primitive object={sideChips[1].root} />

                <group ref={held} visible={false}>
                    <mesh geometry={nearLook.geometry} material={nearLook.material} />
                    {nearLook.core && <mesh geometry={nearLook.core.geometry} material={nearLook.core.material} />}
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
                {replicas.map((ref, i) => (
                    <instancedMesh
                        key={i}
                        ref={ref}
                        args={[nothingLook.geometry, nothingLook.material, MAX_CHIPS]}
                        count={0}
                        frustumCulled={false}
                    />
                ))}
                <mesh
                    ref={heldReplica}
                    geometry={nearLook.geometry}
                    material={replicaMaterialFor(sides[0])}
                    visible={false}
                />
                <mesh ref={(m) => (beams.current[1] = m)} material={beamMaterial} visible={false}>
                    <planeGeometry args={[1, 0.035]} />
                </mesh>
                <pointLight position={[0, INNER_HEIGHT / 2, 1.2]} intensity={15} distance={18} decay={1} color="#b48cff" />
            </group>
        </>
    );
};
