// Simplified Room.tsx
import { useRef } from "react";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { useSceneStore } from "../../stores/sceneStore";

interface RoomProps {
    config: RoomConfig;
}

// Updated Room.tsx
export const Room: React.FC<RoomProps> = ({ config }) => {
    const spotlightsEnabled = useSceneStore((state) => state.spotlightsEnabled);
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const [width, height, depth] = config.dimensions;
    const wallThickness = 0.1;
    const doorWidth = 3;
    const doorHeight = 4;
    const isAtrium = config.id === "atrium";

    const shouldSkipWall = (wallPosition: [number, number, number]) => {
        // Only skip walls in non-atrium rooms
        if (isAtrium) return false;

        return (
            config.archways?.some((arch) => {
                // If this wall has an archway to the atrium, skip creating it
                if (arch.targetRoomId === "atrium") {
                    const archPos = new THREE.Vector2(
                        arch.position[0],
                        arch.position[2]
                    );
                    const wallPos = new THREE.Vector2(
                        wallPosition[0],
                        wallPosition[2]
                    );
                    const distance = archPos.distanceTo(wallPos);
                    return distance < 1;
                }
                return false;
            }) ?? false
        );
    };

    const shouldSegmentWall = (wallPosition: [number, number, number]) => {
        if (!isAtrium) return false;

        return (
            config.archways?.some((arch) => {
                const archPos = new THREE.Vector2(
                    arch.position[0],
                    arch.position[2]
                );
                const wallPos = new THREE.Vector2(
                    wallPosition[0],
                    wallPosition[2]
                );
                const distance = archPos.distanceTo(wallPos);
                return distance < 1;
            }) ?? false
        );
    };

    // Modified wall mapping section

    return (
        <group position={config.position}>
            {/* Lighting */}
            <ambientLight
                intensity={config.lightPreset.ambient.intensity}
                color={config.lightPreset.ambient.color}
            />
            <directionalLight
                ref={directionalLightRef}
                position={config.lightPreset.directional.position}
                intensity={config.lightPreset.directional.intensity}
                color={config.lightPreset.directional.color}
                castShadow
            />
            {/* Floor */}
            <RigidBody type="fixed">
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
            </RigidBody>
            {[
                {
                    id: "north",
                    position: new THREE.Vector3(0, height / 2, -depth / 2),
                    rotation: [0, 0, 0] as [number, number, number],
                    isVertical: false,
                },
                {
                    id: "south",
                    position: new THREE.Vector3(0, height / 2, depth / 2),
                    rotation: [0, 0, 0] as [number, number, number],
                    isVertical: false,
                },
                {
                    id: "east",
                    position: new THREE.Vector3(width / 2, height / 2, 0),
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                    isVertical: true,
                },
                {
                    id: "west",
                    position: new THREE.Vector3(-width / 2, height / 2, 0),
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                    isVertical: true,
                },
            ].map((wall) => {
                // Skip this wall if it connects to the atrium
                if (
                    shouldSkipWall(
                        wall.position.toArray() as [number, number, number]
                    )
                ) {
                    return null;
                }

                // Check if this wall should be segmented (only in atrium)
                if (
                    isAtrium &&
                    shouldSegmentWall(
                        wall.position.toArray() as [number, number, number]
                    )
                ) {
                    const sideWidth =
                        (wall.isVertical ? depth : width - doorWidth) / 2;
                    const leftPosition = new THREE.Vector3(
                        -width / 4 - doorWidth / 4,
                        0,
                        0
                    );
                    const rightPosition = new THREE.Vector3(
                        width / 4 + doorWidth / 4,
                        0,
                        0
                    );
                    const topPosition = new THREE.Vector3(
                        0,
                        height / 2 - doorHeight / 2,
                        0
                    );

                    return (
                        <group
                            key={wall.id}
                            position={wall.position}
                            rotation={wall.rotation}
                        >
                            {/* Left segment with collider */}
                            <RigidBody type="fixed" colliders="cuboid">
                                <mesh position={leftPosition}>
                                    <boxGeometry
                                        args={[
                                            sideWidth,
                                            height,
                                            wallThickness,
                                        ]}
                                    />
                                    <meshStandardMaterial
                                        color="#ff0000"
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                            </RigidBody>

                            {/* Right segment with collider */}
                            <RigidBody type="fixed" colliders="cuboid">
                                <mesh position={rightPosition}>
                                    <boxGeometry
                                        args={[
                                            sideWidth,
                                            height,
                                            wallThickness,
                                        ]}
                                    />
                                    <meshStandardMaterial
                                        color="#00ff00"
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                            </RigidBody>

                            {/* Top segment with collider */}
                            <RigidBody type="fixed" colliders="cuboid">
                                <mesh position={topPosition}>
                                    <boxGeometry
                                        args={[
                                            doorWidth,
                                            height - doorHeight,
                                            wallThickness,
                                        ]}
                                    />
                                    <meshStandardMaterial
                                        color="#0000ff"
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                            </RigidBody>
                        </group>
                    );
                } else {
                    // Regular wall with collider
                    return (
                        <RigidBody type="fixed" colliders="cuboid">
                            <mesh
                                key={wall.id}
                                position={wall.position}
                                rotation={wall.rotation}
                            >
                                <boxGeometry
                                    args={[
                                        wall.isVertical ? depth : width,
                                        height,
                                        wallThickness,
                                    ]}
                                />
                                <meshStandardMaterial
                                    color="#666666"
                                    side={THREE.DoubleSide}
                                />
                            </mesh>
                        </RigidBody>
                    );
                }
            })}
            {/* Interactive elements */}
            {config.interactiveElements.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}
            <Preload all />
        </group>
    );
};
