import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChipDesignId } from "./chipDesigns";
import { BotId, LADDER, SideLook } from "./opponents";
import type { TableState } from "./cosmicSync";

// UI-facing state for the Connect Four table. The board itself and the
// chips' motion live in the game component (refs + ChipSim); this is what
// other parts of the room react to: whose turn, who's speaking, which chip
// you hold, who you're playing (or watching), everyone else's tables, and
// your record against each opponent.

export type GamePhase =
    | "yourTurn"
    | "yourChipFalling"
    | "theirTurn"
    | "theirChipFalling"
    | "over"
    | "clearing"
    | "watching";

// What your board is showing: your own game against an opponent from the
// ladder, a game against another visitor, or someone else's game.
export type TableMode =
    | { kind: "bot" }
    | { kind: "versus"; peer: string; game: string; round: number; challenger: boolean }
    | { kind: "watch"; peer: string };

// Who is drawn across the table (the Void needs no one).
export type Seat = { kind: "bot"; bot: BotId } | { kind: "avatar"; character: number; look: number } | null;

export interface Speech {
    key: number;
    text: string;
}

type Record3 = { wins: number; losses: number; draws: number };

interface CosmicState {
    design: ChipDesignId;
    opponent: BotId;
    beaten: Partial<Record<BotId, boolean>>;
    records: Partial<Record<BotId, Record3>>;
    gamesStarted: number;
    phase: GamePhase;
    mode: TableMode;
    seat: Seat;
    // The two sides' chips on your board: [near side, far side].
    sides: [SideLook, SideLook];
    winner: 0 | 1 | 2 | null; // null while playing, 0 for a draw
    hoverCol: number | null;
    speech: Speech | null; // the Void's
    seatSpeech: Speech | null; // whoever sits across the table
    // The Void's mood drives its eyes and glow: 0 calm .. 1 intent.
    intensity: number;
    // The last chip to go in (and when, performance.now()): whoever sits
    // across the table glances at it. Comes from the game itself, so every
    // client watching a game turns its opponent the same way.
    lastMove: { col: number; at: number } | null;
    // Everyone else in the room, by peer id.
    tables: Record<string, TableState>;
    // Challenges waiting for your answer (peer -> game id), and yours.
    invites: Record<string, string>;
    outgoing: { peer: string; game: string } | null;
    setDesign: (design: ChipDesignId) => void;
    setOpponent: (opponent: BotId) => void;
    setPhase: (phase: GamePhase) => void;
    setMode: (mode: TableMode) => void;
    setSeat: (seat: Seat) => void;
    setSides: (sides: [SideLook, SideLook]) => void;
    setWinner: (winner: 0 | 1 | 2 | null) => void;
    setHoverCol: (col: number | null) => void;
    say: (text: string, by?: "void" | "seat") => void;
    setIntensity: (intensity: number) => void;
    setLastMove: (col: number | null) => void;
    recordResult: (bot: BotId, winner: 0 | 1 | 2) => void;
    markBeaten: (bot: BotId) => void;
    countGame: () => void;
    setTable: (peer: string, table: TableState | null) => void;
    setInvite: (peer: string, game: string | null) => void;
    setOutgoing: (outgoing: { peer: string; game: string } | null) => void;
}

let speechKey = 0;

export const useCosmicStore = create<CosmicState>()(
    persist(
        (set) => ({
            design: "ruby",
            opponent: "pibble",
            beaten: {},
            records: {},
            gamesStarted: 0,
            phase: "yourTurn",
            mode: { kind: "bot" },
            seat: null,
            sides: ["ruby", "rupee"],
            winner: null,
            hoverCol: null,
            speech: null,
            seatSpeech: null,
            intensity: 0,
            lastMove: null,
            tables: {},
            invites: {},
            outgoing: null,
            setDesign: (design) => set({ design }),
            setOpponent: (opponent) => set({ opponent }),
            setPhase: (phase) => set({ phase }),
            setMode: (mode) => set({ mode }),
            // Someone new sits down with nothing said yet.
            setSeat: (seat) => set({ seat, seatSpeech: null }),
            setSides: (sides) => set({ sides }),
            setWinner: (winner) => set({ winner }),
            setHoverCol: (hoverCol) => set({ hoverCol }),
            say: (text, by = "void") =>
                set(by === "void" ? { speech: { key: ++speechKey, text } } : { seatSpeech: { key: ++speechKey, text } }),
            setIntensity: (intensity) => set({ intensity }),
            setLastMove: (col) => set({ lastMove: col === null ? null : { col, at: performance.now() } }),
            recordResult: (bot, winner) =>
                set((s) => {
                    const r = s.records[bot] ?? { wins: 0, losses: 0, draws: 0 };
                    return {
                        records: {
                            ...s.records,
                            [bot]: {
                                wins: r.wins + (winner === 1 ? 1 : 0),
                                losses: r.losses + (winner === 2 ? 1 : 0),
                                draws: r.draws + (winner === 0 ? 1 : 0),
                            },
                        },
                    };
                }),
            markBeaten: (bot) => set((s) => ({ beaten: { ...s.beaten, [bot]: true } })),
            countGame: () => set((s) => ({ gamesStarted: s.gamesStarted + 1 })),
            setTable: (peer, table) =>
                set((s) => {
                    const tables = { ...s.tables };
                    if (table) tables[peer] = table;
                    else delete tables[peer];
                    return { tables };
                }),
            setInvite: (peer, game) =>
                set((s) => {
                    const invites = { ...s.invites };
                    if (game) invites[peer] = game;
                    else delete invites[peer];
                    return { invites };
                }),
            setOutgoing: (outgoing) => set({ outgoing }),
        }),
        {
            name: "cosmic-connect-four",
            version: 2,
            partialize: (s) => ({
                design: s.design,
                opponent: s.opponent,
                beaten: s.beaten,
                records: s.records,
                gamesStarted: s.gamesStarted,
            }),
            // v1 only ever played the Void (then "Nothing"). Anyone who
            // already beat it has nothing left to prove on the way up.
            migrate: (persisted, version) => {
                const state = persisted as Record<string, unknown>;
                if (version < 2) {
                    const record = (state.record as Record3 | undefined) ?? { wins: 0, losses: 0, draws: 0 };
                    const beatIt = record.wins > 0;
                    return {
                        design: state.design,
                        gamesStarted: state.gamesStarted ?? 0,
                        records: { void: record },
                        beaten: beatIt ? Object.fromEntries(LADDER.map((b) => [b, true])) : {},
                        opponent: beatIt ? "void" : "pibble",
                    };
                }
                return state;
            },
        }
    )
);
