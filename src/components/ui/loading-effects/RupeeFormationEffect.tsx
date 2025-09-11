import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

const NUM_RUPEES = 30;
const ORBITAL_SPEED_FACTOR = 0.15;
const BOBBING_FACTOR = 0.1;
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

interface Rupee {
    position: THREE.Vector3;
    initialRotation: THREE.Euler;
    scale: number;
    color: THREE.Color;
    value: number;
    speed: number;
    orbitRadius: number;
    orbitOffset: number;
    verticalOffset: number;
    type: string;
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

const SingleRupee = ({ rupee }: { rupee: Rupee }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const rotationSpeed = useRef({
        x: 0.2 + Math.random() * 0.3,
        y: 0.2 + Math.random() * 0.3,
        z: 0.1 + Math.random() * 0.2,
    });

    // Set initial rotation when the component mounts
    const currentRotation = useRef(
        new THREE.Euler().copy(rupee.initialRotation)
    );

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();

        // Orbital motion
        const angle =
            time * rupee.speed * ORBITAL_SPEED_FACTOR + rupee.orbitOffset;

        meshRef.current.position.x = Math.cos(angle) * rupee.orbitRadius;
        meshRef.current.position.y =
            Math.sin(angle) * rupee.orbitRadius +
            Math.sin(time * 2) * BOBBING_FACTOR +
            rupee.verticalOffset;
        meshRef.current.position.z =
            Math.sin(angle * 0.5) * (rupee.orbitRadius * 0.8);

        // Update current rotation
        currentRotation.current.x += delta * rotationSpeed.current.x;
        currentRotation.current.y += delta * rotationSpeed.current.y;
        currentRotation.current.z += delta * rotationSpeed.current.z;

        // Apply the rotation
        meshRef.current.rotation.copy(currentRotation.current);
    });

    const geometry = RupeeGeometry();

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            scale={rupee.scale}
            rotation={rupee.initialRotation}
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
        const rupees: Rupee[] = [];

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
                    <SingleRupee key={index} rupee={rupee} />
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
