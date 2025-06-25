import { useRef, useMemo, useEffect, useState } from "react";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { getRoomMaterials } from "../../configs/materials";
import { BaseRoom } from "../rooms/BaseRoom";
import { AtriumRoom } from "../rooms/AtriumRoom";
import { GalleryRoom } from "../rooms/GalleryRoom";
import { ProjectsRoom } from "../rooms/ProjectsRoom";
import { AboutRoom } from "../rooms/AboutRoom";
import { DefaultRoom } from "../rooms/DefaultRoom";
import { useSceneStore } from "../../stores/sceneStore";

interface RoomProps {
    config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const groupRef = useRef<THREE.Group>(null);
    const [width, height, depth] = config.dimensions;
    const wallThickness = 0.1;
    const doorWidth = 3;
    const doorHeight = 4;
    const materials = useMemo(() => getRoomMaterials(config.id), [config.id]);
    const { isTransitioning, performance } = useSceneStore();
    const [isLoaded, setIsLoaded] = useState(false);

    // Fade in effect when room loads
    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, [config.id]);

    // Cleanup materials when component unmounts
    useEffect(() => {
        return () => {
            // Dispose of materials to prevent memory leaks
            Object.values(materials).forEach((material) => {
                if (material && typeof material.dispose === 'function') {
                    material.dispose();
                }
            });
        };
    }, [materials]);

    // Performance optimization - reduce quality during transitions
    const shouldOptimize = isTransitioning || performance.quality === 'low';

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
                                receiveShadow={!shouldOptimize}
                                castShadow={!shouldOptimize}
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
                                receiveShadow={!shouldOptimize}
                                castShadow={!shouldOptimize}
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
                                receiveShadow={!shouldOptimize}
                                castShadow={!shouldOptimize}
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

            // No more overlap adjustments needed since rooms are separated
            const wallWidth = wall.isVertical ? depth : width;
            const wallPosition = wall.position.clone();

            return (
                <RigidBody type="fixed" colliders="cuboid" key={wall.id}>
                    <mesh 
                        position={wallPosition} 
                        rotation={wall.rotation}
                        receiveShadow={!shouldOptimize}
                        castShadow={!shouldOptimize}
                    >
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
            shouldOptimize,
        ]
    );

    // Determine which room component to render based on room type
    const renderRoomComponent = useMemo(() => {
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
    }, [config, materials, wallThickness, width, height, depth]);

    // Render room based on room type
    return (
        <group 
            ref={groupRef}
            position={config.position}
            visible={isLoaded}
        >
            {/* Adaptive lighting based on performance */}
            <ambientLight
                intensity={config.lightPreset.ambient.intensity * (shouldOptimize ? 1 : 0.5)}
                color={config.lightPreset.ambient.color}
            />
            <directionalLight
                ref={directionalLightRef}
                position={config.lightPreset.directional.position}
                intensity={config.lightPreset.directional.intensity}
                color={config.lightPreset.directional.color}
                castShadow={!shouldOptimize}
                shadow-mapSize={shouldOptimize ? [512, 512] : [1024, 1024]}
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
                <mesh 
                    rotation={[-Math.PI / 2, 0, 0]} 
                    receiveShadow={!shouldOptimize}
                >
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
            </RigidBody>
            {/* Ceiling */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    position={[0, height, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    receiveShadow={!shouldOptimize}
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
                {renderRoomComponent}
            </BaseRoom>
            
            {/* Only preload resources for the current room */}
            <Preload all />
        </group>
    );
};
