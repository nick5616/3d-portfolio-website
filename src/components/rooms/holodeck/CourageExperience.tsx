import React, { useRef, useState } from "react";
import { CourageComputer } from "../../models/CourageComputer";
import { useSceneStore } from "../../../stores/sceneStore";
import {
    InteractionRaycaster,
    TriggerAction,
} from "../../core/InteractionRaycaster";
import * as THREE from "three";

export const CourageExperience: React.FC = () => {
    const { setConsoleActive, console: consoleState } = useSceneStore();
    const computerRef = useRef<THREE.Mesh>(null);
    const [isHoveringComputer, setIsHoveringComputer] = useState(false);

    return (
        <group>
            {/* Exact recreation of Muriel and Eustace's computer room */}

            {/* Wooden floorboards */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>

            {/* Individual floorboard lines */}
            {Array.from({ length: 12 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[-0.5, 0.105, (i - 5.5) * 0.7]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <planeGeometry args={[8, 0.02]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
            ))}

            {/* Wooden walls with vertical planks */}
            {[
                {
                    pos: [-0.5, 2.5, -4] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number],
                    width: 8,
                },
                {
                    pos: [-0.5, 2.5, 4] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number],
                    width: 8,
                },
                {
                    pos: [-4.5, 2.5, 0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number],
                    width: 8,
                },
                {
                    pos: [3.5, 2.5, 0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number],
                    width: 8,
                },
            ].map((wall, idx) => (
                <group
                    key={`wood-wall-${idx}`}
                    position={wall.pos}
                    rotation={wall.rot}
                >
                    <mesh>
                        <planeGeometry args={[wall.width, 5]} />
                        <meshStandardMaterial color="#DEB887" roughness={0.8} />
                    </mesh>
                    {/* Vertical wood planks */}
                    {Array.from({ length: Math.round(wall.width * 1.25) }).map(
                        (_, i) => (
                            <mesh
                                key={i}
                                position={[
                                    (i - (wall.width * 1.25 - 1) / 2) * 0.8,
                                    0,
                                    0.01,
                                ]}
                            >
                                <planeGeometry args={[0.03, 5]} />
                                <meshStandardMaterial color="#CD853F" />
                            </mesh>
                        )
                    )}
                </group>
            ))}

            {/* Wooden ceiling with beams */}
            <mesh position={[-0.5, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>

            {/* Ceiling beams */}
            {Array.from({ length: 5 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[(i - 2) * 1.5 - 0.5, 4.9, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                >
                    <planeGeometry args={[0.2, 8]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
            ))}

            {/* The iconic wooden desk - positioned on left wall */}
            <group position={[0, 0, -3]} rotation={[0, Math.PI / 2, 0]}>
                {/* Desktop */}
                <mesh position={[0, 0.8, 0]}>
                    <boxGeometry args={[1.2, 0.1, 2.5]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.7} />
                </mesh>

                {/* Desk legs - properly attached */}
                {[
                    [-0.5, -1.1],
                    [0.5, -1.1],
                    [-0.5, 1.1],
                    [0.5, 1.1],
                ].map(([x, z], i) => (
                    <mesh key={i} position={[x, 0.4, z]}>
                        <boxGeometry args={[0.08, 0.8, 0.08]} />
                        <meshStandardMaterial color="#654321" roughness={0.8} />
                    </mesh>
                ))}

                {/* Desk drawers */}
                <mesh position={[0, 0.5, 0.7]}>
                    <boxGeometry args={[1, 0.4, 0.6]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.7} />
                </mesh>

                {/* Drawer handles */}
                {[-0.12, 0.12].map((y, i) => (
                    <mesh key={i} position={[0.5, 0.5 + y, 1]}>
                        <cylinderGeometry args={[0.015, 0.015, 0.08]} />
                        <meshStandardMaterial color="#FFD700" metalness={0.8} />
                    </mesh>
                ))}
            </group>

            {/* Wooden chair - facing the computer */}
            <group position={[0, 0, -2]} rotation={[0, Math.PI, 0]}>
                {/* Seat */}
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[0.7, 0.08, 0.7]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.7} />
                </mesh>

                {/* Backrest */}
                <mesh position={[0, 0.9, -0.31]}>
                    <boxGeometry args={[0.7, 0.8, 0.08]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.7} />
                </mesh>

                {/* Chair legs */}
                {[
                    [-0.3, -0.3],
                    [0.3, -0.3],
                    [-0.3, 0.3],
                    [0.3, 0.3],
                ].map(([x, z], i) => (
                    <mesh key={i} position={[x, 0.25, z]}>
                        <boxGeometry args={[0.06, 0.5, 0.06]} />
                        <meshStandardMaterial color="#654321" roughness={0.8} />
                    </mesh>
                ))}
            </group>

            {/* The Courage Computer on the desk */}
            <group>
                <CourageComputer
                    position={[0, 1.5, -3]}
                    rotation={[0, 0, 0]}
                    scale={[0.6, 0.6, 0.6]}
                />
                {/* Interaction mesh positioned at the computer screen */}
                <mesh ref={computerRef} position={[0, 1.5, -3]} visible={true}>
                    <boxGeometry args={[1.5, 1.2, 0.5]} />
                    <meshBasicMaterial
                        transparent
                        opacity={0.1}
                        wireframe={true}
                        color="#00ff00"
                    />
                </mesh>
            </group>

            {/* Keyboard on the desk */}
            <group position={[0, 0.85, -2.8]} rotation={[0, 0, 0]}>
                {/* Keyboard base */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.4, 0.02, 0.15]} />
                    <meshStandardMaterial color="#2C2C2C" roughness={0.3} />
                </mesh>

                {/* Keyboard keys - main section */}
                {Array.from({ length: 4 }).map((_, row) =>
                    Array.from({ length: 12 }).map((_, col) => (
                        <mesh
                            key={`key-${row}-${col}`}
                            position={[
                                (col - 5.5) * 0.03,
                                0.01,
                                (row - 1.5) * 0.03,
                            ]}
                        >
                            <boxGeometry args={[0.025, 0.005, 0.025]} />
                            <meshStandardMaterial
                                color="#1A1A1A"
                                roughness={0.2}
                            />
                        </mesh>
                    ))
                )}

                {/* Space bar */}
                <mesh position={[0, 0.01, 0.06]}>
                    <boxGeometry args={[0.25, 0.005, 0.02]} />
                    <meshStandardMaterial color="#1A1A1A" roughness={0.2} />
                </mesh>

                {/* Function keys row */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <mesh
                        key={`fkey-${i}`}
                        position={[(i - 5.5) * 0.03, 0.01, -0.06]}
                    >
                        <boxGeometry args={[0.025, 0.005, 0.025]} />
                        <meshStandardMaterial color="#1A1A1A" roughness={0.2} />
                    </mesh>
                ))}

                {/* Number pad section */}
                {Array.from({ length: 4 }).map((_, row) =>
                    Array.from({ length: 3 }).map((_, col) => (
                        <mesh
                            key={`numpad-${row}-${col}`}
                            position={[
                                0.12 + (col - 1) * 0.03,
                                0.01,
                                (row - 1.5) * 0.03,
                            ]}
                        >
                            <boxGeometry args={[0.025, 0.005, 0.025]} />
                            <meshStandardMaterial
                                color="#1A1A1A"
                                roughness={0.2}
                            />
                        </mesh>
                    ))
                )}
            </group>

            {/* Computer Interaction */}
            <InteractionRaycaster
                target={computerRef}
                config={{
                    maxDistance: 6,
                    includeChildren: false,
                    rayOrigin: "center",
                    triggerActions: [
                        { type: "keypress", key: "e", cooldown: 300 },
                        { type: "hover" },
                    ],
                }}
                callbacks={{
                    onRayEnter: () => {
                        console.log("Ray entered computer");
                        setIsHoveringComputer(true);
                    },
                    onRayExit: () => {
                        console.log("Ray exited computer");
                        setIsHoveringComputer(false);
                    },
                    onTrigger: (action: TriggerAction) => {
                        if (action.type === "keypress") {
                            setConsoleActive(true);
                        }
                    },
                }}
                visual={{
                    prompt: {
                        content: (
                            <div
                                style={{
                                    background: "rgba(0, 0, 0, 0.9)",
                                    color: "white",
                                    padding: "10px 16px",
                                    borderRadius: "6px",
                                    fontSize: "16px",
                                    fontFamily: "Arial, sans-serif",
                                    whiteSpace: "nowrap",
                                    border: "2px solid rgba(255, 255, 255, 0.3)",
                                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
                                }}
                            >
                                Press{" "}
                                <kbd
                                    style={{
                                        background: "#fff",
                                        color: "#000",
                                        padding: "3px 8px",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        boxShadow:
                                            "0 2px 4px rgba(0, 0, 0, 0.3)",
                                    }}
                                >
                                    E
                                </kbd>{" "}
                                to interact
                            </div>
                        ),
                        offset: [0, 0.6, 0],
                        visible: isHoveringComputer && !consoleState.isActive,
                        distanceScale: true,
                        fadeTime: 300,
                    },
                }}
            />

            {/* Warm homey lighting like in the show */}
            <pointLight
                position={[0, 4, 0]}
                intensity={1}
                distance={10}
                color="#FFE4B5"
            />

            <pointLight
                position={[-2, 3, -2]}
                intensity={0.6}
                distance={6}
                color="#FFA07A"
            />

            {/* Window with countryside view - on right wall */}
            <group position={[3.4, 2, -2.5]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh>
                    <planeGeometry args={[1.5, 1.2]} />
                    <meshBasicMaterial
                        color="#87CEEB"
                        transparent
                        opacity={0.8}
                    />
                </mesh>
                {/* Window frame */}
                {/* // TODO: add square window frame */}
                {/* <mesh position={[0, 0, 0.01]}>
                    <boxGeometry args={[0.7, 0.8, 0.02]} />
                    <meshStandardMaterial color="#654321" />
                </mesh> */}
                {/* Window cross */}
                <mesh position={[0, 0, 0.02]}>
                    <boxGeometry args={[1.5, 0.04, 0.02]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
                <mesh position={[0, 0, 0.02]}>
                    <boxGeometry args={[0.04, 1.2, 0.02]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
            </group>

            {/* Old carpet under desk */}
            <mesh
                position={[0, 0.11, -2.5]}
                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            >
                <planeGeometry args={[2.5, 3]} />
                <meshStandardMaterial color="#800080" roughness={0.9} />
            </mesh>
        </group>
    );
};
