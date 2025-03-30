import React, { useRef } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

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
    const spinningEaselRef = useRef<THREE.Group>(null);

    // Animation for pulsing light and spinning elements
    useFrame((state) => {
        if (pulsingLightRef.current) {
            pulsingLightRef.current.intensity =
                0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
        }

        if (spinningEaselRef.current) {
            spinningEaselRef.current.rotation.y += 0.005;
        }
    });

    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />

            {/* Creative corner with wooden workbench and tools */}
            <group position={[-7, 0, -8]}>
                {/* Wooden workbench */}
                <RigidBody type="fixed" colliders="cuboid">
                    <mesh position={[0, 1.5, 0]}>
                        <boxGeometry args={[4, 0.2, 2]} />
                        <meshStandardMaterial color="#8B4513" roughness={0.7} />
                    </mesh>
                    <mesh position={[-1.8, 0.75, -0.9]}>
                        <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                        <meshStandardMaterial color="#8B4513" roughness={0.7} />
                    </mesh>
                    <mesh position={[1.8, 0.75, -0.9]}>
                        <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                        <meshStandardMaterial color="#8B4513" roughness={0.7} />
                    </mesh>
                    <mesh position={[-1.8, 0.75, 0.9]}>
                        <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                        <meshStandardMaterial color="#8B4513" roughness={0.7} />
                    </mesh>
                    <mesh position={[1.8, 0.75, 0.9]}>
                        <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                        <meshStandardMaterial color="#8B4513" roughness={0.7} />
                    </mesh>
                </RigidBody>

                {/* Tools on the workbench */}
                <mesh position={[-1, 1.7, 0]}>
                    <boxGeometry args={[0.8, 0.1, 0.8]} />
                    <meshStandardMaterial color="#555555" />
                </mesh>

                {/* Wood pieces */}
                <mesh position={[1, 1.7, 0]} rotation={[0, Math.PI / 4, 0]}>
                    <boxGeometry args={[1.5, 0.1, 0.2]} />
                    <meshStandardMaterial color="#A0522D" />
                </mesh>

                {/* Warm spotlight for woodworking area */}
                <pointLight
                    position={[0, 3, 0]}
                    intensity={0.7}
                    distance={5}
                    color="#FFA07A"
                />
            </group>

            {/* Art/Design wall with bulletin board */}
            <group position={[-8, 3, 0]}>
                {/* Bulletin board background */}
                <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[12, 5]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.9} />
                </mesh>

                {/* Cork bulletin board surface */}
                <mesh position={[0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[11.5, 4.5]} />
                    <meshStandardMaterial color="#CD853F" roughness={1} />
                </mesh>

                {/* Pinned notes and images on bulletin board */}
                <group position={[0.1, 1, -3]}>
                    <mesh rotation={[0, Math.PI / 2, 0.1]}>
                        <planeGeometry args={[1.5, 1.5]} />
                        <meshStandardMaterial color="#FFFFFF" />
                    </mesh>
                    <Text
                        position={[0.05, 0, 0]}
                        rotation={[0, Math.PI / 2, 0.1]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={1.3}
                    >
                        Learning to sing and write a song
                    </Text>
                </group>

                <group position={[0.1, 1, 0]}>
                    <mesh rotation={[0, Math.PI / 2, -0.05]}>
                        <planeGeometry args={[1.7, 1.5]} />
                        <meshStandardMaterial color="#F5F5DC" />
                    </mesh>
                    <Text
                        position={[0.05, 0, 0]}
                        rotation={[0, Math.PI / 2, -0.05]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={1.4}
                    >
                        Programming since 14, creating software day and night
                    </Text>
                </group>

                <group position={[0.1, 1, 3]}>
                    <mesh rotation={[0, Math.PI / 2, 0.08]}>
                        <planeGeometry args={[1.5, 1.5]} />
                        <meshStandardMaterial color="#E6E6FA" />
                    </mesh>
                    <Text
                        position={[0.05, 0, 0]}
                        rotation={[0, Math.PI / 2, 0.08]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={1.3}
                    >
                        3D modeling and animation
                    </Text>
                </group>

                <group position={[0.1, -1, -3]}>
                    <mesh rotation={[0, Math.PI / 2, -0.07]}>
                        <planeGeometry args={[1.6, 1.5]} />
                        <meshStandardMaterial color="#ADD8E6" />
                    </mesh>
                    <Text
                        position={[0.05, 0, 0]}
                        rotation={[0, Math.PI / 2, -0.07]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={1.4}
                    >
                        Realism with pencil & Digital art
                    </Text>
                </group>

                <group position={[0.1, -1, 0]}>
                    <mesh rotation={[0, Math.PI / 2, 0.04]}>
                        <planeGeometry args={[1.7, 1.5]} />
                        <meshStandardMaterial color="#FFE4C4" />
                    </mesh>
                    <Text
                        position={[0.05, 0, 0]}
                        rotation={[0, Math.PI / 2, 0.04]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={1.4}
                    >
                        Woodworking (now with an adult brain)
                    </Text>
                </group>

                <group position={[0.1, -1, 3]}>
                    <mesh rotation={[0, Math.PI / 2, -0.03]}>
                        <planeGeometry args={[1.6, 1.5]} />
                        <meshStandardMaterial color="#D8BFD8" />
                    </mesh>
                    <Text
                        position={[0.05, 0, 0]}
                        rotation={[0, Math.PI / 2, -0.03]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={1.4}
                    >
                        Poetry & Instrumental music
                    </Text>
                </group>

                {/* Soft directional light for the bulletin board */}
                <spotLight
                    position={[2, 1, 0]}
                    target-position={[0, 0, 0]}
                    intensity={1}
                    angle={0.5}
                    penumbra={0.5}
                    color="#F9EAD0"
                />
            </group>

            {/* 3D art corner with spinning easel and art supplies */}
            <group ref={spinningEaselRef} position={[0, 0, 7]}>
                {/* Easel base */}
                <mesh position={[0, 1.5, 0]}>
                    <boxGeometry args={[1.5, 3, 0.1]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.8} />
                </mesh>

                {/* Canvas on easel */}
                <mesh position={[0, 1.5, 0.1]} rotation={[0, 0, 0]}>
                    <planeGeometry args={[1.3, 2]} />
                    <meshStandardMaterial
                        color="#FFFFFF"
                        roughness={0.2}
                        metalness={0.05}
                    />
                </mesh>

                {/* Paint strokes on canvas */}
                <mesh position={[0, 1.5, 0.12]} rotation={[0, 0, 0]}>
                    <planeGeometry args={[1.2, 1.9]} />
                    <meshStandardMaterial
                        color="#FFFFFF"
                        transparent
                        opacity={0.9}
                        roughness={0.3}
                        emissive="#F5DEB3"
                        emissiveIntensity={0.2}
                    />
                </mesh>

                {/* Art supplies around the easel */}
                <mesh position={[0.7, 0.1, 0.3]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
                    <meshStandardMaterial color="#4169E1" />
                </mesh>

                <mesh position={[-0.7, 0.1, 0.3]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
                    <meshStandardMaterial color="#8A2BE2" />
                </mesh>

                {/* Pulsing creative light */}
                <pointLight
                    ref={pulsingLightRef}
                    position={[0, 2.5, 1]}
                    intensity={0.5}
                    distance={5}
                    color="#6A5ACD"
                />
            </group>

            {/* Media wall with floating icons for different creative pursuits */}
            <group position={[8, 3, 0]}>
                {/* Wall backdrop */}
                <mesh position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[12, 5]} />
                    <meshStandardMaterial
                        color="#2F4F4F"
                        roughness={0.3}
                        metalness={0.4}
                        emissive="#20B2AA"
                        emissiveIntensity={0.1}
                    />
                </mesh>

                {/* Media timeline floating elements */}
                {[
                    {
                        pos: [-3, 1, 0],
                        label: "Photography",
                        icon: "📷",
                        color: "#00CED1",
                    },
                    {
                        pos: [-1, -0.5, 0],
                        label: "Tattooing",
                        icon: "🖋️",
                        color: "#9932CC",
                    },
                    {
                        pos: [1, 1, 0],
                        label: "Unreal Engine",
                        icon: "🎮",
                        color: "#1E90FF",
                    },
                    {
                        pos: [3, -0.5, 0],
                        label: "Markers & Art",
                        icon: "🖌️",
                        color: "#FF6347",
                    },
                ].map((item, index) => (
                    <group key={index} position={[0, item.pos[1], item.pos[0]]}>
                        {/* Icon background */}
                        <mesh rotation={[0, -Math.PI / 2, 0]}>
                            <circleGeometry args={[0.8, 32]} />
                            <meshStandardMaterial
                                color={item.color}
                                roughness={0.3}
                                metalness={0.3}
                                emissive={item.color}
                                emissiveIntensity={0.2}
                            />
                        </mesh>

                        {/* Icon text */}
                        <Text
                            position={[-0.1, 0, 0]}
                            rotation={[0, -Math.PI / 2, 0]}
                            fontSize={0.5}
                            color="#FFFFFF"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {item.icon}
                        </Text>

                        {/* Label */}
                        <Text
                            position={[-0.15, -1, 0]}
                            rotation={[0, -Math.PI / 2, 0]}
                            fontSize={0.2}
                            color="#FFFFFF"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {item.label}
                        </Text>
                    </group>
                ))}

                {/* Dynamic accent lighting */}
                <spotLight
                    position={[2, 0, -1]}
                    target-position={[0, 0, 0]}
                    angle={0.8}
                    penumbra={0.5}
                    intensity={0.8}
                    color="#48D1CC"
                />

                <spotLight
                    position={[2, 0, 3]}
                    target-position={[0, 0, 0]}
                    angle={0.8}
                    penumbra={0.5}
                    intensity={0.6}
                    color="#9370DB"
                />
            </group>

            {/* "About Me" section with creative typography on wall */}
            <group position={[0, 4, -8]}>
                <Text
                    position={[0, 1, 0]}
                    rotation={[0, 0, 0]}
                    fontSize={1}
                    color="#8A2BE2"
                    anchorX="center"
                    anchorY="middle"
                >
                    Creator
                </Text>

                <Text
                    position={[-3, 0, 0]}
                    rotation={[0, 0, 0]}
                    fontSize={0.8}
                    color="#20B2AA"
                    anchorX="center"
                    anchorY="middle"
                >
                    Programmer
                </Text>

                <Text
                    position={[3, 0, 0]}
                    rotation={[0, 0, 0]}
                    fontSize={0.8}
                    color="#FF8C00"
                    anchorX="center"
                    anchorY="middle"
                >
                    Artist
                </Text>

                <Text
                    position={[0, -1, 0]}
                    rotation={[0, 0, 0]}
                    fontSize={0.6}
                    color="#B22222"
                    anchorX="center"
                    anchorY="middle"
                >
                    Dreamer & Builder
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
