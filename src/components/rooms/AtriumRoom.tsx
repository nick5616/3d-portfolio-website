import React, { useRef, useMemo } from "react";
import { RoomConfig } from "../../types/scene.types";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Rupee types with their colors, values, and spawn rates (same as RupeeFormationEffect)
const RUPEE_TYPES = [
    { name: "Green", color: "#00FF00", value: 1, spawnWeight: 50 },
    { name: "Blue", color: "#0080FF", value: 5, spawnWeight: 20 },
    { name: "Red", color: "#FF0000", value: 20, spawnWeight: 10 },
    { name: "Silver", color: "#C0C0C0", value: 100, spawnWeight: 3 },
    { name: "Purple", color: "#8000FF", value: 50, spawnWeight: 4 },
    { name: "Orange", color: "#FF8000", value: 300, spawnWeight: 2 },
    { name: "Black", color: "#333333", value: -20, spawnWeight: 1 },
];

interface Rupee {
    position: THREE.Vector3;
    initialRotation: THREE.Euler;
    scale: number;
    color: THREE.Color;
    value: number;
    type: string;
}

// Rupee geometry component - using the proper hexagonal rupee shape
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

// Single rupee component
const SingleRupee: React.FC<{ rupee: Rupee }> = ({ rupee }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const rotationSpeed = useRef({
        x: 0.1 + Math.random() * 0.2,
        y: 0.1 + Math.random() * 0.2,
        z: 0.05 + Math.random() * 0.1,
    });

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Gentle floating animation
        const time = state.clock.getElapsedTime();
        meshRef.current.position.y =
            rupee.position.y + Math.sin(time * 2 + rupee.position.x) * 0.1;

        // Gentle rotation
        meshRef.current.rotation.x += delta * rotationSpeed.current.x;
        meshRef.current.rotation.y += delta * rotationSpeed.current.y;
        meshRef.current.rotation.z += delta * rotationSpeed.current.z;
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

interface AtriumRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const AtriumRoom: React.FC<AtriumRoomProps> = ({ width, height }) => {
    // Generate rupees for the glass cylinder
    const rupees = useMemo(() => {
        const totalWeight = RUPEE_TYPES.reduce(
            (sum, type) => sum + type.spawnWeight,
            0
        );
        const rupees: Rupee[] = [];
        const numRupees = 50; // Number of rupees in the cylinder
        const cylinderRadius = 1.2; // Radius of the glass cylinder (reduced to keep rupees inside)
        const cylinderHeight = height - 0.5; // Height from floor to ceiling minus margin

        for (let i = 0; i < numRupees; i++) {
            let randomWeight = Math.random() * totalWeight;
            let selectedType = RUPEE_TYPES[0];

            for (const type of RUPEE_TYPES) {
                randomWeight -= type.spawnWeight;
                if (randomWeight <= 0) {
                    selectedType = type;
                    break;
                }
            }

            // Random position within cylinder bounds
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * cylinderRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y =
                -cylinderHeight / 2 +
                0.5 +
                Math.random() * (cylinderHeight - 1); // Distribute from bottom to top of cylinder

            // Random initial rotation
            const initialRotation = new THREE.Euler(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            rupees.push({
                position: new THREE.Vector3(x, y, z),
                initialRotation,
                scale: (0.3 + Math.random() * 0.2) / 4, // Scaled down by 4x
                color: new THREE.Color(selectedType.color),
                value: selectedType.value,
                type: selectedType.name,
            });
        }

        return rupees;
    }, [height]);

    // Debug: Log rupee count
    console.log(`Generated ${rupees.length} rupees for glass cylinder`);

    return (
        <>
            <group>
                {/* Central ambient light - reduced intensity */}
                <pointLight
                    position={[0, height * 0.9, 0]}
                    intensity={0.4}
                    distance={25}
                    color="#FFFF99"
                    decay={1.5}
                />

                {/* Subtle ceiling spotlight for wood coffers */}
                <spotLight
                    position={[0, height * 0.6, 0]}
                    target-position={[0, height, 0]}
                    intensity={0.6}
                    distance={15}
                    angle={Math.PI / 3}
                    penumbra={0.3}
                    color="#FFF8DC" // Warm white to enhance wood tones
                />

                {/* Reduced rim lighting */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = 10;
                    return (
                        <pointLight
                            key={i}
                            position={[
                                Math.cos(angle) * radius,
                                height * 0.8,
                                Math.sin(angle) * radius,
                            ]}
                            intensity={0.2}
                            distance={15}
                            color="#FFF8DC"
                            decay={1.8}
                        />
                    );
                })}

                {/* Central ceiling lighting - reduced intensity */}
                <pointLight
                    position={[0, height * 0.85, 0]}
                    intensity={8}
                    distance={0}
                    color="#FFFFaa"
                    decay={0.4}
                />

                {/* Wall washing lights to make walls shine */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = width * 0.4;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    return (
                        <spotLight
                            key={`wall-wash-${i}`}
                            position={[x * 0.7, height * 0.8, z * 0.7]}
                            target-position={[x, height * 0.5, z]}
                            intensity={1.2}
                            distance={20}
                            angle={Math.PI / 4}
                            penumbra={0.4}
                            color="#FFFFFF"
                        />
                    );
                })}
            </group>

            {/* Glass cylinder filled with rupees */}
            <group position={[0, height / 2, 0]}>
                {/* Glass cylinder - highly transparent to see rupees */}
                <mesh renderOrder={1000}>
                    <cylinderGeometry args={[1.5, 1.5, height, 32]} />
                    <meshPhysicalMaterial
                        color="#ffffff"
                        transparent={true}
                        opacity={0.25}
                        roughness={0.0}
                        metalness={0.0}
                        transmission={0.98}
                        thickness={0.1}
                        ior={1.5}
                        clearcoat={1.0}
                        clearcoatRoughness={0.0}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>

                {/* Rupees inside the cylinder */}
                {rupees.map((rupee, index) => (
                    <SingleRupee key={index} rupee={rupee} />
                ))}
            </group>
        </>
    );
};
