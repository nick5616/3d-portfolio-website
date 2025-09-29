import React, { useMemo, useState } from "react";
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

    const centerY = 2.8; // consistent vertical center for all art pieces
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
            [x, centerY, -outerZ],
            [0, 0, 0],
            i % 3 === 0 ? largeScale : smallScale
        );
    });
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((x, i) => {
        add(
            [x, centerY, outerZ],
            [0, Math.PI, 0],
            i % 3 === 1 ? largeScale : smallScale
        );
    });
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((z, i) => {
        add(
            [-outerX, centerY, z],
            [0, Math.PI / 2, 0],
            i % 3 === 2 ? largeScale : smallScale
        );
    });
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]
        .filter((z) => z < -2.5 || z > 2.5)
        .forEach((z, i) => {
            add(
                [outerX, centerY, z],
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
            verticalZs.forEach((z) => {
                add(
                    [x + wallThickness / 2, centerY, z],
                    [0, Math.PI / 2, 0],
                    smallScale
                );
            });
        } else {
            // Right interior wall at x = +width/4, face toward -x
            verticalZs.forEach((z) => {
                add(
                    [x - wallThickness / 2, centerY, z],
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
    horizontalXs.forEach((x) => {
        // Face toward +z
        add([x, centerY, wallThickness / 2], [0, 0, 0], smallScale);
        // Face toward -z
        add([x, centerY, -wallThickness / 2], [0, Math.PI, 0], smallScale);
    });

    return frames.slice(0, count);
};

export const GalleryRoom: React.FC<GalleryRoomProps> = ({
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    const [availableArtCount, setAvailableArtCount] = useState<number>(0);

    React.useEffect(() => {
        ArtPieceMapper.clearCache();

        // Get the actual number of available art pieces
        ArtPieceMapper.getArtPieceCount().then((count) => {
            setAvailableArtCount(count);
        });
    }, []);

    // Use the actual number of available art pieces instead of a fixed number
    const layout = useMemo(() => {
        if (availableArtCount === 0) {
            // Return empty layout while loading
            return [];
        }
        return buildGalleryLayout(
            availableArtCount,
            width,
            depth,
            wallThickness
        );
    }, [availableArtCount, width, depth, wallThickness]);

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
