import { create } from "zustand";

// Door review, a debug mode for localhost only. Aim at a door and press
// Q to approve it, X to say it needs work (with a note), Z to clear it;
// F8 hides the markers. Reviews are written to docs/door-review.json by the
// dev server (vite.config.ts), so the next pass over the doors can read
// every note and answer it (`reply`, `revised`) in the same file.

export const DOOR_REVIEW_AVAILABLE =
    typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname);

const ENDPOINT = "/__door-review";
const LOCAL_KEY = "door-review";
const HIDDEN_KEY = "door-review-hidden";

export type DoorReviewStatus = "approved" | "needs-work";

export interface DoorReviewEntry {
    status: DoorReviewStatus;
    note?: string;
    room: string; // where the door stands
    target: string; // where it goes
    look: string; // what it looked like when reviewed
    at: string;
    // Written when a door is reworked after a review.
    reply?: string;
    revised?: boolean;
    // Earlier verdicts on this door, oldest first.
    history?: { status: DoorReviewStatus; note?: string; reply?: string; at: string }[];
}

export interface DoorReviewFile {
    version: 1;
    doors: Record<string, DoorReviewEntry>;
}

// The door the crosshair is on.
export interface AimedDoor {
    key: string; // "<room id>/<archway id>"
    room: string;
    target: string;
    look: string;
}

interface DoorReviewState {
    loaded: boolean;
    hidden: boolean;
    doors: Record<string, DoorReviewEntry>;
    aimed: AimedDoor | null;
    noting: AimedDoor | null; // the needs-work note box is open for this door
    saveError: boolean;
    load: () => Promise<void>;
    aim: (door: AimedDoor) => void;
    unaim: (key: string) => void;
    setHidden: (hidden: boolean) => void;
    openNote: (door: AimedDoor) => void;
    closeNote: () => void;
    review: (door: AimedDoor, status: DoorReviewStatus | null, note?: string) => void;
}

const readLocal = (): Record<string, DoorReviewEntry> => {
    try {
        return (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as DoorReviewFile).doors ?? {};
    } catch {
        return {};
    }
};

const save = async (doors: Record<string, DoorReviewEntry>) => {
    const file: DoorReviewFile = { version: 1, doors };
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(file));
    } catch {
        // the file below is the one that matters
    }
    const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(file),
    });
    if (!response.ok) throw new Error(`door review save failed: ${response.status}`);
};

let hiddenAtStart = false;
try {
    hiddenAtStart = localStorage.getItem(HIDDEN_KEY) === "1";
} catch {
    // markers shown
}

export const useDoorReview = create<DoorReviewState>((set, get) => ({
    loaded: false,
    hidden: hiddenAtStart,
    doors: {},
    aimed: null,
    noting: null,
    saveError: false,
    load: async () => {
        try {
            const response = await fetch(ENDPOINT);
            if (!response.ok) throw new Error(String(response.status));
            const file = (await response.json()) as Partial<DoorReviewFile>;
            set({ doors: file.doors ?? {}, loaded: true });
        } catch {
            // No dev server (e.g. vite preview): keep them in this browser.
            set({ doors: readLocal(), loaded: true, saveError: true });
        }
    },
    aim: (door) => set({ aimed: door }),
    unaim: (key) => {
        if (get().aimed?.key === key) set({ aimed: null });
    },
    setHidden: (hidden) => {
        try {
            localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0");
        } catch {
            // just for this visit
        }
        set({ hidden });
    },
    openNote: (door) => set({ noting: door }),
    closeNote: () => set({ noting: null }),
    review: (door, status, note) => {
        const doors = { ...get().doors };
        const previous = doors[door.key];
        if (!status) {
            delete doors[door.key];
        } else {
            const history = previous
                ? [
                      ...(previous.history ?? []),
                      { status: previous.status, note: previous.note, reply: previous.reply, at: previous.at },
                  ].slice(-8)
                : undefined;
            doors[door.key] = {
                status,
                ...(note ? { note } : {}),
                room: door.room,
                target: door.target,
                look: door.look,
                at: new Date().toISOString(),
                ...(history ? { history } : {}),
            };
        }
        set({ doors });
        save(doors).then(
            () => set({ saveError: false }),
            () => set({ saveError: true })
        );
    },
}));

// How a door stands now, against its last review.
export type DoorStanding = "unreviewed" | "approved" | "needs-work" | "revised" | "changed";
export const standingOf = (entry: DoorReviewEntry | undefined, look: string): DoorStanding => {
    if (!entry) return "unreviewed";
    if (entry.status === "needs-work") return entry.revised || entry.look !== look ? "revised" : "needs-work";
    return entry.look !== look ? "changed" : "approved";
};

export const STANDING_STYLE: Record<DoorStanding,{ label: string; color: string; gem: string }> = {
    unreviewed: { label: "Unreviewed", color: "#dce6f2", gem: "silver" },
    approved: { label: "Approved", color: "#3ee58f", gem: "green" },
    "needs-work": { label: "Needs work", color: "#ff5d73", gem: "red" },
    revised: { label: "Reworked, check again", color: "#59b4ff", gem: "blue" },
    changed: { label: "Changed since approved", color: "#ffcc55", gem: "gold" },
};
