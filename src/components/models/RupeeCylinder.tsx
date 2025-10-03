import { useMemo } from "react";
import * as THREE from "three";
import { DisplayRupee, RupeeData } from "./DisplayRupee";
import { useRupeeStore } from "../../stores/rupeeStore";

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

interface RupeeCylinderProps {
    height: number;
    radius?: number;
    numRupees?: number;
    rupeeScale?: number;
    position?: [number, number, number];
    animationType?: "floating" | "orbital" | "static" | "rotating";
}

export const RupeeCylinder: React.FC<RupeeCylinderProps> = ({
    height,
    radius = 1.5,
    numRupees = 50,
    rupeeScale = 0.3,
    position = [0, 0, 0],
    animationType = "floating",
}) => {
    const { rupees: collectedRupees } = useRupeeStore();

    // Generate rupees for the glass cylinder based on collected rupees
    const rupees = useMemo(() => {
        const rupees: RupeeData[] = [];
        const cylinderRadius = radius * 0.8; // Keep rupees inside the cylinder

        // Create rupees based on collected ones
        Object.entries(collectedRupees).forEach(([type, collection]) => {
            const rupeeType = RUPEE_TYPES.find((rt) => rt.name === type);
            if (!rupeeType) return;

            // Create multiple rupees for each collected type (up to collection.count)
            const count = Math.min(collection.count, 10); // Limit to 10 per type for performance

            for (let i = 0; i < count; i++) {
                // Random position within cylinder bounds
                const angle = Math.random() * Math.PI * 2;
                const randomRadius = Math.random() * cylinderRadius;
                const x = Math.cos(angle) * randomRadius;
                const z = Math.sin(angle) * randomRadius;
                const y = -height / 2 + 0.5 + Math.random() * (height - 1);

                // Random initial rotation
                const initialRotation = new THREE.Euler(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );

                rupees.push({
                    position: new THREE.Vector3(x, y, z),
                    initialRotation,
                    scale: (rupeeScale + Math.random() * 0.2) / 4, // Scaled down by 4x
                    color: new THREE.Color(rupeeType.color),
                    value: rupeeType.value,
                    type: rupeeType.name,
                });
            }
        });

        // If no collected rupees, show some default ones
        if (rupees.length === 0) {
            for (let i = 0; i < Math.min(numRupees, 5); i++) {
                const selectedType = RUPEE_TYPES[0]; // Default to green

                const angle = Math.random() * Math.PI * 2;
                const randomRadius = Math.random() * cylinderRadius;
                const x = Math.cos(angle) * randomRadius;
                const z = Math.sin(angle) * randomRadius;
                const y = -height / 2 + 0.5 + Math.random() * (height - 1);

                const initialRotation = new THREE.Euler(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );

                rupees.push({
                    position: new THREE.Vector3(x, y, z),
                    initialRotation,
                    scale: (rupeeScale + Math.random() * 0.2) / 4,
                    color: new THREE.Color(selectedType.color),
                    value: selectedType.value,
                    type: selectedType.name,
                });
            }
        }

        return rupees;
    }, [height, radius, rupeeScale, collectedRupees]);

    return (
        <group position={position}>
            {/* Glass cylinder - highly transparent to see rupees */}
            <mesh renderOrder={1000}>
                <cylinderGeometry args={[radius, radius, height, 32]} />
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
                <DisplayRupee
                    key={index}
                    rupee={rupee}
                    animationType={animationType}
                    rotationSpeed={{
                        x: 0.1,
                        y: 0,
                        z: 0,
                    }}
                />
            ))}
        </group>
    );
};
