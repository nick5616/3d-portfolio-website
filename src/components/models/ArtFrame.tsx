import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { azureStorageService } from "../../utils/azureStorage";

interface ArtFrameProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    imageUrl: string;
}

interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

const FRAME_DEPTH = 0.1;
const FRAME_THICKNESS = 0.08;
const WALL_OFFSET = -0.75; // Distance to offset from wall center

// Custom hook to handle Azure + fallback image loading
const useImageWithFallback = (imageUrl: string) => {
    const [finalImageUrl, setFinalImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadImage = async () => {
            if (!imageUrl) {
                setError("No image URL provided");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // First, try to get the Azure URL using the loading manager
                const azureUrl = await azureStorageService.getArtPieceUrlQueued(
                    imageUrl,
                    imageUrl,
                    0 // Default priority
                );
                setFinalImageUrl(azureUrl);
                console.log(`✓ ArtFrame: Loaded from Azure - ${imageUrl}`);
            } catch (azureError) {
                console.warn(
                    `⚠ ArtFrame: Azure failed for ${imageUrl}, trying local fallback`
                );

                // Fallback to local image
                const localUrl = `/images/art/${imageUrl}`;
                setFinalImageUrl(localUrl);
                console.log(`✓ ArtFrame: Using local fallback - ${localUrl}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadImage();
    }, [imageUrl]);

    return { finalImageUrl, isLoading, error };
};

const Frame: React.FC<ArtFrameProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    imageUrl,
}) => {
    const { finalImageUrl, isLoading, error } = useImageWithFallback(imageUrl);

    // Only load texture if we have a final URL
    const texture = finalImageUrl
        ? useLoader(TextureLoader, finalImageUrl)
        : null;

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

    // Show loading state or error state
    if (isLoading) {
        return (
            <group position={mountPosition} rotation={rotation} scale={scale}>
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

    // Show error state
    if (error || !texture) {
        return (
            <group position={mountPosition} rotation={rotation} scale={scale}>
                {/* Error placeholder frame */}
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
                    <meshBasicMaterial color="#ff4444" />
                </mesh>
            </group>
        );
    }

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
                    side={THREE.FrontSide}
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
        </group>
    );
};

export const ArtFrame: React.FC<ArtFrameProps> = (props) => {
    return (
        <Suspense fallback={null}>
            <Frame {...props} />
        </Suspense>
    );
};
