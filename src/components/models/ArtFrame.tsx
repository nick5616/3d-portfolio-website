import * as THREE from "three";
import { Cylinder } from "@react-three/drei";

export const ArtFrame: React.FC<{
    position: [number, number, number];
    scale?: [number, number, number];
    imageUrl: string;
}> = ({ position, scale = [1, 1, 1], imageUrl }) => {
    return (
        <group position={position} scale={scale}>
            {/* Frame */}
            <group>
                {/* Top */}
                <Cylinder
                    args={[0.05, 0.05, 2, 4]}
                    position={[0, 1, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                >
                    <meshStandardMaterial color="#8b7355" roughness={0.8} />
                </Cylinder>
                {/* Bottom */}
                <Cylinder
                    args={[0.05, 0.05, 2, 4]}
                    position={[0, -1, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                >
                    <meshStandardMaterial color="#8b7355" roughness={0.8} />
                </Cylinder>
                {/* Left */}
                <Cylinder args={[0.05, 0.05, 2, 4]} position={[-1, 0, 0]}>
                    <meshStandardMaterial color="#8b7355" roughness={0.8} />
                </Cylinder>
                {/* Right */}
                <Cylinder args={[0.05, 0.05, 2, 4]} position={[1, 0, 0]}>
                    <meshStandardMaterial color="#8b7355" roughness={0.8} />
                </Cylinder>
            </group>

            {/* Canvas/Image plane */}
            <mesh position={[0, 0, -0.02]}>
                <planeGeometry args={[1.9, 1.9]} />
                <meshStandardMaterial
                    map={new THREE.TextureLoader().load(imageUrl)}
                />
            </mesh>

            {/* Backing */}
            <mesh position={[0, 0, -0.03]}>
                <planeGeometry args={[2, 2]} />
                <meshStandardMaterial color="#2c2c2c" />
            </mesh>
        </group>
    );
};
