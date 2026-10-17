import { joinRoom, selfId, type Room } from "trystero";

// Rooms that everyone in them shares - the Bird Dog studio, the Jam Room.
// Visitors find each other over WebRTC (trystero, signalling through public
// Nostr relays - no server of our own) and talk directly. A room's state is
// a set of named parts (one cell of the jam grid, the studio's visuals...);
// a visitor sends a message only when they change something, and only the
// parts that changed. Someone walking in is sent every part by everyone
// already there.
//
// Each part carries a stamp so every visitor settles on the same value even
// when two people change it at once: the higher revision wins, and on a tie
// the visitor who has been in the room longest wins.

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type Parts = Record<string, JsonValue>;

type Stamp = { rev: number; since: number; by: string };
type Message = { since: number; parts: Record<string, { value: JsonValue; stamp: Stamp }> };

const APP_ID = "nicolebelovoskey-world";

const beats = (a: Stamp, b: Stamp) =>
    a.rev !== b.rev ? a.rev > b.rev : a.since !== b.since ? a.since < b.since : a.by < b.by;

export interface SharedRoomHandlers {
    // Every part as it is right now, for bringing a newcomer up to speed.
    snapshot: () => Parts;
    // Parts someone else changed, that won.
    apply: (parts: Parts, from: string) => void;
    onPeers?: (count: number) => void;
    onPeerJoin?: (peerId: string) => void;
    onPeerLeave?: (peerId: string) => void;
}

export interface SharedRoom {
    publish: (parts: Parts) => void;
    // The visitor who's been here longest - for things only one of us
    // should do (keeping time, changing the look on a drop).
    isLeader: () => boolean;
    // A side channel for one-off messages that aren't room state.
    channel: <T extends JsonValue>(
        name: string,
        onMessage: (data: T, from: string) => void
    ) => (data: T, target?: string) => void;
    // Round trip to a peer in ms.
    ping: (peerId: string) => Promise<number>;
    leave: () => void;
}

export const connectSharedRoom = (roomId: string, handlers: SharedRoomHandlers): SharedRoom => {
    const since = Date.now();
    const stamps = new Map<string, Stamp>();
    const peers = new Map<string, number>(); // peer -> when they arrived
    let highest = 0;
    let room: Room | null = null;
    let send: ((message: Message, target?: string) => void) | null = null;

    const stampOf = (key: string) => stamps.get(key) ?? { rev: 0, since, by: selfId };
    const snapshot = (): Message => {
        const parts: Message["parts"] = {};
        Object.entries(handlers.snapshot()).forEach(([key, value]) => (parts[key] = { value, stamp: stampOf(key) }));
        return { since, parts };
    };

    try {
        room = joinRoom({ appId: APP_ID }, roomId);
        const action = room.makeAction<Message>("state");
        send = (message, target) => {
            action.send(message, target ? { target } : undefined).catch(() => {});
        };
        action.onMessage = (message, { peerId }) => {
            if (typeof message.since === "number") peers.set(peerId, message.since);
            const won: Parts = {};
            let any = false;
            Object.entries(message.parts ?? {}).forEach(([key, { value, stamp }]) => {
                if (!beats(stamp, stampOf(key))) return;
                stamps.set(key, stamp);
                highest = Math.max(highest, stamp.rev);
                won[key] = value;
                any = true;
            });
            if (any) handlers.apply(won, peerId);
        };
        room.onPeerJoin = (peerId) => {
            if (!peers.has(peerId)) peers.set(peerId, Number.POSITIVE_INFINITY); // until they say
            handlers.onPeers?.(peers.size);
            send?.(snapshot(), peerId);
            handlers.onPeerJoin?.(peerId);
        };
        room.onPeerLeave = (peerId) => {
            peers.delete(peerId);
            handlers.onPeers?.(peers.size);
            handlers.onPeerLeave?.(peerId);
        };
    } catch {
        // No WebRTC here: the room still works, just on its own.
        room = null;
        send = null;
    }

    // Closing or reloading the tab doesn't unmount anything, so say goodbye
    // here - otherwise the others keep a ghost of us (maybe as leader, so
    // nobody keeps time) until the connection times out.
    const leave = () => {
        window.removeEventListener("pagehide", leave);
        room?.leave().catch(() => {});
        room = null;
        send = null;
        peers.clear();
    };
    window.addEventListener("pagehide", leave);

    return {
        publish: (parts) => {
            const message: Message = { since, parts: {} };
            Object.entries(parts).forEach(([key, value]) => {
                const stamp = { rev: ++highest, since, by: selfId };
                stamps.set(key, stamp);
                message.parts[key] = { value, stamp };
            });
            if (peers.size) send?.(message);
        },
        isLeader: () => [...peers].every(([id, at]) => (at !== since ? since < at : selfId < id)),
        channel: <T extends JsonValue>(name: string, onMessage: (data: T, from: string) => void) => {
            if (!room) return () => {};
            const action = room.makeAction<T>(name);
            action.onMessage = (data, { peerId }) => onMessage(data, peerId);
            return (data: T, target?: string) => {
                action.send(data, target ? { target } : undefined).catch(() => {});
            };
        },
        ping: (peerId) => room?.ping(peerId) ?? Promise.resolve(0),
        leave,
    };
};
