import { useState, useEffect, useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";
import { Archway } from "../../types/scene.types";
import { roomConfigs } from "../../configs/rooms";
import {
    RigidBody,
    CuboidCollider,
    interactionGroups,
} from "@react-three/rapier";
import * as THREE from "three";
import { InteractionRaycaster } from "./InteractionRaycaster";

interface DoorProps {
    archway: Archway;
}

// Add a styled prompt component
const InteractionPrompt: React.FC<{ action: string }> = ({ action }) => (
    <div
        style={{
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "Arial, sans-serif",
            whiteSpace: "nowrap",
        }}
    >
        Press{" "}
        <kbd
            style={{
                background: "#fff",
                color: "#000",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "12px",
                fontWeight: "bold",
            }}
        >
            E
        </kbd>{" "}
        {action}
    </div>
);

export const Door: React.FC<DoorProps> = ({ archway }) => {
    const {
        teleportToRoom,
        lastTeleportTime,
        playerVelocity,
        currentRoom,
        setRoomTransitionLoading,
    } = useSceneStore();
    const [isInTrigger, setIsInTrigger] = useState(false);
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
                };
            case "projects":
                return {
                    color: "#1E3A8A", // Tech blue
                    frameColor: "#00FFFF", // Cyan
                    label: roomName,
                    glowColor: "#00BFFF",
                    isArched: false, // Sleek rectangular
                };
            case "about":
                return {
                    color: "#FF6B6B", // Warm coral
                    frameColor: "#FFB347", // Peach
                    label: roomName,
                    glowColor: "#FF69B4",
                    isArched: false, // Keep it simple
                };
            default:
                if (isGalleryWing) {
                    // Every room in the gallery wing (atrium + halls) shares
                    // the same gallery look and feel.
                    return {
                        color: "#F8F8FF", // Gallery white
                        frameColor: "#2F2F2F", // Elegant dark frame
                        label: roomName,
                        description: "Art Collection",
                        glowColor: "#E6E6FA",
                        isArched: false,
                    };
                }
                return {
                    color: "#8B4513",
                    frameColor: "#654321",
                    label: roomName,
                    glowColor: "#FFFFFF",
                    isArched: false,
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
    // than floating. Skipped for the circular gallery atrium, whose curved
    // wall doesn't have a single flat "surface" this math applies to - its
    // doors are already embedded directly in the wall ring.
    const isCircularRoom = currentRoom?.galleryRoomKind?.kind === "atrium";
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
    // which ignores sign). That made the frame/label face backwards on
    // roughly half the doors. Every archway sits on its room's outer wall,
    // and every room is centered at local (0,0,0), so the door's own
    // position vector reliably points "outward" regardless of rotation -
    // just negate it to get "inward, toward room center."
    const [doorX, , doorZ] = doorPosition;
    const distFromCenter = Math.hypot(doorX, doorZ) || 1;
    const inward: [number, number, number] = [
        -doorX / distFromCenter,
        0,
        -doorZ / distFromCenter,
    ];
    const FRAME_OFFSET = 0.08;
    const framePosition: [number, number, number] = [
        doorPosition[0] + inward[0] * FRAME_OFFSET,
        doorPosition[1] + archway.height / 2,
        doorPosition[2] + inward[2] * FRAME_OFFSET,
    ];
    const labelPosition: [number, number, number] = [
        doorPosition[0] - inward[0] * FRAME_OFFSET,
        doorPosition[1] + archway.height * 1.2,
        doorPosition[2] - inward[2] * FRAME_OFFSET,
    ];

    // The label's <Text> is single-sided (only visible from its local +Z),
    // so it must actually face inward to be readable at all - it can't just
    // rely on archway.rotation like the plain (symmetric, rotation-agnostic)
    // frame box could. Mesh-facing convention: local +Z ends up pointing at
    // world (sin(rotY), 0, cos(rotY)), so solve for the inward vector above.
    const inwardMeshRotationY = Math.atan2(inward[0], inward[2]);
    const inwardMeshRotation: [number, number, number] = [
        0,
        inwardMeshRotationY,
        0,
    ];

    // Helper function to check if player is moving toward the door
    const isMovingTowardDoor = useCallback(() => {
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
    }, [playerVelocity, archway.rotation]);

    const handleTeleport = useCallback(() => {
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

        // Use entrance point if available, otherwise use archway position
        const entrancePosition = archway.entrancePoint?.position || [
            archway.position[0],
            3,
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
    ]);

    const handleDoorClick = () => {
        handleTeleport();
    };

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
        if (now - lastTeleportTime < 1000) return;

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
    }, [isInTrigger, isTransitioning, handleTeleport, lastTeleportTime]);

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
            {/* Themed Door - VISIBLE DOOR MESH */}
            <mesh
                ref={doorMeshRef as any}
                position={[
                    doorPosition[0],
                    doorPosition[1] + archway.height / 2,
                    doorPosition[2],
                ]}
                rotation={inwardMeshRotation}
                castShadow
                receiveShadow
                onClick={handleDoorClick}
                onPointerOver={(e) => (document.body.style.cursor = "pointer")}
                onPointerOut={(e) => (document.body.style.cursor = "default")}
            >
                <boxGeometry args={[archway.width, archway.height, 0.15]} />
                <meshStandardMaterial
                    color={isHoveringFromCenter ? theme.glowColor : theme.color}
                    roughness={archway.targetRoomId === "projects" ? 0.1 : 0.6}
                    metalness={archway.targetRoomId === "projects" ? 0.8 : 0.1}
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
                            <InteractionPrompt
                                action={`to enter ${theme.label}`}
                            />
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
                rotation={inwardMeshRotation}
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
                rotation={inwardMeshRotation}
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

            <mesh position={framePosition} rotation={inwardMeshRotation}>
                <boxGeometry
                    args={[archway.width + 0.4, archway.height + 0.4, 0.06]}
                />
                <meshStandardMaterial
                    color={theme.frameColor}
                    roughness={archway.targetRoomId === "projects" ? 0.1 : 0.8}
                    metalness={archway.targetRoomId === "projects" ? 0.9 : 0.2}
                />
            </mesh>

            <group position={labelPosition} rotation={inwardMeshRotation}>
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
