import React from "react";
import { Text } from "@react-three/drei";
import { RupeeIcon } from "./RupeeIcon";

interface AchievementPlaqueProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    title: string;
    subtitle?: string;
    accentColor?: string;
    locked?: boolean;
    // "rupee" renders the actual rupee gem shape (for the rupee-collection
    // plaques); "gem" is the generic octahedron used for every achievement.
    icon?: "rupee" | "gem";
}

const PLAQUE_WIDTH = 1.1;
const PLAQUE_HEIGHT = 0.55;
const PLAQUE_DEPTH = 0.03;

export const AchievementPlaque: React.FC<AchievementPlaqueProps> = ({
    position,
    rotation = [0, 0, 0],
    title,
    subtitle,
    accentColor = "#FFD700",
    locked = false,
    icon = "gem",
}) => {
    // Rupee plaques get a museum-placard look - white card, black text -
    // instead of the dark plate used for achievements.
    const isRupee = icon === "rupee";

    return (
        <group position={position} rotation={rotation}>
            {/* Plaque background - doubles as the colored frame for rupee
                cards, since the white card mesh below sits on top of it
                leaving only a thin colored border showing. */}
            <mesh castShadow>
                <boxGeometry args={[PLAQUE_WIDTH, PLAQUE_HEIGHT, PLAQUE_DEPTH]} />
                <meshStandardMaterial
                    color={isRupee ? accentColor : locked ? "#1a1a1a" : "#2c2c2c"}
                    roughness={isRupee ? 0.6 : 0.8}
                />
            </mesh>

            {isRupee ? (
                /* White card face, inset from the colored frame behind it */
                <mesh position={[0, 0, PLAQUE_DEPTH / 2 + 0.001]}>
                    <boxGeometry
                        args={[PLAQUE_WIDTH - 0.08, PLAQUE_HEIGHT - 0.08, 0.001]}
                    />
                    <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
                </mesh>
            ) : (
                /* Accent border for achievement plaques */
                <mesh position={[0, 0, PLAQUE_DEPTH / 2 + 0.001]}>
                    <boxGeometry
                        args={[PLAQUE_WIDTH - 0.04, PLAQUE_HEIGHT - 0.04, 0.001]}
                    />
                    <meshStandardMaterial
                        color={accentColor}
                        roughness={0.6}
                        metalness={locked ? 0 : 0.3}
                    />
                </mesh>
            )}

            {/* Decorative icon */}
            {icon === "rupee" ? (
                <RupeeIcon
                    position={[-PLAQUE_WIDTH / 2 + 0.16, 0, PLAQUE_DEPTH / 2 + 0.02]}
                    color={accentColor}
                    emissiveIntensity={locked ? 0 : 0.5}
                />
            ) : (
                <mesh
                    position={[
                        -PLAQUE_WIDTH / 2 + 0.16,
                        0,
                        PLAQUE_DEPTH / 2 + 0.02,
                    ]}
                >
                    <octahedronGeometry args={[0.07]} />
                    <meshStandardMaterial
                        color={accentColor}
                        emissive={accentColor}
                        emissiveIntensity={locked ? 0 : 0.6}
                        roughness={0.3}
                        metalness={0.4}
                    />
                </mesh>
            )}

            {/* Text content */}
            <group position={[0.08, 0, PLAQUE_DEPTH / 2 + 0.003]}>
                <Text
                    position={[0, 0.11, 0]}
                    fontSize={0.055}
                    color={isRupee ? "#111111" : locked ? "#888888" : "#ffffff"}
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={PLAQUE_WIDTH - 0.32}
                    textAlign="center"
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        position={[0, -0.1, 0]}
                        fontSize={0.038}
                        color={isRupee ? "#333333" : locked ? "#666666" : "#cccccc"}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={PLAQUE_WIDTH - 0.32}
                        textAlign="center"
                    >
                        {subtitle}
                    </Text>
                )}
            </group>
        </group>
    );
};
