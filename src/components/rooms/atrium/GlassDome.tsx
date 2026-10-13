import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AtriumMaterials } from "./atriumMaterials";
import { DOME_GLASS, RADIUS, SUN_DIRECTION, WALL_HEIGHT, radialX } from "./atriumLayout";
import { mergeGeometries } from "./atriumParts";

// The dome: a coffered band springing from the drum cornice, then a great
// iron-and-glass skylight. The glass is one unlit shader - sky, drifting
// clouds, the sun's glare and the ironwork are all drawn procedurally, so
// the whole cap is a single draw call with no textures.

const glassVertex = /* glsl */ `
    varying vec3 vDir;
    void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const glassFragment = /* glsl */ `
    uniform float uTime;
    uniform vec3 uSun;
    varying vec3 vDir;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    // 1 on a grid line, 0 in the pane; anti-aliased with fwidth.
    float gridLine(float coordinate, float thickness) {
        float d = abs(fract(coordinate) - 0.5);
        float w = min(fwidth(coordinate) * 1.2, 0.2);
        return smoothstep(0.5 - thickness - w, 0.5 - thickness, d);
    }

    void main() {
        vec3 dir = normalize(vDir);
        float lat = acos(clamp(dir.y, -1.0, 1.0)); // 0 at the apex
        float lon = atan(dir.z, dir.x) / 6.2831853 + 0.5;
        float edge = lat / ${DOME_GLASS.toFixed(3)};

        // Sky through old glass: brighter toward the top, clouds drifting.
        vec3 sky = mix(vec3(0.62, 0.78, 0.95), vec3(0.98, 0.96, 0.9), 1.0 - edge * 0.85);
        vec2 cloudUv = vec2(dir.x, dir.z) / max(dir.y, 0.3) * 1.6 + vec2(uTime * 0.012, uTime * 0.006);
        float clouds = noise(cloudUv * 2.0) * 0.6 + noise(cloudUv * 5.0) * 0.3;
        sky = mix(sky, vec3(1.0, 0.98, 0.95), smoothstep(0.45, 0.85, clouds) * 0.55);

        // Each pane catches the light a little differently.
        float meridians = edge < 0.3 ? 12.0 : (edge < 0.6 ? 24.0 : 48.0);
        vec2 pane = vec2(floor(lon * meridians), floor(edge * 7.0));
        sky *= 0.92 + hash(pane) * 0.12;

        // The sun, a hot glare plus a wide bloom.
        float facing = max(dot(dir, uSun), 0.0);
        sky += vec3(1.0, 0.9, 0.7) * (pow(facing, 220.0) * 3.0 + pow(facing, 18.0) * 0.45);

        // Ironwork: meridian ribs (thinning out toward the apex), rings, and
        // a solid boss at the very top.
        float iron = gridLine(lon * meridians, 0.035);
        iron = max(iron, gridLine(edge * 7.0, 0.03));
        iron = max(iron, 1.0 - smoothstep(0.035, 0.05, edge));
        vec3 ironColor = vec3(0.13, 0.11, 0.09) + vec3(0.25, 0.2, 0.12) * pow(facing, 12.0);

        vec3 color = mix(sky, ironColor, iron);
        gl_FragColor = vec4(color * 1.15, 1.0);
        #include <colorspace_fragment>
    }
`;

export const GlassDome: React.FC<{ materials: AtriumMaterials }> = ({ materials }) => {
    const glass = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: glassVertex,
                fragmentShader: glassFragment,
                uniforms: {
                    uTime: { value: 0 },
                    uSun: { value: SUN_DIRECTION.clone() },
                },
                side: THREE.BackSide,
                toneMapped: false,
            }),
        []
    );
    useFrame((_, delta) => {
        glass.uniforms.uTime.value += delta;
    });

    const geometry = useMemo(() => {
        const cap = new THREE.SphereGeometry(RADIUS, 96, 24, 0, Math.PI * 2, 0, DOME_GLASS);
        const coffers = new THREE.SphereGeometry(RADIUS, 96, 18, 0, Math.PI * 2, DOME_GLASS, Math.PI / 2 - DOME_GLASS);

        // Bronze ribs over the coffered band, and rings at the glass edge
        const ribParts: THREE.BufferGeometry[] = [];
        const ribs = 16;
        for (let i = 0; i < ribs; i++) {
            const rib = new THREE.TorusGeometry(RADIUS - 0.06, 0.09, 6, 24, Math.PI / 2 - DOME_GLASS);
            rib.rotateY(radialX((i / ribs) * Math.PI * 2));
            ribParts.push(rib);
        }
        const glassEdgeY = RADIUS * Math.cos(DOME_GLASS);
        const glassEdgeR = RADIUS * Math.sin(DOME_GLASS);
        [
            [glassEdgeR - 0.05, glassEdgeY - 0.04, 0.16],
            [RADIUS - 0.25, 0.1, 0.12],
        ].forEach(([radius, y, tube]) => {
            const ring = new THREE.TorusGeometry(radius, tube, 8, 128);
            ring.rotateX(Math.PI / 2);
            ring.translate(0, y, 0);
            ribParts.push(ring);
        });
        const bronze = mergeGeometries(ribParts)!;
        ribParts.forEach((g) => g.dispose());
        return { cap, coffers, bronze };
    }, []);
    useEffect(
        () => () => {
            glass.dispose();
            Object.values(geometry).forEach((g) => g.dispose());
        },
        [glass, geometry]
    );

    return (
        <group position={[0, WALL_HEIGHT, 0]}>
            <mesh geometry={geometry.cap} material={glass} raycast={() => null} />
            <mesh geometry={geometry.coffers} material={materials.domeCoffers} />
            <mesh geometry={geometry.bronze} material={materials.bronze} />
        </group>
    );
};
