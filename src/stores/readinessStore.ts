import { create } from "zustand";

// Is the room you're walking into actually ready to be walked in?
//
// "The textures finished downloading" turned out to be a poor answer: the
// room's code may still be on its way, nobody has agreed on what the room
// looks like yet (see multiplayer/roomSession.ts), and the first frame then
// compiled every shader at once, freezing the page for seconds - right
// after the loading screen had gone and the character select had appeared.
// So a room load is a series of stages, each reported by whatever knows:
//
//   room     - the room's components have mounted and its colliders exist
//              (RoomEnvironmentReady)
//   assets   - no texture is still loading (WorldWarmup)
//   shared   - everyone already in the room has told us what it looks like,
//              or we know we're the first (roomSession)
//   shaders  - every material in the scene has a compiled program, done in
//              the background while nothing renders (WorldWarmup)
//   frames   - the first frames have come out smooth (WorldWarmup)
//
// The loading screen, the character select and the door transition all
// wait for every stage. Each load gets a token, so a stage reported late by
// the previous room never counts toward the next.

export type ReadinessStage = "room" | "assets" | "shared" | "shaders" | "frames";
export const STAGES: ReadinessStage[] = ["room", "assets", "shared", "shaders", "frames"];

type Stages = Record<ReadinessStage, boolean>;
const none = (): Stages => ({ room: false, assets: false, shared: false, shaders: false, frames: false });

interface ReadinessState {
    token: number;
    roomId: string | null;
    stages: Stages;
    ready: boolean;
    /** The first room of the visit has been ready once (the boot screen is done). */
    booted: boolean;
    /** 0..1 within the current stage, where a stage can tell (texture or shader counts). */
    stageProgress: number;
    startedAt: number;
    begin: (roomId: string) => number;
    done: (stage: ReadinessStage, token?: number) => void;
    setStageProgress: (progress: number, token: number) => void;
}

export const useReadiness = create<ReadinessState>((set, get) => ({
    token: 0,
    roomId: null,
    stages: none(),
    ready: false,
    booted: false,
    stageProgress: 0,
    startedAt: 0,
    begin: (roomId) => {
        // Asked again for the room already loading (or loaded) - the world
        // re-mounting, or loadRoom run twice - it's the same load: the room
        // is mounted already and won't report its stages a second time.
        if (get().roomId === roomId && get().token > 0) return get().token;
        const token = get().token + 1;
        set({ token, roomId, stages: none(), ready: false, stageProgress: 0, startedAt: performance.now() });
        return token;
    },
    done: (stage, token = get().token) => {
        const s = get();
        if (token !== s.token || s.stages[stage]) return;
        const stages = { ...s.stages, [stage]: true };
        const ready = STAGES.every((k) => stages[k]);
        if (import.meta.env.DEV) {
            console.log(`⏳ ready: ${stage} (${Math.round(performance.now() - s.startedAt)}ms, ${s.roomId})${ready ? " - room ready" : ""}`);
        }
        set({ stages, ready, stageProgress: 0, booted: s.booted || ready });
    },
    setStageProgress: (progress, token) => {
        if (token === get().token) set({ stageProgress: progress });
    },
}));

/** The stage still being waited on, in order, or null once ready. */
export const currentStage = (stages: Stages): ReadinessStage | null => STAGES.find((k) => !stages[k]) ?? null;

/** Overall progress, 0..1: whole stages done plus the current one's share. */
export const overallProgress = (stages: Stages, stageProgress: number) => {
    const done = STAGES.filter((k) => stages[k]).length;
    return Math.min(1, (done + (done < STAGES.length ? stageProgress : 0)) / STAGES.length);
};

export const isWorldReady = () => useReadiness.getState().ready;
