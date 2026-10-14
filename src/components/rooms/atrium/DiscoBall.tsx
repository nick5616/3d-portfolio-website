import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUnlockStore } from "../../../stores/unlockStore";
import { RADIUS, WALL_HEIGHT } from "./atriumLayout";

// The Rupee Shop's Disco Ball: a mirror ball hung from the dome on a long
// chain, slowly turning, scattering flecks of light across the rotunda.

const BALL_Y = WALL_HEIGHT - 1.5;
const FLECKS = 260;

const Ball: React.FC = () => {
    const ball = useRef<THREE.Mesh>(null);
    const flecks = useRef<THREE.Points>(null);
    const geometry = useMemo(() => {
        // Spots on the inside of the drum and the balconies: directions
        // from the ball, pushed out to the wall.
        const positions = new Float32Array(FLECKS * 3);
        const colors = new Float32Array(FLECKS * 3);
        const palette = ["#ffffff", "#ffd1f0", "#a8f4ff", "#fff0b0"].map((c) => new THREE.Color(c));
        for (let i = 0; i < FLECKS; i++) {
            const a = Math.random() * Math.PI * 2;
            const down = -0.15 - Math.random() * 0.9;
            const dir = new THREE.Vector3(Math.cos(a), down, Math.sin(a)).normalize();
            const reach = Math.min((RADIUS - 0.2) / Math.hypot(dir.x, dir.z), (BALL_Y - 0.1) / -dir.y);
            positions.set([dir.x * reach, dir.y * reach, dir.z * reach], i * 3);
            palette[i % palette.length].toArray(colors, i * 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
    }, []);
    useEffect(() => () => geometry.dispose(), [geometry]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (ball.current) ball.current.rotation.y = t * 0.4;
        if (flecks.current) {
            flecks.current.rotation.y = t * 0.4;
            (flecks.current.material as THREE.PointsMaterial).opacity = 0.55 + Math.sin(t * 3) * 0.1;
        }
    });

    return (
        <group position={[0, BALL_Y, 0]}>
            <mesh position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 2.4, 6]} />
                <meshStandardMaterial color="#8a8a90" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh ref={ball}>
                <icosahedronGeometry args={[0.7, 3]} />
                <meshStandardMaterial color="#d8e0ff" metalness={1} roughness={0.05} flatShading envMapIntensity={2.5} />
            </mesh>
            <pointLight intensity={6} distance={10} decay={1.5} color="#e8e0ff" />
            <points ref={flecks} geometry={geometry} raycast={() => null}>
                <pointsMaterial
                    size={0.22}
                    vertexColors
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </points>
        </group>
    );
};

export const DiscoBall: React.FC = () => {
    const owned = useUnlockStore((s) => Boolean(s.unlocked["shop-disco"]));
    return owned ? <Ball /> : null;
};
