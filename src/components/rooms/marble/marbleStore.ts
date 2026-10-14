import { create } from "zustand";
import { persist } from "zustand/middleware";

// The marble wall's layout: which piece sits in which pegboard hole.
// Remembered between visits.

export type PieceKind = "rampRight" | "rampLeft" | "bell" | "bumper" | "spinner";

export const COLS = 14;
export const ROWS = 8;
export const cellKey = (col: number, row: number) => `${col},${row}`;

// A starter run: a zigzag down the middle (every ramp plays a note as the
// marble lands on it, so the first marble already plays a falling tune),
// with bells where the marble swings out past the ramps' ends. Checked
// headless with Rapier: drops into the top of the zigzag always reach the
// tray, at 20-60 Hz physics.
const starter = (): Record<string, PieceKind> => {
    const layout: Record<string, PieceKind> = {};
    for (let row = 7; row >= 1; row--) {
        const right = (7 - row) % 2 === 0;
        layout[cellKey(right ? 6 : 7, row)] = right ? "rampRight" : "rampLeft";
    }
    layout[cellKey(7, 3)] = "bell";
    layout[cellKey(8, 0)] = "bell";
    layout[cellKey(5, 1)] = "bell";
    layout[cellKey(10, 6)] = "bumper";
    layout[cellKey(3, 5)] = "bumper";
    layout[cellKey(10, 3)] = "spinner";
    layout[cellKey(2, 2)] = "spinner";
    return layout;
};

interface MarbleState {
    layout: Record<string, PieceKind>;
    held: PieceKind | null;
    auto: boolean;
    set: (col: number, row: number, kind: PieceKind | null) => void;
    setHeld: (kind: PieceKind | null) => void;
    reset: () => void;
    toggleAuto: () => void;
}

export const useMarbleStore = create<MarbleState>()(
    persist(
        (set) => ({
            layout: starter(),
            held: null,
            auto: false,
            set: (col, row, kind) =>
                set((s) => {
                    const layout = { ...s.layout };
                    if (kind) layout[cellKey(col, row)] = kind;
                    else delete layout[cellKey(col, row)];
                    return { layout };
                }),
            setHeld: (held) => set({ held }),
            reset: () => set({ layout: starter() }),
            toggleAuto: () => set((s) => ({ auto: !s.auto })),
        }),
        { name: "marble-machine", version: 1, partialize: (s) => ({ layout: s.layout }) }
    )
);
