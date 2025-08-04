import * as THREE from "three";
import { useRef, useMemo } from "react";

export const ProjectDisplay: React.FC<{
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    previewUrl?: string;
}> = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    // Create a placeholder texture with a grid pattern
    const placeholderTexture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Fill background
            ctx.fillStyle = "#2a2a2a";
            ctx.fillRect(0, 0, 256, 256);

            // Draw grid
            ctx.strokeStyle = "#3a3a3a";
            ctx.lineWidth = 2;
            for (let i = 0; i <= 256; i += 32) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 256);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(256, i);
                ctx.stroke();
            }

            // Add text
            ctx.fillStyle = "#4a4a4a";
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Project Display", 128, 128);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }, []);

    // Create main display group ref
    const displayRef = useRef<THREE.Group>(null);

    return (
        <group
            ref={displayRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {/* Main panel */}
            <mesh>
                {/* Frame backing */}
                <boxGeometry args={[2, 1.5, 0.1]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.5}
                    roughness={0.2}
                />
            </mesh>

            {/* Screen with preview image */}
            <mesh position={[0, 0, 0.06]} receiveShadow>
                <planeGeometry args={[1.8, 1.3]} />
                <meshStandardMaterial
                    map={placeholderTexture}
                    emissive="#ffffff"
                    emissiveIntensity={0.2}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Stand */}
            <mesh position={[0, -0.9, 0.2]} rotation={[-Math.PI / 6, 0, 0]}>
                <boxGeometry args={[0.4, 0.8, 0.05]} />
                <meshStandardMaterial color="#2c2c2c" metalness={0.6} />
            </mesh>

            {/* Base */}
            <mesh position={[0, -1.2, 0.4]}>
                <boxGeometry args={[0.6, 0.1, 0.4]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
            </mesh>
        </group>
    );
};
