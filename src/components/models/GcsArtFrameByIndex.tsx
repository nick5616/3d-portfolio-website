import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGcsArtByIndex } from "../../hooks/useGcsArtByIndex";
import { ArtPlaque } from "./ArtPlaque";
import { GemPrompt } from "../ui/GemPrompt";
import { ArtCategoryId } from "../../configs/gcsConfig";
import {
    ArtTextureRequest,
    requestArtTexture,
} from "../../utils/artTextureLoader";
import {
    ART_PREVIEW_WIDTH,
    ART_WALL_WIDTH,
    hasImageCdn,
    resizedImageUrl,
} from "../../utils/artImages";
import { artTargets, useArtInspectStore } from "../../stores/artInspectStore";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import {
    FRAME_DEPTH,
    MAT_WIDTH,
    MOULDING_WIDTH,
    buildMouldingGeometry,
    frameMaterials,
    getLightPoolMaterial,
    pictureLightGeometry,
} from "./artFrameParts";

interface GcsArtFrameByIndexProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    category?: ArtCategoryId; // Which GCS art category/folder to pull from (default: digitalart)
    artPieceIndex: number; // Index of the art piece (0, 1, 2, etc.)
    useGcsStorage?: boolean; // Kept for compatibility; art always comes from GCS
    showPlaque?: boolean; // Show a plaque when the piece has a curated title
    proximityRadius?: number; // Unused: the whole room's art loads, nearest first
    lightPool?: boolean; // Soft wash of light on the wall around the frame
}

// Size of the image area. Longest side ~2 m, capped so tall pieces don't
// reach the ceiling.
const artSize = (aspect: number) => {
    let width = 2;
    let height = width / aspect;
    if (height > 2.2) {
        height = 2.2;
        width = height * aspect;
    }
    if (width > 2.8) {
        width = 2.8;
        height = width / aspect;
    }
    return { width, height };
};

const InspectPrompt: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
    <GemPrompt
        center
        keyLabel={isMobile ? null : "E"}
        action={isMobile ? "Tap to inspect" : "Inspect"}
    />
);

export const GcsArtFrameByIndex: React.FC<GcsArtFrameByIndexProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    category = "digitalart",
    artPieceIndex,
    showPlaque = true,
    lightPool = true,
}) => {
    const camera = useThree((state) => state.camera);
    const groupRef = useRef<THREE.Group>(null);
    const artRef = useRef<THREE.Mesh>(null);
    const frameId = useMemo(
        () => `${category}-${artPieceIndex}-${position.join(",")}`,
        [category, artPieceIndex, position]
    );
    const { isMobile } = useDeviceDetection();
    const isAimed = useArtInspectStore((s) => s.aimed?.id === frameId);
    const whiteLight = useSceneStore((s) => s.galleryWhiteLightMode);

    const { artPieceMetadata } = useGcsArtByIndex(category, artPieceIndex);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [aspect, setAspect] = useState(4 / 3);

    // Load preview then full image. Requests are prioritized by distance to
    // the camera at the moment a loader slot frees up.
    useEffect(() => {
        if (!artPieceMetadata) return;
        const worldPosition = new THREE.Vector3();
        const distance = () => {
            if (!groupRef.current) return 1e6;
            groupRef.current.getWorldPosition(worldPosition);
            return worldPosition.distanceTo(camera.position);
        };

        let showingFull = false;
        let cancelled = false;
        const show = (next: THREE.Texture, isFull: boolean) => {
            if (cancelled || (showingFull && !isFull)) return;
            showingFull ||= isFull;
            const image = next.image as { width: number; height: number };
            if (image?.width && image?.height) {
                setAspect(image.width / image.height);
            }
            setTexture(next);
        };

        const requests: ArtTextureRequest[] = [];
        if (hasImageCdn) {
            const preview = requestArtTexture(
                resizedImageUrl(artPieceMetadata.url, ART_PREVIEW_WIDTH, 60),
                // Every preview in the room goes before any full image.
                { priority: () => distance() - 1e5 }
            );
            preview.promise.then((t) => show(t, false)).catch(() => {});
            requests.push(preview);
        }
        const full = requestArtTexture(
            resizedImageUrl(artPieceMetadata.url, ART_WALL_WIDTH, 82),
            { maxSize: ART_WALL_WIDTH, priority: distance }
        );
        full.promise
            .then((t) => show(t, true))
            .catch((error) =>
                console.warn(
                    `Couldn't load ${artPieceMetadata.fileName}:`,
                    error
                )
            );
        requests.push(full);

        return () => {
            cancelled = true;
            requests.forEach((request) => request.release());
        };
    }, [artPieceMetadata, camera]);

    // Register with the single crosshair raycast (ArtAimController).
    useEffect(() => {
        if (!artPieceMetadata) return;
        artTargets.set(frameId, {
            object: artRef,
            category,
            index: artPieceIndex,
        });
        return () => {
            artTargets.delete(frameId);
            const { aimed, setAimed } = useArtInspectStore.getState();
            if (aimed?.id === frameId) setAimed(null);
        };
    }, [frameId, artPieceMetadata, category, artPieceIndex]);

    const { width, height } = artSize(aspect);
    const innerWidth = width + MAT_WIDTH * 2;
    const innerHeight = height + MAT_WIDTH * 2;
    const outerWidth = innerWidth + MOULDING_WIDTH * 2;
    const outerHeight = innerHeight + MOULDING_WIDTH * 2;

    const mouldingGeometry = useMemo(
        () => buildMouldingGeometry(innerWidth, innerHeight),
        [innerWidth, innerHeight]
    );
    useEffect(() => () => mouldingGeometry.dispose(), [mouldingGeometry]);

    const artMaterial = useMemo(
        () => new THREE.MeshBasicMaterial({ toneMapped: false }),
        []
    );
    useEffect(() => {
        artMaterial.map = texture;
        artMaterial.needsUpdate = true;
    }, [artMaterial, texture]);
    useEffect(() => () => artMaterial.dispose(), [artMaterial]);

    // Mount flush against the wall: the frame's back sits on the wall plane.
    const mountPosition = useMemo((): [number, number, number] => {
        const [x, y, z] = position;
        const rotY = rotation[1];
        const offset = FRAME_DEPTH / 2 - 0.02;
        return [x - Math.sin(rotY) * offset, y, z - Math.cos(rotY) * offset];
    }, [position, rotation]);

    const front = FRAME_DEPTH / 2;
    const hasPlaque =
        showPlaque && Boolean(artPieceMetadata?.titled);
    const promptY = -outerHeight / 2 - (hasPlaque ? 0.75 : 0.18);

    return (
        <group
            ref={groupRef}
            position={mountPosition}
            rotation={rotation}
            scale={scale}
        >
            {lightPool && (
                <mesh
                    position={[0, outerHeight * 0.12, -front + 0.025]}
                    material={getLightPoolMaterial(
                        whiteLight ? "#ffffff" : "#ffe6c4",
                        0.28
                    )}
                    renderOrder={-1}
                >
                    <planeGeometry
                        args={[outerWidth * 1.9, outerHeight * 1.7]}
                    />
                </mesh>
            )}

            {/* Moulding */}
            <mesh geometry={mouldingGeometry} material={frameMaterials.moulding} />

            {/* Mat board */}
            <mesh
                position={[0, 0, front - 0.012]}
                material={frameMaterials.mat}
            >
                <planeGeometry args={[innerWidth, innerHeight]} />
            </mesh>

            {/* The art (placeholder tone until the first texture arrives) */}
            <mesh
                ref={artRef}
                position={[0, 0, front - 0.008]}
                material={texture ? artMaterial : frameMaterials.placeholder}
            >
                <planeGeometry args={[width, height]} />
            </mesh>

            {/* Brass picture light above the frame */}
            <mesh
                geometry={pictureLightGeometry}
                material={frameMaterials.brass}
                position={[0, outerHeight / 2 + 0.16, -front]}
                scale={[Math.min(outerWidth * 0.55, 1.2), 1, 1]}
            />

            {hasPlaque && (
                <ArtPlaque
                    position={[0, -outerHeight / 2 - 0.32, front]}
                    artPiece={artPieceMetadata}
                    showPlaque
                />
            )}

            {isAimed && (
                <Html
                    position={[0, promptY, front + 0.05]}
                    zIndexRange={[20, 0]}
                    style={{ pointerEvents: "none" }}
                >
                    <InspectPrompt isMobile={isMobile} />
                </Html>
            )}
        </group>
    );
};
