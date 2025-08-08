import React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { getArtPieceDisplayInfo } from "../../configs/artMetadata";

interface ArtPlaqueProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    artPieceName: string;
    showPlaque?: boolean;
}

const PLAQUE_WIDTH = 0.8;
const PLAQUE_HEIGHT = 0.4;
const PLAQUE_DEPTH = 0.02;
const TEXT_SIZE = 0.04;
const LINE_HEIGHT = 0.06;

export const ArtPlaque: React.FC<ArtPlaqueProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    artPieceName,
    showPlaque = true,
}) => {
    if (!showPlaque) {
        return null;
    }

    const displayInfo = getArtPieceDisplayInfo(artPieceName);
    const hasMetadata =
        displayInfo.date || displayInfo.description || displayInfo.medium;

    // Only show plaque if there's actual metadata
    if (!hasMetadata) {
        return null;
    }

    console.log("displayInfo", displayInfo);
    console.log("artPieceName", artPieceName);
    console.log("showPlaque", showPlaque);
    console.log("hasMetadata", hasMetadata);

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
                    {displayInfo.name}
                </Text>

                {/* Date */}
                {displayInfo.date && (
                    <Text
                        position={[0, 0.06, 0]}
                        fontSize={0.03}
                        color="#cccccc"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={PLAQUE_WIDTH - 0.04}
                        textAlign="center"
                    >
                        {displayInfo.date}
                    </Text>
                )}

                {/* Description */}
                {displayInfo.description && (
                    <Text
                        position={[0, 0, 0]}
                        fontSize={0.025}
                        color="#ffffff"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={PLAQUE_WIDTH - 0.04}
                        textAlign="center"
                    >
                        {displayInfo.description}
                    </Text>
                )}

                {/* Medium */}
                {displayInfo.medium && (
                    <Text
                        position={[0, -0.06, 0]}
                        fontSize={0.03}
                        color="#ffffff"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={PLAQUE_WIDTH - 0.04}
                        textAlign="center"
                    >
                        {displayInfo.medium}
                    </Text>
                )}
            </group>
        </group>
    );
};
