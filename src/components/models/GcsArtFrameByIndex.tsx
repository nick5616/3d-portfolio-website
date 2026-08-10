import { useThree, useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import {
    Component,
    ReactNode,
    Suspense,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useGcsArtByIndex } from "../../hooks/useGcsArtByIndex";
import { ArtPlaque } from "./ArtPlaque";
import { nearestArtManager } from "../../utils/nearestArtManager";
import { ArtCategoryId } from "../../configs/gcsConfig";

interface GcsArtFrameByIndexProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    category?: ArtCategoryId; // Which GCS art category/folder to pull from (default: digitalart)
    artPieceIndex: number; // Index of the art piece (0, 1, 2, etc.)
    useGcsStorage?: boolean; // Whether to use GCS-hosted images (default: true)
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

// The 4 corner decorations share identical geometry/material and differ
// only by position - instancing them (1 draw call instead of 4) directly
// targets WebGPURenderer's current weak point: its UBO/binding system has
// severe overhead with many small non-instanced meshes (see three.js issue
// mrdoob/three.js#30560), and this app's galleries can have many frames.
const FrameCorners: React.FC<{ width: number; height: number }> = ({
    width,
    height,
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const offsets = useMemo(
        () =>
            [
                [-1, 1],
                [1, 1],
                [-1, -1],
                [1, -1],
            ] as const,
        []
    );

    useLayoutEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const matrix = new THREE.Matrix4();
        offsets.forEach(([x, y], i) => {
            matrix.makeTranslation(
                x * (width / 2 - FRAME_THICKNESS / 2),
                y * (height / 2 - FRAME_THICKNESS / 2),
                FRAME_DEPTH / 2
            );
            mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }, [offsets, width, height]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 4]}>
            <boxGeometry
                args={[
                    FRAME_THICKNESS * 1.5,
                    FRAME_THICKNESS * 1.5,
                    FRAME_DEPTH * 1.2,
                ]}
            />
            <meshStandardMaterial color="#6b5335" metalness={0.3} roughness={0.7} />
        </instancedMesh>
    );
};

const EmptyCanvasPlane: React.FC<{ width: number; height: number }> = ({
    width,
    height,
}) => (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#555555" />
    </mesh>
);

// useLoader throws into Suspense on a failed fetch (404, CORS, offline API, etc).
// Catch it here so one broken piece falls back to an empty canvas instead of
// taking down the whole scene (WebGLErrorBoundary above re-throws anything
// that isn't a WebGL error).
class ArtTextureErrorBoundary extends Component<
    { url: string; width: number; height: number; children: ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn("Failed to load art piece texture, showing fallback:", error);
    }

    componentDidUpdate(prevProps: { url: string }) {
        if (prevProps.url !== this.props.url && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return <EmptyCanvasPlane width={this.props.width} height={this.props.height} />;
        }
        return this.props.children;
    }
}

const LazyImagePlane: React.FC<{
    url: string;
    width: number;
    height: number;
    onTextureLoaded?: (aspectRatio: number) => void;
}> = ({ url, width, height, onTextureLoaded }) => {
    const texture = useLoader(TextureLoader, url);
    // r3f v9 removed automatic sRGB conversion of texture props - has to be
    // set explicitly now, or photo textures render washed out/desaturated.
    texture.colorSpace = THREE.SRGBColorSpace;

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

const GcsFrameByIndex: React.FC<GcsArtFrameByIndexProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    category = "digitalart",
    artPieceIndex,
    useGcsStorage = true,
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

    // Hook always loads metadata (so frames show), but only resolves the image URL when enabled
    const {
        imageUrl: gcsImageUrl,
        isLoading,
        artPieceName,
        artPieceMetadata,
        artPieceExists,
    } = useGcsArtByIndex(category, artPieceIndex, useGcsStorage, shouldLoad);

    const finalArtPieceName = artPieceName;

    // Persist the loaded image URL so it stays even when moving away
    useEffect(() => {
        if (gcsImageUrl && !isLoading) {
            setLoadedImageUrl(gcsImageUrl);
            setHasLoaded(true);
        } else if (
            !useGcsStorage &&
            finalArtPieceName &&
            !loadedImageUrl &&
            shouldLoad
        ) {
            // GCS disabled: use local (only when should load)
            setLoadedImageUrl(`/images/art/${finalArtPieceName}`);
            setHasLoaded(true);
        }
    }, [
        gcsImageUrl,
        isLoading,
        finalArtPieceName,
        useGcsStorage,
        loadedImageUrl,
        shouldLoad,
    ]);

    // Use persisted loaded URL if available, otherwise use current URL if near
    const finalImageUrl =
        loadedImageUrl || (isNear && gcsImageUrl ? gcsImageUrl : null);

    const [dimensions, setDimensions] = useState<ImageDimensions>({
        width: 2,
        height: 1.5,
        aspectRatio: 4 / 3,
    });

    // Stable reference (useCallback) + a same-value bailout inside the
    // updater: this is passed to LazyImagePlane and read as a useEffect
    // dependency there. Without both, a fresh function identity on every
    // render re-fires that effect, which calls this again, which calls
    // setDimensions again (new object, same values) - an infinite
    // render loop ("Maximum update depth exceeded").
    const updateDimensionsFromAspect = useCallback((aspectRatio: number) => {
        setDimensions((prev) => {
            if (prev.aspectRatio === aspectRatio) return prev;

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
            return { width, height, aspectRatio };
        });
    }, []);

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
    const showLoading = isNear && isNearest && useGcsStorage && isLoading && !hasLoaded;

    // Always render the frame, even if art piece doesn't exist yet or is loading
    // This ensures all frames are visible from the start
    return (
        <group
            ref={groupRef}
            position={mountPosition}
            rotation={rotation}
            scale={scale}
        >
            {/* Keyed on aspect ratio so the one-time jump from the 4:3
            placeholder to the image's real aspect ratio fully remounts this
            subtree instead of reassigning the box geometries' `args` on an
            already-mounted mesh. WebGPU has a known bug where swapping a
            mesh's geometry in place (dispose old, assign new) corrupts
            renderer state - the vertex buffer binding for the new geometry
            doesn't get set, and the render pass eventually throws
            "Vertex buffer slot N ... was not set". A full remount sidesteps
            it by creating a fresh mesh/geometry instead of mutating one. */}
            <group key={`frame-${dimensions.aspectRatio}`}>
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
                <ArtTextureErrorBoundary
                    url={finalImageUrl}
                    width={dimensions.width - FRAME_THICKNESS * 2}
                    height={dimensions.height - FRAME_THICKNESS * 2}
                >
                    <LazyImagePlane
                        url={finalImageUrl}
                        width={dimensions.width - FRAME_THICKNESS * 2}
                        height={dimensions.height - FRAME_THICKNESS * 2}
                        onTextureLoaded={updateDimensionsFromAspect}
                    />
                </ArtTextureErrorBoundary>
            ) : (
                <EmptyCanvasPlane
                    width={dimensions.width - FRAME_THICKNESS * 2}
                    height={dimensions.height - FRAME_THICKNESS * 2}
                />
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
            <FrameCorners width={dimensions.width} height={dimensions.height} />

            {/* Plaque */}
            {showPlaque && finalArtPieceName && artPieceExists && (
                <ArtPlaque
                    position={[
                        0,
                        -dimensions.height / 2 - 0.3,
                        FRAME_DEPTH / 2 + 0.02,
                    ]}
                    rotation={[0, 0, 0]}
                    scale={[1, 1, 1]}
                    artPiece={artPieceMetadata}
                    showPlaque={showPlaque}
                />
            )}
            </group>
        </group>
    );
};

export const GcsArtFrameByIndex: React.FC<GcsArtFrameByIndexProps> = (
    props
) => {
    return (
        <Suspense fallback={null}>
            <GcsFrameByIndex {...props} />
        </Suspense>
    );
};
