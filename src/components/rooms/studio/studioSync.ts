import { connectSharedRoom } from "../../../multiplayer/sharedRoom";

// Everyone in Bird Dog's studio sees the same show and hears the same song
// (see multiplayer/sharedRoom.ts). The room has two parts: the visuals (the
// two mixer knobs) and the transport (which record, playing or paused, and
// where in it). Each is sent only when someone changes it.

export type Visuals = { mode: number; palette: number };
export type Transport = {
    track: number | null; // SoundCloud track id
    playing: boolean;
    position: number; // ms into the track when sent
    sentAt: number; // sender's Date.now()
};

// Clocks on different machines disagree; never jump further ahead than this
// to cover the time a message spent in flight.
const MAX_FLIGHT_MS = 3000;

export interface StudioSyncHandlers {
    onVisuals: (visuals: Visuals) => void;
    onTransport: (transport: Transport) => void;
    onPeers: (count: number) => void;
    // The music as it is right now, for bringing a newcomer up to speed
    // (the song may have moved on since the last change was sent).
    currentTransport: () => Omit<Transport, "sentAt">;
}

export interface StudioSync {
    setVisuals: (visuals: Visuals) => void;
    setTransport: (transport: Omit<Transport, "sentAt">) => void;
    // One visitor runs the automatic look changes, so they don't fight.
    isLeader: () => boolean;
    leave: () => void;
}

// Where a received transport's song is now, allowing for time in flight.
export const positionNow = (t: Transport) =>
    t.playing ? t.position + Math.min(MAX_FLIGHT_MS, Math.max(0, Date.now() - t.sentAt)) : t.position;

export const connectStudio = (initial: Visuals, handlers: StudioSyncHandlers): StudioSync => {
    let visuals = initial;
    const room = connectSharedRoom("bird-dog-studio", {
        snapshot: () => ({
            visuals,
            transport: { ...handlers.currentTransport(), sentAt: Date.now() },
        }),
        apply: (parts) => {
            if (parts.visuals) {
                visuals = parts.visuals as Visuals;
                handlers.onVisuals(visuals);
            }
            if (parts.transport) handlers.onTransport(parts.transport as Transport);
        },
        onPeers: handlers.onPeers,
    });
    return {
        setVisuals: (value) => {
            visuals = value;
            room.publish({ visuals: value });
        },
        setTransport: (value) => room.publish({ transport: { ...value, sentAt: Date.now() } }),
        isLeader: room.isLeader,
        leave: room.leave,
    };
};
