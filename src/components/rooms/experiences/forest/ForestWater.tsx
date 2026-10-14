import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ForestLayout, mulberry32 } from "./forestGen";
import { forestSky } from "./dayCycle";

// Ponds and creeks: still, dark water that mirrors the sky at a glance and
// glints where the sun or moon catches the ripples, ringed with reeds,
// lily pads floating on top. It follows the day cycle, and it's shallow -
// you can wade through all of it.

const WATER_Y = 0.025;

const waterVertex = /* glsl */ `
    varying vec3 vWorld;
    #include <fog_pars_vertex>
    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
    }
`;
const waterFragment = /* glsl */ `
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uSky;
    uniform vec3 uGlint;
    uniform vec3 uSunDir;
    varying vec3 vWorld;
    #include <fog_pars_fragment>
    void main() {
        // Two sets of slow ripples tilt the surface normal.
        vec2 p = vWorld.xz;
        float a = sin(p.x * 3.1 + uTime * 1.3) * cos(p.y * 2.7 - uTime * 0.9);
        float b = sin((p.x + p.y) * 5.3 - uTime * 1.7) * 0.5;
        vec3 n = normalize(vec3(a * 0.06 + b * 0.03, 1.0, (a - b) * 0.05));
        vec3 v = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = mix(uDeep, uSky, 0.18 + 0.72 * fresnel);
        float glint = pow(max(dot(reflect(-v, n), normalize(uSunDir)), 0.0), 140.0);
        col += uGlint * glint * 1.6;
        gl_FragColor = vec4(col, 0.93);
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

// An irregular pond outline from its wobble samples.
const pondShape = (r: number, wobble: number[]) => {
    const points = wobble.map((w, i) => {
        const a = (i / wobble.length) * Math.PI * 2;
        return new THREE.Vector2(Math.cos(a) * r * w, Math.sin(a) * r * w);
    });
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, 0)), true);
    return new THREE.Shape(curve.getPoints(64).map((p) => new THREE.Vector2(p.x, p.y)));
};

// A flat ribbon following a creek's polyline.
const creekGeometry = (line: [number, number][], halfWidth: number) => {
    const positions: number[] = [];
    const indices: number[] = [];
    line.forEach(([x, z], i) => {
        const [px, pz] = line[Math.max(0, i - 1)];
        const [nx, nz] = line[Math.min(line.length - 1, i + 1)];
        let dx = nx - px;
        let dz = nz - pz;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len;
        dz /= len;
        const w = halfWidth * (0.8 + 0.3 * Math.sin(i * 1.7));
        positions.push(x - dz * w, 0, z + dx * w, x + dz * w, 0, z - dx * w);
        if (i > 0) {
            const k = (i - 1) * 2;
            indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
};

export const ForestWater: React.FC<{ layout: ForestLayout; time: { value: number } }> = ({ layout, time }) => {
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: waterVertex,
                fragmentShader: waterFragment,
                uniforms: {
                    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
                    uTime: time,
                    uDeep: { value: new THREE.Color("#0c2a2c") },
                    uSky: { value: new THREE.Color() },
                    uGlint: { value: new THREE.Color() },
                    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
                },
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                fog: true,
            }),
        [time]
    );

    const water = useMemo(() => {
        const ponds = layout.ponds.map((pond) => {
            const g = new THREE.ShapeGeometry(pondShape(pond.r, pond.wobble), 1);
            g.rotateX(-Math.PI / 2);
            g.translate(pond.x, WATER_Y, pond.z);
            return g;
        });
        const creeks = layout.creeks.map((line) => creekGeometry(line, 0.9).translate(0, WATER_Y - 0.004, 0));
        return [...ponds, ...creeks];
    }, [layout]);

    // Reeds round the shores and lily pads on the ponds.
    const plants = useMemo(() => {
        const rand = mulberry32(layout.ponds.length * 101 + 7);
        const reedGeometry = new THREE.ConeGeometry(0.018, 1, 4).translate(0, 0.5, 0);
        const reedMaterial = new THREE.MeshLambertMaterial({ color: "#5f8a3a" });
        const padGeometry = new THREE.CircleGeometry(1, 14, 0.25, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2);
        const padMaterial = new THREE.MeshLambertMaterial({ color: "#3f7a3a", side: THREE.DoubleSide });
        const bloomGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const bloomMaterial = new THREE.MeshLambertMaterial({ color: "#ffb3d6", emissive: "#ff8ac4", emissiveIntensity: 0.25 });
        const reeds: THREE.Matrix4[] = [];
        const pads: THREE.Matrix4[] = [];
        const blooms: THREE.Matrix4[] = [];
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        layout.ponds.forEach((pond) => {
            const clumps = Math.round(pond.r * 2.5);
            for (let c = 0; c < clumps; c++) {
                const a = rand() * Math.PI * 2;
                const edge = pond.r * pond.wobble[Math.floor((a / (Math.PI * 2)) * pond.wobble.length) % pond.wobble.length];
                for (let k = 0; k < 6; k++) {
                    const d = edge * (0.92 + rand() * 0.16);
                    const aa = a + (rand() - 0.5) * 0.25;
                    reeds.push(
                        new THREE.Matrix4().compose(
                            new THREE.Vector3(pond.x + Math.cos(aa) * d, 0, pond.z + Math.sin(aa) * d),
                            q.setFromEuler(e.set((rand() - 0.5) * 0.25, 0, (rand() - 0.5) * 0.25)),
                            new THREE.Vector3(1, 0.6 + rand() * 0.9, 1)
                        )
                    );
                }
            }
            const padCount = 5 + Math.floor(rand() * 6);
            for (let k = 0; k < padCount; k++) {
                const a = rand() * Math.PI * 2;
                const d = Math.sqrt(rand()) * pond.r * 0.75;
                const s = 0.16 + rand() * 0.18;
                const at = new THREE.Vector3(pond.x + Math.cos(a) * d, WATER_Y + 0.006, pond.z + Math.sin(a) * d);
                pads.push(new THREE.Matrix4().compose(at, q.setFromEuler(e.set(0, rand() * 6, 0)), new THREE.Vector3(s, 1, s)));
                if (rand() < 0.3) blooms.push(new THREE.Matrix4().compose(at.clone().setY(WATER_Y + 0.05), q.identity(), new THREE.Vector3(1, 0.7, 1)));
            }
        });
        const instanced = (g: THREE.BufferGeometry, m: THREE.Material, list: THREE.Matrix4[]) => {
            const mesh = new THREE.InstancedMesh(g, m, Math.max(1, list.length));
            list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
            mesh.count = list.length;
            mesh.frustumCulled = false;
            return mesh;
        };
        return [instanced(reedGeometry, reedMaterial, reeds), instanced(padGeometry, padMaterial, pads), instanced(bloomGeometry, bloomMaterial, blooms)];
    }, [layout]);

    useEffect(
        () => () => {
            material.dispose();
            water.forEach((g) => g.dispose());
            plants.forEach((mesh) => {
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
        },
        [material, water, plants]
    );

    useFrame(() => {
        const sky = forestSky;
        (material.uniforms.uSky.value as THREE.Color).copy(sky.horizon).lerp(sky.top, 0.35).multiplyScalar(0.85);
        (material.uniforms.uDeep.value as THREE.Color).set("#0a2226").lerp(sky.hemiSky, 0.12).multiplyScalar(0.4 + sky.hemi * 0.6);
        (material.uniforms.uGlint.value as THREE.Color).copy(sky.light).multiplyScalar(sky.lightIntensity);
        // Sun by day, moon by night: whichever is up.
        (material.uniforms.uSunDir.value as THREE.Vector3).copy(sky.sunDir.y > 0 ? sky.sunDir : sky.sunDir.clone().negate());
    });

    return (
        <>
            {water.map((g, i) => (
                <mesh key={i} geometry={g} material={material} renderOrder={1} raycast={() => null} />
            ))}
            {plants.map((mesh, i) => (
                <primitive key={i} object={mesh} />
            ))}
        </>
    );
};
