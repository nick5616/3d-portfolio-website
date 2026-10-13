import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Archway } from "../../types/scene.types";
import { archwayDirection } from "../../utils/archwayDirection";

// Baseboard + crown moulding around a rectangular room, broken around
// doorways. Everything for one room is merged into two meshes (one per
// material), so the extra detail costs two draw calls.

interface Run {
    start: number;
    end: number;
}

// Wall runs along one wall's length, minus the doorway openings on it.
const runsFor = (length: number, doors: { center: number; width: number }[]): Run[] => {
    let runs: Run[] = [{ start: -length / 2, end: length / 2 }];
    doors.forEach(({ center, width }) => {
        const a = center - width / 2 - 0.25;
        const b = center + width / 2 + 0.25;
        runs = runs.flatMap((run) => {
            if (b <= run.start || a >= run.end) return [run];
            const pieces: Run[] = [];
            if (a > run.start) pieces.push({ start: run.start, end: a });
            if (b < run.end) pieces.push({ start: b, end: run.end });
            return pieces;
        });
    });
    return runs.filter((run) => run.end - run.start > 0.05);
};

export const RoomTrim: React.FC<{
    width: number;
    depth: number;
    height: number;
    archways: Archway[];
    baseColor?: string;
    crownColor?: string;
    inset?: number; // distance from wall center to the room-side face
}> = ({
    width,
    depth,
    height,
    archways,
    baseColor = "#2b211b",
    crownColor = "#f2eee6",
    inset = 0.06,
}) => {
    const { base, crown } = useMemo(() => {
        const baseParts: THREE.BufferGeometry[] = [];
        const crownParts: THREE.BufferGeometry[] = [];
        const walls = [
            { dir: "north", length: width, place: (c: number, y: number, d: number) => [c, y, -depth / 2 + inset + d / 2], rotY: 0 },
            { dir: "south", length: width, place: (c: number, y: number, d: number) => [c, y, depth / 2 - inset - d / 2], rotY: 0 },
            { dir: "west", length: depth, place: (c: number, y: number, d: number) => [-width / 2 + inset + d / 2, y, c], rotY: Math.PI / 2 },
            { dir: "east", length: depth, place: (c: number, y: number, d: number) => [width / 2 - inset - d / 2, y, c], rotY: Math.PI / 2 },
        ] as const;

        walls.forEach((wall) => {
            const doors = archways
                .filter((a) => archwayDirection(a.position) === wall.dir)
                .map((a) => ({
                    center: wall.dir === "north" || wall.dir === "south" ? a.position[0] : a.position[2],
                    width: a.width,
                }));
            runsFor(wall.length, doors).forEach((run) => {
                const length = run.end - run.start;
                const center = (run.start + run.end) / 2;
                const add = (parts: THREE.BufferGeometry[], h: number, d: number, y: number) => {
                    const box = new THREE.BoxGeometry(length, h, d);
                    box.rotateY(wall.rotY);
                    const [x, py, z] = wall.place(center, y, d);
                    box.translate(x, py, z);
                    parts.push(box);
                };
                add(baseParts, 0.16, 0.035, 0.08); // baseboard
                add(baseParts, 0.025, 0.05, 0.17); // its cap
            });
            // Crown runs the full wall (doors never reach the ceiling)
            const add = (h: number, d: number, y: number) => {
                const box = new THREE.BoxGeometry(wall.length, h, d);
                box.rotateY(wall.rotY);
                const [x, py, z] = wall.place(0, y, d);
                box.translate(x, py, z);
                crownParts.push(box);
            };
            add(0.22, 0.05, height - 0.11);
            add(0.06, 0.11, height - 0.25);
            add(0.04, 0.03, height - 0.42); // picture rail
        });

        const merge = (parts: THREE.BufferGeometry[]) => {
            const merged = mergeGeometries(parts)!;
            parts.forEach((p) => p.dispose());
            return merged;
        };
        return { base: merge(baseParts), crown: merge(crownParts) };
    }, [width, depth, height, archways, inset]);

    return (
        <>
            <mesh geometry={base}>
                <meshStandardMaterial color={baseColor} roughness={0.5} />
            </mesh>
            <mesh geometry={crown}>
                <meshStandardMaterial color={crownColor} roughness={0.7} />
            </mesh>
        </>
    );
};

// A rectangular skylight: a recessed frame with a softly glowing pane.
// Looks like daylight pouring in; costs one unlit draw.
export const Skylight: React.FC<{
    width: number;
    length: number;
    height: number;
    color?: string;
}> = ({ width, length, height, color = "#fff8ec" }) => {
    const mullions = Math.max(0, Math.round(length / 2.2) - 1);
    return (
    <group position={[0, height - 0.02, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
            <planeGeometry args={[width, length]} />
            <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        {/* Mullions */}
        {Array.from({ length: mullions }, (_, i) => (
            <mesh key={i} position={[0, -0.03, -length / 2 + ((i + 1) * length) / (mullions + 1)]}>
                <boxGeometry args={[width, 0.05, 0.08]} />
                <meshStandardMaterial color="#e8e2d6" roughness={0.6} />
            </mesh>
        ))}
        {[-1, 1].map((side) => (
            <mesh key={`x${side}`} position={[(side * (width + 0.16)) / 2, -0.12, 0]}>
                <boxGeometry args={[0.16, 0.24, length + 0.32]} />
                <meshStandardMaterial color="#f2eee6" roughness={0.8} />
            </mesh>
        ))}
        {[-1, 1].map((side) => (
            <mesh key={`z${side}`} position={[0, -0.12, (side * (length + 0.16)) / 2]}>
                <boxGeometry args={[width, 0.24, 0.16]} />
                <meshStandardMaterial color="#f2eee6" roughness={0.8} />
            </mesh>
        ))}
    </group>
);
};
