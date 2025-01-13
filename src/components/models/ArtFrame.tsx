// src/components/models/ArtFrame.tsx
import { useLoader, useThree } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense, useEffect, useState } from "react";

interface ArtFrameProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    imageUrl: string;
    wallOffset?: number; // Distance from wall
}

interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

const Frame: React.FC<ArtFrameProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    imageUrl,
    wallOffset = 0.15, // Default wall offset
}) => {
    const texture = useLoader(TextureLoader, imageUrl);
    const [dimensions, setDimensions] = useState<ImageDimensions>({
        width: 2,
        height: 1.5,
        aspectRatio: 4 / 3,
    });

    // Calculate frame dimensions based on image aspect ratio
    useEffect(() => {
        if (texture) {
            const aspectRatio = texture.image.width / texture.image.height;
            let width = 2; // Base width
            let height = width / aspectRatio;

            // If height would be too tall, constrain by height instead
            if (height > 2) {
                height = 2;
                width = height * aspectRatio;
            }

            setDimensions({
                width,
                height,
                aspectRatio,
            });
        }
    }, [texture]);

    // Frame properties
    const frameDepth = 0.1;
    const frameThickness = 0.08;

    // Adjust position to be closer to wall
    const adjustedPosition: [number, number, number] = [
        position[0],
        position[1],
        position[2] + wallOffset,
    ];

    return (
        <group position={adjustedPosition} rotation={rotation} scale={scale}>
            {/* Main frame box */}
            <mesh castShadow receiveShadow>
                <boxGeometry
                    args={[dimensions.width, dimensions.height, frameDepth]}
                />
                <meshStandardMaterial color="#8b7355" roughness={0.8} />
            </mesh>

            {/* Canvas backing (dark inner frame) */}
            <mesh position={[0, 0, frameDepth / 2 - 0.05]}>
                <boxGeometry
                    args={[
                        dimensions.width - frameThickness * 2,
                        dimensions.height - frameThickness * 2,
                        0.02,
                    ]}
                />
                <meshStandardMaterial color="#2c2c2c" roughness={0.5} />
            </mesh>

            {/* Art canvas/image */}
            <mesh position={[0, 0, frameDepth / 2 + 0.01]}>
                <planeGeometry
                    args={[
                        dimensions.width - frameThickness * 3,
                        dimensions.height - frameThickness * 3,
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
                        x * (dimensions.width / 2 - frameThickness / 2),
                        y * (dimensions.height / 2 - frameThickness / 2),
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
