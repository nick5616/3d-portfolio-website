import React from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomComments } from "./RoomComments";

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
        </>
    );
};
