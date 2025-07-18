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
    const { teleportToRoom } = useSceneStore();
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
                    label: "ATRIUM",
                    icon: "⚱️",
                    description: "Central Hub",
                    glowColor: "#FFD700",
                    isArched: false, // Keep it simple
                };
            case "gallery":
                return {
                    color: "#F8F8FF", // Gallery white
                    frameColor: "#2F2F2F", // Elegant dark frame
                    label: "GALLERY",
                    icon: "🎨",
                    description: "Art Collection",
                    glowColor: "#E6E6FA",
                    isArched: false, // Modern rectangular
                };
            case "projects":
                return {
                    color: "#1E3A8A", // Tech blue
                    frameColor: "#00FFFF", // Cyan
                    label: "PROJECTS",
                    icon: "💻",
                    description: "Software Portfolio",
                    glowColor: "#00BFFF",
                    isArched: false, // Sleek rectangular
                };
            case "about":
                return {
                    color: "#FF6B6B", // Warm coral
                    frameColor: "#FFB347", // Peach
                    label: "ABOUT",
                    icon: "👨‍💻",
                    description: "Personal Info",
                    glowColor: "#FF69B4",
                    isArched: false, // Keep it simple
                };
            default:
                return {
                    color: "#8B4513",
                    frameColor: "#654321",
                    label: "UNKNOWN",
                    icon: "🚪",
                    description: "Room",
                    glowColor: "#FFFFFF",
                    isArched: false,
                };
        }
    };

    const theme = getRoomTheme(archway.targetRoomId);

    const handleTeleport = useCallback(
        (source: "click" | "collision") => {
            console.log(
                `🚪 Door ${source}: ${archway.id} -> ${archway.targetRoomId}`
            );

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
        },
        [archway, teleportToRoom]
    );

    const handleDoorClick = () => {
        handleTeleport("click");
    };

    // Handle collision events
    const handleCollisionEnter = () => {
        if (!isTransitioning) {
            setIsInTrigger(true);
        }
    };

    const handleCollisionExit = () => {
        setIsInTrigger(false);
    };

    useEffect(() => {
        if (!isInTrigger || isTransitioning) return;

        const now = Date.now();
        if (now - lastTransitionTime.current < 1000) return;

        lastTransitionTime.current = now;
        setIsTransitioning(true);

        // Short delay for smooth transition
        setTimeout(() => {
            handleTeleport("collision");
            setIsTransitioning(false);
        }, 100);
    }, [isInTrigger, isTransitioning, handleTeleport]);

    // Listen for UI click events
    useEffect(() => {
        const handleUIClick = (event: CustomEvent) => {
            if (event.detail.doorId === archway.id) {
                console.log(`🖱️ UI Click received for door: ${archway.id}`);
                handleTeleport("click");
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
            {/* Themed Door */}
            {theme.isArched ? (
                // Arched door for classical/artistic rooms
                <group
                    ref={doorMeshRef as any}
                    position={[
                        archway.position[0],
                        archway.position[1],
                        archway.position[2],
                    ]}
                    rotation={archway.rotation}
                    onClick={handleDoorClick}
                    onPointerOver={(e) =>
                        (document.body.style.cursor = "pointer")
                    }
                    onPointerOut={(e) =>
                        (document.body.style.cursor = "default")
                    }
                >
                    {/* Main door rectangle */}
                    <mesh
                        position={[0, archway.height * 0.4, 0]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry
                            args={[archway.width, archway.height * 0.8, 0.15]}
                        />
                        <meshStandardMaterial
                            color={
                                isHoveringFromCenter
                                    ? theme.glowColor
                                    : theme.color
                            }
                            roughness={0.6}
                            metalness={0.1}
                            emissive={
                                isHoveringFromCenter
                                    ? theme.glowColor
                                    : "#000000"
                            }
                            emissiveIntensity={isHoveringFromCenter ? 0.2 : 0}
                        />
                    </mesh>
                    {/* Arch top */}
                    <mesh
                        position={[0, archway.height * 0.85, 0]}
                        rotation={[Math.PI / 2, 0, 0]} // Rotate 90 degrees around X to face upward
                        castShadow
                        receiveShadow
                    >
                        <cylinderGeometry
                            args={[
                                archway.width / 2,
                                archway.width / 2,
                                0.15,
                                16,
                                1,
                                false,
                                -Math.PI / 2,
                                Math.PI,
                            ]}
                        />
                        <meshStandardMaterial
                            color={
                                isHoveringFromCenter
                                    ? theme.glowColor
                                    : theme.color
                            }
                            roughness={0.6}
                            metalness={0.1}
                            emissive={
                                isHoveringFromCenter
                                    ? theme.glowColor
                                    : "#000000"
                            }
                            emissiveIntensity={isHoveringFromCenter ? 0.2 : 0}
                        />
                    </mesh>
                </group>
            ) : (
                // Rectangular door for modern rooms
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
                    onPointerOver={(e) =>
                        (document.body.style.cursor = "pointer")
                    }
                    onPointerOut={(e) =>
                        (document.body.style.cursor = "default")
                    }
                >
                    <boxGeometry args={[archway.width, archway.height, 0.15]} />
                    <meshStandardMaterial
                        color={
                            isHoveringFromCenter ? theme.glowColor : theme.color
                        }
                        roughness={
                            archway.targetRoomId === "projects" ? 0.1 : 0.6
                        }
                        metalness={
                            archway.targetRoomId === "projects" ? 0.8 : 0.1
                        }
                        emissive={
                            isHoveringFromCenter ? theme.glowColor : "#000000"
                        }
                        emissiveIntensity={isHoveringFromCenter ? 0.2 : 0}
                    />
                </mesh>
            )}

            {/* Invisible larger mesh for easier clicking/interaction */}
            <mesh
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height / 2,
                    archway.position[2],
                ]}
                rotation={archway.rotation}
                visible={false}
            >
                <boxGeometry
                    args={[archway.width * 2, archway.height * 1.5, 1]}
                />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Collision trigger for walking into door */}
            <RigidBody
                type="fixed"
                position={archway.position}
                rotation={archway.rotation}
                sensor
                collisionGroups={interactionGroups(1, [0])}
                onCollisionEnter={handleCollisionEnter}
                onCollisionExit={handleCollisionExit}
            >
                <CuboidCollider
                    args={[archway.width / 2, archway.height / 2, 0.5]}
                    sensor
                />
            </RigidBody>

            {/* Themed Door Frame */}
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

            {/* Room Label */}
            <group
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height * 0.85,
                    archway.position[2] + 0.08,
                ]}
                rotation={archway.rotation}
            >
                {/* Label Background */}
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[2.2, 0.6]} />
                    <meshStandardMaterial
                        color={theme.frameColor}
                        transparent
                        opacity={0.9}
                    />
                </mesh>

                {/* Room Label Text */}
                <Text
                    position={[0, 0, 0.01]}
                    fontSize={0.25}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={2}
                    fontWeight="bold"
                >
                    {theme.icon} {theme.label}
                </Text>
            </group>

            {/* Room Description Label */}
            <group
                position={[
                    archway.position[0],
                    archway.position[1] + archway.height * 0.15,
                    archway.position[2] + 0.08,
                ]}
                rotation={archway.rotation}
            >
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[2.4, 0.4]} />
                    <meshStandardMaterial
                        color="black"
                        transparent
                        opacity={0.7}
                    />
                </mesh>

                {/* Description Text */}
                <Text
                    position={[0, 0, 0.01]}
                    fontSize={0.15}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={2.2}
                >
                    {theme.description}
                </Text>
            </group>

            {/* Door Handle */}
            <mesh
                position={[
                    archway.position[0] + archway.width * 0.35,
                    archway.position[1] + archway.height / 2,
                    archway.position[2] + 0.08,
                ]}
                rotation={archway.rotation}
            >
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial
                    color={theme.frameColor}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>
        </group>
    );
};
