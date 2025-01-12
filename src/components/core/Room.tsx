// src/components/core/Room.tsx
import { useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Preload, SpotLight } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { RoomTransitionTrigger } from "./RoomTransitionTrigger";

interface RoomProps {
    config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const spotLightRefs = useRef<(THREE.SpotLight | null)[]>([]);

    // Helper function to create an archway mesh
    const Archway = useCallback(
        ({
            position,
            rotation,
            width,
            height,
        }: {
            position: [number, number, number];
            rotation: [number, number, number];
            width: number;
            height: number;
        }) => {
            const archDepth = 1;
            const archThickness = 0.3;

            return (
                <group position={position} rotation={rotation}>
                    {/* Left pillar */}
                    <mesh
                        position={[-width / 2, height / 2, 0]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry
                            args={[archThickness, height, archDepth]}
                        />
                        <meshStandardMaterial color="#4a4a4a" />
                    </mesh>

                    {/* Right pillar */}
                    <mesh
                        position={[width / 2, height / 2, 0]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry
                            args={[archThickness, height, archDepth]}
                        />
                        <meshStandardMaterial color="#4a4a4a" />
                    </mesh>

                    {/* Top arch */}
                    <mesh position={[0, height, 0]} castShadow receiveShadow>
                        <boxGeometry
                            args={[
                                width + archThickness,
                                archThickness,
                                archDepth,
                            ]}
                        />
                        <meshStandardMaterial color="#4a4a4a" />
                    </mesh>
                </group>
            );
        },
        []
    );

    return (
        <group position={config.position}>
            {/* Room lighting setup */}
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
                shadow-mapSize={[2048, 2048]}
            />
            {config.lightPreset.spots?.map((spot, index) => (
                <SpotLight
                    key={index}
                    ref={(el) => {
                        if (spotLightRefs.current) {
                            spotLightRefs.current[index] = el;
                        }
                    }}
                    position={spot.position}
                    angle={0.5}
                    penumbra={0.5}
                    intensity={spot.intensity}
                    color={spot.color}
                    castShadow
                    target-position={spot.target}
                />
            ))}

            {/* Room boundaries/collision */}
            <RigidBody type="fixed" colliders="cuboid">
                {/* Floor */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry
                        args={[config.dimensions[0], config.dimensions[2]]}
                    />
                    <meshStandardMaterial color="#444444" />
                </mesh>
            </RigidBody>

            {/* Walls */}
            <RigidBody type="fixed" colliders="cuboid">
                <group>
                    {/* Back wall */}
                    <mesh
                        position={[
                            0,
                            config.dimensions[1] / 2,
                            -config.dimensions[2] / 2,
                        ]}
                        receiveShadow
                    >
                        <boxGeometry
                            args={[
                                config.dimensions[0],
                                config.dimensions[1],
                                0.5,
                            ]}
                        />
                        <meshStandardMaterial color="#666666" />
                    </mesh>
                    {/* Left wall */}
                    <mesh
                        position={[
                            -config.dimensions[0] / 2,
                            config.dimensions[1] / 2,
                            0,
                        ]}
                        rotation={[0, Math.PI / 2, 0]}
                        receiveShadow
                    >
                        <boxGeometry
                            args={[
                                config.dimensions[2],
                                config.dimensions[1],
                                0.5,
                            ]}
                        />
                        <meshStandardMaterial color="#666666" />
                    </mesh>
                    {/* Right wall */}
                    <mesh
                        position={[
                            config.dimensions[0] / 2,
                            config.dimensions[1] / 2,
                            0,
                        ]}
                        rotation={[0, -Math.PI / 2, 0]}
                        receiveShadow
                    >
                        <boxGeometry
                            args={[
                                config.dimensions[2],
                                config.dimensions[1],
                                0.5,
                            ]}
                        />
                        <meshStandardMaterial color="#666666" />
                    </mesh>
                </group>
            </RigidBody>

            {/* Interactive elements */}
            {config.interactiveElements.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}

            {/* Archways */}
            {config.archways.map((archway) => (
                <group key={archway.id}>
                    {/* Visual archway */}
                    <Archway
                        position={archway.position}
                        rotation={archway.rotation}
                        width={archway.width}
                        height={archway.height}
                    />
                    {/* Transition trigger */}
                    <RoomTransitionTrigger archway={archway} />
                </group>
            ))}

            {/* Preload assets */}
            <Preload all />
        </group>
    );
};
