import React from "react";
import { Cylinder, Circle } from "@react-three/drei";

export const GreekPillar: React.FC<{
    position: [number, number, number];
    scale?: [number, number, number];
}> = ({ position, scale = [1, 1, 1] }) => {
    const marbleTexture = {
        roughness: 0.3,
        metalness: 0.2,
        color: "#f0f0f0",
    };

    return (
        <group position={position} scale={scale}>
            {/* Base */}
            <Cylinder args={[0.7, 0.8, 0.3, 8]} position={[0, 0.15, 0]}>
                <meshStandardMaterial {...marbleTexture} />
            </Cylinder>

            {/* Main column shaft */}
            <Cylinder args={[0.5, 0.6, 3.4, 16, 4, true]} position={[0, 2, 0]}>
                <meshStandardMaterial {...marbleTexture} />
            </Cylinder>

            {/* Capital (top) */}
            <group position={[0, 3.7, 0]}>
                {/* Echinus */}
                <Cylinder args={[0.8, 0.6, 0.3, 8]} position={[0, 0, 0]}>
                    <meshStandardMaterial {...marbleTexture} />
                </Cylinder>
                {/* Abacus */}
                <Cylinder args={[0.9, 0.9, 0.2, 4]} position={[0, 0.25, 0]}>
                    <meshStandardMaterial {...marbleTexture} />
                </Cylinder>
            </group>

            {/* Fluting detail - vertical lines on the column */}
            {Array(20)
                .fill(null)
                .map((_, i) => {
                    const angle = (i / 20) * Math.PI * 2;
                    const radius = 0.55;
                    return (
                        <Cylinder
                            key={i}
                            args={[0.1, 0.1, 3.4, 4]}
                            position={[
                                Math.cos(angle) * radius,
                                2,
                                Math.sin(angle) * radius,
                            ]}
                            scale={[0.1, 1, 0.1]}
                        >
                            <meshStandardMaterial {...marbleTexture} />
                        </Cylinder>
                    );
                })}
        </group>
    );
};
