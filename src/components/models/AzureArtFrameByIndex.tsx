import { useLoader, useThree, useFrame } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense, useEffect, useRef, useState } from "react";
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
    proximityRadius?: number; // Distance in world units to trigger loading
}

interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

const FRAME_DEPTH = 0.1;
const FRAME_THICKNESS = 0.08;
const FLUSH_GAP = -0.02; // Slight embed to appear perfectly flush and avoid z-fighting
const DEFAULT_PROXIMITY_RADIUS = 16; // ~a room-width away

const LazyImagePlane: React.FC<{
    url: string;
    width: number;
    height: number;
    onTextureLoaded?: (aspectRatio: number) => void;
}> = ({ url, width, height, onTextureLoaded }) => {
    const texture = useLoader(TextureLoader, url);

    // Notify parent of actual aspect ratio
    useEffect(() => {
        if (texture && texture.image && onTextureLoaded) {
            const ratio = texture.image.width / texture.image.height;
            onTextureLoaded(ratio);
        }
    }, [texture, onTextureLoaded]);

    return (
        <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                map={texture}
                toneMapped={false}
                side={THREE.FrontSide}
            />
        </mesh>
    );
};

const AzureFrameByIndex: React.FC<AzureArtFrameByIndexProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    artPieceIndex,
    useAzureStorage = true,
    showPlaque = true,
    proximityRadius = DEFAULT_PROXIMITY_RADIUS,
}) => {
    const { camera } = useThree();

    // Track proximity to camera
    const [isNear, setIsNear] = useState(false);
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!groupRef.current) return;
        const groupWorldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(groupWorldPos);
        const distance = camera.position.distanceTo(groupWorldPos);
        // Small hysteresis to prevent rapid toggling
        setIsNear((prev) =>
            prev ? distance < proximityRadius + 2 : distance < proximityRadius
        );
    });

    // Call the hook, enabling Azure only when near
    const {
        imageUrl: azureImageUrl,
        isLoading,
        error,
        artPieceName,
        artPieceExists,
    } = useAzureArtByIndex(artPieceIndex, useAzureStorage, isNear);

    const finalArtPieceName = artPieceName;

    // Determine which image URL to use with Azure-first behavior when near
    let finalImageUrl: string | null = null;
    if (isNear) {
        if (useAzureStorage) {
            if (azureImageUrl && !error) {
                finalImageUrl = azureImageUrl;
            } else if (error && finalArtPieceName) {
                // Only fallback to local if Azure failed
                finalImageUrl = `/images/art/${finalArtPieceName}`;
            }
        } else if (finalArtPieceName) {
            // Azure disabled: use local when near
            finalImageUrl = `/images/art/${finalArtPieceName}`;
        }
    }

    const [dimensions, setDimensions] = useState<ImageDimensions>({
        width: 2,
        height: 1.5,
        aspectRatio: 4 / 3,
    });

    const updateDimensionsFromAspect = (aspectRatio: number) => {
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
    };

    // Calculate mounting position: offset center opposite the facing normal for flush mount
    const getMountPosition = (): [number, number, number] => {
        const [x, y, z] = position;
        const [, rotY] = rotation;
        const normal = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
        const offset = FRAME_DEPTH / 2 + FLUSH_GAP;
        const mount = new THREE.Vector3(x, y, z).sub(
            normal.multiplyScalar(offset)
        );
        return [mount.x, mount.y, mount.z];
    };

    const mountPosition = getMountPosition();

    // Loading placeholder when near but waiting on Azure decision
    const showLoading =
        isNear && useAzureStorage && isLoading && !finalImageUrl;

    if (showLoading) {
        return (
            <group
                ref={groupRef}
                position={mountPosition}
                rotation={rotation}
                scale={scale}
            >
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

    // If not near, or no valid image, show empty frame (aesthetic placeholder)
    const hasImage = Boolean(finalImageUrl);

    // Don't render anything if the art piece doesn't exist
    if (!artPieceExists && !isLoading) {
        return null;
    }

    return (
        <group
            ref={groupRef}
            position={mountPosition}
            rotation={rotation}
            scale={scale}
        >
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

            {/* Art canvas/image - only mount when near to avoid eager texture load */}
            {isNear && hasImage ? (
                <LazyImagePlane
                    url={finalImageUrl!}
                    width={dimensions.width - FRAME_THICKNESS * 2}
                    height={dimensions.height - FRAME_THICKNESS * 2}
                    onTextureLoaded={updateDimensionsFromAspect}
                />
            ) : (
                <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
                    <planeGeometry
                        args={[
                            dimensions.width - FRAME_THICKNESS * 2,
                            dimensions.height - FRAME_THICKNESS * 2,
                        ]}
                    />
                    <meshBasicMaterial
                        color={hasImage ? "#3a3a3a" : "#555555"}
                    />
                </mesh>
            )}

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
            {showPlaque && finalArtPieceName && (
                <ArtPlaque
                    position={[
                        0,
                        -dimensions.height / 2 - 0.3,
                        FRAME_DEPTH / 2 + 0.02,
                    ]}
                    rotation={[0, 0, 0]}
                    scale={[1, 1, 1]}
                    artPieceName={finalArtPieceName}
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
