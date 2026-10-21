import { joinRoom, selfId, type Room } from "trystero";
import type { JsonValue } from "./sharedRoom";

// One peer-to-peer link per world room, shared by everything in the room
// that talks to the others there: the room session (roomSession.ts) and
// each room's own sync (the jam grid, the studio, the cosmic tables).
//
// trystero hands back the same Room for the same room id, and a Room has
// one peer-join callback and one handler per action - so two features
// joining the same room separately would quietly unplug each other. Here
// each room is joined once, its peer events fan out to every listener, and
// each action can have any number of listeners.

// Dev builds get rooms of their own, so working on the site never puts you
// in a room with real visitors (or theirs on your board). `?mp=name` in dev
// splits that further, for testing with several tabs in private.
export const MP_SPLIT = (() => {
    if (!import.meta.env.DEV) return "";
    return (new URLSearchParams(location.search).get("mp") ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
})();

const APP_ID = (() => {
    const base = "nicolebelovoskey-world";
    if (!import.meta.env.DEV) return base;
    return `${base}-dev${MP_SPLIT ? `-${MP_SPLIT}` : ""}`;
})();

/** Leaving is put off this long, so leaving and coming straight back reuses the link. */
const LINGER_MS = 1500;

export { selfId };

type PeerListener = (peerId: string) => void;
type MessageListener = (data: JsonValue, from: string) => void;

interface Link {
    roomId: string;
    room: Room | null;
    refs: number;
    peers: Set<string>;
    joins: Set<PeerListener>;
    leaves: Set<PeerListener>;
    actions: Map<string, ActionEntry>;
    linger: ReturnType<typeof setTimeout> | null;
}

export interface RoomLink {
    readonly roomId: string;
    readonly selfId: string;
    /** Everyone else in the room right now. */
    peers: () => string[];
    onPeerJoin: (listener: PeerListener) => () => void;
    onPeerLeave: (listener: PeerListener) => () => void;
    /** Send on, and listen to, a named action (32 bytes at most). */
    action: <T extends JsonValue>(
        name: string
    ) => { send: (data: T, target?: string) => void; listen: (listener: (data: T, from: string) => void) => () => void };
    ping: (peerId: string) => Promise<number>;
    release: () => void;
}

interface ActionEntry {
    send: (data: JsonValue, target?: string) => void;
    listeners: Set<MessageListener>;
    // Messages that came in before anything listened (trystero holds on to
    // messages for an action nobody has made yet, and hands them all over
    // the moment it's made - before a listener can be added).
    backlog: Array<[JsonValue, string]>;
}

const links = new Map<string, Link>();

const open = (roomId: string): Link => {
    const link: Link = {
        roomId,
        room: null,
        refs: 0,
        peers: new Set(),
        joins: new Set(),
        leaves: new Set(),
        actions: new Map(),
        linger: null,
    };
    try {
        const room = joinRoom({ appId: APP_ID }, roomId);
        link.room = room;
        room.onPeerJoin = (peerId) => {
            link.peers.add(peerId);
            link.joins.forEach((listener) => listener(peerId));
        };
        room.onPeerLeave = (peerId) => {
            link.peers.delete(peerId);
            link.leaves.forEach((listener) => listener(peerId));
        };
    } catch {
        // No WebRTC here: the room still works, just on its own.
    }
    return link;
};

const close = (link: Link) => {
    links.delete(link.roomId);
    link.room?.leave().catch(() => {});
    link.room = null;
    link.peers.clear();
};

// Closing or reloading the tab doesn't unmount anything, so say goodbye
// here - otherwise the others keep a ghost of us (maybe as leader, so
// nobody keeps time) until the connection times out.
if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => [...links.values()].forEach(close));
}

export const acquireRoomLink = (roomId: string): RoomLink => {
    let link = links.get(roomId);
    if (!link) {
        link = open(roomId);
        links.set(roomId, link);
    }
    const l = link;
    if (l.linger) {
        clearTimeout(l.linger);
        l.linger = null;
    }
    l.refs++;
    let released = false;
    const mine: Array<() => void> = [];
    const track = (undo: () => void) => {
        mine.push(undo);
        return () => {
            undo();
            const i = mine.indexOf(undo);
            if (i >= 0) mine.splice(i, 1);
        };
    };

    return {
        roomId,
        selfId,
        peers: () => [...l.peers],
        onPeerJoin: (listener) => {
            l.joins.add(listener);
            return track(() => l.joins.delete(listener));
        },
        onPeerLeave: (listener) => {
            l.leaves.add(listener);
            return track(() => l.leaves.delete(listener));
        },
        action: <T extends JsonValue>(name: string) => {
            let entry = l.actions.get(name);
            if (!entry) {
                const created: ActionEntry = { send: () => {}, listeners: new Set(), backlog: [] };
                if (l.room) {
                    const action = l.room.makeAction<JsonValue>(name);
                    action.onMessage = (data, { peerId }) => {
                        if (created.listeners.size) created.listeners.forEach((listener) => listener(data, peerId));
                        else if (created.backlog.length < 64) created.backlog.push([data, peerId]);
                    };
                    created.send = (data, target) => {
                        if (!l.peers.size) return;
                        action.send(data, target ? { target } : undefined).catch(() => {});
                    };
                }
                entry = created;
                l.actions.set(name, entry);
            }
            const e = entry;
            return {
                send: (data: T, target?: string) => {
                    if (!released) e.send(data, target);
                },
                listen: (listener: (data: T, from: string) => void) => {
                    const wrapped = listener as MessageListener;
                    e.listeners.add(wrapped);
                    e.backlog.splice(0).forEach(([data, from]) => wrapped(data, from));
                    return track(() => e.listeners.delete(wrapped));
                },
            };
        },
        ping: (peerId) => l.room?.ping(peerId) ?? Promise.resolve(0),
        release: () => {
            if (released) return;
            released = true;
            mine.splice(0).forEach((undo) => undo());
            l.refs--;
            if (l.refs > 0 || links.get(roomId) !== l) return;
            l.linger = setTimeout(() => close(l), LINGER_MS);
        },
    };
};
