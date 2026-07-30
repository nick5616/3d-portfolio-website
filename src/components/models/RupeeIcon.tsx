import React, { useMemo } from "react";
import * as THREE from "three";
import { createRupeeGeometry } from "../../utils/rupeeGeometry";

interface RupeeIconProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    color: string;
    emissiveIntensity?: number;
}

// A small, purely decorative rupee gem - no collection logic, unlike Rupee.tsx.
// Static (unlike the floor pickups) - it sits fixed on the achievement plaques.
export const RupeeIcon: React.FC<RupeeIconProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 0.055,
    color,
    emissiveIntensity = 0.5,
}) => {
    const geometry = useMemo(() => createRupeeGeometry(), []);

    return (
        <mesh
            geometry={geometry}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={emissiveIntensity * 0.4}
                flatShading
                roughness={0.05}
                metalness={0.85}
                envMapIntensity={4}
                clearcoat={1}
                clearcoatRoughness={0.03}
                ior={1.9}
                reflectivity={1}
                transparent
                opacity={0.8}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};
