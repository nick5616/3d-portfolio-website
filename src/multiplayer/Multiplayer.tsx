import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../stores/sceneStore";
import { useCharacterStore } from "../stores/characterStore";
import { characterAt, lookFor, newMotion } from "./characters";
import { MultiplayerClient, useMultiplayerStore } from "./connection";
import { FLAG_CROUCH, FLAG_FLYING, POSE_LEN, encodePose } from "./protocol";
import { samplePose, type InterpolatedPose } from "./remotePoses";

// Production needs VITE_MULTIPLAYER_URL (e.g. wss://world-xyz.a.run.app);
// without it the world is simply single-player. In dev it defaults to the
// local server from multiplayer-server/.
const MULTIPLAYER_URL: string | undefined =
    import.meta.env.VITE_MULTIPLAYER_URL ||
    (import.meta.env.DEV ? `ws://${location.hostname}:8787` : undefined);

/** While moving. Idle senders drop to a heartbeat. */
const SEND_INTERVAL = 1000 / 15;
/** Unreliable channels can lose the final "stopped here" packet; this repairs it. */
const HEARTBEAT_INTERVAL = 1000;

const STANDING_EYE_HEIGHT = 1.8;
const CROUCH_EYE_HEIGHT = 1.3;
const FEET_OFFSET = 0.2;

let client: MultiplayerClient | null = null;

/** Mount once inside the world's Canvas. */
export const Multiplayer: React.FC = () => {
    const roomId = useSceneStore((s) => s.currentRoom?.id ?? null);
    // Nobody appears to anyone until they've picked who to be.
    const entered = useCharacterStore((s) => s.entered);
    const look = useCharacterStore((s) => lookFor(s.character, s.color));
    const char = useCharacterStore((s) => s.character);
    const selecting = useCharacterStore((s) => s.selecting);

    useEffect(() => {
        if (!MULTIPLAYER_URL || !entered) return;
        const { color, character } = useCharacterStore.getState();
        client = new MultiplayerClient(MULTIPLAYER_URL, lookFor(character, color), character);
        client.setRoom(useSceneStore.getState().currentRoom?.id ?? null);
        client.connect();
        return () => {
            client?.disconnect();
            client = null;
        };
    }, [entered]);

    // Browsing in the selector stays private; others see the change once
    // it's confirmed.
    useEffect(() => {
        if (!selecting) client?.setProfile(look, char);
    }, [look, char, selecting]);

    useEffect(() => {
        client?.setRoom(roomId);
    }, [roomId]);

    if (!MULTIPLAYER_URL) return null;
    return (
        <>
            <PoseSender />
            <RemotePlayers />
        </>
    );
};

// On a timer rather than useFrame: hidden tabs and covered windows stop
// rendering entirely, but timers keep running (throttled to ~1 Hz), so
// everyone else still sees you standing where you left off.
const PoseSender: React.FC = () => {
    const camera = useThree((s) => s.camera);

    useEffect(() => {
        const packet = new Uint8Array(POSE_LEN);
        const view = new DataView(packet.buffer);
        const euler = new THREE.Euler(0, 0, 0, "YXZ");
        const last = { at: 0, key: "" };
        const timer = setInterval(() => {
            if (!client || Object.keys(useMultiplayerStore.getState().peers).length === 0) return;
            const now = performance.now();
            const { playerPosition: [x, y, z], flyMode, cameraOverride } = useSceneStore.getState();
            euler.setFromQuaternion(camera.quaternion);
            let flags = flyMode ? FLAG_FLYING : 0;
            // PlayerBody keeps the camera at the body plus its (crouch-lowered)
            // eye height, so a short gap between them means crouching.
            const eye = camera.position.y - y;
            if (!cameraOverride && !flyMode && eye < (STANDING_EYE_HEIGHT + CROUCH_EYE_HEIGHT) / 2) {
                flags |= FLAG_CROUCH;
            }
            encodePose(view, now, x, y, z, euler.y, euler.x, flags);

            // Compare what's actually on the wire (minus the timestamp), so
            // sub-centimetre jitter doesn't count as moving.
            const key = packet.subarray(3).join();
            if (key === last.key && now - last.at < HEARTBEAT_INTERVAL) return;
            last.at = now;
            last.key = key;
            client.sendPose(packet);
        }, SEND_INTERVAL);
        return () => clearInterval(timer);
    }, [camera]);
    return null;
};

const RemotePlayers: React.FC = () => {
    const peers = useMultiplayerStore((s) => s.peers);
    return (
        <>
            {Object.values(peers).map((p) => (
                // Keyed by character too, so switching remounts the model.
                <RemotePlayer key={`${p.id}:${p.char}`} id={p.id} look={p.look} char={p.char} />
            ))}
        </>
    );
};

// Not hit by the interaction/aim raycasts: other visitors shouldn't block
// looking at art.
const noRaycast = () => null;

const RemotePlayer: React.FC<{ id: number; look: number; char: number }> = ({ id, look, char }) => {
    const root = useRef<THREE.Group>(null);
    const pose = useMemo<InterpolatedPose>(() => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, flags: 0 }), []);
    const motion = useMemo(newMotion, []);
    const last = useRef<{ x: number; z: number } | null>(null);
    const color = useMemo(() => new THREE.Color(look), [look]);
    const { Model } = characterAt(char);

    useLayoutEffect(() => {
        root.current?.traverse((o) => (o.raycast = noRaycast));
    }, [char]);

    useFrame((_, delta) => {
        const g = root.current;
        if (!g) return;
        g.visible = samplePose(id, pose);
        if (!g.visible) return;
        g.position.set(pose.x, pose.y, pose.z);
        g.rotation.y = pose.yaw;

        // Speed from how far the interpolated pose moved, smoothed; it
        // drives each character's walk cycle. Teleports read as standing.
        if (last.current && delta > 0) {
            const d = Math.hypot(pose.x - last.current.x, pose.z - last.current.z);
            const speed = d > 2 ? 0 : d / delta;
            motion.speed += (speed - motion.speed) * Math.min(1, delta * 8);
        }
        last.current = { x: pose.x, z: pose.z };
        const crouch = pose.flags & FLAG_CROUCH ? 1 : 0;
        motion.crouch += (crouch - motion.crouch) * Math.min(1, delta * 10);
        motion.pitch = pose.pitch;
    });

    return (
        <group ref={root} visible={false}>
            {/* The body's origin sits 0.2 below the capsule's feet. */}
            <group position-y={FEET_OFFSET}>
                <Model color={color} motion={motion} />
            </group>
        </group>
    );
};
