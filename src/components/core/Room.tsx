import { Suspense, useMemo } from "react";
import { Preload } from "@react-three/drei";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import { getEnhancedRoomMaterials } from "../../configs/enhancedMaterials";
import { BaseRoom } from "../rooms/BaseRoom";
import { AtriumRoom } from "../rooms/AtriumRoom";
import { ProjectsRoom } from "../rooms/ProjectsRoom";
import { RelaxationRoom } from "../rooms/RelaxationRoom";
import { GalleryAtriumRoom } from "../rooms/GalleryAtriumRoom";
import { GalleryHallRoom } from "../rooms/GalleryHallRoom";
import { SketchbookRotunda } from "../rooms/SketchbookRotunda";
import { AchievementsRoom } from "../rooms/AchievementsRoom";
import { CUSTOM_ROOMS } from "../rooms/customRooms";
import { RoomEnvironmentReady } from "./RoomEnvironmentReady";

interface RoomProps {
    config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const [width, height, depth] = config.dimensions;
    const wallThickness = 0.1; // Reduced thickness for better performance
    // Every room in the gallery wing (atrium + every hall) shares the same
    // white-walls/marble-floor/ornate-ceiling look, regardless of its own id.
    const materialsKey = config.galleryRoomKind ? "gallery" : config.id;
    // getEnhancedRoomMaterials() allocates a brand new THREE.MeshStandardMaterial
    // for walls on every call (it's not cached like the PBR textures are), so
    // without memoizing here, every unrelated re-render of this component
    // (e.g. from frequent store updates elsewhere in the tree) was silently
    // reallocating + reassigning wall materials and forcing shader recompiles -
    // the actual source of the "lag while walking" reports, not just texture size.
    const materials = useMemo(
        () => getEnhancedRoomMaterials(materialsKey),
        [materialsKey]
    );

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

    const CustomRoom = CUSTOM_ROOMS[config.id];

    // Determine which room component to render based on room type
    const renderRoomComponent = () => {
        // Gallery wing rooms (lobby/atrium/halls) dispatch off galleryRoomKind
        // rather than a hardcoded id, since there are many hall ids sharing
        // the same generic hall component.
        if (config.galleryRoomKind) {
            switch (config.galleryRoomKind.kind) {
                case "atrium":
                    return (
                        <GalleryAtriumRoom
                            config={config}
                            materials={materials}
                            wallThickness={wallThickness}
                            width={width}
                            height={height}
                            depth={depth}
                        />
                    );
                case "sketchbook":
                    return (
                        <SketchbookRotunda
                            config={config}
                            width={width}
                            height={height}
                        />
                    );
                case "hall":
                    return (
                        <GalleryHallRoom
                            config={config}
                            materials={materials}
                            wallThickness={wallThickness}
                            width={width}
                            height={height}
                            depth={depth}
                        />
                    );
            }
        }

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
            case "relaxation":
                return (
                    <RelaxationRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        width={width}
                        height={height}
                        depth={depth}
                    />
                );
            case "achievements":
                return (
                    <AchievementsRoom
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
                    <BaseRoom
                        config={config}
                        materials={materials}
                        wallThickness={wallThickness}
                        renderWall={renderWall}
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
            {CustomRoom ? (
                // Rooms that build their own floors, walls and lights (and
                // signal readiness themselves), loaded on first visit.
                <Suspense fallback={null}>
                    <CustomRoom />
                </Suspense>
            ) : config.galleryRoomKind?.kind === "sketchbook" ||
              config.id === "atrium" ? (
                // The sketchbook rotunda and the atrium build their own
                // walls, floors, domes and lights (and signal readiness
                // themselves).
                renderRoomComponent()
            ) : config.id === "relaxation" ||
              config.galleryRoomKind?.kind === "atrium" ? (
                // Relaxation room and the gallery atrium hub handle their own
                // cylindrical walls, bypassing BaseRoom's rectangular walls
                <>
                    <RoomEnvironmentReady />
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
