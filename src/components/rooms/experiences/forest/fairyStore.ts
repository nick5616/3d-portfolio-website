import { create } from "zustand";
import { persist } from "zustand/middleware";

// How many of each fairy you've caught, ever. Keys are colour names for
// royal fairies ("Rose", "Seafoam", ...) and "queen" / "king".
interface FairyState {
    caught: Record<string, number>;
    catchOne: (kind: string) => number; // returns the new count
}

export const useFairyStore = create<FairyState>()(
    persist(
        (set, get) => ({
            caught: {},
            catchOne: (kind) => {
                const count = (get().caught[kind] ?? 0) + 1;
                set((s) => ({ caught: { ...s.caught, [kind]: count } }));
                return count;
            },
        }),
        { name: "forest-fairies", version: 1 }
    )
);
