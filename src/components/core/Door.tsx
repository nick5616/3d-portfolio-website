import { useShallow } from "zustand/react/shallow";
import { useState, useEffect, useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";
import { Archway } from "../../types/scene.types";
import { roomConfigs } from "../../configs/rooms";
import { galleryDoorStyles } from "../../configs/galleryDoorStyles";
import {
    RigidBody,
    CuboidCollider,
    interactionGroups,
} from "@react-three/rapier";
import * as THREE from "three";
import { InteractionRaycaster } from "./InteractionRaycaster";
import { GalleryDoorAccent } from "./GalleryDoorAccent";
import { playSound } from "../../audio/soundManager";
import { useUnlockStore } from "../../stores/unlockStore";
import { useRupeeStore } from "../../stores/rupeeStore";
import { useAchievementStore } from "../../stores/achievementStore";
import { RupeeIcon } from "../models/RupeeIcon";
import { GemPrompt } from "../ui/GemPrompt";
import { FairyStonePortal } from "./FairyStonePortal";
import { CosmicPortal } from "./CosmicPortal";
import { WoodenDoor } from "./WoodenDoor";

interface DoorProps {
    archway: Archway;
}

// In-world prompt, in the HUD's gem-glass style.
const InteractionPrompt: React.FC<{
    action: string;
    showKey?: boolean;
    accent?: "green" | "gold" | "red";
}> = ({ action, showKey = true, accent = "green" }) => (
    <GemPrompt action={action} keyLabel={showKey ? "E" : null} accent={accent} />
);

export const Door: React.FC<DoorProps> = ({ archway }) => {
    // playerVelocity/lastTeleportTime are read via getState() at the moment
    // they're needed; subscribing to them re-rendered every door whenever
    // the player moved.
    const { teleportToRoom, currentRoom, setRoomTransitionLoading } =
        useSceneStore(
            useShallow((s) => ({
                teleportToRoom: s.teleportToRoom,
                currentRoom: s.currentRoom,
                setRoomTransitionLoading: s.setRoomTransitionLoading,
            }))
        );
    const [isInTrigger, setIsInTrigger] = useState(false);
    // In the forest, the way home is a holed fairy stone.
    const fairyStone = archway.appearance === "fairyStone";
    const lock = archway.lock;
    const isLocked = useUnlockStore(
        (s) => Boolean(lock) && !s.unlocked[lock!.id]
    );
    const wallet = useRupeeStore((s) => s.totalValue);
    const [justUnlocked, setJustUnlocked] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isHoveringFromCenter, setIsHoveringFromCenter] = useState(false);
    const lastTransitionTime = useRef<number>(0);
    const doorMeshRef = useRef<THREE.Object3D>(null);

    // Get room-specific theming. Colors are picked per known room id; the
    // label always comes from the room's actual config name, never a
    // hardcoded/stale string, so every door (including the gallery wing's
    // many halls) shows the real destination.
    const getRoomTheme = (roomId: string) => {
        const roomName = roomConfigs[roomId]?.name || "Unknown Room";
        const isGalleryWing = Boolean(roomConfigs[roomId]?.galleryRoomKind);

        switch (roomId) {
            case "atrium":
                return {
                    color: "#F4E4BC", // Warm gold
                    frameColor: "#DAA520", // Golden
                    label: roomName,
                    description: "Central Hub",
                    glowColor: "#FFD700",
                    isArched: false, // Keep it simple
                    roughness: 0.6,
                    metalness: 0.1,
                    accent: undefined,
                };
            case "projects":
                return {
                    color: "#1E3A8A", // Tech blue
                    frameColor: "#00FFFF", // Cyan
                    label: roomName,
                    glowColor: "#00BFFF",
                    isArched: false, // Sleek rectangular
                    roughness: 0.1,
                    metalness: 0.8,
                    accent: undefined,
                };
            default:
                if (isGalleryWing) {
                    // Every gallery-wing door is colored/styled per its
                    // destination's own category (or the hub, for doors
                    // back to "gallery"), reusing the exact same colors the
                    // minimap uses for that room - and a distinct decorative
                    // accent (see GalleryDoorAccent) so each hall's door is
                    // recognizable at a glance instead of all six + the hub
                    // sharing one generic "gallery white" look.
                    const kind = roomConfigs[roomId]?.galleryRoomKind;
                    const styleKey =
                        kind?.kind === "hall" || kind?.kind === "sketchbook"
                            ? kind.category
                            : "gallery";
                    const style = galleryDoorStyles[styleKey];
                    return {
                        color: style.color,
                        frameColor: style.frameColor,
                        label: roomName,
                        description:
                            kind?.kind === "hall" || kind?.kind === "sketchbook"
                                ? "Art Collection"
                                : "Central Hub",
                        glowColor: style.glowColor,
                        isArched: false,
                        roughness: style.roughness,
                        metalness: style.metalness,
                        accent: style.accent,
                    };
                }
                return {
                    color: "#8B4513",
                    frameColor: "#654321",
                    label: roomName,
                    glowColor: "#FFFFFF",
                    isArched: false,
                    roughness: 0.8,
                    metalness: 0.2,
                    accent: undefined,
                };
        }
    };

    const theme = getRoomTheme(archway.targetRoomId);

    // Snap the door to the room's ACTUAL wall surface instead of trusting
    // each archway's hand-tuned position, which drifted inconsistently
    // (existing rooms use gaps anywhere from ~0.2 to ~0.3 units short of the
    // real wall) and left doors looking like they float away from the wall.
    // Room.tsx's BaseRoom walls sit at half-dimension - 0.01 with thickness
    // 0.1, so the inner (room-facing) surface is at half-dimension - 0.06;
    // rest the door's center a hair inside that so it reads as flush rather
    // than floating. Skipped for the circular rooms (gallery hub, main
    // atrium rotunda, sketchbook), whose curved walls don't have a single
    // flat "surface" this math applies to - their doors are placed on the
    // curve directly.
    const isCircularRoom = Boolean(currentRoom?.circular);
    // Portals and the forest's fairy stone stand in for the usual panel,
    // frame and sign; the panel stays as an invisible aim target.
    const portal = archway.appearance === "portal";
    const wooden = archway.appearance === "wood";
    const customLook = fairyStone || portal || wooden;
    const doorPosition: [number, number, number] = (() => {
        const dimensions = currentRoom?.dimensions;
        if (!dimensions || isCircularRoom) return archway.position;

        const [archX, , archZ] = archway.position;
        const [roomWidth, , roomDepth] = dimensions;
        const wallInnerFace = 0.06;
        const doorStandoff = 0.02; // sits just inside the inner wall face

        if (Math.abs(archX) > Math.abs(archZ)) {
            const snappedX =
                Math.sign(archX) *
                (roomWidth / 2 - wallInnerFace - doorStandoff);
            return [snappedX, archway.position[1], archZ];
        }
        const snappedZ =
            Math.sign(archZ) * (roomDepth / 2 - wallInnerFace - doorStandoff);
        return [archX, archway.position[1], snappedZ];
    })();

    // The frame and label are meant to sit a hair in front of / behind the
    // door panel, offset toward/away from the room's center. This used to be
    // derived from archway.rotation (sin/cos of rotationY), but rotation
    // does NOT reliably encode which way a door faces in this codebase -
    // e.g. north-wall archways are authored with rotation [0,0,0] in some
    // rooms and [0,Math.PI,0] in others (both are "correct" for the wall itself,
    // since BaseRoom's north/south walls share one rotation and only the
    // interaction code's `Math.abs(dot(...))` check ever cared about it,
    // which ignores sign). Every archway sits on its room's outer wall, and
    // every room is centered at local (0,0,0), so the door's own position
    // vector reliably points "outward" (from center, through the door)
    // regardless of rotation - use it directly instead of trusting rotation.
    // In a rectangular room that's the wall's own normal, though: a door
    // that isn't centred on its wall would otherwise turn a few degrees off
    // it.
    const [doorX, , doorZ] = doorPosition;
    const distFromCenter = Math.hypot(doorX, doorZ) || 1;
    const outward: [number, number, number] = isCircularRoom
        ? [doorX / distFromCenter, 0, doorZ / distFromCenter]
        : Math.abs(doorX) > Math.abs(doorZ)
        ? [Math.sign(doorX), 0, 0]
        : [0, 0, Math.sign(doorZ) || 1];
    const FRAME_OFFSET = 0.08;
    const framePosition: [number, number, number] = [
        doorPosition[0] + outward[0] * FRAME_OFFSET,
        doorPosition[1] + archway.height / 2,
        doorPosition[2] + outward[2] * FRAME_OFFSET,
    ];
    const labelPosition: [number, number, number] = [
        doorPosition[0] - outward[0] * FRAME_OFFSET,
        doorPosition[1] + archway.height * 1.2,
        doorPosition[2] - outward[2] * FRAME_OFFSET,
    ];

    // Mesh-facing convention: local +Z ends up pointing at world
    // (sin(rotY), 0, cos(rotY)), so this makes the door/frame's local +Z
    // point outward (away from room center, through the doorway).
    const outwardMeshRotationY = Math.atan2(outward[0], outward[2]);
    const doorMeshRotation: [number, number, number] = [
        0,
        outwardMeshRotationY,
        0,
    ];

    // The label's <Text> (troika, via drei) renders DOUBLE-sided by default -
    // the back is not culled, it's a mirrored view of the glyphs, and the
    // plain yellow background <mesh> behind it IS single-sided (default
    // meshStandardMaterial), so getting this rotation wrong doesn't just
    // look mirrored, the background plane vanishes too (only the mirrored
    // text renders, floating with nothing behind it). The label needs its
    // local +Z - the readable, non-mirrored face - pointing back at the
    // player standing inside the room, i.e. inward, which is the opposite
    // of the outward-facing rotation the door/frame use above.
    const labelRotationY = outwardMeshRotationY + Math.PI;

    // Helper function to check if player is moving toward the door
    const isMovingTowardDoor = useCallback(() => {
        const { playerVelocity } = useSceneStore.getState();
        // If player is not moving, allow teleportation
        const velocityMagnitude = Math.sqrt(
            playerVelocity[0] ** 2 + playerVelocity[2] ** 2
        );
        if (velocityMagnitude < 0.1) return true;

        // Calculate door normal (perpendicular to door face)
        const doorNormal = new THREE.Vector3();
        const doorRotation = new THREE.Euler(
            archway.rotation[0],
            archway.rotation[1],
            archway.rotation[2]
        );
        doorNormal.set(0, 0, 1).applyEuler(doorRotation);

        // Get player velocity as a vector (ignore Y component)
        const playerVelVector = new THREE.Vector3(
            playerVelocity[0],
            0,
            playerVelocity[2]
        ).normalize();

        // Calculate angle between player velocity and door normal
        const angle = Math.acos(Math.abs(playerVelVector.dot(doorNormal)));

        // Allow teleportation if angle is less than 45 degrees (π/4 radians)
        const maxAngle = Math.PI / 4; // 45 degrees
        return angle <= maxAngle;
    }, [archway.rotation]);

    // Locked doors take payment on the first E press, then open normally.
    const tryUnlock = useCallback(() => {
        if (!lock) return;
        if (useRupeeStore.getState().spendRupees(lock.cost)) {
            useUnlockStore.getState().unlock(lock.id);
            if (lock.id === "sketchbook") {
                useAchievementStore.getState().unlock("sketchbook-unlocked");
            }
            playSound("rupee-spend");
            setTimeout(() => playSound("door-unlock"), 220);
            setJustUnlocked(true);
            setTimeout(() => setJustUnlocked(false), 2500);
        } else {
            playSound("door-locked");
        }
    }, [lock]);

    const handleTeleport = useCallback(() => {
        if (
            lock &&
            !useUnlockStore.getState().unlocked[lock.id]
        ) {
            tryUnlock();
            return;
        }
        // Check velocity direction before teleporting
        if (!isMovingTowardDoor()) {
            console.log(
                `🚫 Teleportation blocked: Player moving sideways relative to door ${archway.id}`
            );
            return;
        }

        // Start room transition loading screen
        const fromRoom = currentRoom?.id || "unknown";
        const toRoom = archway.targetRoomId;

        console.log(`🏠 Starting room transition: ${fromRoom} → ${toRoom}`);
        setRoomTransitionLoading(true, fromRoom, toRoom);
        playSound("door-enter");

        // Use entrance point if available, otherwise use archway position
        const entrancePosition = archway.entrancePoint?.position || [
            archway.position[0],
            archway.position[1] + 3,
            archway.position[2],
        ];

        // Compute arrival facing from the entrance position itself (face
        // toward the target room's center, i.e. away from whichever wall you
        // just walked in through) instead of trusting entrancePoint.rotation.
        // Hand-authored rotation values turned out to be inconsistent room to
        // room (the same issue found in archway.rotation - see the frame/
        // label fix above), so any door landing you facing the "wrong" way
        // depended on which convention that specific entrancePoint happened
        // to be written with. Note this uses the CAMERA's own forward
        // convention (forward = (-sin, 0, -cos) at rotation.y, since
        // THREE.Camera looks down -Z by default), which is the exact
        // opposite sign from the mesh-facing formula used for door
        // frames/labels (where the visible face is local +Z) - mixing the
        // two up is what caused the "backwards" spawns.
        const [entranceX, , entranceZ] = entrancePosition;
        const entranceRotation: [number, number, number] = [
            0,
            Math.atan2(entranceX, entranceZ),
            0,
        ];

        console.log(`📍 Teleporting to:`, entrancePosition);
        console.log(`🔄 With rotation:`, entranceRotation);

        // Delay the actual teleportation to allow loading screen to show
        setTimeout(() => {
            teleportToRoom(
                archway.targetRoomId,
                entrancePosition as [number, number, number],
                entranceRotation as [number, number, number]
            );
        }, 100);
    }, [
        archway,
        teleportToRoom,
        isMovingTowardDoor,
        currentRoom,
        setRoomTransitionLoading,
        lock,
        tryUnlock,
    ]);

    // // Handle collision events
    // const handleCollisionEnter = () => {
    //     if (!isTransitioning) {
    //         setIsInTrigger(true);
    //     }
    // };

    // const handleCollisionExit = (event: any) => {
    //     console.log(
    //         `🔴 COLLISION EXIT: Door ${archway.id} (${archway.targetRoomId}) - Green trigger area deactivated`,
    //         event
    //     );
    //     setIsInTrigger(false);
    // };

    useEffect(() => {
        if (!isInTrigger || isTransitioning) return;

        const now = Date.now();
        // Check both local and global debounce (1 second each)
        if (now - lastTransitionTime.current < 1000) return;
        if (now - useSceneStore.getState().lastTeleportTime < 1000) return;

        console.log(
            `🚪 AUTO-TELEPORT TRIGGERED: Door ${archway.id} (${archway.targetRoomId}) - Starting transition`
        );
        lastTransitionTime.current = now;
        setIsTransitioning(true);

        // Short delay for smooth transition
        setTimeout(() => {
            handleTeleport();
            setIsTransitioning(false);
        }, 100);
    }, [isInTrigger, isTransitioning, handleTeleport]);

    // Listen for UI click events
    useEffect(() => {
        const handleUIClick = (event: CustomEvent) => {
            if (event.detail.doorId === archway.id) {
                console.log(`🖱️ UI Click received for door: ${archway.id}`);
                handleTeleport();
            }
        };

        window.addEventListener("doorUIClick", handleUIClick as EventListener);

        return () => {
            window.removeEventListener(
                "doorUIClick",
                handleUIClick as EventListener
            );
        };
    }, [archway.id, handleTeleport]);

    // Cleanup hover state on unmount
    useEffect(() => {
        return () => {
            // Reset hover state when door component unmounts
            window.dispatchEvent(
                new CustomEvent("doorHover", {
                    detail: { hovering: false },
                })
            );
        };
    }, []);

    return (
        <group>
            {/* Themed Door - VISIBLE DOOR MESH. Deliberately has no onClick:
            under pointer lock the cursor sits pinned at screen center, so an
            R3F onClick here would fire on ANY click as long as the crosshair
            merely rests on a visible-but-distant door, teleporting the
            player from across the room. InteractionRaycaster below is the
            only click/keypress path, and it's gated by maxDistance so the
            door only responds once the player has actually walked up to it. */}
            <mesh
                ref={doorMeshRef as any}
                position={[
                    doorPosition[0],
                    doorPosition[1] + archway.height / 2,
                    doorPosition[2],
                ]}
                rotation={doorMeshRotation}
                // Hidden (but still the aim target) when the fairy stone
                // or a portal stands in for the door.
                visible={!customLook}
            >
                <boxGeometry args={[archway.width, archway.height, 0.15]} />
                <meshStandardMaterial
                    color={isHoveringFromCenter ? theme.glowColor : theme.color}
                    roughness={theme.roughness}
                    metalness={theme.metalness}
                    emissive={
                        isHoveringFromCenter ? theme.glowColor : "#000000"
                    }
                    emissiveIntensity={isHoveringFromCenter ? 0.2 : 0}
                />
            </mesh>

            <InteractionRaycaster
                target={doorMeshRef}
                config={{
                    maxDistance: 6,
                    includeChildren: true,
                    rayOrigin: "center",
                    triggerActions: [
                        { type: "click", cooldown: 1000 },
                        { type: "keypress", key: "e", cooldown: 1000 },
                        { type: "hover" },
                    ],
                }}
                callbacks={{
                    onRayEnter: () => {
                        setIsHoveringFromCenter(true);
                        // Dispatch doorHover event for UI components
                        window.dispatchEvent(
                            new CustomEvent("doorHover", {
                                detail: {
                                    hovering: true,
                                    doorData: {
                                        archway: archway,
                                        doorId: archway.id,
                                        targetRoomId: archway.targetRoomId,
                                    },
                                },
                            })
                        );
                    },
                    onRayExit: () => {
                        setIsHoveringFromCenter(false);
                        // Dispatch doorHover event for UI components
                        window.dispatchEvent(
                            new CustomEvent("doorHover", {
                                detail: {
                                    hovering: false,
                                    doorData: null,
                                },
                            })
                        );
                    },
                    onTrigger: (action) => {
                        if (
                            action.type === "click" ||
                            action.type === "keypress"
                        ) {
                            handleTeleport();
                        }
                    },
                }}
                visual={{
                    cursorStyle: "pointer",
                    highlightColor: theme.glowColor,
                    highlightIntensity: 0.2,
                    prompt: {
                        content: (
                            isLocked ? (
                                wallet >= (lock?.cost ?? 0) ? (
                                    <InteractionPrompt
                                        accent="gold"
                                        action={`Pay ${lock?.cost} rupees to unlock ${theme.label}`}
                                    />
                                ) : (
                                    <InteractionPrompt
                                        accent="red"
                                        showKey={false}
                                        action={`Locked: costs ${lock?.cost} rupees (you have ${Math.max(0, wallet)})`}
                                    />
                                )
                            ) : (
                                <InteractionPrompt
                                    action={
                                        justUnlocked
                                            ? `Unlocked! Enter ${theme.label}`
                                            : `Enter ${theme.label}`
                                    }
                                />
                            )
                        ),
                        offset: [0, 0, 0],
                        visible: isHoveringFromCenter,
                        distanceScale: true,
                        style: {
                            userSelect: "none",
                        },
                    },
                }}
            />

            <mesh
                position={[
                    doorPosition[0],
                    doorPosition[1] + archway.height / 2,
                    doorPosition[2],
                ]}
                rotation={doorMeshRotation}
                visible={true}
            >
                <boxGeometry
                    args={[archway.width * 2, archway.height * 1.5, 1]}
                />
                <meshBasicMaterial color="#ff00ff" transparent opacity={0} />
            </mesh>

            <RigidBody
                type="fixed"
                position={doorPosition}
                rotation={doorMeshRotation}
                sensor
                collisionGroups={interactionGroups(1, [0])}
                // onIntersectionEnter={handleCollisionEnter}
                // onIntersectionExit={handleCollisionExit}
            >
                <CuboidCollider
                    args={[archway.width / 2, archway.height / 2, 1]}
                    sensor
                />
            </RigidBody>

            {fairyStone && (
                <FairyStonePortal
                    position={[doorPosition[0], 0, doorPosition[2]]}
                    rotationY={doorMeshRotation[1]}
                    label={theme.label}
                    hovering={isHoveringFromCenter}
                />
            )}

            {wooden && (
                <WoodenDoor
                    position={doorPosition}
                    rotationY={labelRotationY}
                    width={archway.width}
                    height={archway.height}
                    label={theme.label}
                    hovering={isHoveringFromCenter}
                />
            )}

            {portal && (
                <CosmicPortal
                    position={doorPosition}
                    rotationY={labelRotationY}
                    width={archway.width}
                    height={archway.height}
                    hovering={isHoveringFromCenter}
                    frame={archway.frame}
                    label={archway.frame ? theme.label : undefined}
                />
            )}

            <group position={framePosition} rotation={doorMeshRotation} visible={!customLook}>
                <mesh>
                    <boxGeometry
                        args={[archway.width + 0.4, archway.height + 0.4, 0.06]}
                    />
                    <meshStandardMaterial
                        color={theme.frameColor}
                        roughness={theme.roughness}
                        metalness={theme.metalness}
                    />
                </mesh>
                {theme.accent && (
                    <GalleryDoorAccent
                        accent={theme.accent}
                        width={archway.width}
                        height={archway.height}
                        color={theme.color}
                        glowColor={theme.glowColor}
                        frameColor={theme.frameColor}
                    />
                )}
            </group>

            {isLocked && lock && (
                <group
                    position={[
                        doorPosition[0] - outward[0] * 0.1,
                        doorPosition[1] + archway.height * 0.55,
                        doorPosition[2] - outward[2] * 0.1,
                    ]}
                    rotation={[0, labelRotationY, 0]}
                >
                    <RupeeIcon
                        color="#3ee58f"
                        scale={0.16}
                        emissiveIntensity={1.4}
                    />
                    <Text
                        position={[0, -0.42, 0.02]}
                        fontSize={0.2}
                        color="#ffe9a8"
                        outlineWidth={0.012}
                        outlineColor="#1a1208"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {`${lock.cost} rupees`}
                    </Text>
                </group>
            )}

            <group position={labelPosition} rotation={[0, labelRotationY, 0]} visible={!customLook}>
                {/* Label Background */}
                <mesh position={[0, 0, 0]}>
                    <planeGeometry
                        args={[Math.max(archway.width + 0.2, 2.2), 0.6]}
                    />
                    <meshStandardMaterial
                        color="#ffff00"
                        transparent
                        opacity={0.9}
                    />
                </mesh>

                {/* Room Label Text */}
                <Text
                    position={[0, 0, 0.01]}
                    fontSize={0.25}
                    color="black"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={Math.max(archway.width, 2)}
                    fontWeight="bold"
                >
                    {theme.label}
                </Text>
            </group>
        </group>
    );
};
