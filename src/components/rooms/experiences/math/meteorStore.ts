import { create } from "zustand";

// HUD-facing state for Meteor Multiplication. The 3D game loop lives in
// refs inside MathExperience; it only writes here when something the HUD
// shows changes (score, level, typed answer, banners).

export type MeteorPhase = "off" | "title" | "playing" | "gameover";

const BEST_KEY = "meteor-math-best";
const readBest = () => {
    try {
        return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
    } catch {
        return 0;
    }
};

interface MeteorGameState {
    phase: MeteorPhase;
    seated: boolean; // at the turret (camera locked on the sky)
    score: number;
    destroyed: number;
    level: number;
    shields: number;
    input: string;
    best: number;
    banner: { key: number; text: string } | null;
    feedback: { key: number; kind: "hit" | "miss" | "impact"; text: string } | null;
    set: (patch: Partial<MeteorGameState>) => void;
    showBanner: (text: string) => void;
    showFeedback: (kind: "hit" | "miss" | "impact", text: string) => void;
    saveBest: (score: number) => void;
}

let key = 0;

export const useMeteorGame = create<MeteorGameState>((set, get) => ({
    phase: "off",
    seated: false,
    score: 0,
    destroyed: 0,
    level: 1,
    shields: 3,
    input: "",
    best: readBest(),
    banner: null,
    feedback: null,
    set: (patch) => set(patch),
    showBanner: (text) => set({ banner: { key: ++key, text } }),
    showFeedback: (kind, text) => set({ feedback: { key: ++key, kind, text } }),
    saveBest: (score) => {
        if (score <= get().best) return;
        try {
            localStorage.setItem(BEST_KEY, String(score));
        } catch {
            // ignore
        }
        set({ best: score });
    },
}));
