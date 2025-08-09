import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { useAzureArtByIndex } from "../../hooks/useAzureArtByIndex";
import { ArtPlaque } from "./ArtPlaque";

interface AzureArtFrameByIndexProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    artPieceIndex: number; // Index of the art piece (0, 1, 2, etc.)
    useAzureStorage?: boolean; // Whether to use Azure Storage (default: true)
    showPlaque?: boolean; // Whether to show the plaque (default: true)
}

interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

const FRAME_DEPTH = 0.1;
const FRAME_THICKNESS = 0.08;
const WALL_OFFSET = -0.75; // Distance to offset from wall center

const AzureFrameByIndex: React.FC<AzureArtFrameByIndexProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    artPieceIndex,
    useAzureStorage = true,
    showPlaque = true,
}) => {
    // Use Azure Storage hook with index
    const {
        imageUrl: azureImageUrl,
        isLoading,
        error,
        artPieceName,
    } = useAzureArtByIndex(artPieceIndex);

    // Debug logging
    console.log(`AzureArtFrameByIndex [${artPieceIndex}]:`, {
        azureImageUrl,
        isLoading,
        error,
        artPieceName,
        useAzureStorage,
    });

    // Show loading state if still loading
    if (isLoading) {
        console.log(
            `AzureArtFrameByIndex [${artPieceIndex}]: Still loading, showing placeholder`
        );
        return (
            <group position={position} rotation={rotation} scale={scale}>
                {/* Loading placeholder frame */}
                <mesh castShadow>
                    <boxGeometry args={[2, 1.5, FRAME_DEPTH]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0, FRAME_DEPTH / 2 - 0.02]}>
                    <boxGeometry args={[1.84, 1.34, 0.02]} />
                    <meshStandardMaterial color="#2c2c2c" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
                    <planeGeometry args={[1.84, 1.34]} />
                    <meshBasicMaterial color="#666666" />
                </mesh>
            </group>
        );
    }

    // Determine which image URL to use - only use Azure Storage, no fallbacks
    const finalImageUrl =
        useAzureStorage && azureImageUrl && !error ? azureImageUrl : null;

    console.log(
        `AzureArtFrameByIndex [${artPieceIndex}]: finalImageUrl =`,
        finalImageUrl
    );

    // If no valid image URL, don't render anything
    if (!finalImageUrl) {
        console.log(
            `AzureArtFrameByIndex: No frame displayed for index ${artPieceIndex} (${artPieceName}) - no valid image URL`
        );
        return null;
    }

    // Log if Azure Storage fails
    if (useAzureStorage && (!azureImageUrl || error)) {
        console.log(
            `AzureArtFrameByIndex: No image available for index ${artPieceIndex} (${artPieceName}) - no frame displayed`
        );
        return null;
    }

    const texture = useLoader(TextureLoader, finalImageUrl);
    const [dimensions, setDimensions] = useState<ImageDimensions>({
        width: 2,
        height: 1.5,
        aspectRatio: 4 / 3,
    });

    // Calculate mounting position based on rotation
    const getMountPosition = (): [number, number, number] => {
        const [x, y, z] = position;
        const [_, rotY] = rotation;

        // Use rotation to determine which wall we're on
        if (Math.abs(rotY) === Math.PI / 2) {
            // Frame faces east/west
            return x < 0 ? [x + WALL_OFFSET, y, z] : [x - WALL_OFFSET, y, z];
        } else {
            // Frame faces north/south
            return z < 0 ? [x, y, z + WALL_OFFSET] : [x, y, z - WALL_OFFSET];
        }
    };

    // Calculate frame dimensions based on image aspect ratio
    useEffect(() => {
        if (texture) {
            const aspectRatio = texture.image.width / texture.image.height;
            let width = 2;
            let height = width / aspectRatio;

            if (height > 2.5) {
                height = 2.5;
                width = height * aspectRatio;
            }

            if (width > 3) {
                width = 3;
                height = width / aspectRatio;
            }

            setDimensions({ width, height, aspectRatio });
        }
    }, [texture]);

    const mountPosition = getMountPosition();

    return (
        <group position={mountPosition} rotation={rotation} scale={scale}>
            {/* Main frame box */}
            <mesh castShadow>
                <boxGeometry
                    args={[dimensions.width, dimensions.height, FRAME_DEPTH]}
                />
                <meshStandardMaterial color="#8b7355" roughness={0.8} />
            </mesh>

            {/* Canvas backing */}
            <mesh position={[0, 0, FRAME_DEPTH / 2 - 0.02]}>
                <boxGeometry
                    args={[
                        dimensions.width - FRAME_THICKNESS * 2,
                        dimensions.height - FRAME_THICKNESS * 2,
                        0.02,
                    ]}
                />
                <meshStandardMaterial color="#2c2c2c" roughness={0.5} />
            </mesh>

            {/* Art canvas/image */}
            <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
                <planeGeometry
                    args={[
                        dimensions.width - FRAME_THICKNESS * 2,
                        dimensions.height - FRAME_THICKNESS * 2,
                    ]}
                />
                <meshBasicMaterial
                    map={texture}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Corner decorations */}
            {[
                [-1, 1],
                [1, 1],
                [-1, -1],
                [1, -1],
            ].map(([x, y], i) => (
                <mesh
                    key={i}
                    position={[
                        x * (dimensions.width / 2 - FRAME_THICKNESS / 2),
                        y * (dimensions.height / 2 - FRAME_THICKNESS / 2),
                        FRAME_DEPTH / 2,
                    ]}
                >
                    <boxGeometry
                        args={[
                            FRAME_THICKNESS * 1.5,
                            FRAME_THICKNESS * 1.5,
                            FRAME_DEPTH * 1.2,
                        ]}
                    />
                    <meshStandardMaterial
                        color="#6b5335"
                        metalness={0.3}
                        roughness={0.7}
                    />
                </mesh>
            ))}

            {/* Plaque */}
            {showPlaque && artPieceName && (
                <ArtPlaque
                    position={[0, -dimensions.height / 2 - 0.3, 0]}
                    rotation={[0, 0, 0]}
                    scale={[1, 1, 1]}
                    artPieceName={artPieceName}
                    showPlaque={showPlaque}
                />
            )}
        </group>
    );
};

export const AzureArtFrameByIndex: React.FC<AzureArtFrameByIndexProps> = (
    props
) => {
    return (
        <Suspense fallback={null}>
            <AzureFrameByIndex {...props} />
        </Suspense>
    );
};
