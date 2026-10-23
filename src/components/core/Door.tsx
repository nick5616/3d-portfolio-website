import { useShallow } from "zustand/react/shallow";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Text } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";
import { Archway } from "../../types/scene.types";
import { roomConfigs } from "../../configs/rooms";
import { viewFor } from "../../configs/portalLooks";
import {
    RigidBody,
    CuboidCollider,
    interactionGroups,
} from "@react-three/rapier";
import * as THREE from "three";
import { InteractionRaycaster } from "./InteractionRaycaster";
import { playSound } from "../../audio/soundManager";
import { useUnlockStore } from "../../stores/unlockStore";
import { useRupeeStore } from "../../stores/rupeeStore";
import { useAchievementStore } from "../../stores/achievementStore";
import { RupeeIcon } from "../models/RupeeIcon";
import { GemPrompt } from "../ui/GemPrompt";
import { FairyStonePortal } from "./FairyStonePortal";
import { Portal } from "./portal/Portal";
import { labelLift as frameLabelLift } from "./portal/PortalFrames";
import { WoodenDoor } from "./WoodenDoor";
import { useRoomHeadcount } from "../../multiplayer/presence";
import { DOOR_REVIEW_AVAILABLE, useDoorReview } from "../../debug/doorReview";
import { DoorReviewMarker } from "./DoorReviewMarker";

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
    const lock = archway.lock;
    // Who's on the other side, so a door can say the world isn't empty.
    const inside = useRoomHeadcount(archway.targetRoomId);
    const isLocked = useUnlockStore(
        (s) => Boolean(lock) && !s.unlocked[lock!.id]
    );
    const wallet = useRupeeStore((s) => s.totalValue);
    const [justUnlocked, setJustUnlocked] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isHoveringFromCenter, setIsHoveringFromCenter] = useState(false);
    const lastTransitionTime = useRef<number>(0);
    const doorMeshRef = useRef<THREE.Object3D>(null);

    // The label always comes from the destination's own config name, never
    // a hardcoded string, so every door shows the real destination. What
    // you see through the door is the destination too (PORTAL_VIEWS); the
    // frame is the room's own (archway.frame).
    const label = roomConfigs[archway.targetRoomId]?.name || "Unknown Room";
    const view = viewFor(archway.targetRoomId);
    const appearance = archway.appearance ?? "portal";
    const frame = archway.frame ?? { style: "none" as const };

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

    // Which way is "out" (from the room's center, through the door). This
    // used to be derived from archway.rotation, but rotation does NOT
    // reliably encode which way a door faces in this codebase - north-wall
    // archways are authored with rotation [0,0,0] in some rooms and
    // [0,Math.PI,0] in others. Every archway sits on its room's outer wall,
    // and every room is centered at local (0,0,0), so the door's own
    // position vector reliably points outward regardless of rotation. In a
    // rectangular room that's the wall's own normal, though: a door that
    // isn't centred on its wall would otherwise turn a few degrees off it.
    const [doorX, , doorZ] = doorPosition;
    const distFromCenter = Math.hypot(doorX, doorZ) || 1;
    const outward: [number, number, number] = isCircularRoom
        ? [doorX / distFromCenter, 0, doorZ / distFromCenter]
        : Math.abs(doorX) > Math.abs(doorZ)
        ? [Math.sign(doorX), 0, 0]
        : [0, 0, Math.sign(doorZ) || 1];

    // Mesh-facing convention: local +Z ends up pointing at world
    // (sin(rotY), 0, cos(rotY)), so this makes the aim target's local +Z
    // point outward (away from room center, through the doorway).
    const outwardMeshRotationY = Math.atan2(outward[0], outward[2]);
    const doorMeshRotation: [number, number, number] = [
        0,
        outwardMeshRotationY,
        0,
    ];

    // Everything the player reads or looks into (portals, signs, text)
    // needs its local +Z pointing back at the player standing inside the
    // room, i.e. inward, the opposite of the outward-facing rotation above.
    // drei's <Text> renders double-sided, so getting this wrong shows
    // mirrored glyphs rather than nothing.
    const inwardRotationY = outwardMeshRotationY + Math.PI;

    // Door review (localhost): this door's identity and current look, so a
    // verdict can tell when the door has been changed since.
    const reviewKey = `${currentRoom?.id ?? "?"}/${archway.id}`;
    const look = useMemo(
        () =>
            JSON.stringify({
                appearance,
                frame,
                view,
                size: [archway.width, archway.height],
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [appearance, frame.style, frame.accent, view, archway.width, archway.height]
    );
    const reviewNoteOpen = useDoorReview((s) => s.noting !== null);

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
        // just walked in through) instead of trusting entrancePoint.rotation,
        // whose hand-authored values were inconsistent room to room. This
        // uses the CAMERA's forward convention (forward = (-sin, 0, -cos) at
        // rotation.y, since THREE.Camera looks down -Z), the exact opposite
        // sign from the mesh-facing formula above - mixing the two up is
        // what caused the "backwards" spawns.
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
            if (DOOR_REVIEW_AVAILABLE) useDoorReview.getState().unaim(reviewKey);
        };
    }, [reviewKey]);

    const portalFloor: [number, number, number] =
        appearance === "fairyStone" ? [doorPosition[0], 0, doorPosition[2]] : doorPosition;
    // Room for the frame's lettering (or, unframed, the room's own plaque)
    // above the doorway.
    const lettered = appearance === "portal" && frame.style !== "none";
    const labelLift = lettered ? frameLabelLift(frame, archway.height) + 0.3 : 0.25;
    const markerLift = lettered ? labelLift + 0.45 : 1.1;

    return (
        <group>
            {/* The aim target: an invisible panel filling the doorway.
            Deliberately has no onClick: under pointer lock the cursor sits
            pinned at screen center, so an R3F onClick here would fire on ANY
            click as long as the crosshair merely rests on a distant door,
            teleporting the player from across the room. InteractionRaycaster
            below is the only click/keypress path, and it's gated by
            maxDistance so the door only responds once the player has
            actually walked up to it. */}
            <mesh
                ref={doorMeshRef as any}
                position={[
                    doorPosition[0],
                    doorPosition[1] + archway.height / 2,
                    doorPosition[2],
                ]}
                rotation={doorMeshRotation}
                visible={false}
            >
                <boxGeometry args={[archway.width, archway.height, 0.15]} />
                <meshBasicMaterial />
            </mesh>

            <InteractionRaycaster
                target={doorMeshRef}
                enabled={!reviewNoteOpen}
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
                        if (DOOR_REVIEW_AVAILABLE) {
                            useDoorReview.getState().aim({
                                key: reviewKey,
                                room: currentRoom?.name ?? "?",
                                target: label,
                                look,
                            });
                        }
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
                        if (DOOR_REVIEW_AVAILABLE) useDoorReview.getState().unaim(reviewKey);
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
                    highlightColor: view.light,
                    highlightIntensity: 0.2,
                    prompt: {
                        content: (
                            isLocked ? (
                                wallet >= (lock?.cost ?? 0) ? (
                                    <InteractionPrompt
                                        accent="gold"
                                        action={`Pay ${lock?.cost} rupees to unlock ${label}`}
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
                                            ? `Unlocked! Enter ${label}`
                                            : `Enter ${label}`
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

            <RigidBody
                type="fixed"
                position={doorPosition}
                rotation={doorMeshRotation}
                sensor
                collisionGroups={interactionGroups(1, [0])}
            >
                <CuboidCollider
                    args={[archway.width / 2, archway.height / 2, 1]}
                    sensor
                />
            </RigidBody>

            {appearance === "fairyStone" && (
                <FairyStonePortal
                    position={portalFloor}
                    rotationY={outwardMeshRotationY}
                    label={label}
                    hovering={isHoveringFromCenter}
                />
            )}

            {(appearance === "wood" || appearance === "woodStudio") && (
                <WoodenDoor
                    position={doorPosition}
                    rotationY={inwardRotationY}
                    width={archway.width}
                    height={archway.height}
                    label={label}
                    hovering={isHoveringFromCenter}
                    view={view}
                    variant={appearance === "woodStudio" ? "studio" : "farmhouse"}
                />
            )}

            {appearance === "portal" && (
                <Portal
                    position={doorPosition}
                    rotationY={inwardRotationY}
                    width={archway.width}
                    height={archway.height}
                    view={view}
                    hovering={isHoveringFromCenter}
                    frame={frame}
                    label={label}
                    sealed={isLocked}
                />
            )}

            {isLocked && lock && (
                <group
                    position={[
                        doorPosition[0] - outward[0] * 0.25,
                        doorPosition[1] + archway.height * 0.55,
                        doorPosition[2] - outward[2] * 0.25,
                    ]}
                    rotation={[0, inwardRotationY, 0]}
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

            {inside > 0 && (
                // Half a metre into the room: some walls (the atrium's
                // drum) are thicker than a door is deep, and anything set
                // flush above the doorway ends up inside the stone.
                <Text
                    position={[
                        doorPosition[0] - outward[0] * 0.5,
                        doorPosition[1] + archway.height + labelLift,
                        doorPosition[2] - outward[2] * 0.5,
                    ]}
                    rotation={[0, inwardRotationY, 0]}
                    fontSize={0.19}
                    color="#bfffe0"
                    outlineWidth={0.014}
                    outlineColor="#06210f"
                    anchorX="center"
                    anchorY="middle"
                >
                    {inside === 1 ? "1 traveler inside" : `${inside} travelers inside`}
                </Text>
            )}

            {DOOR_REVIEW_AVAILABLE && (
                <DoorReviewMarker
                    reviewKey={reviewKey}
                    look={look}
                    position={[
                        doorPosition[0] - outward[0] * 0.55,
                        doorPosition[1] + archway.height + markerLift,
                        doorPosition[2] - outward[2] * 0.55,
                    ]}
                    rotationY={inwardRotationY}
                />
            )}
        </group>
    );
};
