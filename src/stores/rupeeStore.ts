import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";

// Rupee types schema
const RupeeTypeSchema = z.object({
    name: z.string(),
    color: z.string(),
    value: z.number(),
    spawnWeight: z.number(),
});

const RupeeCollectionSchema = z.object({
    count: z.number().min(0),
});

const RupeeStoreSchema = z.object({
    rupees: z.record(z.string(), RupeeCollectionSchema),
    totalValue: z.number(),
});

type RupeeType = z.infer<typeof RupeeTypeSchema>;
type RupeeCollection = z.infer<typeof RupeeCollectionSchema>;
type RupeeStore = z.infer<typeof RupeeStoreSchema>;

// Rupee types (same as in RoomRupeeSpawner)
export const RUPEE_TYPES: RupeeType[] = [
    { name: "Green", color: "#00FF00", value: 1, spawnWeight: 50 },
    { name: "Blue", color: "#0080FF", value: 5, spawnWeight: 20 },
    { name: "Red", color: "#FF0000", value: 20, spawnWeight: 10 },
    { name: "Silver", color: "#C0C0C0", value: 100, spawnWeight: 3 },
    { name: "Purple", color: "#8000FF", value: 50, spawnWeight: 4 },
    { name: "Orange", color: "#FF8000", value: 300, spawnWeight: 2 },
    { name: "Black", color: "#333333", value: -20, spawnWeight: 1 },
];

interface RupeeStoreState extends RupeeStore {
    // Actions
    addRupee: (type: string) => void;
    removeRupee: (type: string) => void;
    getRupeeCount: (type: string) => number;
    getTotalValue: () => number;
    resetRupees: () => void;
}

// Helper function to calculate total value
const calculateTotalValue = (
    rupees: Record<string, RupeeCollection>
): number => {
    return Object.entries(rupees).reduce((total, [type, collection]) => {
        const rupeeType = RUPEE_TYPES.find((rt) => rt.name === type);
        return total + (rupeeType ? rupeeType.value * collection.count : 0);
    }, 0);
};

export const useRupeeStore = create<RupeeStoreState>()(
    persist(
        (set, get) => ({
            rupees: {},
            totalValue: 0,

            addRupee: (type: string) => {
                set((state) => {
                    const newRupees = { ...state.rupees };
                    if (!newRupees[type]) {
                        newRupees[type] = { count: 0 };
                    }
                    newRupees[type].count += 1;

                    const totalValue = calculateTotalValue(newRupees);

                    return {
                        rupees: newRupees,
                        totalValue,
                    };
                });
            },

            removeRupee: (type: string) => {
                set((state) => {
                    const newRupees = { ...state.rupees };
                    if (newRupees[type] && newRupees[type].count > 0) {
                        newRupees[type].count -= 1;
                        if (newRupees[type].count === 0) {
                            delete newRupees[type];
                        }
                    }

                    const totalValue = calculateTotalValue(newRupees);

                    return {
                        rupees: newRupees,
                        totalValue,
                    };
                });
            },

            getRupeeCount: (type: string) => {
                const state = get();
                return state.rupees[type]?.count || 0;
            },

            getTotalValue: () => {
                const state = get();
                return state.totalValue;
            },

            resetRupees: () => {
                set({
                    rupees: {},
                    totalValue: 0,
                });
            },
        }),
        {
            name: "rupee-storage",
            version: 1,
        }
    )
);
