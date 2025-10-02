import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Rupee, RupeeData } from "../../models/Rupee";

const NUM_RUPEES = 30;
const GROUP_ROTATION_SPEED = 0.1;

// Rupee types with their colors, values, and spawn rates
const RUPEE_TYPES = [
    { name: "Green", color: "#00FF00", value: 1, spawnWeight: 50 },
    { name: "Blue", color: "#0080FF", value: 5, spawnWeight: 20 },
    { name: "Red", color: "#FF0000", value: 20, spawnWeight: 10 },
    { name: "Silver", color: "#C0C0C0", value: 100, spawnWeight: 3 },
    { name: "Purple", color: "#8000FF", value: 50, spawnWeight: 4 },
    { name: "Orange", color: "#FF8000", value: 300, spawnWeight: 2 },
    { name: "Black", color: "#333333", value: -20, spawnWeight: 1 },
];

// Use RupeeData interface from the Rupee component

export const RupeeFormationEffect = () => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Gradual group rotation
            groupRef.current.rotation.y += delta * GROUP_ROTATION_SPEED;
            groupRef.current.rotation.x =
                Math.sin(state.clock.getElapsedTime() * 0.2) * 0.2;
        }
    });

    const rupees = useMemo(() => {
        const totalWeight = RUPEE_TYPES.reduce(
            (sum, type) => sum + type.spawnWeight,
            0
        );
        const rupees: RupeeData[] = [];

        for (let i = 0; i < NUM_RUPEES; i++) {
            let randomWeight = Math.random() * totalWeight;
            let selectedType = RUPEE_TYPES[0];

            for (const type of RUPEE_TYPES) {
                randomWeight -= type.spawnWeight;
                if (randomWeight <= 0) {
                    selectedType = type;
                    break;
                }
            }

            // More varied 3D distribution
            const angle = Math.random() * Math.PI * 2;
            const radius = 2 + Math.random() * 4;
            const verticalRange = 4;

            // Random initial rotation in all dimensions
            const initialRotation = new THREE.Euler(
                Math.random() * Math.PI * 2, // X rotation
                Math.random() * Math.PI * 2, // Y rotation
                Math.random() * Math.PI * 2 // Z rotation
            );

            rupees.push({
                position: new THREE.Vector3(),
                initialRotation,
                scale: 0.15 + Math.random() * 0.1,
                color: new THREE.Color(selectedType.color),
                value: selectedType.value,
                speed: 0.3 + Math.random() * 0.4,
                orbitRadius: radius,
                orbitOffset: angle,
                verticalOffset: (Math.random() - 0.5) * verticalRange,
                type: selectedType.name,
            });
        }

        return rupees;
    }, []);

    return (
        <>
            {/* Background gradient sphere */}
            <mesh>
                <sphereGeometry args={[20, 32, 32]} />
                <meshBasicMaterial
                    color="#1a1a2e"
                    side={THREE.BackSide}
                    transparent
                    opacity={0.8}
                />
            </mesh>

            <group ref={groupRef}>
                <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    minDistance={2}
                    maxDistance={10}
                />

                {rupees.map((rupee, index) => (
                    <Rupee
                        key={index}
                        rupee={rupee}
                        animationType="orbital"
                        rotationSpeed={{
                            x: 0.2 + Math.random() * 0.3,
                            y: 0.2 + Math.random() * 0.3,
                            z: 0.1 + Math.random() * 0.2,
                        }}
                    />
                ))}

                {/* Enhanced lighting setup */}
                <ambientLight intensity={0.4} />
                <directionalLight position={[1, 1, 2]} intensity={0.5} />
                <directionalLight position={[-1, -1, -2]} intensity={0.5} />
                <directionalLight position={[2, 0, 0]} intensity={0.3} />
                <directionalLight position={[-2, 0, 0]} intensity={0.3} />
                <directionalLight position={[0, 2, 0]} intensity={0.3} />
                <directionalLight position={[0, -2, 0]} intensity={0.3} />

                {/* Soft point lights for depth */}
                <pointLight
                    position={[0, 0, 5]}
                    intensity={0.2}
                    color="#4444ff"
                />
                <pointLight
                    position={[0, 0, -5]}
                    intensity={0.2}
                    color="#4444ff"
                />
            </group>
        </>
    );
};
