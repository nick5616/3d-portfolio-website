import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore } from "../stores/sceneStore";
import { useCharacterStore } from "../stores/characterStore";
import { characterAt, lookFor, newMotion } from "./characters";
import { MultiplayerClient, useMultiplayerStore } from "./connection";
import {
    Activity,
    FLAG_CROUCH,
    FLAG_FLYING,
    POSE_LEN,
    activityOf,
    encodePose,
    withActivity,
    type ActivityCode,
} from "./protocol";
import { useArtInspectStore } from "../stores/artInspectStore";
import { useSketchbookStore } from "../components/sketchbook/sketchbookStore";
import { useDjConsole } from "../components/rooms/studio/dj/consoleGate";
import { playSound } from "../audio/soundManager";
import { ROOM_SOUNDSCAPES } from "../audio/soundManifest";
import { soundscapeKeyForRoom } from "../audio/roomSoundscape";
import { samplePose, type InterpolatedPose } from "./remotePoses";
import { MULTIPLAYER_URL, presenceRoomKey } from "./presence";
// Every room gets a session the moment it starts loading.
import { placeKey, useRoomSessionStore } from "./roomSession";

/** While moving. Idle senders drop to a heartbeat. */
const SEND_INTERVAL = 1000 / 15;
/** Unreliable channels can lose the final "stopped here" packet; this repairs it. */
const HEARTBEAT_INTERVAL = 1000;

const STANDING_EYE_HEIGHT = 1.8;
const CROUCH_EYE_HEIGHT = 1.3;
const FEET_OFFSET = 0.2;

let client: MultiplayerClient | null = null;

/**
 * Mount once, outside the Canvas: the connection should be up before
 * there's anything to render (see below).
 */
export const MultiplayerConnection: React.FC = () => {
    const roomId = useSceneStore((s) => s.currentRoom?.id ?? null);
    const look = useCharacterStore((s) => lookFor(s.character, s.color));
    const char = useCharacterStore((s) => s.character);
    const selecting = useCharacterStore((s) => s.selecting);

    // Connected from the start, while the first room is still loading: who
    // else is in it decides what it looks like (roomSession.ts). Nobody
    // sees anybody until they've picked who to be, though - poses only go
    // out after that (PoseSender).
    useEffect(() => {
        if (!MULTIPLAYER_URL) return;
        const { color, character } = useCharacterStore.getState();
        client = new MultiplayerClient(MULTIPLAYER_URL, lookFor(character, color), character);
        const room = useSceneStore.getState().currentRoom?.id;
        client.setRoom(room ? presenceRoomKey(room) : null);
        client.connect();
        return () => {
            client?.disconnect();
            client = null;
        };
    }, []);

    // Browsing in the selector stays private; others see the change once
    // it's confirmed.
    useEffect(() => {
        if (!selecting) client?.setProfile(look, char);
    }, [look, char, selecting]);

    useEffect(() => {
        client?.setRoom(roomId ? presenceRoomKey(roomId) : null);
    }, [roomId]);

    return null;
};

/** Mount once inside the world's Canvas: everyone else, and our pose to them. */
export const Multiplayer: React.FC = () => {
    if (!MULTIPLAYER_URL) return null;
    return (
        <>
            <PoseSender />
            <RemotePlayers />
        </>
    );
};

// What we're doing, for everyone else to see over our head.
const currentActivity = (): ActivityCode => {
    if (document.hidden) return Activity.away;
    if (useCharacterStore.getState().selecting) return Activity.choosing;
    if (useDjConsole.getState().open) return Activity.djing;
    if (useArtInspectStore.getState().inspecting) return Activity.art;
    if (useSketchbookStore.getState().reading) return Activity.reading;
    const scene = useSceneStore.getState();
    if (scene.console.isActive) return Activity.typing;
    // The pause card is up: cursor free, nothing open.
    if (scene.showStartPrompt) return Activity.away;
    return Activity.none;
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
            // Nobody appears to anyone until they've picked who to be.
            if (!useCharacterStore.getState().entered) return;
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
            flags = withActivity(flags, currentActivity());
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
    // Only those in the same place in the room as us (useRoomPlace).
    const place = useRoomSessionStore((s) => s.place);
    const parts = useRoomSessionStore((s) => s.parts);
    return (
        <>
            {Object.values(peers).filter((p) => (parts[placeKey(p.id)] ?? null) === place).map((p) => (
                // Keyed by character too, so switching remounts the model.
                <RemotePlayer key={`${p.id}:${p.char}`} id={p.id} look={p.look} char={p.char} />
            ))}
        </>
    );
};

// Not hit by the interaction/aim raycasts: other visitors shouldn't block
// looking at art.
const noRaycast = () => null;

const ACTIVITY_LABEL: Record<ActivityCode, string | null> = {
    [Activity.none]: null,
    [Activity.away]: "💤 away",
    [Activity.choosing]: "✨ choosing who to be",
    [Activity.art]: "🖼️ looking closely",
    [Activity.reading]: "📖 reading",
    [Activity.typing]: "💬 typing",
    [Activity.djing]: "🎛️ on the decks",
};

// Dev only: what each visitor is drawn as, for tests.
const shownForTests = new Map<number, { visible: boolean; activity: ActivityCode; x: number; z: number }>();
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__remotes = shownForTests;

/** Footsteps carry this far. */
const HEARING_DISTANCE = 16;
const STRIDE = 1.9; // metres per step, as PlayerBody's

const RemotePlayer: React.FC<{ id: number; look: number; char: number }> = ({ id, look, char }) => {
    const root = useRef<THREE.Group>(null);
    const pose = useMemo<InterpolatedPose>(() => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, flags: 0 }), []);
    const motion = useMemo(newMotion, []);
    const last = useRef<{ x: number; y: number; z: number } | null>(null);
    const color = useMemo(() => new THREE.Color(look), [look]);
    const def = characterAt(char);
    const { Model } = def;
    const camera = useThree((s) => s.camera);
    const [activity, setActivity] = useState<ActivityCode>(Activity.none);
    const shownActivity = useRef<ActivityCode>(Activity.none);
    const stride = useRef(0);
    const lift = useRef(0); // smoothed vertical speed: airborne, riding, or on foot
    const local = useMemo(() => new THREE.Vector3(), []);

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
        let moved = 0;
        if (last.current && delta > 0) {
            const d = Math.hypot(pose.x - last.current.x, pose.z - last.current.z);
            moved = d > 2 ? 0 : d;
            motion.speed += (moved / delta - motion.speed) * Math.min(1, delta * 8);
            const vy = (pose.y - last.current.y) / delta;
            lift.current += (Math.abs(vy) > 20 ? 0 : vy - lift.current) * Math.min(1, delta * 6);
        }
        last.current = { x: pose.x, y: pose.y, z: pose.z };
        const crouch = pose.flags & FLAG_CROUCH ? 1 : 0;
        motion.crouch += (crouch - motion.crouch) * Math.min(1, delta * 10);
        motion.pitch = pose.pitch;

        const now = activityOf(pose.flags);
        if (import.meta.env.DEV) shownForTests.set(id, { visible: true, activity: now, x: pose.x, z: pose.z });
        if (now !== shownActivity.current) {
            shownActivity.current = now;
            setActivity(now);
        }

        // Their footsteps, from where they are: quieter further off, and
        // to whichever side of us they're on.
        const onFoot = def.walks && !(pose.flags & FLAG_FLYING) && Math.abs(lift.current) < 0.6;
        if (!onFoot) {
            stride.current = 0;
            return;
        }
        stride.current += moved;
        if (stride.current < STRIDE) return;
        stride.current = 0;
        local.set(pose.x, pose.y + 0.5, pose.z);
        const distance = local.distanceTo(camera.position);
        if (distance > HEARING_DISTANCE) return;
        local.applyMatrix4(camera.matrixWorldInverse);
        const fall = 1 - distance / HEARING_DISTANCE;
        const room = useSceneStore.getState().currentRoom;
        playSound(ROOM_SOUNDSCAPES[soundscapeKeyForRoom(room)]?.footsteps ?? "footstep-stone", {
            volume: fall * fall * (crouch ? 0.35 : 0.7),
            pan: (local.x / Math.max(1, Math.hypot(local.x, local.z))) * 0.8,
        });
    });

    const label = ACTIVITY_LABEL[activity];
    return (
        <group ref={root} visible={false}>
            {/* The body's origin sits 0.2 below the capsule's feet. */}
            <group position-y={FEET_OFFSET}>
                <Model color={color} motion={motion} />
            </group>
            {label && (
                <Html
                    position={[0, FEET_OFFSET + def.height + 0.35, 0]}
                    center
                    distanceFactor={7}
                    zIndexRange={[15, 0]}
                    style={{ pointerEvents: "none" }}
                >
                    <div className="gem-chip text-xs whitespace-nowrap" style={{ opacity: activity === Activity.away ? 0.75 : 1 }}>
                        {label}
                    </div>
                </Html>
            )}
        </group>
    );
};
