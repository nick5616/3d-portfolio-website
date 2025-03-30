import React from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomComments } from "./RoomComments";

interface AtriumRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const AtriumRoom: React.FC<AtriumRoomProps> = ({
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

            {/* Water feature for atrium - positioned at the back wall */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    position={[0, height / 2, depth / 2 - 0.5]}
                    rotation={[0, 0, 0]}
                >
                    <boxGeometry args={[width, height, wallThickness]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        emissive="#ffffff"
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            </RigidBody>
            {/* Water plane */}
            <mesh position={[0, 0.1, depth / 2 - 0.48]} rotation={[0, 0, 0]}>
                <planeGeometry args={[width, 2]} />
                <meshStandardMaterial
                    color="#0077ff"
                    transparent
                    opacity={0.6}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>
        </>
    );
};
