import React, { useMemo, useRef, useEffect } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { InteractiveObject } from "../core/InteractiveObject";
import { RoomEnvironmentReady } from "../core/RoomEnvironmentReady";
import { useSceneStore } from "../../stores/sceneStore";

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
    const { scene } = useThree();
    const { galleryWhiteLightMode } = useSceneStore();

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
                    config.id === "gallery" && galleryWhiteLightMode
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
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0001}
            />

            {/* Spot lights from configuration */}
            {config.lightPreset.spots?.map((spot, index) => {
                const spotLightRef = useRef<THREE.SpotLight>(null);

                useEffect(() => {
                    if (spotLightRef.current) {
                        const target = new THREE.Object3D();
                        target.position.set(
                            spot.target[0],
                            spot.target[1],
                            spot.target[2]
                        );
                        spotLightRef.current.target = target;
                        scene.add(target); // Add target to scene as required by Three.js
                    }
                }, [spot.target, scene]);

                return (
                    <spotLight
                        ref={spotLightRef}
                        key={`spot-${index}`}
                        position={spot.position}
                        intensity={spot.intensity}
                        color={
                            config.id === "gallery" && galleryWhiteLightMode
                                ? "#ffffff" // White light for gallery white mode
                                : spot.color
                        }
                        shadow-mapSize={[512, 512]}
                        shadow-bias={-0.0001}
                        distance={spot.distance}
                        decay={spot.decay}
                        angle={spot.angle ?? Math.PI / 4}
                        penumbra={spot.penumbra ?? 0.3}
                    />
                );
            })}

            {/* Central point light for projects room */}

            {/* Floor */}
            <RigidBody
                type="fixed"
                colliders="cuboid"
                collisionGroups={interactionGroups(0, [0])}
            >
                <mesh position={[0, -0.1, 0]}>
                    <boxGeometry args={[width, 0.2, depth]} />
                    <primitive object={materials.floor} attach="material" />
                </mesh>
            </RigidBody>
            {/* Ceiling */}
            <RigidBody
                type="fixed"
                colliders="cuboid"
                collisionGroups={interactionGroups(0, [0])}
            >
                <mesh position={[0, height + 0.1, 0]}>
                    <boxGeometry args={[width, 0.2, depth]} />
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
        </>
    );
};
