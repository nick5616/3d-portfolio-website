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
    count: number
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

    const wallZ = 9.5; // North/South
    const wallX = 9.5; // East/West

    const baseY = 2.5;
    const altY = 3.4;
    const smallScale: [number, number, number] = [1.0, 1.0, 1];
    const largeScale: [number, number, number] = [1.2, 1.2, 1];

    // Helper to add if we haven't exceeded count
    const add = (
        position: [number, number, number],
        rotation: [number, number, number],
        scale: [number, number, number]
    ) => {
        if (frames.length < count) {
            frames.push({ index: frames.length, position, rotation, scale });
        }
    };

    // North wall (-z)
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((x, i) => {
        add(
            [x, i % 2 === 0 ? baseY : altY, -wallZ],
            [0, 0, 0],
            i % 3 === 0 ? largeScale : smallScale
        );
    });

    // South wall (+z)
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((x, i) => {
        add(
            [x, i % 2 === 0 ? baseY : altY, wallZ],
            [0, Math.PI, 0],
            i % 3 === 1 ? largeScale : smallScale
        );
    });

    // West wall (-x)
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((z, i) => {
        add(
            [-wallX, i % 2 === 0 ? baseY : altY, z],
            [0, Math.PI / 2, 0],
            i % 3 === 2 ? largeScale : smallScale
        );
    });

    // East wall (+x) but avoid doorway area around z in [-2, 2]
    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]
        .filter((z) => z < -2.5 || z > 2.5)
        .forEach((z, i) => {
            add(
                [wallX, i % 2 === 0 ? baseY : altY, z],
                [0, -Math.PI / 2, 0],
                i % 3 === 0 ? largeScale : smallScale
            );
        });

    // Add interior frames on the center cross walls (x=0 and z=0) to enrich the space
    const innerZs = [-6, -2, 2, 6];
    innerZs.forEach((z, i) => {
        add([0.2, i % 2 === 0 ? baseY : altY, z], [0, 0, 0], smallScale); // x≈0 facing +z
        add([-0.2, i % 2 === 0 ? baseY : altY, z], [0, Math.PI, 0], smallScale); // x≈0 facing -z (back-to-back)
    });

    const innerXs = [-6, -2, 2, 6];
    innerXs.forEach((x, i) => {
        add(
            [x, i % 2 === 0 ? baseY : altY, 0.2],
            [0, Math.PI / 2, 0],
            smallScale
        ); // z≈0 facing +x
        add(
            [x, i % 2 === 0 ? baseY : altY, -0.2],
            [0, -Math.PI / 2, 0],
            smallScale
        ); // z≈0 facing -x
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

    const totalFrames = 24;
    const layout = useMemo(
        () => buildGalleryLayout(totalFrames),
        [totalFrames]
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
                    proximityRadius={12}
                />
            ))}
        </>
    );
};
