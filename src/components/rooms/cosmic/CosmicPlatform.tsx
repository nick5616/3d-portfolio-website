import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { NOISE_GLSL } from "./cosmicShaders";
import {
    ALTAR_POSITION,
    DOOR_Z,
    OPPONENT_ALTAR_POSITION,
    TABLES_POSITION,
    PLATFORM_RADIUS,
    TABLE_SIZE,
    TABLE_THICKNESS,
    TABLE_TOP,
} from "./cosmicLayout";

// The ground under your feet: a disc of black glass etched with gold
// geometry that pulses outward from the table, the broken underside of the
// island it was cut from, an invisible rail at the edge, the table, and
// the gateway home.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TAU = Math.PI * 2;

const floorMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uRadius: { value: PLATFORM_RADIUS } },
        vertexShader: /* glsl */ `
            varying vec2 vP;
            void main() {
                vP = position.xz; // the disc is already laid flat
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uRadius;
            varying vec2 vP;
            ${NOISE_GLSL}
            float line(float d, float w) { return smoothstep(w, 0.0, abs(d)); }
            void main() {
                vec2 p = vP;
                float r = length(p);
                float a = atan(p.y, p.x);
                // Black glass with slow violet clouds under the surface.
                float clouds = fbm(vec3(p * 0.35, uTime * 0.03));
                vec3 col = vec3(0.02, 0.012, 0.04) + vec3(0.12, 0.05, 0.22) * smoothstep(0.45, 0.8, clouds);

                // Etched geometry: rings, spokes, and a seven-pointed star
                // (seven columns) around the table.
                float g = 0.0;
                g += line(r - 2.6, 0.02) + line(r - 4.6, 0.025) + line(r - 7.6, 0.03) + line(r - 7.85, 0.015);
                float spokes = abs(sin(a * 7.0 * 0.5));
                g += line(spokes, 0.012 * (1.0 / max(r, 0.5))) * step(2.6, r) * step(r, 7.6);
                for (int k = 0; k < 7; k++) {
                    float ang = float(k) * 6.28318 * 3.0 / 7.0;
                    vec2 a0 = vec2(cos(float(k) * 6.28318 / 7.0), sin(float(k) * 6.28318 / 7.0)) * 4.6;
                    vec2 a1 = vec2(cos(float(k) * 6.28318 / 7.0 + ang), sin(float(k) * 6.28318 / 7.0 + ang)) * 4.6;
                    vec2 pa = p - a0, ba = a1 - a0;
                    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                    g += line(length(pa - ba * h), 0.02);
                }
                // Pulses of light travelling outward along the etching.
                float pulse = smoothstep(0.6, 0.0, abs(fract(r * 0.18 - uTime * 0.12) - 0.5) * 6.0);
                vec3 gold = vec3(1.0, 0.72, 0.3);
                col += gold * min(g, 1.0) * (0.35 + pulse * 1.3);
                // The rim glows.
                col += vec3(0.6, 0.4, 1.0) * smoothstep(uRadius - 0.6, uRadius, r) * 0.5;
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        toneMapped: false,
    });

export const CosmicPlatform: React.FC = () => {
    const floor = useMemo(() => {
        const geometry = new THREE.CircleGeometry(PLATFORM_RADIUS, 96);
        geometry.rotateX(-Math.PI / 2);
        return { geometry, material: floorMaterial() };
    }, []);

    // The underside: a jagged inverted cone of rock.
    const underside = useMemo(() => {
        const geometry = new THREE.ConeGeometry(PLATFORM_RADIUS, 6, 28, 6, true);
        geometry.rotateX(Math.PI);
        geometry.translate(0, -3.02, 0);
        const pos = geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            if (y > -0.1) continue; // keep the rim true
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const n = Math.sin(x * 3.1 + z * 1.7) * Math.cos(z * 2.3 - y * 1.1);
            pos.setXYZ(i, x * (1 + n * 0.12), y + n * 0.4, z * (1 + n * 0.12));
        }
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
            color: "#1a1424",
            roughness: 0.9,
            flatShading: true,
            emissive: "#2a0f50",
            emissiveIntensity: 0.4,
            side: THREE.DoubleSide,
        });
        return { geometry, material };
    }, []);

    const materials = useMemo(
        () => ({
            obsidian: new THREE.MeshPhysicalMaterial({
                color: "#0d0a14",
                roughness: 0.12,
                metalness: 0.4,
                clearcoat: 1,
                clearcoatRoughness: 0.05,
                envMapIntensity: 1.6,
            }),
            gold: new THREE.MeshStandardMaterial({
                color: "#d9a94a",
                roughness: 0.25,
                metalness: 1,
                emissive: "#5a3a08",
                emissiveIntensity: 0.6,
            }),
            rim: new THREE.MeshBasicMaterial({ color: "#b48cff", toneMapped: false }),
        }),
        []
    );

    useEffect(
        () => () => {
            floor.geometry.dispose();
            floor.material.dispose();
            underside.geometry.dispose();
            underside.material.dispose();
            Object.values(materials).forEach((m) => m.dispose());
        },
        [floor, underside, materials]
    );

    useFrame(({ clock }) => {
        floor.material.uniforms.uTime.value = clock.elapsedTime;
    });

    const [tableW, tableD] = TABLE_SIZE;
    const tableY = TABLE_TOP - TABLE_THICKNESS / 2;

    // Invisible rail around the edge, as a ring of boxes (a cylinder hull
    // would be a solid disc).
    const rail = useMemo(() => {
        const segments = 36;
        return Array.from({ length: segments }, (_, k) => {
            const a = (k / segments) * TAU;
            return {
                position: [Math.cos(a) * (PLATFORM_RADIUS + 0.15), 1.5, Math.sin(a) * (PLATFORM_RADIUS + 0.15)] as [
                    number,
                    number,
                    number,
                ],
                rotationY: -a,
                half: [0.15, 2, PLATFORM_RADIUS * Math.sin(Math.PI / segments) * 1.15] as [number, number, number],
            };
        });
    }, []);

    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                <CylinderCollider args={[0.25, PLATFORM_RADIUS + 0.3]} position={[0, -0.25, 0]} />
                {rail.map((box, i) => (
                    <CuboidCollider key={i} args={box.half} position={box.position} rotation={[0, box.rotationY, 0]} />
                ))}
                {/* The table, the board standing on it, and the altar */}
                <CuboidCollider args={[tableW / 2, TABLE_TOP / 2 + 0.6, tableD / 2]} position={[0, TABLE_TOP / 2 + 0.6, 0]} />
                {[ALTAR_POSITION, OPPONENT_ALTAR_POSITION, TABLES_POSITION].map(([x, , z]) => (
                    <CylinderCollider key={`${x},${z}`} args={[0.6, 0.55]} position={[x, 0.6, z]} />
                ))}
                {/* Keeps you out of the space where the Void is */}
                <CylinderCollider args={[2.5, 1.9]} position={[0, 2.5, -2.9]} />
            </RigidBody>

            <mesh geometry={floor.geometry} material={floor.material} />
            <mesh geometry={underside.geometry} material={underside.material} />
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[PLATFORM_RADIUS - 0.04, PLATFORM_RADIUS + 0.02, 128]} />
                <primitive object={materials.rim} attach="material" />
            </mesh>

            {/* The table: an obsidian slab on a single column, gold-edged */}
            <group>
                <mesh position={[0, tableY, 0]} material={materials.obsidian}>
                    <boxGeometry args={[tableW, TABLE_THICKNESS, tableD]} />
                </mesh>
                <mesh position={[0, tableY, 0]} material={materials.gold}>
                    <boxGeometry args={[tableW + 0.03, 0.025, tableD + 0.03]} />
                </mesh>
                <mesh position={[0, (TABLE_TOP - TABLE_THICKNESS) / 2, 0]} material={materials.obsidian}>
                    <cylinderGeometry args={[0.28, 0.5, TABLE_TOP - TABLE_THICKNESS, 7]} />
                </mesh>
                <mesh position={[0, 0.03, 0]} material={materials.gold}>
                    <cylinderGeometry args={[0.62, 0.66, 0.06, 7]} />
                </mesh>
            </group>

            {/* The way home: an obsidian arch around the door's portal */}
            <group position={[0, 0, DOOR_Z]} rotation={[0, Math.PI, 0]}>
                {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * 1.1, 1.15, 0]} material={materials.obsidian}>
                        <boxGeometry args={[0.24, 2.3, 0.3]} />
                    </mesh>
                ))}
                <mesh position={[0, 2.3, 0]} material={materials.obsidian}>
                    <torusGeometry args={[1.1, 0.12, 10, 32, Math.PI]} />
                </mesh>
                <mesh position={[0, 2.3, 0.02]} material={materials.gold}>
                    <torusGeometry args={[0.98, 0.025, 8, 32, Math.PI]} />
                </mesh>
                <mesh position={[0, 0.04, 0]} material={materials.gold}>
                    <boxGeometry args={[2.6, 0.08, 0.6]} />
                </mesh>
                <Text
                    font={DISPLAY_FONT}
                    position={[0, 3.75, 0.05]}
                    fontSize={0.16}
                    letterSpacing={0.2}
                    color="#e9c77a"
                    anchorX="center"
                    anchorY="middle"
                >
                    BACK TO THE ATRIUM
                </Text>
            </group>
        </>
    );
};
