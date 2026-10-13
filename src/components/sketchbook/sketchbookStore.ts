import { create } from "zustand";

interface SketchbookState {
    reading: boolean;
    aimed: boolean; // crosshair on the book, close enough to read
    spread: number; // leaves turned so far (0 = closed, showing the cover)
    leaves: number;
    images: number;
    set: (patch: Partial<Omit<SketchbookState, "set">>) => void;
    // Registered by the Sketchbook component so the HUD buttons can drive it.
    controls: { next: () => void; prev: () => void; exit: () => void } | null;
}

export const useSketchbookStore = create<SketchbookState>((set) => ({
    reading: false,
    aimed: false,
    spread: 0,
    leaves: 0,
    images: 0,
    controls: null,
    set: (patch) => set(patch),
}));
