import React from "react";
import { Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

type HolodeckExperience =
    | "computer"
    | "fitness"
    | "art"
    | "math"
    | "forest"
    | "off";

interface HolodeckControlPanelProps {
    currentExperience: HolodeckExperience;
    switchExperience: (experience: HolodeckExperience) => void;
    scanLineRef: React.RefObject<THREE.Mesh>;
    controlPanelRef: React.RefObject<THREE.Group>;
}

export const HolodeckControlPanel: React.FC<HolodeckControlPanelProps> = ({
    currentExperience,
    switchExperience,
    scanLineRef,
    controlPanelRef,
}) => {
    return (
        <group
            ref={controlPanelRef}
            position={[0, 2, -3.6]}
            rotation={[0, 0, 0]}
        >
            {/* Main Control Console */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[3, 1.5, 0.3]} />
                    <meshStandardMaterial
                        color="#0a0a0a"
                        metalness={0.9}
                        roughness={0.1}
                        emissive="#001122"
                        emissiveIntensity={0.3}
                    />
                </mesh>
            </RigidBody>

            {/* Holographic Display */}
            <mesh position={[0, 0.4, 0.2]}>
                <planeGeometry args={[2.5, 1]} />
                <meshBasicMaterial
                    transparent
                    opacity={0.8}
                    color="#00ffff"
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Scanning line */}
            <mesh ref={scanLineRef} position={[0, 0.4, 0.21]}>
                <planeGeometry args={[2.5, 0.02]} />
                <meshStandardMaterial
                    color="#00ffff"
                    transparent
                    opacity={0.9}
                    emissive="#00ffff"
                    emissiveIntensity={0.8}
                />
            </mesh>

            {/* Control Interface */}
            <Html
                transform
                occlude={true}
                position={[0, 0.4, 0.22]}
                style={{
                    width: "250px",
                    height: "100px",
                    background: "rgba(0, 20, 30, 0.3)",
                    border: "1px solid #00ffff",
                    borderRadius: "5px",
                    boxShadow: "0 0 20px #00ffff",
                    pointerEvents: "auto",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        padding: "5px",
                        fontFamily: "monospace",
                        color: "#00ffff",
                        fontSize: "10px",
                    }}
                >
                    <div style={{ display: "flex", gap: "3px" }}>
                        <button
                            onClick={() => switchExperience("off")}
                            style={{
                                background:
                                    currentExperience === "off"
                                        ? "#00ffff"
                                        : "transparent",
                                color:
                                    currentExperience === "off"
                                        ? "#000"
                                        : "#00ffff",
                                border: "1px solid #00ffff",
                                padding: "4px 6px",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "9px",
                                flex: 1,
                            }}
                        >
                            🔲 OFF
                        </button>
                        <button
                            onClick={() => switchExperience("computer")}
                            style={{
                                background:
                                    currentExperience === "computer"
                                        ? "#ff6600"
                                        : "transparent",
                                color:
                                    currentExperience === "computer"
                                        ? "#000"
                                        : "#ff6600",
                                border: "1px solid #ff6600",
                                padding: "4px 6px",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "9px",
                                flex: 1,
                            }}
                        >
                            🖥️ HOUSE
                        </button>
                        <button
                            onClick={() => switchExperience("fitness")}
                            style={{
                                background:
                                    currentExperience === "fitness"
                                        ? "#ff0000"
                                        : "transparent",
                                color:
                                    currentExperience === "fitness"
                                        ? "#000"
                                        : "#ff0000",
                                border: "1px solid #ff0000",
                                padding: "4px 6px",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "9px",
                                flex: 1,
                            }}
                        >
                            💪 GYM
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: "3px" }}>
                        <button
                            onClick={() => switchExperience("art")}
                            style={{
                                background:
                                    currentExperience === "art"
                                        ? "#00ff00"
                                        : "transparent",
                                color:
                                    currentExperience === "art"
                                        ? "#000"
                                        : "#00ff00",
                                border: "1px solid #00ff00",
                                padding: "4px 6px",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "9px",
                                flex: 1,
                            }}
                        >
                            🎨 ART
                        </button>
                        <button
                            onClick={() => switchExperience("math")}
                            style={{
                                background:
                                    currentExperience === "math"
                                        ? "#ffff00"
                                        : "transparent",
                                color:
                                    currentExperience === "math"
                                        ? "#000"
                                        : "#ffff00",
                                border: "1px solid #ffff00",
                                padding: "4px 6px",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "9px",
                                flex: 1,
                            }}
                        >
                            🚀 MATH
                        </button>
                        <button
                            onClick={() => switchExperience("forest")}
                            style={{
                                background:
                                    currentExperience === "forest"
                                        ? "#00ff88"
                                        : "transparent",
                                color:
                                    currentExperience === "forest"
                                        ? "#000"
                                        : "#00ff88",
                                border: "1px solid #00ff88",
                                padding: "4px 6px",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "9px",
                                flex: 1,
                            }}
                        >
                            🌲 FOREST
                        </button>
                    </div>
                </div>
            </Html>

            {/* Control buttons - physical holographic buttons */}
            {[-1, -0.5, 0, 0.5, 1].map((x, i) => (
                <mesh key={i} position={[x * 0.4, -0.4, 0.2]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.05, 8]} />
                    <meshStandardMaterial
                        color="#001133"
                        emissive="#00ffff"
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}

            {/* Holographic lighting */}
            <pointLight
                position={[0, 1, 1]}
                intensity={1.5}
                distance={6}
                color="#00ffff"
            />
        </group>
    );
};
