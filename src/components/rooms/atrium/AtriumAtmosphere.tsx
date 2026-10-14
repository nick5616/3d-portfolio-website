import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GodRays, DustMotes } from "../../effects/GodRays";
import { LEVELS, SUN_DIRECTION, SUN_LEAN, WALL_HEIGHT } from "./atriumLayout";

// Light and air: the sun leaning in through the glass, shafts of it
// falling through dusty air onto the pool, the stair and the balcony, and a
// warm haze that gives the height its depth. No shadows or post-processing:
// the shafts are additive cones and the haze is scene fog.

const GLASS_Y = WALL_HEIGHT + 8; // roughly where the shafts pass through the skylight

const shaftRotation = (() => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN_DIRECTION);
    const e = new THREE.Euler().setFromQuaternion(q);
    return [e.x, e.y, e.z] as [number, number, number];
})();

// [x, floor y, z, radius] of each shaft's footprint. Chosen so every shaft
// leans clear of the balconies on its way up.
const SHAFTS: [number, number, number, number][] = [
    [3.4, 0, 1.6, 0.45],
    [5.6, 0, -1.2, 0.34],
    [1.2, 0, 5.6, 0.4],
    [2.6, 0, -4.4, 0.5],
    [3.6, 0, 3.2, 0.38], // across the spiral stair
    [9.4, LEVELS[1], 4.2, 0.38], // onto the first balcony's walkway
];

const shaftLength = (baseY: number) => (GLASS_Y - baseY) / SUN_DIRECTION.y;
// Where a shaft starting at (x, y, z) reaches the glass, for the spotlight.
const sunSource = (x: number, y: number, z: number): [number, number, number] => {
    const rise = GLASS_Y - y;
    return [x + SUN_LEAN[0] * rise, GLASS_Y, z + SUN_LEAN[1] * rise];
};

export const AtriumAtmosphere: React.FC = () => {
    const scene = useThree((state) => state.scene);
    // Warm haze while we're here; hand the previous fog back on the way out.
    // Checked every frame rather than set once: on a fresh load the
    // SceneManager's own (parent) effect installs its fog after ours runs.
    const haze = useMemo(() => new THREE.Fog("#cdbf9f", 16, 78), []);
    const previousFog = useRef<THREE.Scene["fog"]>(null);
    useFrame(() => {
        if (scene.fog !== haze) {
            previousFog.current = scene.fog;
            scene.fog = haze;
        }
    });
    useEffect(
        () => () => {
            if (scene.fog === haze) scene.fog = previousFog.current;
        },
        [scene, haze]
    );

    const sunPosition = useMemo(
        () => SUN_DIRECTION.clone().multiplyScalar(40).toArray() as [number, number, number],
        []
    );
    const poolSource = sunSource(0, 0, 0);

    return (
        <>
            <hemisphereLight intensity={0.5} color="#fff1d6" groundColor="#3b5a46" />
            <ambientLight intensity={0.1} color="#ffe9c9" />
            <directionalLight position={sunPosition} intensity={1.6} color="#ffe7c0" />
            {/* The pool's patch of direct sun */}
            <spotLight
                position={poolSource}
                target-position={[0, 0, 0]}
                angle={0.16}
                penumbra={0.7}
                intensity={55}
                decay={1}
                color="#fff0cc"
            />
            <pointLight position={[0, 0.9, 0]} intensity={3} distance={7} decay={2} color="#4fc3e6" />
            {/* Warm fill up the core so every tier reads */}
            {LEVELS.map((level) => level + 4).map((y) => (
                <pointLight key={y} position={[0, y, 0]} intensity={14} distance={20} decay={1.6} color="#ffe2b8" />
            ))}

            {/* The main shaft onto the pool, with dust thick inside it */}
            <GodRays
                position={[0.2, 0, 0.1]}
                rotation={shaftRotation}
                height={shaftLength(0)}
                radiusBottom={2.9}
                radiusTop={3.0}
                intensity={0.1}
                color="#ffe9bf"
            />
            <group position={[0.2, 0, 0.1]} rotation={shaftRotation}>
                <DustMotes radius={2.7} height={shaftLength(0) - 2} count={480} color="#fff4d8" />
            </group>
            {SHAFTS.map(([x, y, z, r], i) => (
                <GodRays
                    key={i}
                    position={[x, y, z]}
                    rotation={shaftRotation}
                    height={shaftLength(y)}
                    radiusBottom={r}
                    radiusTop={r * 1.35}
                    intensity={0.13}
                    color="#ffe6b5"
                />
            ))}
            {/* Fainter dust everywhere else */}
            <DustMotes radius={10} height={WALL_HEIGHT + 5} count={800} color="#f3e6c8" />
        </>
    );
};
