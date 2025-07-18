import React, { useRef } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { InteractiveEasel } from "../models/InteractiveEasel";
import { CourageComputer } from "../models/CourageComputer";

interface AboutRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const AboutRoom: React.FC<AboutRoomProps> = ({
    config,
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    // References for animated elements
    const pulsingLightRef = useRef<THREE.PointLight>(null);

    // Holographic computer setup refs
    const holoDisplayRef = useRef<THREE.Group>(null);
    const holoScanLineRef = useRef<THREE.Mesh>(null);
    const holoKeyboardRef = useRef<THREE.Group>(null);
    const dataStreamRef = useRef<THREE.Group>(null);
    const holoFrameRef = useRef<THREE.Group>(null);

    // Current URL state
    const [currentUrl] = React.useState("https://saucedog.art");

    // Animation for pulsing light and spinning elements
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;

        if (pulsingLightRef.current) {
            pulsingLightRef.current.intensity =
                0.3 + Math.sin(elapsed * 1.5) * 0.2;
        }

        // Holographic computer animations - stationary display
        // Remove the creepy following animation

        if (holoScanLineRef.current) {
            holoScanLineRef.current.position.y = Math.sin(elapsed * 4) * 0.8;
            (
                holoScanLineRef.current.material as THREE.MeshStandardMaterial
            ).emissiveIntensity = 0.5 + Math.sin(elapsed * 6) * 0.3;
        }

        if (holoKeyboardRef.current) {
            holoKeyboardRef.current.children.forEach((child, i) => {
                if (child instanceof THREE.Mesh) {
                    (
                        child.material as THREE.MeshStandardMaterial
                    ).emissiveIntensity =
                        0.3 + Math.sin(elapsed * 3 + i * 0.5) * 0.2;
                }
            });
        }

        if (dataStreamRef.current) {
            dataStreamRef.current.children.forEach((child, i) => {
                child.position.y = ((elapsed * 2 + i * 2) % 8) - 4;
                if (child instanceof THREE.Mesh) {
                    (child.material as THREE.MeshStandardMaterial).opacity =
                        Math.sin((elapsed * 2 + i * 2) % (Math.PI * 2)) * 0.3 +
                        0.4;
                }
            });
        }

        if (holoFrameRef.current) {
            holoFrameRef.current.children.forEach((child, i) => {
                if (child instanceof THREE.Mesh) {
                    (
                        child.material as THREE.MeshStandardMaterial
                    ).emissiveIntensity = 0.8 + Math.sin(elapsed * 2 + i) * 0.4;
                }
            });
        }
    });

    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />

            {/* Interactive drawing easel */}
            <InteractiveEasel
                position={[0, 0, 14]}
                rotation={[0, Math.PI, 0]}
            />

            {/* Courage the Cowardly Dog Style AI Computer */}
            <CourageComputer
                position={[7, 2, -12]}
                rotation={[0, -Math.PI / 4, 0]}
                scale={[1.5, 1.5, 1.5]}
            />

            {/* "About Me" section with creative typography on wall */}
            <group position={[0, 4, -8]}>
                <Text
                    position={[0, 1, -1.9]}
                    rotation={[0, 0, 0]}
                    fontSize={1}
                    color="#8A2BE2"
                    anchorX="center"
                    anchorY="middle"
                >
                    🧚🏼
                </Text>

                <Text
                    position={[-3, 0, -1.9]}
                    rotation={[0, 0, 0]}
                    fontSize={0.8}
                    color="#20B2AA"
                    anchorX="center"
                    anchorY="middle"
                >
                    🧑‍💻
                </Text>

                <Text
                    position={[3, 0, -1.9]}
                    rotation={[0, 0, 0]}
                    fontSize={0.8}
                    color="#FF8C00"
                    anchorX="center"
                    anchorY="middle"
                >
                    👨‍🎨
                </Text>

                <spotLight
                    position={[0, 2, 3]}
                    target-position={[0, 0, 0]}
                    angle={0.6}
                    penumbra={0.7}
                    intensity={1.2}
                    color="#FFFAF0"
                />
            </group>

            {/* Exercise corner with weighted calisthenics equipment */}
            <group position={[7, 0, -7]}>
                {/* Exercise mat */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[3, 2]} />
                    <meshStandardMaterial color="#4682B4" roughness={0.9} />
                </mesh>

                {/* Weights */}
                <mesh position={[-0.8, 0.3, 0.5]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                    <meshStandardMaterial
                        color="#2F4F4F"
                        metalness={0.6}
                        roughness={0.3}
                    />
                </mesh>

                <mesh position={[0.8, 0.3, 0.5]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                    <meshStandardMaterial
                        color="#2F4F4F"
                        metalness={0.6}
                        roughness={0.3}
                    />
                </mesh>

                {/* Exercise bar */}
                <mesh position={[0, 0.3, 0.5]} rotation={[0, Math.PI / 2, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 1.8, 8]} />
                    <meshStandardMaterial
                        color="#A9A9A9"
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>

                {/* Focused light for exercise area */}
                <spotLight
                    position={[0, 3, 0]}
                    target-position={[0, 0, 0]}
                    angle={0.5}
                    penumbra={0.5}
                    intensity={0.8}
                    color="#F0FFFF"
                />
            </group>

            {/* 🚀 WALL-MOUNTED HOLOGRAPHIC CONTROL STATION - North Wall */}
            <group position={[-5, 1.6, -14.5]} rotation={[0, 0, 0]}>
                {/* Wall Mount Base */}
                <RigidBody type="fixed" colliders="cuboid">
                    <mesh position={[0, 0, -0.2]}>
                        <boxGeometry args={[4, 3, 0.3]} />
                        <meshStandardMaterial
                            color="#0a0a0a"
                            metalness={0.9}
                            roughness={0.1}
                            emissive="#001122"
                            emissiveIntensity={0.3}
                        />
                    </mesh>

                    {/* Wall mount arms */}
                    {[
                        [-1.5, 1],
                        [1.5, 1],
                        [-1.5, -1],
                        [1.5, -1],
                    ].map(([x, y], i) => (
                        <mesh key={i} position={[x, y, -0.4]}>
                            <cylinderGeometry args={[0.1, 0.15, 0.6, 8]} />
                            <meshStandardMaterial
                                color="#1a1a2e"
                                metalness={0.8}
                                roughness={0.2}
                                emissive="#00ffff"
                                emissiveIntensity={0.4}
                            />
                        </mesh>
                    ))}
                </RigidBody>

                {/* Wall-mounted Control Panel */}
                <mesh position={[0, -1.2, 0.2]}>
                    <boxGeometry args={[3, 0.8, 0.1]} />
                    <meshStandardMaterial
                        color="#000020"
                        metalness={0.8}
                        roughness={0.2}
                        emissive="#00ffff"
                        emissiveIntensity={0.2}
                    />
                </mesh>

                {/* Main Holographic Display */}
                <group ref={holoDisplayRef} position={[0, 0.5, 0.3]}>
                    {/* Display frame */}
                    <mesh>
                        <boxGeometry args={[3.5, 2.2, 0.05]} />
                        <meshStandardMaterial
                            color="#000011"
                            metalness={0.9}
                            roughness={0.1}
                            emissive="#00ffff"
                            emissiveIntensity={0.2}
                        />
                    </mesh>

                    {/* Holographic screen backdrop */}
                    <mesh position={[0, 0, 0.03]}>
                        <planeGeometry args={[3.3, 2]} />
                        <meshBasicMaterial
                            transparent
                            opacity={0.4}
                            color="#00ffff"
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Holographic frame effects */}
                    <group ref={holoFrameRef}>
                        {/* Corner projectors */}
                        {[
                            [-1.6, -0.9],
                            [1.6, -0.9],
                            [1.6, 0.9],
                            [-1.6, 0.9],
                        ].map(([x, y], i) => (
                            <mesh key={i} position={[x, y, 0.1]}>
                                <sphereGeometry args={[0.05, 8, 8]} />
                                <meshStandardMaterial
                                    color="#00ffff"
                                    emissive="#00ffff"
                                    emissiveIntensity={1.5}
                                />
                            </mesh>
                        ))}

                        {/* Frame edges with glow */}
                        <mesh>
                            <ringGeometry args={[1.8, 1.85, 32]} />
                            <meshStandardMaterial
                                color="#00ffff"
                                emissive="#00ffff"
                                emissiveIntensity={0.8}
                                transparent
                                opacity={0.8}
                            />
                        </mesh>
                    </group>

                    {/* Scanning line */}
                    <mesh ref={holoScanLineRef} position={[0, 0, 0.05]}>
                        <planeGeometry args={[3.2, 0.02]} />
                        <meshStandardMaterial
                            color="#00ffff"
                            transparent
                            opacity={0.9}
                            emissive="#00ffff"
                            emissiveIntensity={0.8}
                        />
                    </mesh>

                    {/* Web browser interface */}
                    <Html
                        transform
                        occlude={true}
                        position={[0, 0, 0.031]}
                        rotation={[0, 0, 0]}
                        style={{
                            width: "132px",
                            height: "80px",
                            background: "rgba(0, 20, 30, 0.4)",
                            border: "1px solid #00ffff",
                            borderRadius: "3px",
                            boxShadow:
                                "0 0 15px #00ffff, inset 0 0 12px rgba(0, 255, 255, 0.3)",
                            overflow: "hidden",
                            pointerEvents: "auto",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                background:
                                    "linear-gradient(135deg, rgba(0,50,100,0.2), rgba(0,20,40,0.3))",
                                borderRadius: "6px",
                                display: "flex",
                                flexDirection: "column",
                                color: "#00ffff",
                                fontFamily: "monospace",
                            }}
                        >
                            {/* Browser header */}
                            <div
                                style={{
                                    height: "24px",
                                    background: "rgba(0,10,20,0.8)",
                                    borderBottom: "1px solid #00ffff",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 6px",
                                    fontSize: "10px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "2px",
                                        marginRight: "8px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            background: "#ff5555",
                                            borderRadius: "50%",
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            background: "#ffaa00",
                                            borderRadius: "50%",
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            background: "#00ff00",
                                            borderRadius: "50%",
                                        }}
                                    />
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        background: "rgba(0,20,40,0.5)",
                                        padding: "2px 6px",
                                        borderRadius: "2px",
                                        border: "1px solid #00ffff",
                                        color: "#00ffff",
                                        fontFamily: "monospace",
                                        fontSize: "10px",
                                    }}
                                >
                                    🌐 saucedog.art
                                </div>
                            </div>

                            {/* Browser content mockup */}
                            <div
                                style={{
                                    flex: 1,
                                    background:
                                        "linear-gradient(45deg, #001122, #002244)",
                                    display: "flex",
                                    flexDirection: "column",
                                    padding: "4px",
                                    fontSize: "8px",
                                    color: "#00ffff",
                                }}
                            >
                                <div
                                    style={{
                                        marginBottom: "3px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    🎨 Portfolio Website
                                </div>
                                <div
                                    style={{
                                        marginBottom: "2px",
                                        opacity: 0.7,
                                    }}
                                >
                                    ➤ Projects & Art Gallery
                                </div>
                                <div
                                    style={{
                                        marginBottom: "2px",
                                        opacity: 0.7,
                                    }}
                                >
                                    ➤ Interactive 3D Experience
                                </div>
                                <div
                                    style={{
                                        marginBottom: "2px",
                                        opacity: 0.7,
                                    }}
                                >
                                    ➤ Creative Coding Demos
                                </div>
                                <div
                                    style={{
                                        marginTop: "auto",
                                        textAlign: "center",
                                        opacity: 0.5,
                                        fontSize: "6px",
                                    }}
                                >
                                    ✨ saucedog.art ✨
                                </div>
                            </div>
                        </div>
                    </Html>
                </group>

                {/* Holographic Keyboard - Wall-mounted */}
                <group ref={holoKeyboardRef} position={[0, -0.8, 0.5]}>
                    {/* Keyboard base */}
                    <mesh>
                        <boxGeometry args={[2.8, 0.05, 0.8]} />
                        <meshStandardMaterial
                            color="#000020"
                            transparent
                            opacity={0.8}
                            emissive="#00ffff"
                            emissiveIntensity={0.3}
                        />
                    </mesh>

                    {/* Floating holographic keys */}
                    {Array.from({ length: 42 }).map((_, i) => {
                        const x = (i % 14) * 0.18 - 1.17;
                        const z = Math.floor(i / 14) * 0.18 - 0.18;
                        return (
                            <mesh key={i} position={[x, 0.08, z]}>
                                <boxGeometry args={[0.12, 0.08, 0.12]} />
                                <meshStandardMaterial
                                    color="#001133"
                                    transparent
                                    opacity={0.7}
                                    emissive="#00ffff"
                                    emissiveIntensity={0.4}
                                />
                            </mesh>
                        );
                    })}
                </group>

                {/* Holographic Mouse - Wall-mounted */}
                <mesh position={[1.5, -0.8, 0.5]}>
                    <boxGeometry args={[0.4, 0.1, 0.6]} />
                    <meshStandardMaterial
                        color="#001133"
                        transparent
                        opacity={0.7}
                        emissive="#00ffff"
                        emissiveIntensity={0.5}
                    />
                </mesh>

                {/* Data Streams */}
                <group ref={dataStreamRef}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <mesh
                            key={i}
                            position={[
                                Math.cos(i * 0.8) * 3,
                                0,
                                Math.sin(i * 0.8) * 3,
                            ]}
                        >
                            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
                            <meshStandardMaterial
                                color="#00ffff"
                                emissive="#00ffff"
                                emissiveIntensity={0.8}
                                transparent
                                opacity={0.6}
                            />
                        </mesh>
                    ))}
                </group>

                {/* Ambient holographic lighting */}
                <pointLight
                    position={[0, 1, 1]}
                    intensity={1.8}
                    distance={10}
                    color="#00ffff"
                    decay={2}
                />

                {/* Secondary lighting for dramatic effect */}
                <spotLight
                    position={[0, 2, 2]}
                    target-position={[0, 0, 0]}
                    angle={0.8}
                    penumbra={0.7}
                    intensity={2.5}
                    color="#0077ff"
                    castShadow
                />

                {/* Floating UI elements */}
                <group position={[-3, 2.5, -1]}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <mesh
                            key={i}
                            position={[0, i * 0.3, Math.sin(i) * 0.2]}
                            rotation={[0, i * 0.5, 0]}
                        >
                            <planeGeometry args={[0.8, 0.15]} />
                            <meshStandardMaterial
                                color="#001133"
                                transparent
                                opacity={0.6}
                                emissive="#00ffff"
                                emissiveIntensity={0.4}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    ))}
                </group>

                <group position={[3, 2.5, -1]}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <mesh
                            key={i}
                            position={[0, i * 0.3, Math.cos(i) * 0.2]}
                            rotation={[0, -i * 0.5, 0]}
                        >
                            <planeGeometry args={[0.8, 0.15]} />
                            <meshStandardMaterial
                                color="#001133"
                                transparent
                                opacity={0.6}
                                emissive="#00ffff"
                                emissiveIntensity={0.4}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    ))}
                </group>
            </group>

            {/* Ambient, more subtle room lighting with warm tones */}
            <pointLight
                position={[0, 6, 0]}
                intensity={0.4}
                distance={15}
                color="#FFD700"
            />

            <pointLight
                position={[-7, 3, -7]}
                intensity={0.3}
                distance={10}
                color="#FFA07A"
            />

            <pointLight
                position={[7, 3, 7]}
                intensity={0.3}
                distance={10}
                color="#B0C4DE"
            />
        </>
    );
};
