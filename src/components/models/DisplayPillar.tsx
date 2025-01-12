import { Cylinder } from "@react-three/drei";

export const DisplayPillar: React.FC<{
    position: [number, number, number];
    scale?: [number, number, number];
}> = ({ position, scale = [1, 1, 1] }) => {
    return (
        <group position={position} scale={scale}>
            {/* Base */}
            <Cylinder args={[0.6, 0.8, 0.2, 8]} position={[0, 0.1, 0]}>
                <meshStandardMaterial
                    color="#2c2c2c"
                    metalness={0.6}
                    roughness={0.2}
                />
            </Cylinder>

            {/* Main display surface */}
            <Cylinder args={[0.5, 0.5, 4, 8]} position={[0, 2.1, 0]}>
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.4}
                    roughness={0.3}
                />
            </Cylinder>

            {/* Top cap */}
            <Cylinder args={[0.6, 0.5, 0.1, 8]} position={[0, 4.1, 0]}>
                <meshStandardMaterial
                    color="#2c2c2c"
                    metalness={0.6}
                    roughness={0.2}
                />
            </Cylinder>
        </group>
    );
};
