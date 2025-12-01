import { useThree, useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useAzureArtByIndex } from "../../hooks/useAzureArtByIndex";
import { ArtPlaque } from "./ArtPlaque";
import { nearestArtManager } from "../../utils/nearestArtManager";

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
    const [isNearest, setIsNearest] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false); // Track if this piece has ever loaded
    const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null); // Persist loaded URL
    const groupRef = useRef<THREE.Group>(null);
    const distanceRef = useRef<number>(Infinity);
    const frameId = useRef(`frame-${artPieceIndex}-${position.join("-")}`);

    useFrame(() => {
        if (!groupRef.current) return;
        const groupWorldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(groupWorldPos);
        const currentDistance = camera.position.distanceTo(groupWorldPos);
        distanceRef.current = currentDistance;
        
        // Small hysteresis to prevent rapid toggling
        const wasNear = isNear;
        const nowNear = wasNear
            ? currentDistance < proximityRadius + 2
            : currentDistance < proximityRadius;
        
        if (nowNear !== wasNear) {
            setIsNear(nowNear);
        }

        // Register with nearest art manager
        nearestArtManager.register(frameId.current, currentDistance, nowNear);
    });

    // Subscribe to nearest art changes
    useEffect(() => {
        const unsubscribe = nearestArtManager.subscribe((nearestId) => {
            setIsNearest(nearestId === frameId.current);
        });

        return () => {
            unsubscribe();
            nearestArtManager.unregister(frameId.current);
        };
    }, []);

    // Only allow NEW loading if this is the nearest AND near
    // But if it's already loaded, keep showing it
    const shouldLoad = (isNear && isNearest) || hasLoaded;

    // Calculate priority based on distance (closer = higher priority)
    // Priority range: 0-1000, where 1000 is closest
    const priority = useMemo(() => {
        if (!shouldLoad || distanceRef.current === Infinity) return 0;
        // Invert distance so closer = higher priority
        const normalizedDistance = Math.min(
            distanceRef.current / proximityRadius,
            1
        );
        return Math.round((1 - normalizedDistance) * 1000);
    }, [shouldLoad, proximityRadius]);

    // Hook always loads metadata (so frames show), but only loads images when enabled
    // We pass shouldLoad as enabled to control image loading
    const {
        imageUrl: azureImageUrl,
        isLoading,
        error,
        artPieceName,
        artPieceExists,
    } = useAzureArtByIndex(artPieceIndex, useAzureStorage, shouldLoad, priority);

    const finalArtPieceName = artPieceName;

    // Persist the loaded image URL so it stays even when moving away
    useEffect(() => {
        if (azureImageUrl && !isLoading && !error) {
            setLoadedImageUrl(azureImageUrl);
            setHasLoaded(true);
        } else if (error && finalArtPieceName && !loadedImageUrl) {
            // Fallback to local if Azure failed and we don't have a loaded URL
            setLoadedImageUrl(`/images/art/${finalArtPieceName}`);
            setHasLoaded(true);
        } else if (!useAzureStorage && finalArtPieceName && !loadedImageUrl && shouldLoad) {
            // Azure disabled: use local (only when should load)
            setLoadedImageUrl(`/images/art/${finalArtPieceName}`);
            setHasLoaded(true);
        }
    }, [azureImageUrl, isLoading, error, finalArtPieceName, useAzureStorage, loadedImageUrl, shouldLoad]);

    // Use persisted loaded URL if available, otherwise use current URL if near
    const finalImageUrl = loadedImageUrl || (isNear && azureImageUrl && !error ? azureImageUrl : null);

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

    // Show loading state when this is the nearest and loading (and hasn't loaded yet)
    const showLoading = isNear && isNearest && useAzureStorage && isLoading && !hasLoaded;

    // Always render the frame, even if art piece doesn't exist yet or is loading
    // This ensures all frames are visible from the start
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

            {/* Art canvas/image - show if we have a final image URL */}
            {finalImageUrl ? (
                <LazyImagePlane
                    url={finalImageUrl}
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
                    <meshBasicMaterial color="#555555" />
                </mesh>
            )}

            {/* Loading spinner overlay */}
            {showLoading && (
                <Html
                    transform
                    position={[0, 0, FRAME_DEPTH / 2 + 0.02]}
                    distanceFactor={1}
                    style={{
                        pointerEvents: "none",
                        width: `${(dimensions.width - FRAME_THICKNESS * 2) * 400}px`,
                        height: `${(dimensions.height - FRAME_THICKNESS * 2) * 400}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "12px",
                            color: "#ffffff",
                            fontFamily: "system-ui, sans-serif",
                        }}
                    >
                        {/* Spinner */}
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                border: "4px solid rgba(255, 255, 255, 0.2)",
                                borderTop: "4px solid #ffffff",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                        {/* Loading text */}
                        <div
                            style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                            }}
                        >
                            Loading...
                        </div>
                        <style>
                            {`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}
                        </style>
                    </div>
                </Html>
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
