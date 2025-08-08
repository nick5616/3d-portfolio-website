import React, { useMemo, useRef } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";
import { InteractiveObject } from "../core/InteractiveObject";

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

    return (
        <>
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
            <RigidBody
                type="fixed"
                colliders="cuboid"
                collisionGroups={interactionGroups(0, [0])}
            >
                <mesh position={[0, -0.1, 0]}>
                    <boxGeometry args={[width, 0.2, depth]} />
                    <meshStandardMaterial color="#444444" />
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
