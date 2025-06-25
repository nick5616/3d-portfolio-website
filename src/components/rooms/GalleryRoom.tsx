import React from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomComments } from "./RoomComments";
import { ArtFrame } from "../models/ArtFrame";
import { getArtImageUrl } from "../../configs/artConfig";

interface GalleryRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const GalleryRoom: React.FC<GalleryRoomProps> = ({
    config,
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />

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

            {/* Art pieces along left vertical divider */}
            {/* Left side of left divider */}
            <ArtFrame
                position={[-width / 4 + 0.5, 2.5, -3]}
                rotation={[0, -Math.PI / 2, 0]}
                scale={[1.2, 1.2, 1]}
                imageUrl={getArtImageUrl(22)} // marvin martian
            />
            <ArtFrame
                position={[-width / 4 + 0.5, 2.5, 3]}
                rotation={[0, -Math.PI / 2, 0]}
                scale={[1.2, 1.2, 1]}
                imageUrl={getArtImageUrl(23)} // monster under
            />

            {/* Left side of right divider */}
            <ArtFrame
                position={[width / 4 - 0.5, 2.5, -3]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[1.2, 1.2, 1]}
                imageUrl={getArtImageUrl(5)} // fuzzy
            />
            <ArtFrame
                position={[width / 4 - 0.5, 2.5, 3]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[1.2, 1.2, 1]}
                imageUrl={getArtImageUrl(3)} // chaos bird
            />

            {/* Art pieces along horizontal connector */}
            {/* Front side of horizontal divider */}
            <ArtFrame
                position={[-3, 2.5, -0.001]}
                rotation={[0, Math.PI, 0]}
                scale={[1.1, 1.1, 1]}
                imageUrl={getArtImageUrl(6)} // tree night
            />
            <ArtFrame
                position={[3, 2.5, -0.001]}
                rotation={[0, Math.PI, 0]}
                scale={[1.1, 1.1, 1]}
                imageUrl={getArtImageUrl(7)} // wispette
            />

            {/* Additional smaller art pieces at different heights */}

            <ArtFrame
                position={[-width / 4 + 0.5, 3.8, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                scale={[0.8, 0.8, 1]}
                imageUrl={getArtImageUrl(11)} // link botw
            />

            {/* Right divider - higher pieces */}
            <ArtFrame
                position={[width / 4 - 0.5, 3.8, 0]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[0.8, 0.8, 1]}
                imageUrl={getArtImageUrl(12)} // okay blue heron
            />
        </>
    );
};
