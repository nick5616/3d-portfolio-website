import * as THREE from "three";

export const ProjectDisplay: React.FC<{
    position: [number, number, number];
    scale?: [number, number, number];
    previewUrl: string;
}> = ({ position, scale = [1, 1, 1], previewUrl }) => {
    return (
        <group position={position} scale={scale}>
            {/* Display frame */}
            <group>
                {/* Main display panel */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[2, 1.5, 0.1]} />
                    <meshStandardMaterial
                        color="#1a1a1a"
                        metalness={0.5}
                        roughness={0.2}
                    />
                </mesh>

                {/* Screen/Preview area */}
                <mesh position={[0, 0, 0.051]}>
                    <planeGeometry args={[1.8, 1.3]} />
                    <meshStandardMaterial
                        map={new THREE.TextureLoader().load(previewUrl)}
                        emissive="#ffffff"
                        emissiveIntensity={0.2}
                    />
                </mesh>

                {/* Decorative elements */}
                <mesh position={[0, -0.8, 0.06]}>
                    <boxGeometry args={[0.3, 0.05, 0.02]} />
                    <meshStandardMaterial color="#3d3d3d" metalness={0.7} />
                </mesh>
            </group>

            {/* Stand */}
            <mesh position={[0, -0.9, -0.2]} rotation={[Math.PI / 6, 0, 0]}>
                <boxGeometry args={[0.4, 0.8, 0.05]} />
                <meshStandardMaterial color="#2c2c2c" metalness={0.6} />
            </mesh>

            {/* Base */}
            <mesh position={[0, -1.2, -0.4]}>
                <boxGeometry args={[0.6, 0.1, 0.4]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
            </mesh>
        </group>
    );
};
