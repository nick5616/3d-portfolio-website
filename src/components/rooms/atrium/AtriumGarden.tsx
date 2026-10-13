import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { AtriumMaterials } from "./atriumMaterials";
import {
    BALUSTRADE_RADIUS,
    BED_OUTER,
    COLUMN_COUNT,
    COLUMN_OFFSET,
    LEVELS,
    POOL_RIM,
    STAIR_ANGLE,
    angleGap,
    polar,
    seeded,
} from "./atriumLayout";
import { GardenBuilder, createGardenMaterial } from "./atriumPlants";
import { BED_ARCS, WATER_LEVEL } from "./ReflectingPool";
import { getUrnGeometry, makeInstanced, place } from "./atriumParts";

// Hanging gardens: palms in urns around the ambulatory, a flowering ring
// around the pool, lily pads and lotus on the water, ferns upstairs, and
// ivy spilling over both balconies. One draw call for all the foliage.

const TAU = Math.PI * 2;
const BED_SOIL = 0.38;

// Ground floor urns sit between the doors, under the sconces, pushed back
// against the wall so the walk behind the columns stays ~1 m wide.
export const URN_SPOTS = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return { angle: a, level: 0, radius: 11.45, scale: 0.95 };
}).concat(
    // Small pots on each balcony, flush with the wall between the doors.
    [1, 2].flatMap((level) =>
        [0, 1, 2, 3].map((i) => ({
            angle: Math.PI / 4 + (i * Math.PI) / 2,
            level,
            radius: 11.6,
            scale: 0.6,
        }))
    )
);

export const AtriumGarden: React.FC<{ materials: AtriumMaterials }> = ({ materials }) => {
    const garden = useMemo(() => {
        const builder = new GardenBuilder();

        // Flowering shrubs in the planter ring
        const bedRadius = (POOL_RIM + BED_OUTER) / 2;
        BED_ARCS.forEach(({ start, length }, arc) => {
            const count = 5;
            for (let k = 0; k < count; k++) {
                const seed = arc * 10 + k;
                const a = start + (length * (k + 0.5)) / count + (seeded(seed) - 0.5) * 0.08;
                const [x, z] = polar(bedRadius + (seeded(seed + 1) - 0.5) * 0.15, a);
                builder.shrub(x, BED_SOIL, z, 0.75 + seeded(seed + 2) * 0.35, seed + 1, k % 2 ? 6 : 3);
            }
        });

        // Lily pads (kept clear of the fountain)
        for (let i = 0; i < 11; i++) {
            const a = seeded(i + 300) * TAU;
            const r = 1.35 + seeded(i + 310) * 1.35;
            const [x, z] = polar(r, a);
            builder.lilyPad(x, WATER_LEVEL + 0.006, z, 0.2 + seeded(i + 320) * 0.14, i + 330, i % 3 === 0);
        }

        // Palms and ferns in the urns
        URN_SPOTS.forEach(({ angle, level, radius, scale }, i) => {
            const [x, z] = polar(radius, angle);
            const top = LEVELS[level] + scale * 0.94;
            if (level === 0) builder.palm(x, top, z, 1.5 + seeded(i + 50) * 0.7, i + 60);
            else builder.fern(x, top, z, 0.85, i + 70);
        });

        // Ivy spilling over both balustrades, in loose clusters
        [LEVELS[1], LEVELS[2]].forEach((level, tier) => {
            const rail = BALUSTRADE_RADIUS;
            const clusters = tier === 0 ? 20 : 16;
            for (let c = 0; c < clusters; c++) {
                const center = ((c + seeded(c + tier * 50 + 500)) / clusters) * TAU;
                const strands = 2 + Math.floor(seeded(c + tier * 50 + 520) * 3);
                for (let s = 0; s < strands; s++) {
                    const seed = tier * 1000 + c * 10 + s;
                    const a = center + (seeded(seed + 1) - 0.5) * 0.12;
                    if (angleGap(a, STAIR_ANGLE) < 0.2) continue; // keep the bridge clear
                    // The upper columns stand in the first balcony's rail.
                    const slot = ((a - COLUMN_OFFSET) * COLUMN_COUNT) / TAU;
                    if (tier === 0 && Math.abs(slot - Math.round(slot)) * (TAU / COLUMN_COUNT) * rail < 0.4) continue;
                    const [x, z] = polar(rail, a);
                    const inward = new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a));
                    const length = (tier === 0 ? 1.4 : 1.6) + seeded(seed + 2) * 2.0;
                    builder.ivy(new THREE.Vector3(x, level + 1.0, z), inward, length, seed, 0.65);
                }
            }
        });

        return builder.build();
    }, []);
    const { material, time } = useMemo(() => createGardenMaterial(), []);
    useFrame((_, delta) => {
        time.value += delta;
    });

    const urns = useMemo(() => {
        const matrices = URN_SPOTS.map(({ angle, level, radius, scale }) => {
            const [x, z] = polar(radius, angle);
            return place(x, LEVELS[level], z, angle, [scale, scale, scale]);
        });
        const soil = new THREE.CircleGeometry(0.42, 16);
        soil.rotateX(-Math.PI / 2);
        soil.translate(0, 0.93, 0);
        return {
            urns: makeInstanced(getUrnGeometry(), materials.trim, matrices),
            soil: makeInstanced(soil, materials.soil, matrices),
            soilGeometry: soil,
        };
    }, [materials]);

    useEffect(
        () => () => {
            garden.dispose();
            material.dispose();
            urns.urns.dispose();
            urns.soil.dispose();
            urns.soilGeometry.dispose();
        },
        [garden, material, urns]
    );

    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                {URN_SPOTS.map(({ angle, level, radius, scale }, i) => {
                    const [x, z] = polar(radius, angle);
                    return (
                        <CylinderCollider
                            key={i}
                            args={[scale * 0.5, scale * 0.5]}
                            position={[x, LEVELS[level] + scale * 0.5, z]}
                        />
                    );
                })}
            </RigidBody>
            <primitive object={urns.urns} />
            <primitive object={urns.soil} />
            <mesh geometry={garden} material={material} raycast={() => null} />
        </>
    );
};
