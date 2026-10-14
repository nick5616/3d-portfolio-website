import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { NOISE_GLSL, SPACE_GLSL } from "../rooms/cosmic/cosmicShaders";

// A doorway that is a window into deep space: an arch-shaped surface whose
// shader looks up the starfield along the view ray, so the stars hold still
// behind it as you walk past (it reads as a hole, not a picture). The edge
// burns gold and swirls; it brightens while aimed at.

interface CosmicPortalProps {
    position: [number, number, number]; // threshold centre
    rotationY: number; // local +Z faces the viewer
    width: number;
    height: number; // threshold to the top of the arch
    hovering: boolean;
    // Bring its own dark stone arch (for portals standing in the open),
    // with `label` lettered above it.
    frame?: boolean;
    label?: string;
}

const FRAME_STONE = new THREE.MeshPhysicalMaterial({
    color: "#15111c",
    roughness: 0.2,
    metalness: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
});
const FRAME_GOLD = new THREE.MeshStandardMaterial({
    color: "#d9a94a",
    roughness: 0.25,
    metalness: 1,
    emissive: "#5a3a08",
    emissiveIntensity: 0.6,
});

const PortalFrame: React.FC<{ half: number; jamb: number; label?: string }> = ({ half, jamb, label }) => (
    <group>
        {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (half + 0.15), jamb / 2, 0]} material={FRAME_STONE}>
                <boxGeometry args={[0.3, jamb, 0.34]} />
            </mesh>
        ))}
        <mesh position={[0, jamb, 0]} material={FRAME_STONE}>
            <torusGeometry args={[half + 0.15, 0.15, 10, 32, Math.PI]} />
        </mesh>
        <mesh position={[0, jamb, 0.03]} material={FRAME_GOLD}>
            <torusGeometry args={[half + 0.02, 0.025, 8, 32, Math.PI]} />
        </mesh>
        <mesh position={[0, 0.04, 0]} material={FRAME_GOLD}>
            <boxGeometry args={[half * 2 + 0.8, 0.08, 0.7]} />
        </mesh>
        {label && (
            <Text
                font="/fonts/Fraunces.ttf"
                position={[0, jamb + half + 0.5, 0.05]}
                fontSize={0.16}
                letterSpacing={0.2}
                color="#e9c77a"
                anchorX="center"
                anchorY="middle"
            >
                {label.toUpperCase()}
            </Text>
        )}
    </group>
);

const archShape = (half: number, jamb: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, jamb);
    shape.absarc(0, jamb, half, 0, Math.PI, false);
    shape.lineTo(-half, 0);
    return shape;
};

export const CosmicPortal: React.FC<CosmicPortalProps> = ({
    position,
    rotationY,
    width,
    height,
    hovering,
    frame,
    label,
}) => {
    const half = width / 2;
    const jamb = Math.max(0.1, height - half);
    const geometry = useMemo(() => new THREE.ShapeGeometry(archShape(half, jamb), 48), [half, jamb]);
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uHover: { value: 0 },
                    uHalf: { value: half },
                    uJamb: { value: jamb },
                },
                vertexShader: /* glsl */ `
                    varying vec2 vShape;
                    varying vec3 vWorld;
                    void main() {
                        vShape = position.xy;
                        vec4 world = modelMatrix * vec4(position, 1.0);
                        vWorld = world.xyz;
                        gl_Position = projectionMatrix * viewMatrix * world;
                    }
                `,
                fragmentShader: /* glsl */ `
                    uniform float uTime;
                    uniform float uHover;
                    uniform float uHalf;
                    uniform float uJamb;
                    varying vec2 vShape;
                    varying vec3 vWorld;
                    ${NOISE_GLSL}
                    ${SPACE_GLSL}
                    void main() {
                        vec3 dir = normalize(vWorld - cameraPosition);
                        // Swirl the view ray around the arch's centre.
                        vec2 c = vShape - vec2(0.0, uJamb * 0.6);
                        float r = length(c);
                        float twist = 0.6 / (0.4 + r) * (0.6 + 0.4 * sin(uTime * 0.3));
                        float s = sin(twist + uTime * 0.05), co = cos(twist + uTime * 0.05);
                        dir.xy = mat2(co, -s, s, co) * dir.xy;
                        vec3 col = spaceColor(dir, uTime) * (1.4 + uHover * 0.8);

                        // Distance to the arch's edge, for the burning rim.
                        float d = vShape.y < uJamb
                            ? min(uHalf - abs(vShape.x), vShape.y)
                            : uHalf - length(vShape - vec2(0.0, uJamb));
                        float flicker = fbm(vec3(vShape * 3.0, uTime * 0.6));
                        float rim = exp(-max(d, 0.0) * (14.0 - uHover * 5.0)) * (0.7 + flicker * 0.8);
                        col += vec3(1.0, 0.72, 0.28) * rim * (1.3 + uHover);
                        // A slow inward spiral of faint light.
                        float a = atan(c.y, c.x);
                        float spiral = sin(a * 3.0 + r * 9.0 - uTime * 1.2);
                        col += vec3(0.55, 0.35, 1.0) * smoothstep(0.85, 1.0, spiral) * 0.12 * (1.0 - smoothstep(0.0, 1.4, r));
                        gl_FragColor = vec4(col, 1.0);
                    }
                `,
                side: THREE.DoubleSide,
                toneMapped: false,
                fog: false,
            }),
        [half, jamb]
    );
    useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
        },
        [geometry, material]
    );

    useFrame(({ clock }, delta) => {
        material.uniforms.uTime.value = clock.elapsedTime;
        const target = hovering ? 1 : 0;
        material.uniforms.uHover.value += (target - material.uniforms.uHover.value) * Math.min(1, delta * 6);
    });

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh geometry={geometry} material={material} />
            {frame && <PortalFrame half={half} jamb={jamb} label={label} />}
            <pointLight
                position={[0, height * 0.55, 0.6]}
                intensity={hovering ? 4 : 2.2}
                distance={5}
                decay={2}
                color="#b48cff"
            />
        </group>
    );
};
