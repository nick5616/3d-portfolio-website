import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { AtriumMaterials } from "./atriumMaterials";
import { BED_OUTER, POOL_RADIUS, POOL_RIM, polar, radialX } from "./atriumLayout";
import { mergeGeometries } from "./atriumParts";

// The reflecting pool under the skylight: kintsugi tile seen through
// clear blue water, a tiered fountain spilling a sheet of water, and a
// planted ring around the rim, open toward each door.

export const WATER_LEVEL = 0.36;
const RIM_HEIGHT = 0.5;
const BED_HEIGHT = 0.45;
// Paths through the planter ring line up with the four doors.
export const BED_GAP = 0.17;
export const BED_ARCS = [0, 1, 2, 3].map((i) => ({
    start: (i * Math.PI) / 2 + BED_GAP,
    length: Math.PI / 2 - 2 * BED_GAP,
}));

const waterVertex = /* glsl */ `
    varying vec3 vWorld;
    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;
// Animated ripples, a caustic web, fountain rings spreading from the
// center, glints, and more reflection (less transparency) at grazing angles.
const waterFragment = /* glsl */ `
    uniform float uTime;
    uniform float uRadius;
    varying vec3 vWorld;
    float wave(vec2 p, float t) {
        return sin(p.x * 3.1 + t * 1.3) * 0.5 + sin(p.y * 2.7 - t * 1.1) * 0.5
             + sin((p.x + p.y) * 4.3 + t * 0.7) * 0.35;
    }
    void main() {
        vec2 p = vWorld.xz;
        float r = length(p);
        float w = wave(p, uTime);
        float rings = sin(r * 10.0 - uTime * 2.6) * exp(-max(r - 0.9, 0.0) * 0.9);
        float caustic = pow(abs(sin(p.x * 5.0 + w * 1.4 + uTime * 0.6) * sin(p.y * 5.0 - w * 1.2 + uTime * 0.5)), 3.0);
        vec3 deep = vec3(0.02, 0.17, 0.31);
        vec3 shallow = vec3(0.1, 0.52, 0.64);
        vec3 color = mix(shallow, deep, smoothstep(0.0, 1.0, r / uRadius) * 0.75);
        color += vec3(0.55, 0.85, 1.0) * caustic * 0.28;
        color += vec3(1.0, 0.95, 0.8) * smoothstep(0.8, 1.0, w * 0.5 + 0.5 + rings * 0.12) * 0.22;
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - clamp(view.y, 0.0, 1.0), 3.0);
        color = mix(color, vec3(0.86, 0.93, 1.0), fresnel * 0.4);
        gl_FragColor = vec4(color, mix(0.58, 0.94, fresnel));
        #include <colorspace_fragment>
    }
`;

// A sheet of water falling from the fountain bowl: streaks scroll down.
const veilVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const veilFragment = /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
        float strands = 0.5 + 0.5 * sin(vUv.x * 140.0 + sin(vUv.x * 23.0) * 4.0);
        float flow = 0.5 + 0.5 * sin((vUv.y + uTime * 1.3) * 34.0 + vUv.x * 80.0);
        float alpha = (0.14 + 0.4 * smoothstep(0.35, 1.0, strands) * flow)
            * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        gl_FragColor = vec4(vec3(0.8, 0.94, 1.0), alpha);
        #include <colorspace_fragment>
    }
`;

// Arc of an open cylinder covering floor angles [start, start + length].
const cylinderArc = (radius: number, height: number, start: number, length: number) => {
    const g = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true, Math.PI / 2 - (start + length), length);
    g.translate(0, height / 2, 0);
    return g;
};
// Arc of a flat ring in the floor plane covering floor angles [start, start + length].
const ringArc = (inner: number, outer: number, y: number, start: number, length: number) => {
    const g = new THREE.RingGeometry(inner, outer, 48, 1, -(start + length), length);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return g;
};

const lathe = (profile: [number, number][]) =>
    new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32);

export const ReflectingPool: React.FC<{ materials: AtriumMaterials }> = ({ materials }) => {
    const shaders = useMemo(() => {
        const water = new THREE.ShaderMaterial({
            vertexShader: waterVertex,
            fragmentShader: waterFragment,
            uniforms: { uTime: { value: 0 }, uRadius: { value: POOL_RADIUS } },
            transparent: true,
        });
        const veil = new THREE.ShaderMaterial({
            vertexShader: veilVertex,
            fragmentShader: veilFragment,
            uniforms: { uTime: { value: 0 } },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        return { water, veil };
    }, []);
    useFrame((_, delta) => {
        shaders.water.uniforms.uTime.value += delta;
        shaders.veil.uniforms.uTime.value += delta;
    });

    const geometry = useMemo(() => {
        const basin = new THREE.CircleGeometry(POOL_RADIUS, 64);
        basin.rotateX(-Math.PI / 2);
        basin.translate(0, 0.04, 0);
        const basinWall = new THREE.CylinderGeometry(POOL_RADIUS, POOL_RADIUS, RIM_HEIGHT - 0.04, 64, 1, true);
        basinWall.translate(0, 0.04 + (RIM_HEIGHT - 0.04) / 2, 0);
        const water = new THREE.CircleGeometry(POOL_RADIUS, 64);
        water.rotateX(-Math.PI / 2);
        water.translate(0, WATER_LEVEL, 0);

        // Rim, fountain stone, and the planter ring's curbs: one marble mesh
        const marbleParts: THREE.BufferGeometry[] = [];
        const rimOuter = new THREE.CylinderGeometry(POOL_RIM, POOL_RIM + 0.05, RIM_HEIGHT, 96, 1, true);
        rimOuter.translate(0, RIM_HEIGHT / 2, 0);
        const rimTop = new THREE.RingGeometry(POOL_RADIUS, POOL_RIM, 96, 1);
        rimTop.rotateX(-Math.PI / 2);
        rimTop.translate(0, RIM_HEIGHT, 0);
        marbleParts.push(rimOuter, rimTop);
        const pedestal = lathe([
            [0.0, 0.04],
            [0.62, 0.04],
            [0.6, 0.16],
            [0.42, 0.24],
            [0.26, 0.5],
            [0.2, 0.9],
            [0.24, 1.08],
            [0.34, 1.16],
            [0.0, 1.16],
        ]);
        const bowl = lathe([
            [0.0, 1.14],
            [0.3, 1.14],
            [0.62, 1.22],
            [0.86, 1.38],
            [0.92, 1.47],
            [0.86, 1.47],
            [0.8, 1.42],
            [0.0, 1.38],
        ]);
        const crown = lathe([
            [0.0, 1.38],
            [0.12, 1.38],
            [0.09, 1.6],
            [0.15, 1.72],
            [0.06, 1.86],
            [0.0, 1.9],
        ]);
        marbleParts.push(pedestal, bowl, crown);
        const bowlWater = new THREE.CircleGeometry(0.84, 40);
        bowlWater.rotateX(-Math.PI / 2);
        bowlWater.translate(0, 1.44, 0);
        const veil = new THREE.CylinderGeometry(0.93, 1.02, 1.47 - WATER_LEVEL, 48, 1, true);
        veil.translate(0, WATER_LEVEL + (1.47 - WATER_LEVEL) / 2, 0);

        const soilParts: THREE.BufferGeometry[] = [];
        BED_ARCS.forEach(({ start, length }) => {
            marbleParts.push(cylinderArc(BED_OUTER, BED_HEIGHT, start, length));
            marbleParts.push(ringArc(BED_OUTER - 0.14, BED_OUTER, BED_HEIGHT, start, length));
            soilParts.push(ringArc(POOL_RIM + 0.02, BED_OUTER - 0.14, BED_HEIGHT - 0.07, start, length));
            [start, start + length].forEach((a) => {
                const cap = new THREE.BoxGeometry(BED_OUTER - POOL_RIM, BED_HEIGHT, 0.14);
                cap.translate((BED_OUTER + POOL_RIM) / 2, BED_HEIGHT / 2, 0);
                cap.rotateY(radialX(a));
                marbleParts.push(cap);
            });
        });

        const brassParts = [POOL_RADIUS, POOL_RIM].map((radius) => {
            const ring = new THREE.TorusGeometry(radius, 0.025, 6, 128);
            ring.rotateX(Math.PI / 2);
            ring.translate(0, RIM_HEIGHT, 0);
            return ring;
        });
        const bowlLip = new THREE.TorusGeometry(0.9, 0.022, 6, 64);
        bowlLip.rotateX(Math.PI / 2);
        bowlLip.translate(0, 1.47, 0);
        brassParts.push(bowlLip);

        const merge = (parts: THREE.BufferGeometry[]) => {
            const merged = mergeGeometries(parts)!;
            parts.forEach((p) => p.dispose());
            return merged;
        };
        return {
            basin,
            basinWall,
            water,
            bowlWater,
            veil,
            marble: merge(marbleParts),
            soil: merge(soilParts),
            brass: merge(brassParts),
        };
    }, []);
    useEffect(
        () => () => {
            Object.values(geometry).forEach((g) => g.dispose());
            shaders.water.dispose();
            shaders.veil.dispose();
        },
        [geometry, shaders]
    );

    // Planter ring colliders: short boxes following each arc
    const bedBoxes = useMemo(() => {
        const boxes: { position: [number, number, number]; rotationY: number; half: [number, number, number] }[] = [];
        const mid = (BED_OUTER + POOL_RIM) / 2;
        BED_ARCS.forEach(({ start, length }) => {
            const pieces = 6;
            const step = length / pieces;
            for (let k = 0; k < pieces; k++) {
                const a = start + (k + 0.5) * step;
                const [x, z] = polar(mid, a);
                boxes.push({
                    position: [x, 0.3, z],
                    rotationY: radialX(a),
                    half: [(BED_OUTER - POOL_RIM) / 2, 0.3, BED_OUTER * Math.sin(step / 2) * 1.05],
                });
            }
        });
        return boxes;
    }, []);

    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                <CylinderCollider args={[RIM_HEIGHT / 2, POOL_RIM]} position={[0, RIM_HEIGHT / 2, 0]} />
                <CylinderCollider args={[0.95, 0.95]} position={[0, 0.95, 0]} />
                {bedBoxes.map((box, i) => (
                    <CuboidCollider key={i} args={box.half} position={box.position} rotation={[0, box.rotationY, 0]} />
                ))}
            </RigidBody>

            <mesh geometry={geometry.basin} material={materials.poolFloor} />
            <mesh geometry={geometry.basinWall} material={materials.poolTile} />
            <mesh geometry={geometry.marble} material={materials.trim} />
            <mesh geometry={geometry.brass} material={materials.brass} />
            <mesh geometry={geometry.soil} material={materials.soil} />
            <mesh geometry={geometry.water} material={shaders.water} raycast={() => null} />
            <mesh geometry={geometry.bowlWater} material={shaders.water} raycast={() => null} />
            <mesh geometry={geometry.veil} material={shaders.veil} renderOrder={5} raycast={() => null} />
        </>
    );
};
