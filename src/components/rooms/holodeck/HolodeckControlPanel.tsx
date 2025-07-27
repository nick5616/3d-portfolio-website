import React, { useState } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
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

interface ButtonProps {
    position: [number, number, number];
    experience: HolodeckExperience;
    currentExperience: HolodeckExperience;
    switchExperience: (experience: HolodeckExperience) => void;
    label: string;
    color: string;
    icon: string;
}

const ControlButton: React.FC<ButtonProps> = ({
    position,
    experience,
    currentExperience,
    switchExperience,
    label,
    color,
    icon,
}) => {
    const [hovered, setHovered] = useState(false);
    const isActive = currentExperience === experience;

    const buttonColor = isActive ? color : hovered ? "#444" : "#222";
    const emissiveColor = isActive ? color : hovered ? "#333" : "#000";
    const emissiveIntensity = isActive ? 0.3 : hovered ? 0.1 : 0;

    const handleClick = (e: any) => {
        e.stopPropagation();
        switchExperience(experience);
    };

    return (
        <group position={position}>
            {/* Button Base */}
            <mesh
                onClick={handleClick}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                position={[0, 0, 0.02]}
                rotation={[Math.PI / 2, 0, 0]}
            >
                <cylinderGeometry args={[0.15, 0.15, 0.04, 16]} />
                <meshStandardMaterial
                    color={buttonColor}
                    metalness={0.8}
                    roughness={0.2}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                />
            </mesh>

            {/* Button Text */}
            <Text
                position={[0, 0, 0.05]}
                fontSize={0.06}
                color={isActive ? "#000" : "#fff"}
                anchorX="center"
                anchorY="middle"
            >
                {label}
            </Text>
        </group>
    );
};

export const HolodeckControlPanel: React.FC<HolodeckControlPanelProps> = ({
    currentExperience,
    switchExperience,
    scanLineRef,
    controlPanelRef,
}) => {
    const buttons = [
        { experience: "off" as const, label: "OFF", color: "#666", icon: "" },
        {
            experience: "computer" as const,
            label: "HOUSE",
            color: "#ff6600",
            icon: "",
        },
        {
            experience: "fitness" as const,
            label: "GYM",
            color: "#ff0000",
            icon: "",
        },
        {
            experience: "art" as const,
            label: "ART",
            color: "#00ff00",
            icon: "",
        },
        {
            experience: "math" as const,
            label: "MATH",
            color: "#ffff00",
            icon: "",
        },
        {
            experience: "forest" as const,
            label: "FOREST",
            color: "#00ff88",
            icon: "",
        },
    ];

    return (
        <group
            ref={controlPanelRef}
            position={[3.45, 2, 0]}
            rotation={[0, -Math.PI / 2, 0]}
        >
            {/* Main Panel Base */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[2.4, 1.8, 0.1]} />
                    <meshStandardMaterial
                        color="#0a0a0a"
                        metalness={0.9}
                        roughness={0.1}
                        emissive="#001122"
                        emissiveIntensity={0.1}
                    />
                </mesh>
            </RigidBody>

            {/* Panel Frame */}
            <mesh position={[0, 0, 0.06]}>
                <boxGeometry args={[2.2, 1.6, 0.02]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.7}
                    roughness={0.3}
                />
            </mesh>

            {/* Title */}
            <Text
                position={[0, 0.7, 0.08]}
                fontSize={0.08}
                color="#00ffff"
                anchorX="center"
                anchorY="middle"
            >
                HOLODECK CONTROL
            </Text>

            {/* Buttons arranged in 2 rows */}
            {buttons.map((button, index) => {
                const row = Math.floor(index / 3);
                const col = index % 3;
                const x = (col - 1) * 0.6; // Center the 3 buttons
                const y = 0.2 - row * 0.5; // Two rows

                return (
                    <ControlButton
                        key={button.experience}
                        position={[x, y, 0.08]}
                        experience={button.experience}
                        currentExperience={currentExperience}
                        switchExperience={switchExperience}
                        label={button.label}
                        color={button.color}
                        icon={button.icon}
                    />
                );
            })}

            {/* Ambient lighting for the panel */}
            <pointLight
                position={[0, 0, 0.5]}
                intensity={0.5}
                distance={3}
                color="#00ffff"
            />
        </group>
    );
};
