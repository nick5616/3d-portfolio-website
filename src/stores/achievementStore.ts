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
    "rupee-shop",
    "cosmic-connect-four",
    "meteor-math",
    "courage",
    "sky-course",
    "art-studio",
    "jam-room",
    "bird-dog-studio",
    "marble-machine",
    "forest",
    "observatory",
] as const;

const ROOM_NAMES: Record<string, string> = {
    atrium: "the Atrium",
    gallery: "the Art Gallery",
    "gallery-hall-digitalart": "the Digital Art Hall",
    "gallery-hall-paintings": "the Paintings Hall",
    "gallery-hall-sketches": "the Sketchbook Rotunda",
    "gallery-hall-lefthanded": "the Left-Handed Rotunda",
    "gallery-hall-miscellaneous": "the Miscellaneous Hall",
    "gallery-hall-notesappart": "the Notes App Art room",
    projects: "the Software Projects room",
    "rupee-shop": "the Rupee Shop",
    "cosmic-connect-four": "Cosmic Connect Four",
    "meteor-math": "Meteor Math",
    courage: "Courage's farmhouse attic",
    "sky-course": "the Sky Course",
    "art-studio": "the Art Studio",
    "jam-room": "the Jam Room",
    "bird-dog-studio": "Bird Dog's studio",
    "marble-machine": "the Marble Machine",
    forest: "the Forest",
    observatory: "the Observatory",
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
        hint: "Blast some meteors on the moon.",
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
        hint: "A farmhouse somewhere has a computer with opinions.",
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
        id: "lefthanded-finished",
        title: "Back to Front",
        description: "Read the left-handed sketchbook all the way through.",
        hint: "One book in the gallery is bound the other way round.",
    },
    {
        id: "truth-seen",
        title: "Equivalent Exchange",
        description: "Looked into the eye in the Notes App room.",
        hint: "Something at the very end of the gallery is watching.",
    },
    {
        id: "project-opened",
        title: "Hands-On",
        description: "Opened one of the software projects.",
        hint: "Don't just look at the projects. Try one.",
    },
    {
        id: "c4-first-game",
        title: "Took a Seat",
        description: "Played a game of Cosmic Connect Four.",
        hint: "Something upstairs wants a game.",
    },
    {
        id: "c4-win",
        title: "Something from the Void",
        description: "Beat the Void at Connect Four.",
        hint: "Win against the thing across the table. Eventually.",
    },
    {
        id: "c4-all",
        title: "Connect Four, Itself",
        description: "Beat Pibble, Willow, the Fairy King and the Void.",
        hint: "Everyone at the cosmic table, one after another.",
    },
    {
        id: "c4-spared",
        title: "Spared",
        description: "The Void could have won, and chose not to.",
        hint: "It could end you. Will it?",
    },
    {
        id: "jam-bandleader",
        title: "Bandleader",
        description: "Gave a row of the Jam Room its own instrument.",
        hint: "Some instruments are waiting for a shelf.",
    },
    {
        id: "studio-listen",
        title: "Front Row",
        description: "Listened to Bird Dog in the studio.",
        hint: "Somebody upstairs makes music.",
    },
    {
        id: "sky-course-finish",
        title: "Bell Ringer",
        description: "Finished the Sky Course.",
        hint: "There's a golden bell above the clouds.",
    },
    {
        id: "sky-course-par",
        title: "Under Par",
        description: "Finished the Sky Course in under a minute.",
        hint: "Ring the bell, faster.",
    },
    {
        id: "shop-customer",
        title: "Valued Customer",
        description: "Bought something at the Rupee Shop.",
        hint: "Pip the owl has wares.",
    },
    {
        id: "observatory-telescope",
        title: "Stargazer",
        description: "Looked through the observatory's telescope.",
        hint: "The roof has a view.",
    },
    {
        id: "observatory-stargazer",
        title: "Astronomer",
        description: "Found ten constellations in the observatory sky.",
        hint: "Every star pattern up there means something.",
    },
    {
        id: "marble-machine",
        title: "Chain Reaction",
        description: "Dropped ten marbles through the Marble Machine.",
        hint: "Upstairs, a wall full of ramps is waiting for marbles.",
    },
    {
        id: "forest-childyllic",
        title: "Fairy Recital",
        description: "Heard the fairy play the Song of the Forest.",
        hint: "Somebody in the woods plays piano.",
    },
    {
        id: "fairy-catch",
        title: "Fairy Catcher",
        description: "Caught a Royal Fairy in the forest.",
        hint: "The fairies by the water spook easily. Go gently.",
    },
    {
        id: "fairy-collection",
        title: "Royal Collection",
        description: "Caught a Rose, Seafoam, Ember and Lilac Royal Fairy.",
        hint: "Royal Fairies come in four colours.",
    },
    {
        id: "fairy-queen",
        title: "Her Majesty",
        description: "Caught the Fairy Queen.",
        hint: "On rare visits, someone regal holds court over a pond.",
    },
    {
        id: "fairy-king",
        title: "His Majesty",
        description: "Caught the Fairy King.",
        hint: "On rare visits, someone crowned wanders the deep woods.",
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
