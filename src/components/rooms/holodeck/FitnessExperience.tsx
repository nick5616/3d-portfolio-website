import React from "react";
import { Text, Html } from "@react-three/drei";

export const FitnessExperience: React.FC = () => {
    return (
        <group>
            {/* Dark industrial gym floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#2F2F2F" roughness={0.8} />
            </mesh>

            {/* Rubber mat sections */}
            {Array.from({ length: 3 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[(i - 1) * 2.5, 0.11, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <planeGeometry args={[2, 6]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                </mesh>
            ))}

            {/* Pull-up instructions poster - on left wall */}
            <group position={[-1, 3, 5]} rotation={[0, -Math.PI, 0]}>
                <mesh>
                    <planeGeometry args={[3, 2]} />
                    <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
                </mesh>

                {/* Title */}
                <Text
                    position={[0, 0.7, 0.02]}
                    rotation={[0, 0, 0]}
                    fontSize={0.12}
                    color="#FF0000"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={2.8}
                >
                    PERFECT PULL-UP TECHNIQUE
                </Text>

                {/* Instructions */}
                <Text
                    position={[0, 0, 0.02]}
                    rotation={[0, 0, 0]}
                    fontSize={0.06}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={2.6}
                    textAlign="left"
                >
                    {`GRIP: Hands shoulder-width apart. Grip like you're tearing a towel in half - firm but not crushing.

SETUP: Start with bar behind your head/neck. Keep shoulders back and down.

PULL: Drive elbows down and back. Think about straightening your spine, not just going up.

SCAPULA: Keep shoulder blades tight and engaged throughout the entire movement.

DESCENT: Control the negative. Feel your body's momentum. Slow and controlled, despite your own weight. Cancel your momentum and go alllll the way down.`}
                </Text>

                {/* Quote */}
                <Text
                    position={[0, -0.6, 0.02]}
                    rotation={[0, 0, 0]}
                    fontSize={0.05}
                    color="#666666"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={2.6}
                    fontStyle="italic"
                >
                    "Pull-ups are my favorite!"
                </Text>
            </group>

            {/* Weight rack - against back wall */}
            <group position={[0, 0, -3.5]}>
                {/* Rack frame */}
                <mesh position={[0, 1, 0]}>
                    <boxGeometry args={[1.5, 1.8, 0.4]} />
                    <meshStandardMaterial color="#2F4F4F" metalness={0.8} />
                </mesh>

                {/* Various weights */}
                {[0.3, 0.6, 0.9, 1.2].map((y, i) => (
                    <React.Fragment key={i}>
                        <mesh position={[-0.5, y, 0.1]}>
                            <cylinderGeometry args={[0.12, 0.12, 0.08]} />
                            <meshStandardMaterial
                                color="#2F4F4F"
                                metalness={0.7}
                            />
                        </mesh>
                        <mesh position={[0.5, y, 0.1]}>
                            <cylinderGeometry args={[0.12, 0.12, 0.08]} />
                            <meshStandardMaterial
                                color="#2F4F4F"
                                metalness={0.7}
                            />
                        </mesh>
                    </React.Fragment>
                ))}
            </group>

            {/* Barbell station - center of room */}
            <group position={[0, -0.25, -2.75]}>
                {/* Barbell */}
                <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.025, 0.025, 1.8]} />
                    <meshStandardMaterial color="#A9A9A9" metalness={0.9} />
                </mesh>

                {/* Weight plates */}
                {[-0.7, 0.7].map((x, i) => (
                    <mesh
                        key={i}
                        position={[x, 1.2, 0]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <cylinderGeometry args={[0.18, 0.18, 0.04]} />
                        <meshStandardMaterial color="#2F4F4F" metalness={0.7} />
                    </mesh>
                ))}

                {/* Weight collars */}
                {[-0.8, 0.8].map((x, i) => (
                    <mesh
                        key={i}
                        position={[x, 1.2, 0]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <cylinderGeometry args={[0.03, 0.03, 0.015]} />
                        <meshStandardMaterial color="#FFD700" metalness={0.8} />
                    </mesh>
                ))}
            </group>

            {/* Bench - center-right */}
            <group position={[0, 0, -2.5]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[1.2, 0.15, 0.35]} />
                    <meshStandardMaterial color="#8B0000" roughness={0.7} />
                </mesh>
                {/* Bench legs */}
                {[
                    [-0.5, -0.5],
                    [0.5, -0.5],
                    [-0.5, 0.5],
                    [0.5, 0.5],
                ].map(([x, z], i) => (
                    <mesh key={i} position={[x, 0.25, z]}>
                        <boxGeometry args={[0.08, 0.5, 0.08]} />
                        <meshStandardMaterial color="#2F4F4F" metalness={0.8} />
                    </mesh>
                ))}
            </group>

            {/* Motivational text - on right wall */}
            <Text
                position={[3.9, 5, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                fontSize={0.4}
                color="#FF0000"
                anchorX="center"
                anchorY="middle"
            >
                NO PAIN, NO GAIN
            </Text>
            <Text
                position={[3.9, 4.5, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                fontSize={0.4}
                color="#FF0000"
                anchorX="center"
                anchorY="middle"
            >
                Except for pain in the joints and ligaments. 
            </Text>
            <Text
                position={[3.9, 4.1, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                fontSize={0.4}
                color="#FF0000"
                anchorX="center"
                anchorY="middle"
            >
                That's pain without gain.
            </Text>
            

            {/* Gym lighting — overhead spots with targets in scene graph */}
            <spotLight position={[0, 4, 0]} angle={0.6} penumbra={0.3} intensity={20} color="#FFFFFF" castShadow={false}>
                <object3D attach="target" position={[0, -4.5, 0]} />
            </spotLight>
        </group>
    );
};
