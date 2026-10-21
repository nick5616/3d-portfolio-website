import { useMemo } from "react";
import * as THREE from "three";
import { Rupee, RupeeData } from "./Rupee";
import { sessionSeed, useRoomSession } from "../../multiplayer/roomSession";
import { mulberry32 } from "../rooms/experiences/forest/forestGen";

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

// A room's rupees are the same for everyone in it: where they lie and what
// they're worth come from the room session's seed, and one picked up by
// anybody is gone for everybody (multiplayer/roomSession.ts). A fresh
// session - the room empty, then someone walks in - lays out fresh ones.

interface RoomRupeeSpawnerProps {
    roomId: string;
    dimensions: [number, number, number]; // [width, height, depth]
    position: [number, number, number]; // room position
    numRupees?: number;
    rupeeScale?: number;
    // Optional custom placement: returns [x, y, z] for the i-th rupee,
    // using `rand` (the room's shared randomness) for any choices.
    pickPosition?: (index: number, rand: () => number) => [number, number, number];
}

export const RoomRupeeSpawner: React.FC<RoomRupeeSpawnerProps> = ({
    roomId,
    dimensions,
    numRupees = 8,
    rupeeScale = 0.4,
    pickPosition,
}) => {
    const session = useRoomSession();

    const rupees = useMemo(() => {
        const rand = mulberry32(sessionSeed(session, `rupees:${roomId}`));
        const totalWeight = RUPEE_TYPES.reduce((sum, type) => sum + type.spawnWeight, 0);
        const rupees: RupeeData[] = [];
        const [width, , depth] = dimensions;

        // Create a safe spawning area (avoid edges and center)
        const margin = 2;
        const safeWidth = Math.max(width - margin * 2, 4);
        const safeDepth = Math.max(depth - margin * 2, 4);

        // Rooms are positioned at the origin, so local coordinates are world ones.
        const minX = -width / 2;
        const minZ = -depth / 2;

        for (let i = 0; i < numRupees; i++) {
            let randomWeight = rand() * totalWeight;
            let selectedType = RUPEE_TYPES[0];

            for (const type of RUPEE_TYPES) {
                randomWeight -= type.spawnWeight;
                if (randomWeight <= 0) {
                    selectedType = type;
                    break;
                }
            }

            // Random position within safe area, unless the room picks its
            // own spots (round or multi-level rooms). y is the low point of
            // the bob.
            const [x, y, z] = pickPosition
                ? pickPosition(i, rand)
                : [minX + margin + rand() * safeWidth, 0.5, minZ + margin + rand() * safeDepth];

            rupees.push({
                position: new THREE.Vector3(x, y, z),
                initialRotation: new THREE.Euler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2),
                scale: (rupeeScale + rand() * 0.2) / 4, // Match cylinder scale (divided by 4)
                color: new THREE.Color(selectedType.color),
                value: selectedType.value,
                type: selectedType.name,
            });
        }

        return rupees;
        // The layout is the session's; nothing else should regrow it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.seed, roomId]);

    return (
        <group key={`rupee-spawner-${roomId}-${session.seed}`}>
            {rupees.map((rupee, index) => (
                <Rupee
                    key={`${roomId}-rupee-${index}`}
                    rupee={rupee}
                    animationType="rotating"
                    sharedKey={`rupee:${roomId}:${index}`}
                />
            ))}
        </group>
    );
};
