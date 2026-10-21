import { useEffect } from "react";
import { create } from "zustand";
import { useSceneStore } from "../stores/sceneStore";
import { useReadiness } from "../stores/readinessStore";
import { acquireRoomLink, type RoomLink } from "./roomLink";
import { connectSharedRoom, type JsonValue, type SharedRoom } from "./sharedRoom";
import { presenceCount } from "./presence";
import { useMultiplayerStore } from "./connection";
import { useCharacterStore } from "../stores/characterStore";

// What everyone standing in the same room agrees on, just by being there
// together. Whoever walks into an empty room founds a session for it: a
// seed and a start time. Everyone who arrives while anyone is still there
// joins that session instead of starting their own, so:
//
//   - anything grown from a seed (the forest, where the rupees lie, which
//     royal fairies are about) comes out the same for all of them
//   - anything that runs on a clock (the forest's day, the disco ball)
//     reads sessionSeconds(), so it's the same time of day for everyone
//   - the room's parts (useRoomPart) - a rupee picked up, a fairy caught,
//     the gallery lights - are the same for everyone, and a newcomer is
//     sent all of them
//
// When the last visitor leaves, the session is over: the next one to come
// in grows a new forest, finds fresh rupees.
//
// Start times travel as an age ("founded 93 s ago"), so nobody's clock has
// to agree with anybody else's.
//
// Two visitors walking into an empty room within a moment of each other
// will both found a session. When they find each other, the older session
// wins (or, founded at the same moment, the lower seed) and the other one
// switches to it; rooms built from the seed rebuild.
//
// A room doesn't count as ready (stores/readinessStore.ts, "shared") until
// its session is settled: either the presence server says nobody else is
// there, or someone who is has told us theirs.

export interface Session {
    roomId: string;
    seed: number;
    /** When the session began, on this machine's clock (Date.now()). */
    epoch: number;
}

type Announce = { seed: number; age: number };

/** Sessions founded this close together count as simultaneous. */
const SIMULTANEOUS_MS = 1500;
/** How long to wait to hear from presence whether anyone's in the room. */
const PRESENCE_WAIT_MS = 3000;
/** How long to wait on someone presence says is there. */
const PEERS_WAIT_MS = 6000;
/** No presence server: how long to listen before deciding we're alone. */
const BLIND_WAIT_MS = 1500;
/** Rough one-way trip, for turning an age into a start time. */
const ONE_WAY_MS = 40;

interface SessionState {
    session: Session | null;
    /** Session-scoped room parts, keyed without the seed. */
    parts: Record<string, JsonValue>;
    /** Which part of the room we're in, if it has parts (useRoomPlace). */
    place: string | null;
}

export const useRoomSessionStore = create<SessionState>(() => ({ session: null, parts: {}, place: null }));

const older = (a: Session, b: Session) =>
    Math.abs(a.epoch - b.epoch) > SIMULTANEOUS_MS ? a.epoch < b.epoch : a.seed < b.seed;

const randomSeed = () => (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;

interface Current {
    roomId: string;
    link: RoomLink;
    parts: SharedRoom;
    /** Every part heard, under its session's seed - a switch picks up the right ones. */
    raw: Map<string, JsonValue>;
    settled: Promise<Session>;
    settle: (session: Session) => void;
    timers: ReturnType<typeof setTimeout>[];
    cleanups: Array<() => void>;
}

let current: Current | null = null;

const announceOf = (session: Session): Announce => ({ seed: session.seed, age: Date.now() - session.epoch });

const partsFor = (c: Current, seed: number) => {
    const prefix = `${seed}/`;
    const parts: Record<string, JsonValue> = {};
    c.raw.forEach((value, key) => {
        if (key.startsWith(prefix)) parts[key.slice(prefix.length)] = value;
    });
    return parts;
};

const adopt = (c: Current, session: Session) => {
    const prev = useRoomSessionStore.getState().session;
    if (prev?.roomId === session.roomId && prev.seed === session.seed) return;
    if (import.meta.env.DEV) {
        console.log(`🤝 session ${session.roomId}: seed ${session.seed}, ${Math.round((Date.now() - session.epoch) / 1000)}s old${prev ? " (switched)" : ""}`);
    }
    // Parts belong to a session: only the ones heard for this one.
    useRoomSessionStore.setState({ session, parts: partsFor(c, session.seed) });
    c.settle(session);
    announcePlace();
};

const leaveCurrent = () => {
    if (!current) return;
    const c = current;
    current = null;
    c.timers.forEach(clearTimeout);
    c.cleanups.forEach((undo) => undo());
    c.parts.leave();
    c.link.release();
    useRoomSessionStore.setState({ session: null, parts: {}, place: null });
};

const enter = (roomId: string, token: number) => {
    leaveCurrent();
    const link = acquireRoomLink(roomId);
    let settle: (session: Session) => void = () => {};
    const settled = new Promise<Session>((resolve) => (settle = resolve));
    const c: Current = {
        roomId,
        link,
        parts: null as unknown as SharedRoom,
        raw: new Map(),
        settled,
        settle: (session) => {
            settle(session);
            useReadiness.getState().done("shared", token);
        },
        timers: [],
        cleanups: [],
    };
    current = c;
    const mine = () => useRoomSessionStore.getState().session;

    // Room parts: one namespace for the whole session. Keys go out with
    // the seed in front, so a part from another session never lands here.
    c.parts = connectSharedRoom(
        roomId,
        {
            snapshot: () => {
                const s = mine();
                if (!s) return {};
                const out: Record<string, JsonValue> = {};
                Object.entries(useRoomSessionStore.getState().parts).forEach(([key, value]) => (out[`${s.seed}/${key}`] = value));
                return out;
            },
            apply: (incoming) => {
                Object.entries(incoming).forEach(([key, value]) => c.raw.set(key, value));
                const s = mine();
                if (!s) return;
                const prefix = `${s.seed}/`;
                const won: Record<string, JsonValue> = {};
                Object.entries(incoming).forEach(([key, value]) => {
                    if (key.startsWith(prefix)) won[key.slice(prefix.length)] = value;
                });
                if (Object.keys(won).length) {
                    useRoomSessionStore.setState((st) => ({ parts: { ...st.parts, ...won } }));
                }
            },
        },
        "rs"
    );

    const announce = link.action<Announce>("rs:session");
    const tell = (target?: string) => {
        const s = mine();
        if (s) announce.send(announceOf(s), target);
    };
    c.cleanups.push(
        announce.listen((data, from) => {
            if (current !== c || typeof data?.seed !== "number" || typeof data.age !== "number") return;
            const theirs: Session = { roomId, seed: data.seed >>> 0, epoch: Date.now() - Math.max(0, data.age) - ONE_WAY_MS };
            const ours = mine();
            if (!ours) {
                adopt(c, theirs);
            } else if (ours.seed !== theirs.seed) {
                if (older(theirs, ours)) {
                    adopt(c, theirs);
                    tell(); // so anyone else still on ours comes across too
                } else {
                    tell(from); // they'll come across to ours
                }
            }
        }),
        link.onPeerJoin((peerId) => tell(peerId))
    );

    const found = () => {
        if (current !== c || mine()) return;
        adopt(c, { roomId, seed: randomSeed(), epoch: Date.now() });
        tell();
    };

    // Is anyone here? The presence server knows straight away; trystero
    // can only tell us by someone turning up.
    presenceCount(roomId, PRESENCE_WAIT_MS).then((count) => {
        if (current !== c || mine()) return;
        if (count === 0) found();
        else if (count === null) c.timers.push(setTimeout(found, BLIND_WAIT_MS));
        else c.timers.push(setTimeout(found, PEERS_WAIT_MS));
    });
};

// Every room change (begin() in the readiness store) moves the session.
useReadiness.subscribe((state, prev) => {
    if (state.token === prev.token || !state.roomId) return;
    enter(state.roomId, state.token);
});
// Already mid-load when this module first loaded.
{
    const { token, roomId } = useReadiness.getState();
    if (roomId && token) enter(roomId, token);
}

// --- Reading it ------------------------------------------------------------

/** The current room's session, waiting (Suspense) until it's settled. */
export const useRoomSession = (): Session => {
    const session = useRoomSessionStore((s) => s.session);
    const roomId = useSceneStore((s) => s.currentRoom?.id);
    if (session && session.roomId === roomId) return session;
    if (current && current.roomId === roomId) throw current.settled;
    // Between rooms; the next render will have it.
    throw new Promise((resolve) => setTimeout(resolve, 50));
};

/** Seconds since the room's session began - the same for everyone in it. */
export const sessionSeconds = () => {
    const s = useRoomSessionStore.getState().session;
    return s ? (Date.now() - s.epoch) / 1000 : performance.now() / 1000;
};

/** A seed for one thing in the room, from the session's (same for everyone). */
export const sessionSeed = (session: Session, salt: string) => {
    let h = session.seed ^ 0x9e3779b9;
    for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193);
    return h >>> 0;
};

/** Set a room part for everyone in the room. */
export const setRoomPart = (key: string, value: JsonValue) => {
    const c = current;
    const s = useRoomSessionStore.getState().session;
    useRoomSessionStore.setState((st) => ({ parts: { ...st.parts, [key]: value } }));
    if (c && s) {
        c.raw.set(`${s.seed}/${key}`, value);
        c.parts.publish({ [`${s.seed}/${key}`]: value });
    }
};

export const getRoomPart = <T extends JsonValue>(key: string): T | undefined =>
    useRoomSessionStore.getState().parts[key] as T | undefined;

/** A room part, and a setter that shares it with everyone in the room. */
export const useRoomPart = <T extends JsonValue>(key: string, fallback: T): [T, (value: T) => void] => {
    const value = useRoomSessionStore((s) => s.parts[key]) as T | undefined;
    return [value === undefined ? fallback : value, (v: T) => setRoomPart(key, v)];
};

// --- Places within a room ----------------------------------------------------
//
// Some rooms hold several places at once: each visitor runs their own Sky
// Course. Visitors in the same room but a different place aren't shown to
// each other (they'd be floating over nothing). Who's where is a room part
// per visitor, under their presence id, which is how the avatars are known.

export const placeKey = (presenceId: number) => `place:${presenceId}`;

const announcePlace = () => {
    const id = useMultiplayerStore.getState().selfId;
    if (id === null || !useRoomSessionStore.getState().session) return;
    const place = useRoomSessionStore.getState().place;
    if ((getRoomPart(placeKey(id)) ?? null) !== place) setRoomPart(placeKey(id), place);
};
// A new presence id (reconnected) is a new key.
useMultiplayerStore.subscribe((state, prev) => {
    if (state.selfId !== prev.selfId) announcePlace();
});

/** While mounted, we're in `place` within the current room. */
export const useRoomPlace = (place: string | null) => {
    useEffect(() => {
        useRoomSessionStore.setState({ place });
        announcePlace();
        return () => {
            useRoomSessionStore.setState({ place: null });
            announcePlace();
        };
    }, [place]);
};

/** One-off messages to everyone in the current room (not kept as state). */
export const roomEvents = <T extends JsonValue>(name: string, onMessage: (data: T, from: string) => void) => {
    const c = current;
    if (!c) return { send: (_: T) => {}, stop: () => {} };
    const action = c.link.action<T>(`rs:e:${name}`);
    const stop = action.listen(onMessage);
    return { send: (data: T) => action.send(data), stop };
};

/** The visitor who's been in the room longest - for things one of us should do. */
export const isRoomLeader = () => current?.parts.isLeader() ?? true;

// For driving the world from the console or a test, in dev only.
if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__world = {
        session: () => useRoomSessionStore.getState(),
        readiness: () => useReadiness.getState(),
        scene: () => useSceneStore.getState(),
        presence: () => useMultiplayerStore.getState(),
        character: () => useCharacterStore.getState(),
        sessionSeconds,
        setRoomPart,
    };
}
