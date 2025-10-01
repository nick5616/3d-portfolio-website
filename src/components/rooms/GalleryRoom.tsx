import React, { useMemo, useState } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { AzureArtFrameByIndex } from "../models/AzureArtFrameByIndex";
import { ArtPieceMapper } from "../../utils/artPieceMapper";
import { LightSwitch } from "../ui/LightSwitch";
import { useSceneStore } from "../../stores/sceneStore";

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

    // Outer walls - reduced density to make room for more internal wall art
    [-7.5, -1.5, 1.5, 7.5].forEach((x, i) => {
        add(
            [x, centerY, -outerZ],
            [0, 0, 0],
            i % 2 === 0 ? largeScale : smallScale
        );
    });
    [-7.5, -1.5, 1.5, 7.5].forEach((x, i) => {
        add(
            [x, centerY, outerZ],
            [0, Math.PI, 0],
            i % 2 === 1 ? largeScale : smallScale
        );
    });
    [-7.5, -1.5, 1.5, 7.5].forEach((z, i) => {
        add(
            [-outerX, centerY, z],
            [0, Math.PI / 2, 0],
            i % 2 === 0 ? largeScale : smallScale
        );
    });
    [-7.5, -1.5, 1.5, 7.5]
        .filter((z) => z < -2.5 || z > 2.5)
        .forEach((z, i) => {
            add(
                [outerX, centerY, z],
                [0, -Math.PI / 2, 0],
                i % 2 === 1 ? largeScale : smallScale
            );
        });

    // Interior H walls - ALL 10 sections with proper positioning
    //
    // Room Layout (bird's eye view):
    //
    // OUTER WALLS
    // ┌─────────────────────────────────────┐
    // │                                     │
    // │  1│2   3   4│5  <- Section 1,5 face │
    // │   │ ═══════ │      OUTWARD to walls │
    // │  6│7   8   9│10 <- Section 6,10 face│
    // │                     OUTWARD to walls │
    // │                                     │
    // └─────────────────────────────────────┘
    // OUTER WALLS
    //
    // Where:
    // - Sections 1,6 (left outside): Face LEFT toward west outer wall
    // - Sections 5,10 (right outside): Face RIGHT toward east outer wall
    // - Sections 2,7 (left inside): Face RIGHT toward room center
    // - Sections 4,9 (right inside): Face LEFT toward room center
    // - Section 3 (crossbar front): Faces FORWARD toward south outer wall
    // - Section 8 (crossbar back): Faces BACKWARD toward north outer wall
    //
    // H-shape numbering: 1|2_34|5 (top row) and 6|7_89|10 (bottom row)
    const leftWallX = -width / 4; // x = -5
    const rightWallX = width / 4; // x = +5

    // ═══════════════════════════════════════════════════════════════════════════
    // LEFT VERTICAL WALL (4 sections total)
    // ═══════════════════════════════════════════════════════════════════════════

    // Section 1: Left Outside Top (faces west outer wall)
    const section1_leftOutsideTop: [number, number, number] = [
        leftWallX - wallThickness / 2,
        centerY,
        -4,
    ];
    add(section1_leftOutsideTop, [0, -Math.PI / 2, 0], largeScale);

    // Section 2: Left Inside Top (faces room center)
    const section2_leftInsideTop: [number, number, number] = [
        leftWallX + wallThickness / 2,
        centerY,
        -2,
    ];
    add(section2_leftInsideTop, [0, Math.PI / 2, 0], smallScale);

    // Section 6: Left Outside Bottom (faces west outer wall)
    const section6_leftOutsideBottom: [number, number, number] = [
        leftWallX - wallThickness / 2,
        centerY,
        4,
    ];
    add(section6_leftOutsideBottom, [0, -Math.PI / 2, 0], largeScale);

    // Section 7: Left Inside Bottom (faces room center)
    const section7_leftInsideBottom: [number, number, number] = [
        leftWallX + wallThickness / 2,
        centerY,
        2,
    ];
    add(section7_leftInsideBottom, [0, Math.PI / 2, 0], smallScale);

    // ═══════════════════════════════════════════════════════════════════════════
    // RIGHT VERTICAL WALL (4 sections total)
    // ═══════════════════════════════════════════════════════════════════════════

    // Section 5: Right Outside Top (faces east outer wall - entrance side)
    const section5_rightOutsideTop: [number, number, number] = [
        rightWallX + wallThickness / 2,
        centerY,
        -4,
    ];
    add(section5_rightOutsideTop, [0, Math.PI / 2, 0], largeScale);

    // Section 4: Right Inside Top (faces room center)
    const section4_rightInsideTop: [number, number, number] = [
        rightWallX - wallThickness / 2,
        centerY,
        -2,
    ];
    add(section4_rightInsideTop, [0, -Math.PI / 2, 0], smallScale);

    // Section 10: Right Outside Bottom (faces east outer wall - entrance side)
    const section10_rightOutsideBottom: [number, number, number] = [
        rightWallX + wallThickness / 2,
        centerY,
        4,
    ];
    add(section10_rightOutsideBottom, [0, Math.PI / 2, 0], largeScale);

    // Section 9: Right Inside Bottom (faces room center)
    const section9_rightInsideBottom: [number, number, number] = [
        rightWallX - wallThickness / 2,
        centerY,
        2,
    ];
    add(section9_rightInsideBottom, [0, -Math.PI / 2, 0], smallScale);

    // ═══════════════════════════════════════════════════════════════════════════
    // HORIZONTAL CROSSBAR (2 sections total)
    // ═══════════════════════════════════════════════════════════════════════════

    // Section 3: Crossbar Front Face (faces south outer wall)
    const section3_crossbarFront_left: [number, number, number] = [
        -2,
        centerY,
        wallThickness / 2,
    ];
    const section3_crossbarFront_center: [number, number, number] = [
        0,
        centerY,
        wallThickness / 2,
    ];
    const section3_crossbarFront_right: [number, number, number] = [
        2,
        centerY,
        wallThickness / 2,
    ];
    add(section3_crossbarFront_left, [0, 0, 0], largeScale);
    add(section3_crossbarFront_center, [0, 0, 0], smallScale);
    add(section3_crossbarFront_right, [0, 0, 0], largeScale);

    // Section 8: Crossbar Back Face (faces north outer wall)
    const section8_crossbarBack_left: [number, number, number] = [
        -2,
        centerY,
        -wallThickness / 2,
    ];
    const section8_crossbarBack_right: [number, number, number] = [
        2,
        centerY,
        -wallThickness / 2,
    ];
    add(section8_crossbarBack_left, [0, Math.PI, 0], smallScale);
    add(section8_crossbarBack_right, [0, Math.PI, 0], largeScale);

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
    const [availableArtCount, setAvailableArtCount] = useState<number>(0);
    const { galleryWhiteLightMode, toggleGalleryLightMode } = useSceneStore();

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
            {/* Simple light position indicators for debugging */}
            {config.lightPreset.spots?.map((spot, index) => (
                <group key={`light-debug-${index}`}>
                    {/* Light source */}
                    <mesh position={spot.position}>
                        <sphereGeometry args={[0.2]} />
                        <meshBasicMaterial color="red" />
                    </mesh>
                    {/* Target */}
                    <mesh position={spot.target}>
                        <sphereGeometry args={[0.1]} />
                        <meshBasicMaterial color="blue" />
                    </mesh>
                </group>
            ))}

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

            {/* Light Switch - positioned on the east wall, farther from door and higher */}
            <LightSwitch
                position={[9.74, 1.75, 3] as [number, number, number]}
                rotation={[0, -Math.PI / 2, 0] as [number, number, number]}
                onToggle={toggleGalleryLightMode}
                isWhiteLight={galleryWhiteLightMode}
            />
        </>
    );
};
