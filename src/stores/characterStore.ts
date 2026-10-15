import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHARACTERS, PALETTE, characterAt } from "../multiplayer/characters";
import { useFairyStore } from "../components/rooms/experiences/forest/fairyStore";
import { useUnlockStore } from "./unlockStore";
import { useRupeeStore } from "./rupeeStore";

// Who the visitor appears as to everyone else. The pick is remembered, but
// the selector still opens on every visit (with that pick ready to confirm),
// while the starting room loads behind it.
interface CharacterState {
    character: number; // index into CHARACTERS
    color: number; // 0xRRGGBB, from PALETTE (fairies bring their own)
    /** The selector is open. */
    selecting: boolean;
    /** Confirmed at least once this visit (multiplayer waits for this). */
    entered: boolean;
    setCharacter: (character: number) => void;
    setColor: (color: number) => void;
    confirm: () => void;
    reopen: () => void;
}

// Fairies are earned: catch that one in the forest, or buy it.
const purchaseId = (character: number) => `avatar-fairy-${characterAt(character).fairy?.caughtKey}`;

export const isCharacterUnlocked = (
    character: number,
    caught = useFairyStore.getState().caught,
    unlocked = useUnlockStore.getState().unlocked
) => {
    const fairy = CHARACTERS[character]?.fairy;
    if (!fairy) return character < CHARACTERS.length;
    return Boolean(caught[fairy.caughtKey]) || Boolean(unlocked[purchaseId(character)]);
};

export const useCharacterUnlocked = (character: number) => {
    const caught = useFairyStore((s) => s.caught);
    const unlocked = useUnlockStore((s) => s.unlocked);
    return isCharacterUnlocked(character, caught, unlocked);
};

/** Spends the rupees and unlocks it; false (and nothing spent) if short. */
export const buyCharacter = (character: number) => {
    const fairy = characterAt(character).fairy;
    if (!fairy || isCharacterUnlocked(character)) return false;
    if (!useRupeeStore.getState().spendRupees(fairy.price)) return false;
    useUnlockStore.getState().unlock(purchaseId(character));
    return true;
};

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            character: Math.floor(Math.random() * 2), // Pip or Wisp
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            selecting: true,
            entered: false,
            setCharacter: (character) => set({ character }),
            setColor: (color) => set({ color }),
            // Only someone you're allowed to be.
            confirm: () => {
                if (!isCharacterUnlocked(get().character)) return;
                set({ selecting: false, entered: true });
            },
            reopen: () => set({ selecting: true }),
        }),
        {
            name: "character-storage",
            version: 2,
            partialize: (s) => ({ character: s.character, color: s.color }),
            // v1 had a different cast; everyone starts back at Pip.
            migrate: (persisted, version) => {
                const state = persisted as { character: number; color: number };
                return version < 2 ? { ...state, character: 0 } : state;
            },
            // A pick that's no longer yours (or no longer exists) falls back.
            onRehydrateStorage: () => (state) => {
                if (state && !isCharacterUnlocked(state.character)) state.setCharacter(0);
            },
        }
    )
);
