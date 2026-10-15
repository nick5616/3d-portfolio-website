// Wire format for multiplayer. Keep in sync with multiplayer-server/server.mjs.
//
// Two kinds of traffic, split by what each actually needs:
//
// - Poses (position + look direction) are a latest-wins stream: a lost
//   packet is superseded 66ms later anyway, so retransmitting it would only
//   delay the newer one behind it. They're tiny binary packets sent over
//   unreliable, unordered WebRTC data channels (UDP-like) straight to each
//   peer, or relayed through the server's WebSocket when a direct channel
//   can't be opened.
// - Everything else (who joined/left a room, WebRTC signaling) is rare and
//   must arrive, so it's JSON over the WebSocket (TCP).

export const POSE_TYPE = 1;
/** [type u8][t u16][x i16][y i16][z i16][yaw u8][pitch u8][flags u8] */
export const POSE_LEN = 12;
/** The server inserts the sender's id: [type u8][id u16][...rest]. */
export const RELAYED_POSE_LEN = POSE_LEN + 2;

export const FLAG_CROUCH = 1 << 0;
export const FLAG_FLYING = 1 << 1;

export interface Pose {
    /** Sender's clock in ms, wrapped to 16 bits. */
    t: number;
    /** Feet position, metres. Centimetre precision on the wire (+/-327 m). */
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    flags: number;
}

const TAU = Math.PI * 2;
const toCm = (m: number) => Math.max(-32768, Math.min(32767, Math.round(m * 100)));

export function encodePose(
    out: DataView,
    t: number,
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    flags: number
) {
    out.setUint8(0, POSE_TYPE);
    out.setUint16(1, t & 0xffff, true);
    out.setInt16(3, toCm(x), true);
    out.setInt16(5, toCm(y), true);
    out.setInt16(7, toCm(z), true);
    out.setUint8(9, Math.round((yaw / TAU) * 256) & 0xff);
    const p = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    out.setUint8(10, Math.round((p / Math.PI + 0.5) * 255));
    out.setUint8(11, flags & 0xff);
}

/** Decode a pose starting at `offset` (0 for direct, 2 for relayed). */
export function decodePose(view: DataView, offset: number): Pose {
    return {
        t: view.getUint16(1 + offset, true),
        x: view.getInt16(3 + offset, true) / 100,
        y: view.getInt16(5 + offset, true) / 100,
        z: view.getInt16(7 + offset, true) / 100,
        yaw: (view.getUint8(9 + offset) / 256) * TAU,
        pitch: (view.getUint8(10 + offset) / 255 - 0.5) * Math.PI,
        flags: view.getUint8(11 + offset),
    };
}

// Reliable messages (JSON over the WebSocket).
export type ClientMessage =
    | { t: "hello"; look: number; char: number }
    | { t: "room"; room: string | null }
    | { t: "signal"; to: number; data: SignalData }
    | { t: "direct"; peers: number[] };

export interface PeerProfile {
    id: number;
    look: number; // avatar color, 0xRRGGBB
    char: number; // index into CHARACTERS
}

export type ServerMessage =
    | { t: "welcome"; id: number }
    | { t: "room"; room: string; peers: PeerProfile[] }
    | { t: "join" | "profile"; id: number; look: number; char: number }
    | { t: "leave"; id: number }
    | { t: "signal"; from: number; data: SignalData };

export type SignalData =
    | { sdp: RTCSessionDescriptionInit }
    | { ice: RTCIceCandidateInit };
