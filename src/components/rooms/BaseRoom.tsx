import { useShallow } from "zustand/react/shallow";
import React, { useMemo, useRef } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";
import { InteractiveObject } from "../core/InteractiveObject";
import { RoomEnvironmentReady } from "../core/RoomEnvironmentReady";
import { useSceneStore } from "../../stores/sceneStore";
import { RoomRupeeSpawner } from "../models/RoomRupeeSpawner";

// Helper function to determine rupee count based on room
const getRupeeCountForRoom = (roomId: string): number => {
    switch (roomId) {
        case "atrium":
            return 2;
        case "gallery":
            return 4; // Art gallery, good for exploration
        case "projects":
            return 2;
        case "about":
            return 1;
        case "relaxation":
            return 2;
        case "achievements":
            return 2;
        default:
            return 6;
    }
};

type SpotConfig = NonNullable<RoomConfig["lightPreset"]["spots"]>[number];

// The spotlight owns its target as a child object. The previous version
// created a target with useEffect inside a .map() (a hooks-rules violation)
// and scene.add()-ed it without ever removing it, so every room visit left
// orphaned objects behind in the scene graph for every frame to traverse.
const ConfigSpotLight: React.FC<{ spot: SpotConfig; color: string }> = ({
    spot,
    color,
}) => {
    const target = useMemo(() => {
        const object = new THREE.Object3D();
        object.position.set(spot.target[0], spot.target[1], spot.target[2]);
        return object;
    }, [spot.target]);

    return (
        <>
            <primitive object={target} />
            <spotLight
                position={spot.position}
                target={target}
                intensity={spot.intensity}
                color={color}
                distance={spot.distance}
                decay={spot.decay}
                angle={spot.angle ?? Math.PI / 4}
                penumbra={spot.penumbra ?? 0.3}
            />
        </>
    );
};

interface BaseRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    renderWall: (wall: any) => JSX.Element;
    width: number;
    height: number;
    depth: number;
    children?: React.ReactNode;
}

export const BaseRoom: React.FC<BaseRoomProps> = ({
    config,
    materials,
    wallThickness,
    renderWall,
    width,
    height,
    depth,
    children,
}) => {
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const { galleryWhiteLightMode } = useSceneStore(
        useShallow((s) => ({ galleryWhiteLightMode: s.galleryWhiteLightMode }))
    );

    // Memoize wall configurations - skip shared walls to prevent z-fighting
    const wallConfigs = useMemo(() => {
        const walls = [
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
        ];

        return walls;
    }, [width, height, depth, config.id]);

    return (
        <>
            <RoomEnvironmentReady />

            {/* Lighting */}
            <ambientLight
                intensity={
                    config.galleryRoomKind && galleryWhiteLightMode
                        ? config.lightPreset.ambient.intensity * 2 // Double ambient for white light mode
                        : config.lightPreset.ambient.intensity * 0.5
                }
                color={config.lightPreset.ambient.color}
            />
            <directionalLight
                ref={directionalLightRef}
                position={config.lightPreset.directional.position}
                intensity={config.lightPreset.directional.intensity}
                color={config.lightPreset.directional.color}
            />

            {/* Spot lights from configuration */}
            {config.lightPreset.spots?.map((spot, index) => (
                <ConfigSpotLight
                    key={`spot-${index}`}
                    spot={spot}
                    color={
                        config.galleryRoomKind && galleryWhiteLightMode
                            ? "#ffffff" // White light for gallery white mode
                            : spot.color
                    }
                />
            ))}

            {/* Central point light for projects room */}

            {/* Floor */}
            <RigidBody
                type="fixed"
                colliders="cuboid"
                collisionGroups={interactionGroups(0, [0])}
            >
                <mesh position={[0, -0.05, 0]}>
                    <boxGeometry args={[width, 0.1, depth]} />
                    <primitive object={materials.floor} attach="material" />
                </mesh>
            </RigidBody>
            {/* Ceiling */}
            <RigidBody
                type="fixed"
                colliders="cuboid"
                collisionGroups={interactionGroups(0, [0])}
            >
                <mesh position={[0, height + 0.05, 0]}>
                    <boxGeometry args={[width, 0.1, depth]} />
                    <primitive object={materials.ceiling} attach="material" />
                </mesh>
            </RigidBody>
            {/* Walls */}
            {wallConfigs.map(renderWall)}

            {/* Room-specific elements */}
            {children}

            {/* Interactive elements */}
            {config.interactiveElements.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}

            {/* Rupee spawner - spawn rupees on the floor when entering room */}
            <RoomRupeeSpawner
                key={`rupee-spawner-${config.id}`}
                roomId={config.id}
                dimensions={[width, height, depth]}
                position={config.position}
                numRupees={getRupeeCountForRoom(config.id)}
                rupeeScale={0.3}
            />
        </>
    );
};
