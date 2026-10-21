import { acquireRoomLink } from "./roomLink";

// Shared state for everyone in a room - the Bird Dog studio, the Jam Room,
// the room session every room has (roomSession.ts). Visitors find each
// other over WebRTC (trystero, signalling through public Nostr relays - no
// server of our own; see roomLink.ts) and talk directly. A room's state is
// a set of named parts (one cell of the jam grid, the studio's visuals...);
// a visitor sends a message only when they change something, and only the
// parts that changed. Someone walking in is sent every part by everyone
// already there.
//
// Each part carries a stamp so every visitor settles on the same value even
// when two people change it at once: the higher revision wins, and on a tie
// the visitor who has been in the room longest wins.
//
// Several of these can share one room, each under its own namespace. One
// that starts up after the others in the room already have (the studio
// mounting once the room session has long been linked) still trades
// everything with them: the first word from a visitor this one hasn't heard
// from yet is answered with everything it has.

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type Parts = Record<string, JsonValue>;

type Stamp = { rev: number; since: number; by: string };
type Message = { since: number; parts: Record<string, { value: JsonValue; stamp: Stamp }> };

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
    selfId: string;
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

/**
 * `namespace` keeps this room's parts apart from anything else sharing the
 * room. Without one it uses the original action names, which visitors on
 * older builds of the site still speak.
 */
export const connectSharedRoom = (roomId: string, handlers: SharedRoomHandlers, namespace?: string): SharedRoom => {
    const link = acquireRoomLink(roomId);
    const { selfId } = link;
    const since = Date.now();
    const stamps = new Map<string, Stamp>();
    const peers = new Map<string, number>(); // peer -> when they arrived
    let highest = 0;
    let open = true;
    const name = (action: string) => (namespace ? `${namespace}:${action}` : action);

    const state = link.action<Message>(name("state"));
    const send = (message: Message, target?: string) => state.send(message, target);

    const stampOf = (key: string) => stamps.get(key) ?? { rev: 0, since, by: selfId };
    const snapshot = (): Message => {
        const parts: Message["parts"] = {};
        Object.entries(handlers.snapshot()).forEach(([key, value]) => (parts[key] = { value, stamp: stampOf(key) }));
        return { since, parts };
    };

    // Someone this room hasn't dealt with yet: bring them up to speed.
    const meet = (peerId: string, arrived = Number.POSITIVE_INFINITY) => {
        if (!open || peers.has(peerId)) return false;
        peers.set(peerId, arrived); // until they say
        handlers.onPeers?.(peers.size);
        send(snapshot(), peerId);
        handlers.onPeerJoin?.(peerId);
        return true;
    };

    const unlisten = state.listen((message, peerId) => {
        if (!open) return;
        meet(peerId, typeof message.since === "number" ? message.since : undefined);
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
    });
    link.onPeerJoin((peerId) => meet(peerId));
    link.onPeerLeave((peerId) => {
        if (!peers.delete(peerId)) return;
        handlers.onPeers?.(peers.size);
        handlers.onPeerLeave?.(peerId);
    });
    // Already here before we were: say hello (they answer with theirs).
    // Not until the caller has its room back - their handlers use it.
    queueMicrotask(() => link.peers().forEach((peerId) => meet(peerId)));

    return {
        selfId,
        publish: (parts) => {
            const message: Message = { since, parts: {} };
            Object.entries(parts).forEach(([key, value]) => {
                const stamp = { rev: ++highest, since, by: selfId };
                stamps.set(key, stamp);
                message.parts[key] = { value, stamp };
            });
            if (peers.size || link.peers().length) send(message);
        },
        isLeader: () => [...peers].every(([id, at]) => (at !== since ? since < at : selfId < id)),
        channel: <T extends JsonValue>(channelName: string, onMessage: (data: T, from: string) => void) => {
            const action = link.action<T>(name(channelName));
            action.listen((data, from) => {
                if (open) onMessage(data, from);
            });
            return (data: T, target?: string) => {
                if (open) action.send(data, target);
            };
        },
        ping: (peerId) => link.ping(peerId),
        leave: () => {
            if (!open) return;
            open = false;
            unlisten();
            peers.clear();
            link.release();
        },
    };
};
