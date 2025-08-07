import { useState, useEffect, useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";
import { Archway } from "../../types/scene.types";
import {
    RigidBody,
    CuboidCollider,
    interactionGroups,
} from "@react-three/rapier";
import * as THREE from "three";

interface DoorProps {
    archway: Archway;
}

export const Door: React.FC<DoorProps> = ({ archway }) => {
    const { teleportToRoom, lastTeleportTime, playerVelocity } =
        useSceneStore();
    const { camera, raycaster } = useThree();
    const [isInTrigger, setIsInTrigger] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isHoveringFromCenter, setIsHoveringFromCenter] = useState(false);
    const lastTransitionTime = useRef<number>(0);
    const doorMeshRef = useRef<THREE.Object3D>(null);

    // Get room-specific theming
    const getRoomTheme = (roomId: string) => {
        switch (roomId) {
            case "atrium":
                return {
                    color: "#F4E4BC", // Warm gold
                    frameColor: "#DAA520", // Golden
                    label: "Atrium",
                    description: "Central Hub",
                    glowColor: "#FFD700",
                    isArched: false, // Keep it simple
                };
            case "gallery":
                return {
                    color: "#F8F8FF", // Gallery white
                    frameColor: "#2F2F2F", // Elegant dark frame
                    label: "Art Gallery",
                    description: "Art Collection",
                    glowColor: "#E6E6FA",
                    isArched: false, // Modern rectangular
                };
            case "projects":
                return {
                    color: "#1E3A8A", // Tech blue
                    frameColor: "#00FFFF", // Cyan
                    label: "Software Projects",
                    glowColor: "#00BFFF",
                    isArched: false, // Sleek rectangular
                };
            case "about":
                return {
                    color: "#FF6B6B", // Warm coral
                    frameColor: "#FFB347", // Peach
                    label: "Play Place",
                    glowColor: "#FF69B4",
                    isArched: false, // Keep it simple
                };
            default:
                return {
                    color: "#8B4513",
                    frameColor: "#654321",
                    label: "UNKNOWN",
                    glowColor: "#FFFFFF",
                    isArched: false,
                };
        }
    };

    const theme = getRoomTheme(archway.targetRoomId);

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

        // Use entrance point if available, otherwise use archway position
        const entrancePosition = archway.entrancePoint?.position || [
            archway.position[0],
            3,
            archway.position[2],
        ];

        // Add 180-degree rotation to the entrance rotation
        const baseRotation = archway.entrancePoint?.rotation || [0, 0, 0];
        const entranceRotation = [
            baseRotation[0],
            baseRotation[1] + Math.PI, // 180 degrees
            baseRotation[2],
        ];

        console.log(`📍 Teleporting to:`, entrancePosition);
        console.log(`🔄 With 180° rotation:`, entranceRotation);

        teleportToRoom(
            archway.targetRoomId,
            entrancePosition as [number, number, number],
            entranceRotation as [number, number, number]
        );
    }, [archway, teleportToRoom, isMovingTowardDoor]);

    const handleDoorClick = () => {
        handleTeleport();
    };

    // Handle collision events
    const handleCollisionEnter = () => {
        if (!isTransitioning) {
            setIsInTrigger(true);
        }
    };

    const handleCollisionExit = (event: any) => {
        console.log(
            `🔴 COLLISION EXIT: Door ${archway.id} (${archway.targetRoomId}) - Green trigger area deactivated`,
            event
        );
        setIsInTrigger(false);
    };

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

    // Raycast from center of screen to detect door hover
    useFrame(() => {
        if (!doorMeshRef.current) return;

        // Cast ray from camera center
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObject(doorMeshRef.current, true); // Include children

        // Check if door is hit by raycast AND within interaction range
        const maxInteractionDistance = 6; // Maximum distance for door interaction
        const nowHovering =
            intersects.length > 0 &&
            intersects[0].distance <= maxInteractionDistance;

        if (nowHovering !== isHoveringFromCenter) {
            setIsHoveringFromCenter(nowHovering);

            // Dispatch custom event to UI with door interaction data
            window.dispatchEvent(
                new CustomEvent("doorHover", {
                    detail: {
                        hovering: nowHovering,
                        distance:
                            intersects.length > 0
                                ? intersects[0].distance
                                : Infinity,
                        // Pass door interaction data for UI click handling
                        doorData: nowHovering
                            ? {
                                  archway: archway,
                                  doorId: archway.id,
                                  targetRoomId: archway.targetRoomId,
                              }
                            : null,
                    },
                })
            );
        }
    });

    return (
        <group>
            {/* Themed Door - VISIBLE DOOR MESH */}
            <mesh
                ref={doorMeshRef as any}
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height / 2,
                    archway.position[2],
                ]}
                rotation={archway.rotation}
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

            <mesh
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height / 2,
                    archway.position[2],
                ]}
                rotation={archway.rotation}
                visible={true}
            >
                <boxGeometry
                    args={[archway.width * 2, archway.height * 1.5, 1]}
                />
                <meshBasicMaterial color="#ff00ff" transparent opacity={0} />
            </mesh>

            <RigidBody
                type="fixed"
                position={archway.position}
                rotation={archway.rotation}
                sensor
                collisionGroups={interactionGroups(1, [0])}
                onIntersectionEnter={handleCollisionEnter}
                onIntersectionExit={handleCollisionExit}
            >
                <CuboidCollider
                    args={[archway.width / 2, archway.height / 2, 1]}
                    sensor
                />
            </RigidBody>

            <mesh
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height / 2,
                    archway.position[2] - 0.08,
                ]}
                rotation={archway.rotation}
            >
                <boxGeometry
                    args={[archway.width + 0.4, archway.height + 0.4, 0.06]}
                />
                <meshStandardMaterial
                    color={theme.frameColor}
                    roughness={archway.targetRoomId === "projects" ? 0.1 : 0.8}
                    metalness={archway.targetRoomId === "projects" ? 0.9 : 0.2}
                />
            </mesh>

            <group
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height * 1.2,
                    archway.position[2] + 0.08,
                ]}
                rotation={archway.rotation}
            >
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
