import React, { useEffect, useMemo, useState } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { GcsArtFrameByIndex } from "../models/GcsArtFrameByIndex";
import { ArtPieceMapper } from "../../utils/artPieceMapper";
import { buildHallLayout } from "../../utils/galleryHallLayout";
import { archwayDirection, CardinalDirection } from "../../utils/archwayDirection";
import { RoomTrim, Skylight } from "../architecture/RoomTrim";
import { HallPlacard } from "../architecture/HallPlacard";

interface GalleryHallRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

// One generic component for every category hall in the gallery wing
// (digitalart, paintings, sketches, lefthanded, miscellaneous, notesappart).
// Which category/floor-plan shape to use comes from config.galleryRoomKind.
export const GalleryHallRoom: React.FC<GalleryHallRoomProps> = ({
    config,
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    if (config.galleryRoomKind?.kind !== "hall") {
        return null;
    }
    const { category } = config.galleryRoomKind;
    // Plaques appear for any piece with a curated title (see ArtPiece.titled),
    // so uncurated halls gain plaques as their pieces get named.
    const showPlaque = true;

    // Never hang art on a wall that has a doorway on it.
    const doorWalls = useMemo(() => {
        const dirs = new Set<CardinalDirection>();
        config.archways.forEach((archway) => {
            dirs.add(archwayDirection(archway.position));
        });
        return dirs;
    }, [config.archways]);

    const [availableArtCount, setAvailableArtCount] = useState<number>(0);

    useEffect(() => {
        setAvailableArtCount(0);
        ArtPieceMapper.getArtPieceCount(category)
            .then((count) => {
                setAvailableArtCount(count);
            })
            .catch((err) => {
                console.warn(`Could not load art count for ${category}:`, err);
            });
    }, [category]);

    const layout = useMemo(() => {
        if (availableArtCount === 0) {
            return { frames: [], dividers: [] };
        }
        return buildHallLayout(
            availableArtCount,
            width,
            height,
            depth,
            wallThickness,
            doorWalls
        );
    }, [availableArtCount, width, height, depth, wallThickness, doorWalls]);

    return (
        <>
            <RoomTrim
                width={width}
                depth={depth}
                height={height}
                archways={config.archways}
            />
            <Skylight width={2.4} length={depth * 0.62} height={height} />
            {/* Wall text beside the entrance (every hall's way in is south) */}
            <HallPlacard
                category={category}
                position={[Math.min(5.6, width / 2 - 1.2), 3.3, depth / 2 - 0.075]}
                rotation={[0, Math.PI, 0]}
                pieceCount={availableArtCount || undefined}
            />

            {layout.dividers.map((divider) => (
                <RigidBody key={divider.id} type="fixed" colliders="cuboid">
                    <mesh position={new THREE.Vector3(...divider.position)}>
                        <boxGeometry args={divider.size} />
                        <primitive
                            object={materials.dividers || materials.walls}
                            attach="material"
                        />
                    </mesh>
                </RigidBody>
            ))}

            {layout.frames.map((slot) => (
                <GcsArtFrameByIndex
                    key={`${config.id}-frame-${slot.index}`}
                    position={slot.position}
                    rotation={slot.rotation}
                    scale={slot.scale}
                    category={category}
                    artPieceIndex={slot.index}
                    useGcsStorage={true}
                    showPlaque={showPlaque}
                    proximityRadius={10}
                />
            ))}
        </>
    );
};
