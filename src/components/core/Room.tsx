// src/components/core/Room.tsx
import { useRef, useMemo } from "react";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { useSceneStore } from "../../stores/sceneStore";
import { getRoomMaterials } from "../../configs/materials";

interface RoomProps {
    config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const [width, height, depth] = config.dimensions;
    const wallThickness = 0.1;
    const doorWidth = 3;
    const doorHeight = 4;
    const materials = getRoomMaterials(config.id);

    // Memoize wall configurations
    const wallConfigs = useMemo(
        () => [
            {
                id: "north",
                position: new THREE.Vector3(0, height / 2, -depth / 2 + 0.01),
                rotation: new THREE.Euler(0, 0, 0),
                isVertical: false,
            },
            {
                id: "south",
                position: new THREE.Vector3(0, height / 2, depth / 2 - 0.01),
                rotation: new THREE.Euler(0, 0, 0),
                isVertical: false,
            },
            {
                id: "east",
                position: new THREE.Vector3(width / 2 - 0.01, height / 2, 0),
                rotation: new THREE.Euler(0, Math.PI / 2, 0),
                isVertical: true,
            },
            {
                id: "west",
                position: new THREE.Vector3(-width / 2 + 0.01, height / 2, 0),
                rotation: new THREE.Euler(0, Math.PI / 2, 0),
                isVertical: true,
            },
        ],
        [width, height, depth]
    );

    // Memoize archway check function
    const hasArchwayAtPosition = useMemo(() => {
        return (pos: THREE.Vector3) => {
            return (
                config.archways?.some((arch) => {
                    const archPos = new THREE.Vector2(
                        arch.position[0],
                        arch.position[2]
                    );
                    const wallPos = new THREE.Vector2(pos.x, pos.z);
                    return archPos.distanceTo(wallPos) < 1;
                }) ?? false
            );
        };
    }, [config.archways]);

    // Memoize wall rendering function
    const renderWall = useMemo(
        () => (wall: (typeof wallConfigs)[0]) => {
            if (hasArchwayAtPosition(wall.position)) {
                const sideWidth =
                    (wall.isVertical ? depth : width - doorWidth) / 2;
                return (
                    <group
                        key={wall.id}
                        position={wall.position}
                        rotation={wall.rotation}
                    >
                        {/* Left segment */}
                        <RigidBody type="fixed" colliders="cuboid">
                            <mesh
                                position={[
                                    -sideWidth / 2 - doorWidth / 2,
                                    0,
                                    -wallThickness / 2,
                                ]}
                            >
                                <boxGeometry
                                    args={[sideWidth, height, wallThickness]}
                                />
                                <primitive
                                    object={materials.walls}
                                    attach="material"
                                />
                            </mesh>
                        </RigidBody>

                        {/* Right segment */}
                        <RigidBody type="fixed" colliders="cuboid">
                            <mesh
                                position={[
                                    sideWidth / 2 + doorWidth / 2,
                                    0,
                                    -wallThickness / 2,
                                ]}
                            >
                                <boxGeometry
                                    args={[sideWidth, height, wallThickness]}
                                />
                                <primitive
                                    object={materials.walls}
                                    attach="material"
                                />
                            </mesh>
                        </RigidBody>

                        {/* Top segment */}
                        <RigidBody type="fixed" colliders="cuboid">
                            <mesh
                                position={[
                                    0,
                                    height / 2 - doorHeight / 2,
                                    -wallThickness / 2,
                                ]}
                            >
                                <boxGeometry
                                    args={[
                                        doorWidth,
                                        height - doorHeight,
                                        wallThickness,
                                    ]}
                                />
                                <primitive
                                    object={materials.walls}
                                    attach="material"
                                />
                            </mesh>
                        </RigidBody>
                    </group>
                );
            }

            return (
                <RigidBody type="fixed" colliders="cuboid" key={wall.id}>
                    <mesh position={wall.position} rotation={wall.rotation}>
                        <boxGeometry
                            args={[
                                wall.isVertical ? depth : width,
                                height,
                                wallThickness,
                            ]}
                        />
                        <primitive object={materials.walls} attach="material" />
                    </mesh>
                </RigidBody>
            );
        },
        [
            width,
            height,
            depth,
            doorWidth,
            doorHeight,
            wallThickness,
            materials.walls,
            hasArchwayAtPosition,
        ]
    );

    return (
        <group position={config.position}>
            {/* Lighting */}
            <ambientLight
                intensity={config.lightPreset.ambient.intensity * 0.5}
                color={config.lightPreset.ambient.color}
            />
            <directionalLight
                ref={directionalLightRef}
                position={config.lightPreset.directional.position}
                intensity={config.lightPreset.directional.intensity}
                color={config.lightPreset.directional.color}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0001}
            />
            {/* Single corner light for depth */}
            <pointLight
                position={[0, height / 2, 0]}
                intensity={0.3}
                distance={Math.max(width, depth)}
                decay={1.5}
            />
            {/* Floor */}
            <RigidBody type="fixed">
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
            </RigidBody>
            {/* Walls */}
            {wallConfigs.map(renderWall)}
            {/* Gallery dividers */}
            {config.id === "gallery" && (
                <>
                    {/* Vertical dividers */}
                    <RigidBody type="fixed" colliders="cuboid">
                        <mesh
                            position={
                                new THREE.Vector3(-width / 4, height / 2, 0)
                            }
                        >
                            <boxGeometry
                                args={[wallThickness, height, depth * 0.6]}
                            />
                            <primitive
                                object={materials.dividers || materials.walls}
                                attach="material"
                            />
                        </mesh>
                    </RigidBody>
                    <RigidBody type="fixed" colliders="cuboid">
                        <mesh
                            position={
                                new THREE.Vector3(width / 4, height / 2, 0)
                            }
                        >
                            <boxGeometry
                                args={[wallThickness, height, depth * 0.6]}
                            />
                            <primitive
                                object={materials.dividers || materials.walls}
                                attach="material"
                            />
                        </mesh>
                    </RigidBody>
                    {/* Horizontal connector */}
                    <RigidBody type="fixed" colliders="cuboid">
                        <mesh position={new THREE.Vector3(0, height / 2, 0)}>
                            <boxGeometry
                                args={[width / 2, height, wallThickness]}
                            />
                            <primitive
                                object={materials.dividers || materials.walls}
                                attach="material"
                            />
                        </mesh>
                    </RigidBody>
                </>
            )}
            {/* Interactive elements */}
            {config.interactiveElements.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}
            <Preload all />
        </group>
    );
};
