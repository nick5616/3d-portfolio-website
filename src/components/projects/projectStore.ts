import { create } from "zustand";

interface ProjectState {
    aimedId: string | null;
    openId: string | null;
    setAimed: (id: string | null) => void;
    open: (id: string) => void;
    close: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    aimedId: null,
    openId: null,
    setAimed: (id) => set((s) => (s.aimedId === id ? s : { aimedId: id })),
    open: (id) => set({ openId: id }),
    close: () => set({ openId: null }),
}));
