import { create } from "zustand";
import { persist } from "zustand/middleware";

// Doors (and anything else) that have been paid for. Persisted, so a door
// you've opened once stays open on later visits.
interface UnlockState {
    unlocked: Record<string, number>; // id -> timestamp
    unlock: (id: string) => void;
}

export const useUnlockStore = create<UnlockState>()(
    persist(
        (set) => ({
            unlocked: {},
            unlock: (id) =>
                set((state) =>
                    state.unlocked[id]
                        ? state
                        : { unlocked: { ...state.unlocked, [id]: Date.now() } }
                ),
        }),
        { name: "unlock-storage", version: 1 }
    )
);
