import { useMemo } from "react";
import { Preload } from "@react-three/drei";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import { getEnhancedRoomMaterials } from "../../configs/enhancedMaterials";
import { BaseRoom } from "../rooms/BaseRoom";
import { AtriumRoom } from "../rooms/AtriumRoom";
import { GalleryRoom } from "../rooms/GalleryRoom";
import { ProjectsRoom } from "../rooms/ProjectsRoom";
import { AboutRoom } from "../rooms/AboutRoom";
import { DefaultRoom } from "../rooms/DefaultRoom";
import { RoomEnvironmentReady } from "./RoomEnvironmentReady";

interface RoomProps {
    config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const [width, height, depth] = config.dimensions;
    const wallThickness = 0.5;
    const materials = getEnhancedRoomMaterials(config.id);

    // Simple wall rendering - just render solid walls
    const renderWall = useMemo(
        () => (wall: any) => {
            // Calculate correct wall dimensions based on orientation
            const wallDimensions: [number, number, number] = wall.isVertical
                ? [depth, height, wallThickness] // East/West walls use depth
                : [width, height, wallThickness]; // North/South walls use width

            return (
                <RigidBody
                    type="fixed"
                    colliders="cuboid"
                    key={wall.id}
                    collisionGroups={interactionGroups(0, [0])}
                >
                    <mesh position={wall.position} rotation={wall.rotation}>
                        <boxGeometry args={wallDimensions} />
                        <primitive object={materials.walls} attach="material" />
                    </mesh>
                </RigidBody>
            );
        },
        [width, height, depth, wallThickness, materials.walls]
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
            case "projects":
                return (
                    <ProjectsRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        width={width}
                        height={height}
                        depth={depth}
                    />
                );
            case "about":
                return (
                    <AboutRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        width={8}
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

    // Render room based on room type - always at origin since we only render current room
    return (
        <group position={[0, 0, 0]}>
            {config.id === "about" ? (
                // About room (holodeck) handles its own walls and environment
                <>
                    <RoomEnvironmentReady />

                    {/* Floor collision for about room - covers entire 8x8 room */}
                    <RigidBody type="fixed" colliders="cuboid">
                        <mesh position={[0, -0.25, 0]}>
                            <boxGeometry args={[8, 0.5, 8]} />
                            <primitive
                                object={materials.floor}
                                attach="material"
                            />
                        </mesh>
                    </RigidBody>
                    {renderRoomComponent()}
                </>
            ) : (
                // All other rooms use BaseRoom
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
            )}
            <Preload all />
        </group>
    );
};
