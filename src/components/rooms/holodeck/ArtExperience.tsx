import React from "react";
import { Text } from "@react-three/drei";
import { InteractiveEasel } from "../../models/InteractiveEasel";

export const ArtExperience: React.FC = () => {
    return (
        <group>
            {/* Classroom tile floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[9, 8]} />
                <meshStandardMaterial color="#F5F5DC" roughness={0.6} />
            </mesh>

            {/* Tile pattern */}
            {Array.from({ length: 64 }).map((_, i) => {
                const x = (i % 8) - 3.5;
                const z = Math.floor(i / 8) - 3.5;
                return (
                    <mesh
                        key={i}
                        position={[x, 0.101, z]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[0.9, 0.9]} />
                        <meshStandardMaterial
                            color={Math.random() > 0.9 ? "#FFE4E1" : "#F5F5DC"}
                            roughness={0.7}
                        />
                    </mesh>
                );
            })}

            {/* Colorful walls */}
            {[
                {
                    pos: [-0.5, 2.5, -3.5] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number],
                    color: "#FFE4B5",
                    width: 8,
                },
                {
                    pos: [-0.5, 2.5, 3.5] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number],
                    color: "#E0FFFF",
                    width: 8,
                },
                {
                    pos: [-4.5, 2.5, 0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number],
                    color: "#F0FFF0",
                    width: 7,
                },
                {
                    pos: [3.5, 2.5, 0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number],
                    color: "#FFF0F5",
                    width: 7,
                },
            ].map((wall, idx) => (
                <mesh key={idx} position={wall.pos} rotation={wall.rot}>
                    <planeGeometry args={[wall.width, 5]} />
                    <meshStandardMaterial color={wall.color} roughness={0.8} />
                </mesh>
            ))}

            {/* Interactive easel - on right wall */}
            <InteractiveEasel
                position={[2.5, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
            />

            {/* Cork board for artwork display - on front wall (opposite control panel) */}
            <group position={[0, 2.5, 3.4]}>
                <mesh>
                    <planeGeometry args={[6, 2.5]} />
                    <meshStandardMaterial color="#DEB887" roughness={0.9} />
                </mesh>

                {/* Sample "student" artwork */}
                {Array.from({ length: 9 }).map((_, i) => {
                    const x = ((i % 3) - 1) * 1.8;
                    const y = (Math.floor(i / 3) - 1) * 0.7;
                    return (
                        <mesh key={i} position={[x, y, 0.02]}>
                            <planeGeometry args={[0.5, 0.5]} />
                            <meshBasicMaterial
                                color={`hsl(${i * 40}, 70%, 80%)`}
                                transparent
                                opacity={0.9}
                            />
                        </mesh>
                    );
                })}
            </group>

            {/* Encouraging text - above cork board */}
            <Text
                position={[0, 4, 3.3]}
                fontSize={0.3}
                color="#FF69B4"
                anchorX="center"
                anchorY="middle"
            >
                🌟 AMAZING ARTWORK! KEEP CREATING! 🌟
            </Text>

            {/* Art supplies scattered around - front area */}
            <group position={[-2, 0, 2]}>
                {/* Paint bottles */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <mesh key={i} position={[i * 0.25, 0.1, 0]}>
                        <cylinderGeometry args={[0.04, 0.04, 0.15]} />
                        <meshStandardMaterial
                            color={`hsl(${i * 60}, 80%, 60%)`}
                        />
                    </mesh>
                ))}
            </group>

            {/* Bright classroom lighting */}
            <pointLight
                position={[0, 4.5, 0]}
                intensity={1.2}
                distance={10}
                color="#FFFAF0"
            />
        </group>
    );
};
