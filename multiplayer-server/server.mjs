// Multiplayer presence server for the 3D world.
//
// This is deliberately not a game server. Nothing here is authoritative:
// each visitor owns their own pose, and rupees/unlocks/minigames stay
// local to each browser. The server only does what browsers can't do for
// themselves:
//
//   1. Presence - who is in which world room (join/leave), over reliable
//      JSON text frames.
//   2. Signaling - forwarding WebRTC offers/answers/ICE so peers in the
//      same room can open direct, unreliable (UDP-like) data channels and
//      send poses to each other without coming through here at all.
//   3. Fallback relay - for pairs whose direct channel couldn't connect
//      (symmetric NATs, no TURN), it forwards their small binary pose
//      packets, stamping the sender's id on so it can't be spoofed.
//
// Keep the binary layout in sync with src/multiplayer/protocol.ts.

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
// Comma-separated list. Localhost is always allowed for development.
const ALLOWED_ORIGINS = new Set(
    (
        process.env.ALLOWED_ORIGINS ??
        "https://nicolebelovoskey.com,https://www.nicolebelovoskey.com"
    )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
);
const ALLOW_NETLIFY_PREVIEWS = process.env.ALLOW_NETLIFY_PREVIEWS !== "false";

const POSE_TYPE = 1;
const POSE_LEN = 12; // what a client sends
const MAX_ROOM_ID = 64;
const MAX_SIGNAL_BYTES = 8 * 1024; // SDP offers are ~1-3 KB
const MAX_MSGS_PER_SEC = 60; // poses are 15 Hz; signaling bursts briefly on join
const MAX_CONNECTIONS = 500;

/** @type {Map<number, Conn>} */
const conns = new Map();
/** @type {Map<string, Set<Conn>>} */
const rooms = new Map();
let nextId = 1;

/**
 * @typedef {{
 *   id: number, ws: import("ws").WebSocket, room: string | null,
 *   look: number, char: number, direct: Set<number>,
 *   budget: number, budgetAt: number,
 * }} Conn
 */

function originAllowed(origin) {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.has("*") || ALLOWED_ORIGINS.has(origin)) return true;
    try {
        const { hostname, protocol } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") return true;
        if (
            ALLOW_NETLIFY_PREVIEWS &&
            protocol === "https:" &&
            hostname.endsWith(".netlify.app")
        )
            return true;
    } catch {
        // fall through
    }
    return false;
}

function allocId() {
    // u16 on the wire; 0 is reserved.
    for (let i = 0; i < 0xffff; i++) {
        const id = nextId;
        nextId = nextId >= 0xffff ? 1 : nextId + 1;
        if (!conns.has(id)) return id;
    }
    return 0;
}

function send(conn, msg) {
    if (conn.ws.readyState === 1) conn.ws.send(JSON.stringify(msg));
}

/** What others see of a visitor: an id, a color and a character. */
const profile = (c) => ({ id: c.id, look: c.look, char: c.char });

function leaveRoom(conn) {
    const room = conn.room;
    if (!room) return;
    conn.room = null;
    const members = rooms.get(room);
    if (!members) return;
    members.delete(conn);
    if (members.size === 0) rooms.delete(room);
    for (const other of members) {
        other.direct.delete(conn.id);
        send(other, { t: "leave", id: conn.id });
    }
}

function joinRoom(conn, room) {
    if (conn.room === room) return;
    leaveRoom(conn);
    conn.direct.clear();
    let members = rooms.get(room);
    if (!members) rooms.set(room, (members = new Set()));
    // Tell the newcomer who's already here (they'll initiate WebRTC to each),
    // and tell everyone already here about the newcomer.
    send(conn, {
        t: "room",
        room,
        peers: [...members].map(profile),
    });
    for (const other of members) send(other, { t: "join", ...profile(conn) });
    members.add(conn);
    conn.room = room;
}

function overBudget(conn) {
    const now = Date.now();
    conn.budget = Math.min(
        MAX_MSGS_PER_SEC,
        conn.budget + ((now - conn.budgetAt) / 1000) * MAX_MSGS_PER_SEC
    );
    conn.budgetAt = now;
    if (conn.budget < 1) return true;
    conn.budget -= 1;
    return false;
}

function relayPose(conn, data) {
    if (!conn.room || data.length !== POSE_LEN || data[0] !== POSE_TYPE) return;
    const members = rooms.get(conn.room);
    if (!members || members.size < 2) return;
    // [type][senderId u16][rest of client packet]
    const out = Buffer.allocUnsafe(POSE_LEN + 2);
    out[0] = POSE_TYPE;
    out.writeUInt16LE(conn.id, 1);
    data.copy(out, 3, 1);
    for (const other of members) {
        if (other === conn || conn.direct.has(other.id)) continue;
        if (other.ws.readyState === 1) other.ws.send(out);
    }
}

function handleText(conn, text) {
    if (text.length > MAX_SIGNAL_BYTES) return;
    let msg;
    try {
        msg = JSON.parse(text);
    } catch {
        return;
    }
    if (!msg || typeof msg !== "object") return;
    switch (msg.t) {
        case "hello": {
            // look: a 24-bit avatar color; char: which character model.
            // Sent on connect and again whenever the visitor changes them.
            if (Number.isInteger(msg.look)) conn.look = msg.look & 0xffffff;
            if (Number.isInteger(msg.char)) conn.char = msg.char & 0xff;
            const members = conn.room && rooms.get(conn.room);
            if (members) {
                for (const other of members) {
                    if (other !== conn) send(other, { t: "profile", ...profile(conn) });
                }
            }
            break;
        }
        case "room": {
            const room = msg.room;
            if (room === null) leaveRoom(conn);
            else if (
                typeof room === "string" &&
                room.length <= MAX_ROOM_ID &&
                /^[a-z0-9-]+$/.test(room)
            )
                joinRoom(conn, room);
            break;
        }
        case "signal": {
            // Only between members of the same room.
            const to = conns.get(msg.to);
            if (!to || !conn.room || to.room !== conn.room) return;
            send(to, { t: "signal", from: conn.id, data: msg.data });
            break;
        }
        case "direct": {
            // The peers this client now reaches over its own data channels,
            // so their poses needn't be relayed from it.
            if (!Array.isArray(msg.peers)) return;
            conn.direct = new Set(msg.peers.filter(Number.isInteger).slice(0, 64));
            break;
        }
    }
}

const http = createServer((req, res) => {
    // Cloud Run health checks and a quick way to eyeball load.
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, connections: conns.size, rooms: rooms.size }));
});

const wss = new WebSocketServer({
    server: http,
    maxPayload: MAX_SIGNAL_BYTES,
    perMessageDeflate: false, // packets are tiny; compression costs more than it saves
    verifyClient: ({ origin }) => originAllowed(origin) && conns.size < MAX_CONNECTIONS,
});

wss.on("connection", (ws) => {
    const id = allocId();
    if (!id) return ws.close(1013, "full");
    /** @type {Conn} */
    const conn = {
        id, ws, room: null, look: 0xffffff, char: 0, direct: new Set(),
        budget: MAX_MSGS_PER_SEC, budgetAt: Date.now(),
    };
    conns.set(id, conn);
    send(conn, { t: "welcome", id });

    ws.on("message", (data, isBinary) => {
        if (overBudget(conn)) return;
        if (isBinary) relayPose(conn, /** @type {Buffer} */ (data));
        else handleText(conn, data.toString());
    });
    ws.on("close", () => {
        leaveRoom(conn);
        conns.delete(id);
    });
    ws.on("error", () => ws.terminate());

    // Drop sockets that silently died (laptop lid closed, etc.).
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));
});

setInterval(() => {
    for (const ws of wss.clients) {
        if (!ws.isAlive) {
            ws.terminate();
            continue;
        }
        ws.isAlive = false;
        ws.ping();
    }
}, 30_000).unref();

http.listen(PORT, () => console.log(`[multiplayer] listening on :${PORT}`));

for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => {
        for (const ws of wss.clients) ws.close(1001, "restarting");
        http.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 2000).unref();
    });
}
