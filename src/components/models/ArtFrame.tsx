import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";

interface ArtFrameProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    imageUrl: string;
}

interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

const FRAME_DEPTH = 0.1;
const FRAME_THICKNESS = 0.08;
const WALL_OFFSET = -0.75; // Distance to offset from wall center

const Frame: React.FC<ArtFrameProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    imageUrl,
}) => {
    const texture = useLoader(TextureLoader, imageUrl);
    const [dimensions, setDimensions] = useState<ImageDimensions>({
        width: 2,
        height: 1.5,
        aspectRatio: 4 / 3,
    });

    // Calculate mounting position based on rotation
    const getMountPosition = (): [number, number, number] => {
        const [x, y, z] = position;
        const [_, rotY] = rotation;

        // Use rotation to determine which wall we're on
        if (Math.abs(rotY) === Math.PI / 2) {
            // Frame faces east/west
            return x < 0 ? [x + WALL_OFFSET, y, z] : [x - WALL_OFFSET, y, z];
        } else {
            // Frame faces north/south
            return z < 0 ? [x, y, z + WALL_OFFSET] : [x, y, z - WALL_OFFSET];
        }
    };

    // Calculate frame dimensions based on image aspect ratio
    useEffect(() => {
        if (texture) {
            const aspectRatio = texture.image.width / texture.image.height;
            let width = 2;
            let height = width / aspectRatio;

            if (height > 2.5) {
                height = 2.5;
                width = height * aspectRatio;
            }

            if (width > 3) {
                width = 3;
                height = width / aspectRatio;
            }

            setDimensions({ width, height, aspectRatio });
        }
    }, [texture]);

    const mountPosition = getMountPosition();

    return (
        <group position={mountPosition} rotation={rotation} scale={scale}>
            {/* Main frame box */}
            <mesh castShadow>
                <boxGeometry
                    args={[dimensions.width, dimensions.height, FRAME_DEPTH]}
                />
                <meshStandardMaterial color="#8b7355" roughness={0.8} />
            </mesh>

            {/* Canvas backing */}
            <mesh position={[0, 0, FRAME_DEPTH / 2 - 0.02]}>
                <boxGeometry
                    args={[
                        dimensions.width - FRAME_THICKNESS * 2,
                        dimensions.height - FRAME_THICKNESS * 2,
                        0.02,
                    ]}
                />
                <meshStandardMaterial color="#2c2c2c" roughness={0.5} />
            </mesh>

            {/* Art canvas/image */}
            <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.01]}>
                <planeGeometry
                    args={[
                        dimensions.width - FRAME_THICKNESS * 2,
                        dimensions.height - FRAME_THICKNESS * 2,
                    ]}
                />
                <meshBasicMaterial
                    map={texture}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                />
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
                        x * (dimensions.width / 2 - FRAME_THICKNESS / 2),
                        y * (dimensions.height / 2 - FRAME_THICKNESS / 2),
                        FRAME_DEPTH / 2,
                    ]}
                >
                    <boxGeometry
                        args={[
                            FRAME_THICKNESS * 1.5,
                            FRAME_THICKNESS * 1.5,
                            FRAME_DEPTH * 1.2,
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
