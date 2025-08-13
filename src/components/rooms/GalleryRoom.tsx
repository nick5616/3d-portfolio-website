import React, { useMemo } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { AzureArtFrameByIndex } from "../models/AzureArtFrameByIndex";
import { ArtPieceMapper } from "../../utils/artPieceMapper";

interface GalleryRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

// Compute aesthetically spaced positions for up to N frames around the room
const buildGalleryLayout = (
    count: number,
    width: number,
    depth: number,
    wallThickness: number
): Array<{
    index: number;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
}> => {
    const frames: Array<{
        index: number;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
    }> = [];

    const outerZ = depth / 2 - wallThickness / 2; // wall face z
    const outerX = width / 2 - wallThickness / 2; // wall face x

    const heights = [2.1, 2.8, 3.5]; // vertical variance for interior rows
    const baseY = 2.5;
    const altY = 3.4;
    const smallScale: [number, number, number] = [1.0, 1.0, 1];
    const largeScale: [number, number, number] = [1.2, 1.2, 1];

    const add = (
        position: [number, number, number],
        rotation: [number, number, number],
        scale: [number, number, number]
    ) => {
        if (frames.length < count) {
            frames.push({ index: frames.length, position, rotation, scale });
        }
    };

    // Outer walls
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((x, i) => {
        add(
            [x, i % 2 === 0 ? baseY : altY, -outerZ],
            [0, 0, 0],
            i % 3 === 0 ? largeScale : smallScale
        );
    });
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((x, i) => {
        add(
            [x, i % 2 === 0 ? baseY : altY, outerZ],
            [0, Math.PI, 0],
            i % 3 === 1 ? largeScale : smallScale
        );
    });
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((z, i) => {
        add(
            [-outerX, i % 2 === 0 ? baseY : altY, z],
            [0, Math.PI / 2, 0],
            i % 3 === 2 ? largeScale : smallScale
        );
    });
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]
        .filter((z) => z < -2.5 || z > 2.5)
        .forEach((z, i) => {
            add(
                [outerX, i % 2 === 0 ? baseY : altY, z],
                [0, -Math.PI / 2, 0],
                i % 3 === 0 ? largeScale : smallScale
            );
        });

    // Interior H walls (rebalance)
    const interiorHalfSpanZ = depth * 0.3;
    const interiorXs = [-width / 4, width / 4];
    // Reduced density on vertical interior walls, avoid z near 0 to prevent blockage by horizontal wall
    const verticalZsRaw = [
        -interiorHalfSpanZ + 2,
        -4,
        -2,
        0,
        2,
        4,
        interiorHalfSpanZ - 2,
    ];
    const verticalZs = verticalZsRaw.filter((z) => Math.abs(z) > 1.2);

    interiorXs.forEach((x) => {
        if (x < 0) {
            // Left interior wall at x = -width/4, face toward +x
            verticalZs.forEach((z, i) => {
                const y = heights[i % heights.length];
                add(
                    [x + wallThickness / 2, y, z],
                    [0, Math.PI / 2, 0],
                    smallScale
                );
            });
        } else {
            // Right interior wall at x = +width/4, face toward -x
            verticalZs.forEach((z, i) => {
                const y = heights[(i + 1) % heights.length];
                add(
                    [x - wallThickness / 2, y, z],
                    [0, -Math.PI / 2, 0],
                    smallScale
                );
            });
        }
    });

    // Horizontal interior wall at z = 0: lower density and vertical variance, both faces
    const interiorHalfSpanX = width / 4;
    // Keep more clearance near intersections with vertical walls
    const startX = -interiorHalfSpanX + 1.6;
    const endX = interiorHalfSpanX - 1.6;
    const step = 3.2; // wider spacing to reduce horizontal density
    const horizontalXs: number[] = [];
    for (let x = startX; x <= endX + 0.001; x += step) {
        horizontalXs.push(parseFloat(x.toFixed(2)));
    }
    horizontalXs.forEach((x, i) => {
        // Raise frames near intersections to avoid overlap with vertical-wall frames
        const nearIntersection =
            Math.abs(Math.abs(x) - interiorHalfSpanX) < 2.2;
        const y = nearIntersection ? 3.5 : heights[i % heights.length];
        // Face toward +z
        add([x, y, wallThickness / 2], [0, 0, 0], smallScale);
        // Face toward -z
        add([x, y, -wallThickness / 2], [0, Math.PI, 0], smallScale);
    });

    return frames.slice(0, count);
};

export const GalleryRoom: React.FC<GalleryRoomProps> = ({
    config,
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    React.useEffect(() => {
        ArtPieceMapper.clearCache();
    }, []);

    const totalFrames = 44; // reduced overall to lighten density
    const layout = useMemo(
        () => buildGalleryLayout(totalFrames, width, depth, wallThickness),
        [totalFrames, width, depth, wallThickness]
    );

    return (
        <>
            {/* Vertical dividers */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={new THREE.Vector3(-width / 4, height / 2, 0)}>
                    <boxGeometry args={[wallThickness, height, depth * 0.6]} />
                    <primitive
                        object={materials.dividers || materials.walls}
                        attach="material"
                    />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={new THREE.Vector3(width / 4, height / 2, 0)}>
                    <boxGeometry args={[wallThickness, height, depth * 0.6]} />
                    <primitive
                        object={materials.dividers || materials.walls}
                        attach="material"
                    />
                </mesh>
            </RigidBody>
            {/* Horizontal connector */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={new THREE.Vector3(0, height / 2, 0)}>
                    <boxGeometry args={[width / 2, height, wallThickness]} />
                    <primitive
                        object={materials.dividers || materials.walls}
                        attach="material"
                    />
                </mesh>
            </RigidBody>

            {/* Frames placed aesthetically around the room */}
            {layout.map((slot) => (
                <AzureArtFrameByIndex
                    key={`gallery-frame-${slot.index}`}
                    position={slot.position}
                    rotation={slot.rotation}
                    scale={slot.scale}
                    artPieceIndex={slot.index}
                    useAzureStorage={true}
                    showPlaque={true}
                    proximityRadius={10}
                />
            ))}
        </>
    );
};
