import { create } from "zustand";
import { persist } from "zustand/middleware";
import { InstrumentId, LoopId, TransportState } from "./jamAudio";

// Everything about the song in the jam room. The grid, the tempo, the
// beats per bar and which instrument stands on which stand are remembered
// between visits; the floor loops start off, so walking in is never loud.

export const ROWS = 4;
export const MAX_STEPS = 16; // two bars of up to eight beats
export const BPM_RANGE: [number, number] = [60, 160];
export const BPB_RANGE: [number, number] = [2, 8];

const emptyCells = () => Array<boolean>(MAX_STEPS).fill(false);

interface JamState extends TransportState {
    held: InstrumentId | null;
    toggleCell: (row: number, step: number) => void;
    clearGrid: () => void;
    nudgeBpm: (delta: number) => void;
    nudgeBeatsPerBar: (delta: number) => void;
    toggleLoop: (id: LoopId) => void;
    place: (row: number, instrument: InstrumentId | null) => void;
    setHeld: (instrument: InstrumentId | null) => void;
}

// A starter groove so the wall isn't blank the first time.
const starterRows = (): TransportState["rows"] => {
    const kick = emptyCells();
    [0, 2, 4, 6].forEach((i) => (kick[i] = true));
    const clap = emptyCells();
    [1, 3, 5, 7].forEach((i) => (clap[i] = true));
    return [
        { instrument: "drum", cells: kick },
        { instrument: "clap", cells: clap },
        { instrument: null, cells: emptyCells() },
        { instrument: null, cells: emptyCells() },
    ];
};

const noLoops = (): Record<LoopId, boolean> => ({
    beat: false,
    bass: false,
    chords: false,
    melody: false,
    sparkle: false,
    shaker: false,
});

const clamp = (value: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, value));

export const useJamStore = create<JamState>()(
    persist(
        (set) => ({
            bpm: 100,
            beatsPerBar: 4,
            rows: starterRows(),
            loops: noLoops(),
            held: null,
            toggleCell: (row, step) =>
                set((s) => ({
                    rows: s.rows.map((r, i) =>
                        i === row ? { ...r, cells: r.cells.map((on, j) => (j === step ? !on : on)) } : r
                    ),
                })),
            clearGrid: () => set((s) => ({ rows: s.rows.map((r) => ({ ...r, cells: emptyCells() })) })),
            nudgeBpm: (delta) => set((s) => ({ bpm: clamp(s.bpm + delta, BPM_RANGE) })),
            nudgeBeatsPerBar: (delta) => set((s) => ({ beatsPerBar: clamp(s.beatsPerBar + delta, BPB_RANGE) })),
            toggleLoop: (id) => set((s) => ({ loops: { ...s.loops, [id]: !s.loops[id] } })),
            // An instrument can only stand on one shelf at a time.
            place: (row, instrument) =>
                set((s) => ({
                    rows: s.rows.map((r, i) =>
                        i === row ? { ...r, instrument } : r.instrument === instrument ? { ...r, instrument: null } : r
                    ),
                })),
            setHeld: (held) => set({ held }),
        }),
        {
            name: "jam-room",
            version: 1,
            partialize: (s) => ({ bpm: s.bpm, beatsPerBar: s.beatsPerBar, rows: s.rows }),
        }
    )
);
