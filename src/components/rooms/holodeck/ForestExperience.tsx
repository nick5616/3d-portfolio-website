import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody, interactionGroups } from "@react-three/rapier";

export const ForestExperience: React.FC = () => {
    return (
        <group>
            {/* Collision walls for forest boundaries */}
            {[
                // Back wall (north)
                {
                    pos: [0, 2.5, -4] as [number, number, number],
                    size: [8, 5, 0.1] as [number, number, number],
                },
                // Front wall (south)
                {
                    pos: [0, 2.5, 4] as [number, number, number],
                    size: [8, 5, 0.1] as [number, number, number],
                },
                // Left wall (west)
                {
                    pos: [-4, 2.5, 0] as [number, number, number],
                    size: [0.1, 5, 8] as [number, number, number],
                },
                // Right wall (east)
                {
                    pos: [4, 2.5, 0] as [number, number, number],
                    size: [0.1, 5, 8] as [number, number, number],
                },
            ].map((wall, i) => (
                <RigidBody
                    key={`forest-wall-${i}`}
                    type="fixed"
                    colliders="cuboid"
                >
                    <mesh position={wall.pos} visible={false}>
                        <boxGeometry args={wall.size} />
                    </mesh>
                </RigidBody>
            ))}

            {/* Forest floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#2F4F2F" roughness={0.9} />
            </mesh>

            {/* Spooky trees - all around the perimeter */}
            {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const radius = 2.5 + Math.random() * 1;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;

                return (
                    <group key={i} position={[x, 0, z]}>
                        {/* Tree trunk */}
                        <mesh position={[0, 1.2, 0]}>
                            <cylinderGeometry args={[0.15, 0.25, 2.5]} />
                            <meshStandardMaterial
                                color="#4A4A2A"
                                roughness={0.9}
                            />
                        </mesh>

                        {/* Spooky branches */}
                        {Array.from({ length: 4 }).map((_, j) => (
                            <mesh
                                key={j}
                                position={[
                                    Math.cos(j * 1.5) * 0.6,
                                    1.5 + j * 0.25,
                                    Math.sin(j * 1.5) * 0.6,
                                ]}
                                rotation={[0, j * 1.5, Math.PI / 8]}
                            >
                                <cylinderGeometry args={[0.015, 0.06, 0.8]} />
                                <meshStandardMaterial
                                    color="#2A2A1A"
                                    roughness={0.9}
                                />
                            </mesh>
                        ))}
                    </group>
                );
            })}

            {/* Floating spooky eyes - scattered throughout */}
            {Array.from({ length: 8 }).map((_, i) => (
                <group
                    key={i}
                    position={[
                        (Math.random() - 0.5) * 6,
                        1 + Math.random() * 1.5,
                        (Math.random() - 0.5) * 6,
                    ]}
                >
                    <mesh position={[-0.08, 0, 0]}>
                        <sphereGeometry args={[0.04]} />
                        <meshBasicMaterial color="#FF0000" />
                    </mesh>
                    <mesh position={[0.08, 0, 0]}>
                        <sphereGeometry args={[0.04]} />
                        <meshBasicMaterial color="#FF0000" />
                    </mesh>
                </group>
            ))}

            {/* Eerie fog */}
            <mesh position={[0, 0.5, 0]}>
                <planeGeometry args={[10, 10]} />
                <meshBasicMaterial color="#888888" transparent opacity={0.25} />
            </mesh>

            {/* Spooky text - floating in center */}
            <Text
                position={[0, 2.5, 0]}
                fontSize={0.4}
                color="#800080"
                anchorX="center"
                anchorY="middle"
            >
                👻 STUPID DOG! 👻
            </Text>

            {/* Eerie lighting */}
            <ambientLight intensity={0.08} color="#444444" />
            <pointLight
                position={[0, 4, 0]}
                intensity={0.4}
                distance={10}
                color="#800080"
            />
        </group>
    );
};
