import { create } from "zustand";

const BEST_KEY = "gym-best-set";
const readBest = () => {
    try {
        return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
    } catch {
        return 0;
    }
};

export type PullPhase = "hang" | "pulling" | "top" | "lowering";

interface GymState {
    hanging: boolean;
    reps: number;
    cleanReps: number;
    best: number;
    cue: string;
    phase: PullPhase;
    flash: { key: number; text: string; good: boolean } | null;
    combo: number;
    aimed: "bar" | "bag" | null;
    set: (patch: Partial<GymState>) => void;
    showFlash: (text: string, good: boolean) => void;
    saveBest: (reps: number) => void;
}

let key = 0;
export const useGym = create<GymState>((set, get) => ({
    hanging: false,
    reps: 0,
    cleanReps: 0,
    best: readBest(),
    cue: "",
    phase: "hang",
    flash: null,
    combo: 0,
    aimed: null,
    set: (patch) => set(patch),
    showFlash: (text, good) => set({ flash: { key: ++key, text, good } }),
    saveBest: (reps) => {
        if (reps <= get().best) return;
        try {
            localStorage.setItem(BEST_KEY, String(reps));
        } catch {
            // ignore
        }
        set({ best: reps });
    },
}));
