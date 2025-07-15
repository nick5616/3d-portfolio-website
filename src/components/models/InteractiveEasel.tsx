import React, {
    useRef,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface InteractiveEaselProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
}

export const InteractiveEasel: React.FC<InteractiveEaselProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
}) => {
    const easelRef = useRef<THREE.Group>(null);
    const pulsingLightRef = useRef<THREE.PointLight>(null);
    const canvasMeshRef = useRef<THREE.Mesh>(null);
    const { camera, raycaster, scene } = useThree();

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(3);

    // Create drawing texture and canvas
    const { texture, canvas, ctx } = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;

        // Initialize with white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle grid
        ctx.strokeStyle = "#F5F5F5";
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 32) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        return { texture, canvas, ctx };
    }, []);

    // Mouse/touch position tracking
    const getIntersectionPoint = useCallback(
        (event: any) => {
            if (!canvasMeshRef.current) return null;

            // Get the canvas element to calculate mouse position
            const canvas = event.target.closest("canvas");
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(canvasMeshRef.current);

            if (intersects.length > 0) {
                const uv = intersects[0].uv;
                if (uv) {
                    return {
                        x: uv.x * canvas.width,
                        y: (1 - uv.y) * canvas.height, // Flip Y coordinate
                    };
                }
            }
            return null;
        },
        [camera, raycaster, canvas]
    );

    // Drawing functions - simplified approach
    const startDrawing = useCallback(
        (event: any) => {
            event.stopPropagation();
            setIsDrawing(true);

            // Get intersection point on the mesh
            if (!canvasMeshRef.current) return;

            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(canvasMeshRef.current);

            if (intersects.length > 0 && intersects[0].uv) {
                const uv = intersects[0].uv;
                const x = uv.x * canvas.width;
                const y = (1 - uv.y) * canvas.height;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = brushSize;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
        },
        [camera, raycaster, canvas, ctx, currentColor, brushSize]
    );

    const continueDrawing = useCallback(
        (event: any) => {
            if (!isDrawing || !canvasMeshRef.current) return;
            event.stopPropagation();

            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(canvasMeshRef.current);

            if (intersects.length > 0 && intersects[0].uv) {
                const uv = intersects[0].uv;
                const x = uv.x * canvas.width;
                const y = (1 - uv.y) * canvas.height;

                ctx.lineTo(x, y);
                ctx.stroke();
                texture.needsUpdate = true;
            }
        },
        [isDrawing, camera, raycaster, canvas, ctx, texture]
    );

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    // Clear canvas function
    const clearCanvas = useCallback(() => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Redraw grid
        ctx.strokeStyle = "#F5F5F5";
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 32) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        texture.needsUpdate = true;
    }, [ctx, canvas.width, canvas.height, texture]);

    // Animation for pulsing light
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;
        if (pulsingLightRef.current) {
            pulsingLightRef.current.intensity =
                0.3 + Math.sin(elapsed * 1.5) * 0.2;
        }
    });

    return (
        <group
            ref={easelRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {/* Easel base */}
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[4, 3, 0.2]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>

            {/* Interactive drawing canvas - using texture */}
            <mesh
                ref={canvasMeshRef}
                position={[0, 2, 0.11]}
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
            >
                <planeGeometry args={[3.5, 2.5]} />
                <meshStandardMaterial map={texture} toneMapped={false} />
            </mesh>

            {/* Color palette as floating 3D buttons */}
            <group position={[-2.2, 3.5, 0.2]}>
                {[
                    { color: "#000000", pos: [0, 0, 0] },
                    { color: "#FF0000", pos: [0.3, 0, 0] },
                    { color: "#00FF00", pos: [0.6, 0, 0] },
                    { color: "#0000FF", pos: [0, -0.3, 0] },
                    { color: "#FFFF00", pos: [0.3, -0.3, 0] },
                    { color: "#FF00FF", pos: [0.6, -0.3, 0] },
                ].map((colorData, index) => (
                    <mesh
                        key={colorData.color}
                        position={colorData.pos as [number, number, number]}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentColor(colorData.color);
                        }}
                    >
                        <boxGeometry args={[0.2, 0.2, 0.1]} />
                        <meshStandardMaterial
                            color={colorData.color}
                            emissive={
                                currentColor === colorData.color
                                    ? colorData.color
                                    : "#000000"
                            }
                            emissiveIntensity={
                                currentColor === colorData.color ? 0.3 : 0
                            }
                        />
                    </mesh>
                ))}
            </group>

            {/* Clear button */}
            <mesh
                position={[2.2, 3.5, 0.2]}
                onClick={(e) => {
                    e.stopPropagation();
                    clearCanvas();
                }}
            >
                <boxGeometry args={[0.4, 0.3, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Easel legs - positioned to connect to the base properly */}
            {/* Left front leg */}
            <mesh position={[-0.8, 0.75, 0.05]} rotation={[0, 0, -0.15]}>
                <boxGeometry args={[0.08, 1.5, 0.08]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>
            {/* Right front leg */}
            <mesh position={[0.8, 0.75, 0.05]} rotation={[0, 0, 0.15]}>
                <boxGeometry args={[0.08, 1.5, 0.08]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>
            {/* Back support leg - closer to the other two */}
            <mesh position={[0, 0.75, -0.4]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.08, 1.5, 0.08]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>

            {/* Art supplies */}
            <mesh position={[2, 0.1, 0.5]}>
                <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
                <meshStandardMaterial color="#4169E1" />
            </mesh>
            <mesh position={[-2, 0.1, 0.5]}>
                <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
                <meshStandardMaterial color="#8A2BE2" />
            </mesh>
            <mesh position={[1.5, 0.1, 1]}>
                <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
                <meshStandardMaterial color="#FF6347" />
            </mesh>
            <mesh position={[-1.5, 0.1, 1]}>
                <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
                <meshStandardMaterial color="#32CD32" />
            </mesh>

            {/* Pulsing creative light */}
            <pointLight
                ref={pulsingLightRef}
                position={[0, 4, 1]}
                intensity={0.6}
                distance={6}
                color="#6A5ACD"
            />
        </group>
    );
};
