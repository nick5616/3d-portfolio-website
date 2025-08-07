import React from "react";
import * as THREE from "three";
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

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Plaque background */}
            <mesh castShadow receiveShadow>
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
                <mesh position={[0, 0.12, 0]}>
                    <planeGeometry args={[PLAQUE_WIDTH - 0.04, 0.04]} />
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.9}
                    />
                </mesh>

                {/* Date */}
                {displayInfo.date && (
                    <mesh position={[0, 0.06, 0]}>
                        <planeGeometry args={[PLAQUE_WIDTH - 0.04, 0.03]} />
                        <meshBasicMaterial
                            color="#cccccc"
                            transparent
                            opacity={0.8}
                        />
                    </mesh>
                )}

                {/* Description */}
                {displayInfo.description && (
                    <mesh position={[0, 0, 0]}>
                        <planeGeometry args={[PLAQUE_WIDTH - 0.04, 0.06]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                )}

                {/* Medium */}
                {displayInfo.medium && (
                    <mesh position={[0, -0.06, 0]}>
                        <planeGeometry args={[PLAQUE_WIDTH - 0.04, 0.03]} />
                        <meshBasicMaterial
                            color="#cccccc"
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                )}

                {/* Dimensions */}
                {displayInfo.dimensions && (
                    <mesh position={[0, -0.12, 0]}>
                        <planeGeometry args={[PLAQUE_WIDTH - 0.04, 0.03]} />
                        <meshBasicMaterial
                            color="#cccccc"
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                )}
            </group>
        </group>
    );
};
