import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChipDesignId } from "./chipDesigns";

// UI-facing state for the Connect Four table. The board itself and the
// chips' motion live in the game component (refs + ChipSim); this is what
// other parts of the room react to: whose turn, what Nothing is saying,
// which chip you hold, and your record against it.

export type GamePhase =
    | "yourTurn"
    | "yourChipFalling"
    | "nothingThinking"
    | "nothingChipFalling"
    | "over"
    | "clearing";

export interface Speech {
    key: number;
    text: string;
}

interface CosmicState {
    design: ChipDesignId;
    record: { wins: number; losses: number; draws: number };
    gamesStarted: number;
    phase: GamePhase;
    winner: 0 | 1 | 2 | null; // null while playing, 0 for a draw
    hoverCol: number | null;
    speech: Speech | null;
    // Nothing's mood drives its eyes and glow: 0 calm .. 1 intent.
    intensity: number;
    setDesign: (design: ChipDesignId) => void;
    setPhase: (phase: GamePhase) => void;
    setWinner: (winner: 0 | 1 | 2 | null) => void;
    setHoverCol: (col: number | null) => void;
    say: (text: string) => void;
    setIntensity: (intensity: number) => void;
    recordResult: (winner: 0 | 1 | 2) => void;
    countGame: () => void;
}

let speechKey = 0;

export const useCosmicStore = create<CosmicState>()(
    persist(
        (set) => ({
            design: "ruby",
            record: { wins: 0, losses: 0, draws: 0 },
            gamesStarted: 0,
            phase: "yourTurn",
            winner: null,
            hoverCol: null,
            speech: null,
            intensity: 0,
            setDesign: (design) => set({ design }),
            setPhase: (phase) => set({ phase }),
            setWinner: (winner) => set({ winner }),
            setHoverCol: (hoverCol) => set({ hoverCol }),
            say: (text) => set({ speech: { key: ++speechKey, text } }),
            setIntensity: (intensity) => set({ intensity }),
            recordResult: (winner) =>
                set((s) => ({
                    record: {
                        wins: s.record.wins + (winner === 1 ? 1 : 0),
                        losses: s.record.losses + (winner === 2 ? 1 : 0),
                        draws: s.record.draws + (winner === 0 ? 1 : 0),
                    },
                })),
            countGame: () => set((s) => ({ gamesStarted: s.gamesStarted + 1 })),
        }),
        {
            name: "cosmic-connect-four",
            version: 1,
            partialize: (s) => ({ design: s.design, record: s.record, gamesStarted: s.gamesStarted }),
        }
    )
);
