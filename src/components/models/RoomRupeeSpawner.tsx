import { useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Rupee, RupeeData } from "./Rupee";

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

interface RoomRupeeSpawnerProps {
    roomId: string;
    dimensions: [number, number, number]; // [width, height, depth]
    position: [number, number, number]; // room position
    numRupees?: number;
    rupeeScale?: number;
    spawnDelay?: number; // Delay before spawning rupees (ms)
}

export const RoomRupeeSpawner: React.FC<RoomRupeeSpawnerProps> = ({
    roomId,
    dimensions,
    position,
    numRupees = 8,
    rupeeScale = 0.4,
    spawnDelay = 500,
}) => {
    const [shouldSpawn, setShouldSpawn] = useState(false);
    const [hasSpawned, setHasSpawned] = useState(false);

    // Trigger spawning after delay - only once per room
    useEffect(() => {
        if (hasSpawned) return; // Don't spawn again if already spawned

        const timer = setTimeout(() => {
            setShouldSpawn(true);
            setHasSpawned(true);
            console.log(
                `💰 Spawning ${numRupees} rupees in room ${roomId} at position`,
                position,
                "with dimensions",
                dimensions
            );
        }, spawnDelay);

        return () => clearTimeout(timer);
    }, [roomId, numRupees, spawnDelay, hasSpawned]);

    // Generate rupees for the room floor - only once when shouldSpawn becomes true
    const rupees = useMemo(() => {
        if (!shouldSpawn) return [];

        const totalWeight = RUPEE_TYPES.reduce(
            (sum, type) => sum + type.spawnWeight,
            0
        );
        const rupees: RupeeData[] = [];
        const [width, height, depth] = dimensions;
        const [roomX, roomY, roomZ] = position;

        // Create a safe spawning area (avoid edges and center)
        const margin = 2;
        const safeWidth = Math.max(width - margin * 2, 4);
        const safeDepth = Math.max(depth - margin * 2, 4);

        // Calculate room boundaries - rooms are positioned at origin (0,0,0) in scene
        const minX = -width / 2;
        const maxX = width / 2;
        const minZ = -depth / 2;
        const maxZ = depth / 2;

        console.log(`🏠 Room ${roomId} boundaries (local coordinates):`, {
            dimensions: [width, height, depth],
            bounds: {
                x: [minX, maxX],
                z: [minZ, maxZ],
            },
            safeArea: {
                x: [minX + margin, maxX - margin],
                z: [minZ + margin, maxZ - margin],
            },
        });

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

            // Random position within safe area - use local coordinates (room center at 0,0,0)
            const x = minX + margin + Math.random() * safeWidth;
            const z = minZ + margin + Math.random() * safeDepth;
            const y = 0.22; // Slightly above floor (local to room)

            // Random initial rotation
            const initialRotation = new THREE.Euler(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            const rupeePosition = new THREE.Vector3(x, y, z);
            console.log(
                `💰 Rupee ${i + 1} world position:`,
                `x:${x.toFixed(2)}, y:${y.toFixed(2)}, z:${z.toFixed(2)}`,
                "type:",
                selectedType.name
            );

            rupees.push({
                position: rupeePosition, // World coordinates
                initialRotation,
                scale: (rupeeScale + Math.random() * 0.2) / 4, // Match cylinder scale (divided by 4)
                color: new THREE.Color(selectedType.color),
                value: selectedType.value,
                type: selectedType.name,
            });
        }

        return rupees;
    }, [shouldSpawn]); // Only depend on shouldSpawn to prevent re-generation

    // Don't render if not spawning - after all hooks
    if (!shouldSpawn) {
        return null;
    }

    return (
        <group key={`rupee-spawner-${roomId}`}>
            {rupees.map((rupee, index) => (
                <Rupee
                    key={`${roomId}-rupee-${index}`}
                    rupee={rupee}
                    animationType="rotating"
                />
            ))}
        </group>
    );
};
