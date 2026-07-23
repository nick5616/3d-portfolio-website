import React, { useEffect, useMemo, useState } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { GcsArtFrameByIndex } from "../models/GcsArtFrameByIndex";
import { ArtPieceMapper } from "../../utils/artPieceMapper";
import { buildHallLayout } from "../../utils/galleryHallLayout";
import { archwayDirection, CardinalDirection } from "../../utils/archwayDirection";

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
    const showPlaque = category === "digitalart";

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
        ArtPieceMapper.getArtPieceCount(category).then((count) => {
            setAvailableArtCount(count);
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
