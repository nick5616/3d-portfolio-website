import React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { ArtPiece } from "../../configs/artMetadata";

interface ArtPlaqueProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    artPiece: ArtPiece | null;
    showPlaque?: boolean;
}

const PLAQUE_WIDTH = 0.8;
const PLAQUE_HEIGHT = 0.4;
const PLAQUE_DEPTH = 0.02;

export const ArtPlaque: React.FC<ArtPlaqueProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    artPiece,
    showPlaque = true,
}) => {
    if (!showPlaque || !artPiece) return null;

    const title = artPiece.name;
    const date = artPiece.date;
    const description = artPiece.description;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Plaque background */}
            <mesh castShadow>
                <boxGeometry
                    args={[PLAQUE_WIDTH, PLAQUE_HEIGHT, PLAQUE_DEPTH]}
                />
                <meshStandardMaterial color="#2c2c2c" roughness={0.8} />
            </mesh>

            {/* Plaque border */}
            <mesh position={[0, 0, PLAQUE_DEPTH / 2 + 0.001]}>
                <boxGeometry
                    args={[PLAQUE_WIDTH - 0.02, PLAQUE_HEIGHT - 0.02, 0.001]}
                />
                <meshStandardMaterial color="#8b7355" roughness={0.7} />
            </mesh>

            {/* Text content */}
            <group position={[0, 0, PLAQUE_DEPTH / 2 + 0.002]}>
                {/* Title */}
                <Text
                    position={[0, 0.12, 0]}
                    fontSize={0.04}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={PLAQUE_WIDTH - 0.04}
                    textAlign="center"
                >
                    {title}
                </Text>

                {/* Date */}
                {date && (
                    <Text
                        position={[0, 0.06, 0]}
                        fontSize={0.03}
                        color="#cccccc"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={PLAQUE_WIDTH - 0.04}
                        textAlign="center"
                    >
                        {date}
                    </Text>
                )}

                {/* Description */}
                {description && (
                    <Text
                        position={[0, -0.05, 0]}
                        fontSize={0.025}
                        color="#ffffff"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={PLAQUE_WIDTH - 0.04}
                        textAlign="center"
                    >
                        {description}
                    </Text>
                )}
            </group>
        </group>
    );
};
