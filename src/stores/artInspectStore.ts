import { create } from "zustand";
import { ArtCategoryId } from "../configs/gcsConfig";

export interface AimedArt {
    id: string;
    category: ArtCategoryId;
    index: number;
}

interface ArtInspectState {
    // The art frame the crosshair is resting on (within reach), if any.
    aimed: AimedArt | null;
    setAimed: (aimed: AimedArt | null) => void;

    // The full-screen inspect view.
    inspecting: { category: ArtCategoryId; index: number } | null;
    openInspect: (category: ArtCategoryId, index: number) => void;
    setInspectIndex: (index: number) => void;
    closeInspect: () => void;
}

export const useArtInspectStore = create<ArtInspectState>((set) => ({
    aimed: null,
    setAimed: (aimed) =>
        set((state) =>
            state.aimed?.id === aimed?.id ? state : { aimed }
        ),
    inspecting: null,
    openInspect: (category, index) => set({ inspecting: { category, index } }),
    setInspectIndex: (index) =>
        set((state) =>
            state.inspecting
                ? { inspecting: { ...state.inspecting, index } }
                : state
        ),
    closeInspect: () => set({ inspecting: null }),
}));

// Art meshes register here so a single raycast per frame (ArtAimController)
// can find the one under the crosshair, instead of one raycaster per frame.
export const artTargets = new Map<
    string,
    { object: { current: import("three").Object3D | null }; category: ArtCategoryId; index: number }
>();
