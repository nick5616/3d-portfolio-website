import { create } from "zustand";
import {
    POSE_LEN,
    POSE_TYPE,
    RELAYED_POSE_LEN,
    decodePose,
    type ClientMessage,
    type PeerProfile,
    type ServerMessage,
    type SignalData,
} from "./protocol";
import { forgetAllPoses, forgetPose, recordPose } from "./remotePoses";

// Peer-to-peer where possible, relayed where not.
//
// Nobody's state is canonical here: each visitor is the only authority on
// their own pose, and nothing else in the world is shared. So the server is
// just a room directory, a WebRTC signaling post and a fallback relay; poses
// go straight between browsers over unreliable data channels whenever the
// network allows it.

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
/** A full mesh costs each sender one copy per peer; past this, relay. */
const MAX_DIRECT_PEERS = 8;
/** Give up on a direct channel and stay relayed after this long. */
const DIRECT_TIMEOUT = 8000;

export type RemotePeer = PeerProfile;

interface MultiplayerState {
    status: "off" | "connecting" | "online";
    selfId: number | null;
    /** Others in the same world room. Changes only on join/leave. */
    peers: Record<number, RemotePeer>;
}

export const useMultiplayerStore = create<MultiplayerState>(() => ({
    status: "off",
    selfId: null,
    peers: {},
}));

interface PeerLink {
    id: number;
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
    /** Signals handled one at a time, so ICE never lands before its SDP. */
    chain: Promise<void>;
    timeout: ReturnType<typeof setTimeout>;
}

export class MultiplayerClient {
    private ws: WebSocket | null = null;
    private generation = 0;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private destroyed = false;
    private room: string | null = null;
    private links = new Map<number, PeerLink>();
    /** Peers whose direct channel is open, as last reported to the server. */
    private direct = new Set<number>();

    constructor(
        private url: string,
        private look: number,
        private char: number,
        private allowDirect = typeof RTCPeerConnection !== "undefined"
    ) {}

    connect() {
        this.destroyed = false;
        const gen = ++this.generation;
        useMultiplayerStore.setState({ status: "connecting" });

        const ws = new WebSocket(this.url);
        ws.binaryType = "arraybuffer";
        this.ws = ws;

        ws.onmessage = (ev) => {
            if (gen !== this.generation) return;
            if (typeof ev.data === "string") {
                try {
                    this.handleMessage(JSON.parse(ev.data) as ServerMessage);
                } catch {
                    // ignore malformed
                }
            } else {
                this.handleRelayedPose(ev.data as ArrayBuffer);
            }
        };
        ws.onclose = () => {
            if (gen !== this.generation) return;
            this.resetPeers();
            useMultiplayerStore.setState({ status: "off", selfId: null });
            if (this.destroyed) return;
            this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
        };
        ws.onerror = () => ws.close();
    }

    disconnect() {
        this.destroyed = true;
        this.generation++;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.ws?.close();
        this.ws = null;
        this.resetPeers();
        useMultiplayerStore.setState({ status: "off", selfId: null });
    }

    /** Change how we look to everyone else. */
    setProfile(look: number, char: number) {
        if (look === this.look && char === this.char) return;
        this.look = look;
        this.char = char;
        this.send({ t: "hello", look, char });
    }

    /** Which world room we're standing in (null while between rooms). */
    setRoom(room: string | null) {
        if (room === this.room) return;
        this.room = room;
        this.resetPeers();
        this.send({ t: "room", room });
    }

    /** Send our pose to everyone in the room, by whichever path reaches them. */
    sendPose(packet: Uint8Array) {
        let needsRelay = false;
        for (const id of Object.keys(useMultiplayerStore.getState().peers)) {
            const link = this.links.get(Number(id));
            if (link?.dc.readyState === "open") {
                // Never queue behind a congested channel: a stale pose is
                // worthless once the next one's ready.
                if (link.dc.bufferedAmount < POSE_LEN * 4) link.dc.send(packet);
            } else {
                needsRelay = true;
            }
        }
        if (needsRelay && this.ws?.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 1024) {
            this.ws.send(packet);
        }
    }

    private send(msg: ClientMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    }

    private handleMessage(msg: ServerMessage) {
        switch (msg.t) {
            case "welcome":
                this.reconnectDelay = 1000;
                useMultiplayerStore.setState({ status: "online", selfId: msg.id });
                this.send({ t: "hello", look: this.look, char: this.char });
                if (this.room) this.send({ t: "room", room: this.room });
                break;
            case "room": {
                if (msg.room !== this.room) return; // we've since moved on
                const peers: Record<number, RemotePeer> = {};
                for (const p of msg.peers) peers[p.id] = { id: p.id, look: p.look, char: p.char };
                useMultiplayerStore.setState({ peers });
                // The newcomer makes the offers; everyone already here answers.
                if (this.allowDirect) {
                    for (const p of msg.peers.slice(0, MAX_DIRECT_PEERS)) this.openLink(p.id, true);
                }
                break;
            }
            case "join":
            case "profile":
                if (msg.t === "profile" && !useMultiplayerStore.getState().peers[msg.id]) return;
                useMultiplayerStore.setState((s) => ({
                    peers: { ...s.peers, [msg.id]: { id: msg.id, look: msg.look, char: msg.char } },
                }));
                break;
            case "leave":
                this.closeLink(msg.id);
                forgetPose(msg.id);
                useMultiplayerStore.setState((s) => {
                    const peers = { ...s.peers };
                    delete peers[msg.id];
                    return { peers };
                });
                break;
            case "signal":
                this.handleSignal(msg.from, msg.data);
                break;
        }
    }

    private handleRelayedPose(buf: ArrayBuffer) {
        if (buf.byteLength !== RELAYED_POSE_LEN) return;
        const view = new DataView(buf);
        if (view.getUint8(0) !== POSE_TYPE) return;
        const id = view.getUint16(1, true);
        if (!useMultiplayerStore.getState().peers[id]) return;
        recordPose(id, decodePose(view, 2));
    }

    // --- WebRTC ---------------------------------------------------------

    private openLink(id: number, initiator: boolean): PeerLink | null {
        if (this.links.has(id)) return this.links.get(id)!;
        if (this.links.size >= MAX_DIRECT_PEERS) return null;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        // Negotiated with a fixed id on both ends, so neither side waits
        // on an ondatachannel event. Unordered with no retransmits: as
        // close to raw UDP as a browser gets.
        const dc = pc.createDataChannel("pose", {
            negotiated: true,
            id: 0,
            ordered: false,
            maxRetransmits: 0,
        });
        dc.binaryType = "arraybuffer";
        const link: PeerLink = {
            id,
            pc,
            dc,
            chain: Promise.resolve(),
            timeout: setTimeout(() => {
                if (dc.readyState !== "open") this.closeLink(id);
            }, DIRECT_TIMEOUT),
        };
        this.links.set(id, link);

        dc.onopen = () => this.setDirect(id, true);
        dc.onclose = () => this.closeLink(id);
        dc.onmessage = (ev) => {
            const buf = ev.data as ArrayBuffer;
            if (buf.byteLength !== POSE_LEN) return;
            const view = new DataView(buf);
            if (view.getUint8(0) === POSE_TYPE) recordPose(id, decodePose(view, 0));
        };
        pc.onicecandidate = (ev) => {
            if (ev.candidate) this.send({ t: "signal", to: id, data: { ice: ev.candidate.toJSON() } });
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") this.closeLink(id);
        };

        if (initiator) {
            link.chain = link.chain.then(async () => {
                await pc.setLocalDescription(await pc.createOffer());
                this.send({ t: "signal", to: id, data: { sdp: pc.localDescription!.toJSON() } });
            }).catch(() => this.closeLink(id));
        }
        return link;
    }

    private handleSignal(from: number, data: SignalData) {
        if (!this.allowDirect || !useMultiplayerStore.getState().peers[from]) return;
        const link = this.links.get(from) ?? ("sdp" in data && data.sdp.type === "offer" ? this.openLink(from, false) : null);
        if (!link) return; // over the direct-peer cap: they'll time out and use the relay
        const { pc } = link;
        link.chain = link.chain.then(async () => {
            if ("sdp" in data) {
                await pc.setRemoteDescription(data.sdp);
                if (data.sdp.type === "offer") {
                    await pc.setLocalDescription(await pc.createAnswer());
                    this.send({ t: "signal", to: from, data: { sdp: pc.localDescription!.toJSON() } });
                }
            } else if (pc.remoteDescription) {
                await pc.addIceCandidate(data.ice);
            }
        }).catch(() => {
            // A bad candidate shouldn't kill the link; failures surface
            // through connectionState or the timeout instead.
        });
    }

    private closeLink(id: number) {
        const link = this.links.get(id);
        if (!link) return;
        this.links.delete(id);
        clearTimeout(link.timeout);
        link.dc.onclose = null;
        link.pc.onconnectionstatechange = null;
        link.dc.close();
        link.pc.close();
        this.setDirect(id, false);
    }

    private setDirect(id: number, open: boolean) {
        if (open === this.direct.has(id)) return;
        if (open) this.direct.add(id);
        else this.direct.delete(id);
        // Lets the server stop relaying our poses to peers we reach directly.
        this.send({ t: "direct", peers: [...this.direct] });
    }

    private resetPeers() {
        for (const id of [...this.links.keys()]) this.closeLink(id);
        this.direct.clear();
        forgetAllPoses();
        useMultiplayerStore.setState({ peers: {} });
    }
}
