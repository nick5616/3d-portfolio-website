import React from "react";
import * as THREE from "three";

interface HolodeckGridProps {
    gridWallsRef: React.RefObject<THREE.Group>;
}

export const HolodeckGrid: React.FC<HolodeckGridProps> = ({ gridWallsRef }) => {
    return (
        <group ref={gridWallsRef}>
            {/* Floor grid - positioned to align with archway entrance */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#f0f0f0" />
            </mesh>

            {/* Grid lines on floor */}
            {Array.from({ length: 17 }).map((_, i) => (
                <React.Fragment key={`floor-${i}`}>
                    <mesh
                        position={[(i - 8) * 0.5 - 0.5, 0.11, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[0.02, 8]} />
                        <meshStandardMaterial
                            color="#00ffff"
                            emissive="#00ffff"
                            emissiveIntensity={0.2}
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                    <mesh
                        position={[-0.5, 0.11, (i - 8) * 0.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[8, 0.02]} />
                        <meshStandardMaterial
                            color="#00ffff"
                            emissive="#00ffff"
                            emissiveIntensity={0.2}
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                </React.Fragment>
            ))}

            {/* Wall grids - floor to ceiling */}
            {[
                {
                    pos: [-0.5, 2.5, -4] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number],
                    width: 8,
                }, // Back
                {
                    pos: [-0.5, 2.5, 4] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number],
                    width: 8,
                }, // Front
                {
                    pos: [-4.5, 2.5, 0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number],
                    width: 8,
                }, // Left
                {
                    pos: [3.5, 2.5, 0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number],
                    width: 8,
                }, // Right
            ].map((wall, idx) => (
                <group
                    key={`wall-${idx}`}
                    position={wall.pos}
                    rotation={wall.rot}
                >
                    <mesh>
                        <planeGeometry args={[wall.width, 5]} />
                        <meshStandardMaterial color="#f0f0f0" />
                    </mesh>
                    {/* Wall grid lines */}
                    {Array.from({ length: Math.round(wall.width * 2) + 1 }).map(
                        (_, i) => (
                            <React.Fragment key={`wall-grid-${i}`}>
                                <mesh
                                    position={[(i - wall.width) * 0.5, 0, 0.01]}
                                >
                                    <planeGeometry args={[0.02, 5]} />
                                    <meshStandardMaterial
                                        color="#00ffff"
                                        emissive="#00ffff"
                                        emissiveIntensity={0.1}
                                        transparent
                                        opacity={0.4}
                                    />
                                </mesh>
                                <mesh position={[0, (i - 8) * 0.3, 0.01]}>
                                    <planeGeometry args={[wall.width, 0.02]} />
                                    <meshStandardMaterial
                                        color="#00ffff"
                                        emissive="#00ffff"
                                        emissiveIntensity={0.1}
                                        transparent
                                        opacity={0.4}
                                    />
                                </mesh>
                            </React.Fragment>
                        )
                    )}
                </group>
            ))}

            {/* Ceiling grid */}
            <mesh position={[-0.5, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#f0f0f0" />
            </mesh>

            {/* Grid lines on ceiling */}
            {Array.from({ length: 17 }).map((_, i) => (
                <React.Fragment key={`ceiling-${i}`}>
                    <mesh
                        position={[(i - 8) * 0.5 - 0.5, 4.99, 0]}
                        rotation={[Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[0.02, 8]} />
                        <meshStandardMaterial
                            color="#00ffff"
                            emissive="#00ffff"
                            emissiveIntensity={0.1}
                            transparent
                            opacity={0.4}
                        />
                    </mesh>
                    <mesh
                        position={[-0.5, 4.99, (i - 8) * 0.5]}
                        rotation={[Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[8, 0.02]} />
                        <meshStandardMaterial
                            color="#00ffff"
                            emissive="#00ffff"
                            emissiveIntensity={0.1}
                            transparent
                            opacity={0.4}
                        />
                    </mesh>
                </React.Fragment>
            ))}
        </group>
    );
};
