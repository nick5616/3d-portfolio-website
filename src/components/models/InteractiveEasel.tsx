import React, { useRef, useState, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingContext, setDrawingContext] =
        useState<CanvasRenderingContext2D | null>(null);

    // Initialize canvas context
    const initCanvas = useCallback((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Set up canvas with white background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Set up drawing styles
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Add a subtle grid pattern to make it look more like a canvas
            ctx.strokeStyle = "#F0F0F0";
            ctx.lineWidth = 0.2;
            for (let i = 0; i < canvas.width; i += 4) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += 6) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }

            // Reset stroke style for drawing
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;

            setDrawingContext(ctx);
        }
    }, []);

    // Initialize canvas when ref is available
    useEffect(() => {
        if (canvasRef.current && !drawingContext) {
            initCanvas(canvasRef.current);
        }
    }, [canvasRef.current, drawingContext, initCanvas]);

    // Handle drawing
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!drawingContext) return;
            e.stopPropagation();
            setIsDrawing(true);
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            drawingContext.beginPath();
            drawingContext.moveTo(x, y);
        },
        [drawingContext]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDrawing || !drawingContext) return;
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            drawingContext.lineTo(x, y);
            drawingContext.stroke();
        },
        [isDrawing, drawingContext]
    );

    const handleMouseUp = useCallback(
        (e?: React.MouseEvent<HTMLCanvasElement>) => {
            setIsDrawing(false);
        },
        []
    );

    // Handle touch events for mobile
    const handleTouchStart = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            if (!drawingContext) return;
            e.preventDefault();
            e.stopPropagation();
            setIsDrawing(true);
            const rect = e.currentTarget.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            drawingContext.beginPath();
            drawingContext.moveTo(x, y);
        },
        [drawingContext]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            if (!isDrawing || !drawingContext) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            drawingContext.lineTo(x, y);
            drawingContext.stroke();
        },
        [isDrawing, drawingContext]
    );

    const handleTouchEnd = useCallback(
        (e?: React.TouchEvent<HTMLCanvasElement>) => {
            setIsDrawing(false);
        },
        []
    );

    // Clear canvas function
    const clearCanvas = useCallback(() => {
        if (drawingContext && canvasRef.current) {
            // Clear with white background
            drawingContext.fillStyle = "#FFFFFF";
            drawingContext.fillRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );

            // Redraw grid pattern
            drawingContext.strokeStyle = "#F0F0F0";
            drawingContext.lineWidth = 0.2;
            for (let i = 0; i < canvasRef.current.width; i += 4) {
                drawingContext.beginPath();
                drawingContext.moveTo(i, 0);
                drawingContext.lineTo(i, canvasRef.current.height);
                drawingContext.stroke();
            }
            for (let i = 0; i < canvasRef.current.height; i += 6) {
                drawingContext.beginPath();
                drawingContext.moveTo(0, i);
                drawingContext.lineTo(canvasRef.current.width, i);
                drawingContext.stroke();
            }

            // Reset stroke style for drawing
            drawingContext.strokeStyle = "#000000";
            drawingContext.lineWidth = 1;
        }
    }, [drawingContext]);

    // Animation for pulsing light only
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
            <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[1.5, 3, 0.1]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>

            {/* Canvas backing */}
            <mesh position={[0, 1.5, 0.1]} rotation={[0, 0, 0]}>
                <planeGeometry args={[1.3, 2]} />
                <meshStandardMaterial
                    color="#FFFFFF"
                    roughness={0.2}
                    metalness={0.05}
                />
            </mesh>

            {/* Interactive drawing canvas */}
            <Html
                transform
                occlude={true}
                position={[-0.32, 1.8, 0.11]}
                rotation={[0, 0, 0]}
                style={{
                    width: "20px",
                    height: "30px",
                    pointerEvents: "auto",
                    userSelect: "none",
                    touchAction: "none",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={40}
                        height={60}
                        style={{
                            border: "1px solid #8B4513",
                            borderRadius: "1px",
                            cursor: "crosshair",
                            backgroundColor: "#FFFFFF",
                            width: "100%",
                            height: "100%",
                            display: "block",
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            clearCanvas();
                        }}
                        style={{
                            position: "absolute",
                            top: "1px",
                            right: "1px",
                            background: "#8B4513",
                            color: "white",
                            border: "none",
                            borderRadius: "1px",
                            padding: "1px",
                            fontSize: "5px",
                            cursor: "pointer",
                            pointerEvents: "auto",
                            lineHeight: "1",
                        }}
                    >
                        ✕
                    </button>
                </div>
            </Html>

            {/* Art supplies around the easel */}
            <mesh position={[0.7, 0.1, 0.3]}>
                <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
                <meshStandardMaterial color="#4169E1" />
            </mesh>

            <mesh position={[-0.7, 0.1, 0.3]}>
                <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
                <meshStandardMaterial color="#8A2BE2" />
            </mesh>

            {/* Pulsing creative light */}
            <pointLight
                ref={pulsingLightRef}
                position={[0, 2.5, 1]}
                intensity={0.5}
                distance={5}
                color="#6A5ACD"
            />
        </group>
    );
};
