import React, {
    useRef,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";

interface InteractiveEaselProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    onSubmit?: (blob: Blob) => void;
}

export const InteractiveEasel: React.FC<InteractiveEaselProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    onSubmit,
}) => {
    const easelRef = useRef<THREE.Group>(null);
    const canvasMeshRef = useRef<THREE.Mesh>(null);
    const { camera, raycaster, scene } = useThree();
    const { setIsInteracting } = useSceneStore();

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [isCanvasFocused, setIsCanvasFocused] = useState(false);
    const [currentColor, setCurrentColor] = useState("#000000");
    // TODO: Add a control on the easel to change the brush size
    const [brushSize, setBrushSize] = useState(4);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Prevent pointer lock during drawing
    const preventPointerLockRef = useRef(false);

    // Create drawing texture and canvas
    const { texture, canvas, ctx } = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 500;
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

    const startDrawing = useCallback(
        (event: any) => {
            event.stopPropagation();
            setIsDrawing(true);
            setIsCanvasFocused(true);
            setIsInteracting(true);
            preventPointerLockRef.current = true;

            // Exit pointer lock to switch to mouse mode
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

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
        [
            camera,
            raycaster,
            canvas,
            ctx,
            currentColor,
            brushSize,
            setIsInteracting,
        ]
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

    // Submit canvas as JPEG
    const submitCanvas = useCallback(() => {
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                if (onSubmit) {
                    onSubmit(blob);
                }
                setShowConfirmation(true);
                setTimeout(() => setShowConfirmation(false), 3000);
            },
            "image/jpeg",
            0.9
        );
    }, [canvas, onSubmit]);

    // Handle exiting drawing mode
    const exitDrawingMode = useCallback(() => {
        setIsCanvasFocused(false);
        setIsInteracting(false);
        preventPointerLockRef.current = false; // Allow pointer lock requests again

        // Request pointer lock to switch back to camera mode
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.requestPointerLock();
        }
    }, [setIsInteracting]);

    // Exit canvas focus when ESC key is pressed
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isCanvasFocused) {
                exitDrawingMode();
            }
        };

        if (isCanvasFocused) {
            document.addEventListener("keydown", handleKeyDown);
            return () => {
                document.removeEventListener("keydown", handleKeyDown);
            };
        }
    }, [isCanvasFocused, exitDrawingMode]);

    // Also handle clicks outside the easel to exit drawing mode
    useEffect(() => {
        const handleGlobalClick = (event: MouseEvent) => {
            if (isCanvasFocused && easelRef.current) {
                // Use raycaster to check if click intersects with easel elements
                const mouse = new THREE.Vector2();
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);
                // TODO: Include the greater easel with the controls in the intersection check, so selecting a color does not sometimes exit drawing mode
                const intersects = raycaster.intersectObject(
                    easelRef.current,
                    true
                );

                // If no intersection with easel, exit drawing mode
                if (intersects.length === 0) {
                    exitDrawingMode();
                }
            }
        };

        if (isCanvasFocused) {
            document.addEventListener("click", handleGlobalClick, true);
            return () => {
                document.removeEventListener("click", handleGlobalClick, true);
            };
        }
    }, [isCanvasFocused, exitDrawingMode, camera, raycaster]);

    // Prevent pointer lock requests during drawing
    useEffect(() => {
        const originalRequestPointerLock =
            HTMLElement.prototype.requestPointerLock;

        HTMLElement.prototype.requestPointerLock = function () {
            if (preventPointerLockRef.current) {
                console.log("Prevented pointer lock request during drawing");
                return Promise.resolve();
            }
            return originalRequestPointerLock.call(this);
        };

        return () => {
            HTMLElement.prototype.requestPointerLock =
                originalRequestPointerLock;
        };
    }, []);

    // Ensure pointer lock stays disabled during drawing
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (isCanvasFocused) {
            intervalId = setInterval(() => {
                if (document.pointerLockElement) {
                    console.log("Force exiting pointer lock during drawing");
                    document.exitPointerLock();
                }
            }, 100); // Check every 100ms
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isCanvasFocused]);

    // Safety cleanup: ensure interaction state is cleared on unmount
    useEffect(() => {
        return () => {
            setIsInteracting(false);
            preventPointerLockRef.current = false;
        };
    }, [setIsInteracting]);

    return (
        <group
            ref={easelRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {/* Easel base with consolidated physics */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, 2, 0]}>
                    <boxGeometry args={[4, 3, 0.2]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.8} />
                </mesh>
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
                {/* Back support leg - moved even closer to the front legs */}
                <mesh position={[0, 0.75, -0.2]} rotation={[0.2, 0, 0]}>
                    <boxGeometry args={[0.08, 1.5, 0.08]} />
                    <meshStandardMaterial color="#8B4513" roughness={0.8} />
                </mesh>
            </RigidBody>

            {/* Interactive drawing canvas - using texture */}
            <mesh
                ref={canvasMeshRef}
                position={[0, 2, 0.11]}
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={stopDrawing}
                onPointerLeave={(e) => {
                    e.stopPropagation();
                    stopDrawing();
                }}
            >
                <planeGeometry args={[3.5, 2.5]} />
                <meshStandardMaterial map={texture} toneMapped={false} />
            </mesh>

            {/* Color palette as floating 3D buttons */}
            <group position={[-1.65, 0.6, 0.1]}>
                {[
                    { color: "#000000", pos: [0, 0, 0] },
                    { color: "#FF0000", pos: [0.25, 0, 0] },
                    { color: "#00FF00", pos: [0.5, 0, 0] },
                    { color: "#0000FF", pos: [0.75, 0, 0] },
                    { color: "#FFFF00", pos: [1, 0, 0] },
                    { color: "#FF00FF", pos: [1.25, 0, 0] },
                ].map((colorData) => (
                    <mesh
                        key={colorData.color}
                        position={colorData.pos as [number, number, number]}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentColor(colorData.color);
                        }}
                    >
                        <boxGeometry args={[0.2, 0.2, 0.05]} />
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
            <group position={[1.4, 0.5, 0.1]}>
                <mesh
                    onClick={(e) => {
                        e.stopPropagation();
                        clearCanvas();
                    }}
                >
                    <boxGeometry args={[0.6, 0.4, 0.1]} />
                    <meshStandardMaterial color="#8B4513" />
                </mesh>
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.08}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                >
                    CLEAR
                </Text>
            </group>

            {/* Submit button */}
            <group position={[0.75, 0.5, 0.1]}>
                <mesh
                    onClick={(e) => {
                        e.stopPropagation();
                        submitCanvas();
                    }}
                >
                    <boxGeometry args={[0.6, 0.4, 0.1]} />
                    <meshStandardMaterial color="#2E7D32" />
                </mesh>
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.08}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                >
                    SUBMIT
                </Text>
            </group>

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

            {/* Drawing mode indicator / submission confirmation */}
            {showConfirmation ? (
                <Text
                    position={[0, 3.3, 0.2]}
                    fontSize={0.15}
                    color="#2E7D32"
                    anchorX="center"
                    anchorY="middle"
                >
                    Artwork submitted!
                </Text>
            ) : (
                isCanvasFocused && (
                    <Text
                        position={[0, 3.3, 0.2]}
                        fontSize={0.15}
                        color={
                            currentColor === "#000000"
                                ? "#FFFFFF"
                                : currentColor
                        }
                        anchorX="center"
                        anchorY="middle"
                    >
                        Drawing Mode - Click outside the canvas to exit
                    </Text>
                )
            )}
        </group>
    );
};
