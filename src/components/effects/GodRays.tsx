import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A shaft of light, faked: an open cone with an additive shader that fades
// toward the floor and toward its silhouette edges, with slow drifting
// streaks. No post-processing, no extra render passes - one transparent
// draw call, which is why it's affordable on a laptop with tabs open.

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    void main() {
        float along = vUv.y; // 0 at the floor, 1 at the source
        float fade = smoothstep(0.0, 0.35, along) * (0.25 + 0.75 * along);
        // Faces seen edge-on (the cone's silhouette) fade out: soft edges.
        float facing = abs(dot(vNormalW, vViewDir));
        float soft = pow(facing, 1.8);
        float streaks = 0.6
            + 0.25 * sin(vUv.x * 41.0 + uTime * 0.21)
            + 0.15 * sin(vUv.x * 13.0 - uTime * 0.13 + along * 3.0);
        float alpha = uIntensity * fade * soft * streaks;
        gl_FragColor = vec4(uColor * alpha, alpha);
    }
`;

interface GodRaysProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    height: number;
    radiusTop: number;
    radiusBottom: number;
    color?: string;
    intensity?: number;
}

export const GodRays: React.FC<GodRaysProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    height,
    radiusTop,
    radiusBottom,
    color = "#ffe7b8",
    intensity = 0.22,
}) => {
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(color) },
                    uIntensity: { value: intensity },
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            }),
        [color, intensity]
    );
    const geometry = useMemo(() => {
        const cone = new THREE.CylinderGeometry(
            radiusTop,
            radiusBottom,
            height,
            48,
            1,
            true
        );
        cone.translate(0, height / 2, 0); // base at the group's origin
        return cone;
    }, [radiusTop, radiusBottom, height]);

    useFrame((_, delta) => {
        material.uniforms.uTime.value += delta;
    });

    return (
        <mesh
            position={position}
            rotation={rotation}
            geometry={geometry}
            material={material}
            renderOrder={10}
            raycast={() => null}
        />
    );
};

// Specks of dust drifting through a beam of light.
const dustVertex = /* glsl */ `
    uniform float uTime;
    uniform float uHeight;
    attribute float aSeed;
    varying float vAlpha;
    void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.04 + aSeed * 0.05), uHeight);
        p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.12;
        p.z += cos(uTime * 0.27 + aSeed * 31.0) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aSeed * 3.0) * (6.0 / -mv.z);
        float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 20.0);
        vAlpha = twinkle * smoothstep(0.0, 1.0, p.y) * smoothstep(uHeight, uHeight - 2.0, p.y);
    }
`;
const dustFragment = /* glsl */ `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.8;
        gl_FragColor = vec4(uColor * a, a);
    }
`;

export const DustMotes: React.FC<{
    position?: [number, number, number];
    radius: number;
    height: number;
    count?: number;
    color?: string;
}> = ({ position = [0, 0, 0], radius, height, count = 220, color = "#fff2d0" }) => {
    const time = useRef(0);
    const { geometry, material } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const seeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const r = Math.sqrt(Math.random()) * radius;
            const a = Math.random() * Math.PI * 2;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.random() * height;
            positions[i * 3 + 2] = Math.sin(a) * r;
            seeds[i] = Math.random();
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
        const material = new THREE.ShaderMaterial({
            vertexShader: dustVertex,
            fragmentShader: dustFragment,
            uniforms: {
                uTime: { value: 0 },
                uHeight: { value: height },
                uColor: { value: new THREE.Color(color) },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        return { geometry, material };
    }, [radius, height, count, color]);

    useFrame((_, delta) => {
        time.current += delta;
        material.uniforms.uTime.value = time.current;
    });

    return (
        <points
            position={position}
            geometry={geometry}
            material={material}
            frustumCulled={false}
            raycast={() => null}
        />
    );
};
