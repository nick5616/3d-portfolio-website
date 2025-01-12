// src/components/models/ArtFrame.tsx
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense } from "react";

interface ArtFrameProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    imageUrl: string;
}

const Frame: React.FC<ArtFrameProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    imageUrl,
}) => {
    const texture = useLoader(TextureLoader, imageUrl);

    // Frame dimensions
    const frameWidth = 2;
    const frameHeight = 1.5;
    const frameDepth = 0.1;
    const frameThickness = 0.08;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Main frame box */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[frameWidth, frameHeight, frameDepth]} />
                <meshStandardMaterial color="#8b7355" roughness={0.8} />
            </mesh>

            {/* Canvas backing (dark inner frame) - moved back */}
            <mesh position={[0, 0, frameDepth / 2 - 0.05]}>
                <boxGeometry
                    args={[
                        frameWidth - frameThickness * 2,
                        frameHeight - frameThickness * 2,
                        0.02,
                    ]}
                />
                <meshStandardMaterial color="#2c2c2c" roughness={0.5} />
            </mesh>

            {/* Art canvas/image - moved forward */}
            <mesh position={[0, 0, frameDepth / 2 + 0.01]}>
                <planeGeometry
                    args={[
                        frameWidth - frameThickness * 3,
                        frameHeight - frameThickness * 3,
                    ]}
                />
                <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>

            {/* Corner decorations */}
            {[
                [-1, 1],
                [1, 1],
                [-1, -1],
                [1, -1],
            ].map(([x, y], i) => (
                <mesh
                    key={i}
                    position={[
                        x * (frameWidth / 2 - frameThickness / 2),
                        y * (frameHeight / 2 - frameThickness / 2),
                        frameDepth / 2 + 0.02,
                    ]}
                >
                    <boxGeometry
                        args={[
                            frameThickness * 1.5,
                            frameThickness * 1.5,
                            frameDepth * 1.2,
                        ]}
                    />
                    <meshStandardMaterial
                        color="#6b5335"
                        metalness={0.3}
                        roughness={0.7}
                    />
                </mesh>
            ))}
        </group>
    );
};

export const ArtFrame: React.FC<ArtFrameProps> = (props) => {
    return (
        <Suspense fallback={null}>
            <Frame {...props} />
        </Suspense>
    );
};
