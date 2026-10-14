import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { EnhancedMaterialSystem } from "../../configs/enhancedMaterials";
import { DustMotes } from "../effects/GodRays";

// A holed "fairy stone" (hag stone / Men-an-Tol): the folklore says looking
// or stepping through the hole takes you to another world. In the forest,
// the way home is one: a huge standing stone with a hole full
// of a slowly swirling other-world shimmer. Built in the door's own frame:
// local +Z points out of the room (through the door), the slab spans X/Y.

const STONE_W = 3.8;
const STONE_H = 4.7;
const HOLE_Y = 1.65;
const HOLE_R = 1.18;
const DEPTH = 0.8;

const portalVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const portalFragment = /* glsl */ `
    uniform float uTime;
    uniform float uHover;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);
        // Spiral bands drifting inward
        float swirl = a * 2.0 + r * 6.0 - uTime * 0.9;
        float bands = 0.5 + 0.5 * sin(swirl + noise(vec2(a * 2.0, r * 4.0 - uTime * 0.3)) * 3.0);
        float mist = noise(vec2(a * 3.0 + uTime * 0.2, r * 5.0 - uTime * 0.6));
        vec3 teal = vec3(0.3, 0.95, 0.9);
        vec3 violet = vec3(0.62, 0.42, 1.0);
        vec3 gold = vec3(1.0, 0.85, 0.5);
        vec3 col = mix(violet, teal, bands);
        col = mix(col, gold, smoothstep(0.75, 1.0, mist) * 0.6);
        float core = smoothstep(0.55, 0.0, r);
        float rim = smoothstep(0.75, 0.98, r) * smoothstep(1.02, 0.95, r);
        float alpha = (0.35 + bands * 0.35 + core * 0.4) * smoothstep(1.0, 0.9, r) + rim * 0.8;
        alpha *= 0.85 + uHover * 0.3;
        col += vec3(1.0) * core * 0.35 + teal * rim;
        gl_FragColor = vec4(col * alpha, alpha);
    }
`;

const noise3 = (x: number, y: number, z: number) =>
    Math.sin(x * 2.1 + y * 1.3) * Math.cos(y * 1.7 - z * 2.3) * 0.5 +
    Math.sin(z * 3.1 + x * 0.7) * 0.25;

const buildStone = () => {
    // Irregular standing-stone outline: an egg, flattened where it meets
    // the ground, wobbled by noise.
    const outline = new THREE.Shape();
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const wobble = 1 + Math.sin(t * 3 + 1.3) * 0.05 + Math.sin(t * 7 + 0.4) * 0.03;
        const taper = 1 - Math.max(0, Math.sin(t)) * 0.12; // narrower at the top
        const x = Math.cos(t) * (STONE_W / 2) * wobble * taper;
        const y = Math.max(0, STONE_H / 2 + Math.sin(t) * (STONE_H / 2) * wobble);
        if (i === 0) outline.moveTo(x, y);
        else outline.lineTo(x, y);
    }
    const hole = new THREE.Path();
    for (let i = 0; i <= 48; i++) {
        const t = -(i / 48) * Math.PI * 2; // opposite winding for a hole
        const r = HOLE_R * (1 + Math.sin(t * 4 + 0.7) * 0.04);
        const x = Math.cos(t) * r;
        const y = HOLE_Y + Math.sin(t) * r;
        if (i === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
    }
    outline.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(outline, {
        depth: DEPTH,
        bevelEnabled: true,
        bevelThickness: 0.16,
        bevelSize: 0.14,
        bevelSegments: 4,
        curveSegments: 48,
    });
    geometry.translate(0, 0, -DEPTH / 2);
    // Weather it: lumpy surface, mossy where it faces up.
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const n = noise3(x, y, z) * 0.06;
        position.setXYZ(i, x + n, y > 0.05 ? y + n * 0.5 : y, z + n);
    }
    geometry.computeVertexNormals();
    const normal = geometry.attributes.normal;
    const colors = new Float32Array(position.count * 3);
    const stone = new THREE.Color("#ffffff");
    const moss = new THREE.Color("#7fa86a");
    const c = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
        const up = Math.max(0, normal.getY(i));
        const lowDamp = Math.max(0, 1 - position.getY(i) / 1.2) * 0.35; // damp moss near the ground
        c.copy(stone).lerp(moss, Math.min(1, up * 0.9 + lowDamp));
        c.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
};

export const FairyStonePortal: React.FC<{
    position: [number, number, number];
    rotationY: number;
    label: string;
    hovering: boolean;
}> = ({ position, rotationY, label, hovering }) => {
    const geometry = useMemo(buildStone, []);
    useEffect(() => () => geometry.dispose(), [geometry]);
    const stoneMaterial = useMemo(() => {
        const material = EnhancedMaterialSystem.getInstance().pbr("wall-stone", {
            repeat: [0.42, 0.42],
            fallbackColor: "#8a8478",
            tint: "#c2b9aa",
            metalness: 0,
        });
        material.vertexColors = true;
        material.needsUpdate = true;
        return material;
    }, []);
    // The small side stones have no vertex colors, so they get their own
    // (plain) stone material - vertexColors without the attribute = black.
    const sideStoneMaterial = useMemo(
        () =>
            EnhancedMaterialSystem.getInstance().pbr("wall-stone", {
                repeat: [1, 1],
                fallbackColor: "#8a8478",
                tint: "#b4ad9f",
                metalness: 0,
            }),
        []
    );
    const portalMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: portalVertex,
                fragmentShader: portalFragment,
                uniforms: { uTime: { value: 0 }, uHover: { value: 0 } },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            }),
        []
    );
    useEffect(() => () => portalMaterial.dispose(), [portalMaterial]);
    useFrame((_, delta) => {
        portalMaterial.uniforms.uTime.value += delta;
        const hover = portalMaterial.uniforms.uHover;
        hover.value += ((hovering ? 1 : 0) - hover.value) * Math.min(1, delta * 6);
    });

    const sideStones = useMemo(
        () => [
            { x: -2.9, h: 2.4, w: 0.9, tilt: 0.12 },
            { x: 3.0, h: 1.9, w: 0.8, tilt: -0.18 },
        ],
        []
    );
    const mushrooms = useMemo(
        () =>
            Array.from({ length: 9 }, (_, i) => {
                const side = i % 2 === 0 ? -1 : 1;
                return {
                    x: side * (1.2 + Math.random() * 1.2),
                    z: -0.7 - Math.random() * 0.6,
                    s: 0.7 + Math.random() * 0.8,
                    hue: Math.random() < 0.5 ? "#7ff3ff" : "#d9a6ff",
                };
            }),
        []
    );

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh geometry={geometry} material={stoneMaterial} />

            {/* The other world, glimpsed through the hole */}
            <mesh position={[0, HOLE_Y, 0]} material={portalMaterial} raycast={() => null}>
                <circleGeometry args={[HOLE_R * 0.99, 64]} />
            </mesh>
            <pointLight position={[0, HOLE_Y, -0.6]} intensity={hovering ? 3 : 2} distance={7} decay={2} color="#8ff2ff" />
            <DustMotes position={[0, 0.4, -0.3]} radius={1.1} height={3.2} count={90} color="#c8f7ff" />

            {/* Its name, on the room-facing side. Sits clear of the bevel +
                weathering bumps (up to ~0.22 past the face) so it never
                z-fights with the stone. */}
            <Text
                font="/fonts/Fraunces.ttf"
                position={[0, HOLE_Y + HOLE_R + 0.45, -DEPTH / 2 - 0.27]}
                rotation={[0, Math.PI, 0]}
                fontSize={0.34}
                color="#2a2620"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.006}
                outlineColor="#b7ad9c"
            >
                {label}
            </Text>

            {/* Two smaller standing stones keep it company */}
            {sideStones.map((stone) => (
                <mesh
                    key={stone.x}
                    material={sideStoneMaterial}
                    position={[stone.x, stone.h / 2 - 0.1, 0.1]}
                    rotation={[0, stone.x, stone.tilt]}
                    scale={[stone.w, stone.h / 2, stone.w * 0.7]}
                >
                    <dodecahedronGeometry args={[1, 1]} />
                </mesh>
            ))}

            {/* Glowing mushrooms at its foot */}
            {mushrooms.map((m, i) => (
                <group key={i} position={[m.x, 0, m.z]} scale={m.s}>
                    <mesh position={[0, 0.09, 0]}>
                        <cylinderGeometry args={[0.025, 0.035, 0.18, 6]} />
                        <meshStandardMaterial color="#efe6d2" />
                    </mesh>
                    <mesh position={[0, 0.18, 0]}>
                        <sphereGeometry args={[0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshBasicMaterial color={m.hue} toneMapped={false} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};
