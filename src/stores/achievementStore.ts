// src/stores/achievementStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { playSound } from "../audio/soundManager";

export interface AchievementDef {
    id: string;
    title: string;
    description: string;
    // Shown instead of title/description while locked, so the achievement
    // wall works as a checklist without spoiling the exact unlock text.
    hint: string;
}

// Every room that counts toward "discover each room" / "Grand Tour". The
// achievements room itself is deliberately excluded - you're standing in it
// to read this list, so tracking its own discovery would be a freebie.
export const TRACKED_ROOM_IDS = [
    "atrium",
    "gallery",
    "gallery-hall-digitalart",
    "gallery-hall-paintings",
    "gallery-hall-sketches",
    "gallery-hall-lefthanded",
    "gallery-hall-miscellaneous",
    "gallery-hall-notesappart",
    "projects",
    "about",
    "relaxation",
] as const;

const ROOM_NAMES: Record<string, string> = {
    atrium: "the Atrium",
    gallery: "the Art Gallery",
    "gallery-hall-digitalart": "the Digital Art Hall",
    "gallery-hall-paintings": "the Paintings Hall",
    "gallery-hall-sketches": "the Sketchbook Rotunda",
    "gallery-hall-lefthanded": "the Left-Handed Hall",
    "gallery-hall-miscellaneous": "the Miscellaneous Hall",
    "gallery-hall-notesappart": "the Notes App Art room",
    projects: "the Software Projects room",
    about: "the Play Place",
    relaxation: "the Relaxation Room",
};

const roomAchievement = (roomId: string): AchievementDef => ({
    id: `room-${roomId}`,
    title: ROOM_NAMES[roomId] ?? roomId,
    description: `Discovered ${ROOM_NAMES[roomId] ?? roomId}.`,
    hint: "Keep exploring to find this room.",
});

export const ACHIEVEMENTS: AchievementDef[] = [
    ...TRACKED_ROOM_IDS.map(roomAchievement),
    {
        id: "all-rooms",
        title: "Grand Tour",
        description: "Discovered every room in the experience.",
        hint: "Find every single room to unlock this.",
    },
    {
        id: "flight",
        title: "Up, Up, and Away",
        description: "Discovered flight mode.",
        hint: "A settings menu somewhere holds the sky.",
    },
    {
        id: "debug-info",
        title: "Behind the Curtain",
        description: "Turned on debug info.",
        hint: "A settings menu somewhere tracks the raw numbers.",
    },
    {
        id: "minimap",
        title: "You Are Here",
        description: "Turned on the minimap.",
        hint: "A settings menu somewhere draws the map.",
    },
    {
        id: "math-score-5",
        title: "Rocket Cadet",
        description: "Scored 5 in the meteor math game.",
        hint: "Blast some meteors in the Play Place.",
    },
    {
        id: "math-score-10",
        title: "Rocket Pilot",
        description: "Scored 10 in the meteor math game.",
        hint: "Keep blasting meteors.",
    },
    {
        id: "math-score-15",
        title: "Rocket Commander",
        description: "Scored 15 in the meteor math game.",
        hint: "Become a true math ace.",
    },
    {
        id: "art-submission",
        title: "Teacher's Pet",
        description: "Submitted an artwork in the Art Room.",
        hint: "Grab an easel and get creative.",
    },
    {
        id: "courage-computer",
        title: "STUPID DOG!",
        description: "Talked to the Computer.",
        hint: "Nowhere has a computer with opinions.",
    },
    {
        id: "first-rupee",
        title: "First Rupee",
        description: "Collected your very first rupee.",
        hint: "Rupees are scattered through every room.",
    },
    {
        id: "rupees-50",
        title: "Rupee Hoarder",
        description: "Collected 50 rupees total.",
        hint: "Keep collecting rupees.",
    },
    {
        id: "rupees-150",
        title: "Rupee Baron",
        description: "Collected 150 rupees total.",
        hint: "Keep collecting rupees.",
    },
    {
        id: "art-inspector",
        title: "Connoisseur",
        description: "Took a closer look at a piece of art.",
        hint: "Walk right up to a painting.",
    },
    {
        id: "sketchbook-unlocked",
        title: "Paid the Toll",
        description: "Spent 5 rupees to open the sketchbook room.",
        hint: "One door in the gallery wants payment.",
    },
    {
        id: "sketchbook-finished",
        title: "Cover to Cover",
        description: "Turned every page of the sketchbook.",
        hint: "Some books deserve to be read all the way through.",
    },
    {
        id: "project-opened",
        title: "Hands-On",
        description: "Opened one of the software projects.",
        hint: "Don't just look at the projects. Try one.",
    },
    {
        id: "black-rupee",
        title: "Ouch.",
        description: "Collected a Black Rupee.",
        hint: "Not every rupee is good news.",
    },
];

interface AchievementState {
    unlocked: Record<string, number>; // id -> unlock timestamp
    unlock: (id: string) => void;
    discoverRoom: (roomId: string) => void;
    checkMathScore: (score: number) => void;
    checkRupeeCollection: (type: string, totalCount: number) => void;
}

export const useAchievementStore = create<AchievementState>()(
    persist(
        (set, get) => ({
            unlocked: {},

            unlock: (id) => {
                if (get().unlocked[id]) return;
                playSound("achievement-unlock");
                set((state) => ({
                    unlocked: { ...state.unlocked, [id]: Date.now() },
                }));
            },

            discoverRoom: (roomId) => {
                if (!(TRACKED_ROOM_IDS as readonly string[]).includes(roomId))
                    return;
                get().unlock(`room-${roomId}`);
                const allFound = TRACKED_ROOM_IDS.every(
                    (id) => get().unlocked[`room-${id}`]
                );
                if (allFound) get().unlock("all-rooms");
            },

            checkMathScore: (score) => {
                if (score >= 5) get().unlock("math-score-5");
                if (score >= 10) get().unlock("math-score-10");
                if (score >= 15) get().unlock("math-score-15");
            },

            checkRupeeCollection: (type, totalCount) => {
                get().unlock("first-rupee");
                if (totalCount >= 50) get().unlock("rupees-50");
                if (totalCount >= 150) get().unlock("rupees-150");
                if (type === "Black") get().unlock("black-rupee");
            },
        }),
        {
            name: "achievement-storage",
            version: 1,
        }
    )
);
