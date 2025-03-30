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
                    return archPos.distanceTo(wallPos) < 1.5; // Increased detection radius
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

            // Adjust wall dimensions to prevent overlap with adjacent rooms
            let wallWidth = wall.isVertical ? depth : width;
            let wallPosition = wall.position.clone();

            // If this is the atrium room and the wall is the east wall (facing about room)
            if (config.id === "atrium" && wall.id === "east") {
                // Adjust the wall to start after the projects room
                const projectsRoomDepth = 20; // From roomConfigs
                wallWidth = (width - projectsRoomDepth) / 2;
                wallPosition.x = width / 2 - wallWidth / 2 - 0.01;
            }

            // If this is the atrium room and the wall is the north wall (back wall)
            if (config.id === "atrium" && wall.id === "north") {
                // Create a recessed area by moving the wall closer
                wallWidth = width * 0.7; // Make the wall 70% of the room width
                wallPosition.z = -depth / 2 + 5; // Move it 5 units forward from the back wall
                return (
                    <group
                        key={wall.id}
                        position={wallPosition}
                        rotation={wall.rotation}
                    >
                        {/* Light wall */}
                        <RigidBody type="fixed" colliders="cuboid">
                            <mesh>
                                <boxGeometry
                                    args={[wallWidth, height, wallThickness]}
                                />
                                <meshStandardMaterial
                                    color="#ffffff"
                                    emissive="#ffffff"
                                    emissiveIntensity={0.5}
                                    transparent
                                    opacity={0.8}
                                />
                            </mesh>
                        </RigidBody>
                        {/* Water plane */}
                        <mesh position={[0, 0.1, 0.02]}>
                            <planeGeometry args={[wallWidth, 2]} />
                            <meshStandardMaterial
                                color="#0077ff"
                                transparent
                                opacity={0.6}
                                metalness={0.8}
                                roughness={0.2}
                            />
                        </mesh>
                    </group>
                );
            }

            // If this is the atrium room and the wall is the south wall (facing projects room)
            if (config.id === "atrium" && wall.id === "south") {
                // Adjust the wall to not overlap with the projects room
                wallWidth = width / 2;
                wallPosition.z = depth / 2 - wallWidth / 2 - 0.01;
            }

            return (
                <RigidBody type="fixed" colliders="cuboid" key={wall.id}>
                    <mesh position={wallPosition} rotation={wall.rotation}>
                        <boxGeometry
                            args={[wallWidth, height, wallThickness]}
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
            config.id,
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
            {/* Ceiling */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    position={[0, height, 0]}
                    rotation={[0, 0, 0]}
                    receiveShadow
                >
                    <boxGeometry args={[width, wallThickness, depth]} />
                    <primitive object={materials.ceiling} attach="material" />
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
