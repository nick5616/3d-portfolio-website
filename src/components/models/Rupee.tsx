import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface RupeeData {
    position: THREE.Vector3;
    initialRotation: THREE.Euler;
    scale: number;
    color: THREE.Color;
    value: number;
    type: string;
    // Optional properties for different animation types
    speed?: number;
    orbitRadius?: number;
    orbitOffset?: number;
    verticalOffset?: number;
}

interface RupeeProps {
    rupee: RupeeData;
    animationType?: "floating" | "orbital" | "static" | "rotating";
    rotationSpeed?: {
        x: number;
        y: number;
        z: number;
    };
}

const RupeeGeometry = () => {
    const geometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();

        const vertices = new Float32Array([
            // Front hexagon vertices (0-6)
            0, 0, 0, 0, 2.0, 0, 0.866, 1.0, 0, 0.866, -1.0, 0, 0, -2.0, 0,
            -0.866, -1.0, 0, -0.866, 1.0, 0,

            // Back hexagon vertices (7-13)
            0, 0, -0.5, 0, 2.0, -0.5, 0.866, 1.0, -0.5, 0.866, -1.0, -0.5, 0,
            -2.0, -0.5, -0.866, -1.0, -0.5, -0.866, 1.0, -0.5,

            // Middle ridge vertices (14-19)
            0, 2.5, -0.25, 1.2, 1.3, -0.25, 1.2, -1.3, -0.25, 0, -2.5, -0.25,
            -1.2, -1.3, -0.25, -1.2, 1.3, -0.25,
        ]);

        const indices = new Uint16Array([
            // Front hexagon faces
            0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1,

            // Back hexagon faces
            7, 8, 9, 7, 9, 10, 7, 10, 11, 7, 11, 12, 7, 12, 13, 7, 13, 8,

            // Connect front to middle ridge
            1, 14, 2, 14, 15, 2, 2, 15, 3, 15, 16, 3, 3, 16, 4, 16, 17, 4, 4,
            17, 5, 17, 18, 5, 5, 18, 6, 18, 19, 6, 6, 19, 1, 19, 14, 1,

            // Connect back to middle ridge
            8, 14, 9, 14, 15, 9, 9, 15, 10, 15, 16, 10, 10, 16, 11, 16, 17, 11,
            11, 17, 12, 17, 18, 12, 12, 18, 13, 18, 19, 13, 13, 19, 8, 19, 14,
            8,
        ]);

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(vertices, 3)
        );
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        return geometry;
    }, []);

    return geometry;
};

export const Rupee: React.FC<RupeeProps> = ({
    rupee,
    animationType = "floating",
    rotationSpeed,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const currentRotation = useRef(
        new THREE.Euler().copy(rupee.initialRotation)
    );

    // Default rotation speeds if not provided
    const defaultRotationSpeed = useMemo(
        () => ({
            x: 0.1 + Math.random() * 0.2,
            y: 0.1 + Math.random() * 0.2,
            z: 0.05 + Math.random() * 0.1,
        }),
        []
    );

    const finalRotationSpeed = rotationSpeed || defaultRotationSpeed;

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();

        switch (animationType) {
            case "floating":
                // Gentle floating animation - use base position + floating
                meshRef.current.position.x = rupee.position.x;
                meshRef.current.position.y =
                    rupee.position.y +
                    Math.sin(time * 2 + rupee.position.x) * 0.1;
                meshRef.current.position.z = rupee.position.z;
                break;

            case "orbital":
                // Orbital motion for loading animation
                if (
                    rupee.speed &&
                    rupee.orbitRadius &&
                    rupee.orbitOffset !== undefined
                ) {
                    const ORBITAL_SPEED_FACTOR = 0.15;
                    const BOBBING_FACTOR = 0.1;

                    const angle =
                        time * rupee.speed * ORBITAL_SPEED_FACTOR +
                        rupee.orbitOffset;

                    meshRef.current.position.x =
                        Math.cos(angle) * rupee.orbitRadius;
                    meshRef.current.position.y =
                        Math.sin(angle) * rupee.orbitRadius +
                        Math.sin(time * 2) * BOBBING_FACTOR +
                        (rupee.verticalOffset || 0);
                    meshRef.current.position.z =
                        Math.sin(angle * 0.5) * (rupee.orbitRadius * 0.8);
                }
                break;

            case "rotating":
                // Rotating animation - use base position + upright spinning like Zelda
                meshRef.current.position.x = rupee.position.x;
                meshRef.current.position.y = rupee.position.y;
                meshRef.current.position.z = rupee.position.z;
                break;

            case "static":
                // No position animation, just rotation
                meshRef.current.position.x = rupee.position.x;
                meshRef.current.position.y = rupee.position.y;
                meshRef.current.position.z = rupee.position.z;
                break;
        }

        // Apply rotation based on animation type
        if (animationType === "rotating") {
            // Zelda-style upright spinning - only rotate around Y-axis
            currentRotation.current.y += delta; // Fast Y-axis rotation like in Zelda
            // Keep X and Z rotations at their initial values to maintain upright orientation
            currentRotation.current.x = 0;
            currentRotation.current.z = 0;
        } else {
            // Normal rotation for other animations
            currentRotation.current.x += delta * finalRotationSpeed.x;
            currentRotation.current.y += delta * finalRotationSpeed.y;
            currentRotation.current.z += delta * finalRotationSpeed.z;
        }

        meshRef.current.rotation.copy(currentRotation.current);
    });

    const geometry = RupeeGeometry();

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            position={rupee.position}
            scale={rupee.scale}
            rotation={rupee.initialRotation}
            renderOrder={999}
        >
            <meshPhongMaterial
                color={rupee.color}
                transparent={true}
                opacity={0.9}
                shininess={90}
                specular={new THREE.Color(0xffffff)}
                reflectivity={0.5}
                side={THREE.DoubleSide}
                depthWrite={true}
                depthTest={true}
                alphaTest={0.1}
            />
        </mesh>
    );
};
