import React from "react";
import { Text, Html } from "@react-three/drei";

export const FitnessExperience: React.FC = () => {
    return (
        <group>
            {/* Dark industrial gym floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[9, 8]} />
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

            {/* Mirror walls - all 4 walls */}
            {[
                {
                    pos: [-0.5, 2.5, -3.5] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number],
                    width: 8,
                },
                {
                    pos: [-0.5, 2.5, 3.5] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number],
                    width: 8,
                },
                {
                    pos: [-4.5, 2.5, 0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number],
                    width: 7,
                },
                {
                    pos: [3.5, 2.5, 0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number],
                    width: 7,
                },
            ].map((wall, idx) => (
                <mesh key={idx} position={wall.pos} rotation={wall.rot}>
                    <planeGeometry args={[wall.width, 5]} />
                    <meshStandardMaterial
                        color="#E6E6FA"
                        metalness={0.9}
                        roughness={0.1}
                    />
                </mesh>
            ))}

            {/* Pull-up instructions poster - on front wall (opposite control panel) */}
            <group position={[0, 3, 3.4]}>
                <mesh>
                    <planeGeometry args={[3, 2]} />
                    <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
                </mesh>

                {/* Poster frame */}
                <mesh position={[0, 0, 0.01]}>
                    <ringGeometry args={[1.05, 1.1, 32]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>

                <Html position={[0, 0, 0.02]} center>
                    <div
                        style={{
                            width: "300px",
                            height: "200px",
                            background: "white",
                            padding: "10px",
                            fontFamily: "Arial, sans-serif",
                            fontSize: "11px",
                            color: "#000",
                            textAlign: "left",
                            lineHeight: "1.3",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "14px",
                                fontWeight: "bold",
                                textAlign: "center",
                                marginBottom: "8px",
                                color: "#FF0000",
                            }}
                        >
                            PERFECT PULL-UP TECHNIQUE
                        </div>
                        <div style={{ fontSize: "10px" }}>
                            <div style={{ marginBottom: "4px" }}>
                                <strong>GRIP:</strong> Hands shoulder-width
                                apart. Grip like you're tearing a towel in half
                                - firm but not crushing.
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                                <strong>SETUP:</strong> Start with bar behind
                                your head/neck. Keep shoulders back and down.
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                                <strong>PULL:</strong> Drive elbows down and
                                back. Think about straightening your spine, not
                                just going up.
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                                <strong>SCAPULA:</strong> Keep shoulder blades
                                tight and engaged throughout the entire
                                movement.
                            </div>
                            <div style={{ marginBottom: "4px" }}>
                                <strong>DESCENT:</strong> Control the negative.
                                Feel your body's momentum. Master your own
                                weight.
                            </div>
                            <div
                                style={{
                                    fontSize: "9px",
                                    fontStyle: "italic",
                                    textAlign: "center",
                                    marginTop: "6px",
                                    color: "#666",
                                }}
                            >
                                "Pull-ups are the ultimate test of functional
                                strength - your body against gravity."
                            </div>
                        </div>
                    </div>
                </Html>
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
            <group position={[0, 0, 0]}>
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
            <group position={[1.5, 0, -0.5]}>
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
                position={[3.9, 3, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                fontSize={0.4}
                color="#FF0000"
                anchorX="center"
                anchorY="middle"
            >
                💪 NO PAIN, NO GAIN 💪
            </Text>

            {/* Gym lighting */}
            <spotLight
                position={[0, 4.5, 0]}
                target-position={[0, 0, 0]}
                angle={0.6}
                penumbra={0.3}
                intensity={1.5}
                color="#FFFFFF"
                castShadow={false}
            />
        </group>
    );
};
