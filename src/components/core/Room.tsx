import { useRef, useMemo } from "react";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { getRoomMaterials } from "../../configs/materials";
import { BaseRoom } from "../rooms/BaseRoom";
import { AtriumRoom } from "../rooms/AtriumRoom";
import { GalleryRoom } from "../rooms/GalleryRoom";
import { DefaultRoom } from "../rooms/DefaultRoom";

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
        () => (wall: any) => {
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

            if (config.id === "atrium" && wall.id === "north") {
                // Create a divider wall that's visible but not in the player's way
                wallWidth = width; // Keep the full width
                wallPosition.z = depth / 2 - wallWidth / 2 + 5; // Original position
            }

            if (config.id === "atrium" && wall.id === "south") {
                // Adjust the wall to not overlap with the projects room
                wallWidth = width / 2;
                wallPosition.z = depth / 2 - wallWidth / 2 + 3.5;
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

    // Determine which room component to render based on room type
    const renderRoomComponent = () => {
        switch (config.id) {
            case "atrium":
                return (
                    <AtriumRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        width={width}
                        height={height}
                        depth={depth}
                    />
                );
            case "gallery":
                return (
                    <GalleryRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        width={width}
                        height={height}
                        depth={depth}
                    />
                );
            default:
                return (
                    <DefaultRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        width={width}
                        height={height}
                        depth={depth}
                    />
                );
        }
    };

    // Render room based on room type
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
            <RigidBody type="fixed" colliders="cuboid">
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
            </RigidBody>
            {/* Ceiling */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    position={[0, height, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    receiveShadow
                >
                    <planeGeometry args={[width, depth]} />
                    <primitive object={materials.ceiling} attach="material" />
                </mesh>
            </RigidBody>
            {/* Walls */}
            <BaseRoom
                config={config}
                materials={materials}
                wallThickness={wallThickness}
                renderWall={renderWall}
                width={width}
                height={height}
                depth={depth}
            >
                {renderRoomComponent()}
            </BaseRoom>
            <Preload all />
        </group>
    );
};
