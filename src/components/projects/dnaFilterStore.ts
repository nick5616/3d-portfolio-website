import { create } from "zustand";
import { TECH_FAMILIES } from "./projectDna";

// Which tech families are switched on at the legend console. A helix stays
// on the ring if any of its rungs belongs to a lit family; rungs of unlit
// families go dark on the helixes that remain.
interface DnaFilterState {
    enabled: Record<string, boolean>;
    toggle: (familyId: string) => void;
    aimedButton: string | null;
    setAimedButton: (id: string | null) => void;
    // The physical press of a console button (drives the cap animation).
    // The filter itself flips a beat later, when the button bottoms out.
    lastPress: { id: string; at: number } | null;
    pressButton: (id: string) => void;
}

export const useDnaFilterStore = create<DnaFilterState>((set) => ({
    enabled: Object.fromEntries(TECH_FAMILIES.map((f) => [f.id, true])),
    toggle: (familyId) =>
        set((s) => ({ enabled: { ...s.enabled, [familyId]: !s.enabled[familyId] } })),
    aimedButton: null,
    setAimedButton: (id) => set((s) => (s.aimedButton === id ? s : { aimedButton: id })),
    lastPress: null,
    pressButton: (id) => set({ lastPress: { id, at: performance.now() } }),
}));

// Time from pressing E to the button bottoming out (when the filter flips).
export const BUTTON_TRAVEL_MS = 150;
