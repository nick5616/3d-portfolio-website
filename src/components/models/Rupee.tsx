import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRupeeStore } from "../../stores/rupeeStore";
import { useSceneStore } from "../../stores/sceneStore";
import { createRupeeGeometry } from "../../utils/rupeeGeometry";

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
    const geometry = useMemo(() => createRupeeGeometry(), []);
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
    const [isCollected, setIsCollected] = useState(false);
    const { addRupee } = useRupeeStore();
    const { playerPosition } = useSceneStore();

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
        if (!meshRef.current || isCollected) return;

        const time = state.clock.getElapsedTime();

        // Check for player collision
        const distance = meshRef.current.position.distanceTo(
            new THREE.Vector3(
                playerPosition[0],
                playerPosition[1],
                playerPosition[2]
            )
        );

        if (distance < 1.5) {
            // Collection radius
            setIsCollected(true);
            addRupee(rupee.type);
            return; // Don't animate collected rupees
        }

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

            case "rotating": {
                // Upright spinning like Zelda, plus a slow, gentle bob that
                // rises up from the base position and settles back down -
                // base position is the floor of the motion, not the middle,
                // so it never dips below where it was placed.
                const ROTATING_BOB_SPEED = 0.6;
                const ROTATING_BOB_HEIGHT = 0.18;
                const bobPhase =
                    time * ROTATING_BOB_SPEED +
                    rupee.position.x * 3 +
                    rupee.position.z * 3;

                meshRef.current.position.x = rupee.position.x;
                meshRef.current.position.y =
                    rupee.position.y +
                    ((Math.sin(bobPhase) + 1) / 2) * ROTATING_BOB_HEIGHT;
                meshRef.current.position.z = rupee.position.z;
                break;
            }

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
            visible={!isCollected} // Hide collected rupees instead of unmounting
        >
            <meshPhysicalMaterial
                color={rupee.color}
                emissive={rupee.color}
                emissiveIntensity={0.2}
                flatShading
                roughness={0.05}
                metalness={0.85}
                envMapIntensity={4}
                clearcoat={1}
                clearcoatRoughness={0.03}
                ior={1.9}
                reflectivity={1}
                transparent
                opacity={0.8}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};
