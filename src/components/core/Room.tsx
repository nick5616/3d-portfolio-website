// src/components/core/Room.tsx
import { useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Preload, SpotLight } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { RoomTransitionTrigger } from "./RoomTransitionTrigger";
import { useSceneStore } from "../../stores/sceneStore";

interface RoomProps {
    config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const spotlightsEnabled = useSceneStore((state) => state.spotlightsEnabled);
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const spotLightRefs = useRef<(THREE.SpotLight | null)[]>([]);

    return (
        <group position={config.position}>
            {/* Base lighting - always on */}
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

            {/* Optional spotlight lighting */}
            {spotlightsEnabled &&
                config.lightPreset.spots?.map((spot, index) => (
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
                        intensity={spot.intensity * 0.75} // Reduced intensity to blend better with ambient
                        color={spot.color}
                        castShadow
                        target-position={spot.target}
                        distance={15}
                        decay={2}
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

                {/* Walls */}
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

                    {/* Front wall */}
                    <mesh
                        position={[
                            0,
                            config.dimensions[1] / 2,
                            config.dimensions[2] / 2,
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
                    {/* Archway visual */}
                    <group
                        position={archway.position}
                        rotation={archway.rotation}
                    >
                        {/* Left pillar */}
                        <mesh
                            position={[
                                -archway.width / 2,
                                archway.height / 2,
                                0,
                            ]}
                        >
                            <boxGeometry args={[0.3, archway.height, 1]} />
                            <meshStandardMaterial color="#4a4a4a" />
                        </mesh>

                        {/* Right pillar */}
                        <mesh
                            position={[
                                archway.width / 2,
                                archway.height / 2,
                                0,
                            ]}
                        >
                            <boxGeometry args={[0.3, archway.height, 1]} />
                            <meshStandardMaterial color="#4a4a4a" />
                        </mesh>

                        {/* Top */}
                        <mesh position={[0, archway.height, 0]}>
                            <boxGeometry args={[archway.width + 0.3, 0.3, 1]} />
                            <meshStandardMaterial color="#4a4a4a" />
                        </mesh>
                    </group>
                    {/* Transition trigger */}
                    <RoomTransitionTrigger archway={archway} />
                </group>
            ))}

            {/* Preload assets */}
            <Preload all />
        </group>
    );
};
