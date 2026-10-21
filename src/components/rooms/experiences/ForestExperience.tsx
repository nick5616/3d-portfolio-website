import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useSceneStore } from "../../../stores/sceneStore";
import { RUPEE_TYPES } from "../../../stores/rupeeStore";
import { Rupee, RupeeData } from "../../models/Rupee";
import {
    FOREST_RADIUS,
    ForestLayout,
    distanceToPaths,
    distanceToWater,
    generateForest,
    mulberry32,
    noise2,
} from "./forest/forestGen";
import {
    CYCLE_SECONDS,
    START_PHASE,
    SkyState,
    forestSky,
    sampleSky,
} from "./forest/dayCycle";
import { ForestWater } from "./forest/ForestWater";
import { ForestFairies } from "./forest/ForestFairies";
import { sessionSeconds, sessionSeed, useRoomSession } from "../../../multiplayer/roomSession";

// The forest: a procedurally generated Lost-Woods-style forest you can run
// through, with fog banks, light shafts through the canopy, glowing
// mushrooms, fairies, rupees on the paths, and a short dawn/day/dusk/night
// cycle.
//
// Everyone in the forest is in the same forest: it's grown from the room
// session's seed and its day runs on the session's clock (see
// multiplayer/roomSession.ts), so whoever's here sees the same trees, the
// same rupees on the same paths, the same time of day. The first one in
// grows a new forest; it lasts until the last one leaves.
//
// Everything repeated is instanced (one draw call per kind of thing), and
// every per-frame value lives in refs/uniforms - nothing re-renders React
// while you're walking around.

const sky = forestSky;

// ---------------------------------------------------------------- shaders
const skyVertex = /* glsl */ `
    varying vec3 vDir;
    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vDir = normalize(world.xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;
const skyFragment = /* glsl */ `
    uniform vec3 uTop;
    uniform vec3 uHorizon;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform float uStars;
    uniform float uTime;
    varying vec3 vDir;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 col = mix(uHorizon, uTop, smoothstep(-0.05, 0.55, h));
        float sunAmt = max(dot(dir, uSunDir), 0.0);
        col += uSunColor * (pow(sunAmt, 400.0) * 3.0 + pow(sunAmt, 12.0) * 0.35) * step(-0.1, uSunDir.y);
        // Moon opposite the sun
        float moonAmt = max(dot(dir, -uSunDir), 0.0);
        col += vec3(0.85, 0.9, 1.0) * pow(moonAmt, 900.0) * 2.0 * uStars;
        col += vec3(0.4, 0.5, 0.9) * pow(moonAmt, 10.0) * 0.12 * uStars;
        // Stars
        if (uStars > 0.01 && h > 0.0) {
            vec3 cell = floor(dir * 170.0);
            float star = step(0.9965, hash(cell));
            float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + hash(cell + 3.0) * 30.0);
            col += vec3(star * twinkle * uStars * smoothstep(0.0, 0.3, h));
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
    }
`;

const grassVertex = /* glsl */ `
    attribute float aShade;
    uniform float uTime;
    varying float vT;
    varying float vShade;
    #include <fog_pars_vertex>
    void main() {
        vT = uv.y;
        vShade = aShade;
        vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float sway = sin(uTime * 1.6 + world.x * 0.35 + world.z * 0.22) * 0.6
                   + sin(uTime * 0.7 + world.z * 0.5) * 0.4;
        world.x += sway * 0.18 * vT * vT;
        world.z += sway * 0.08 * vT * vT;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
    }
`;
const grassFragment = /* glsl */ `
    uniform vec3 uBase;
    uniform vec3 uTip;
    uniform vec3 uLight;
    uniform vec3 uAmbient;
    varying float vT;
    varying float vShade;
    #include <fog_pars_fragment>
    void main() {
        vec3 col = mix(uBase, uTip, vT) * (0.75 + vShade * 0.5);
        col *= uAmbient + uLight * (0.35 + 0.65 * vT);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

const fairyVertex = /* glsl */ `
    attribute vec3 aColor;
    attribute float aSeed;
    uniform float uTime;
    uniform float uBright;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vec3 p = position;
        float s = aSeed * 50.0;
        p += vec3(sin(uTime * 0.5 + s) * 0.9, sin(uTime * 0.8 + s * 1.3) * 0.45, cos(uTime * 0.45 + s * 0.7) * 0.9);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + s), 3.0);
        vAlpha = uBright * twinkle;
        vColor = aColor;
        gl_PointSize = (3.0 + aSeed * 5.0) * uPixelRatio * (14.0 / -mv.z);
    }
`;
const fairyFragment = /* glsl */ `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.18, 0.0, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.45;
        float a = (core + halo) * vAlpha;
        gl_FragColor = vec4(vColor * a + vec3(core * vAlpha * 0.6), a);
    }
`;

const shaftVertex = /* glsl */ `
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
const shaftFragment = /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    void main() {
        float along = vUv.y;
        float fade = smoothstep(0.0, 0.25, along) * smoothstep(1.0, 0.55, along);
        float soft = pow(abs(dot(vNormalW, vViewDir)), 1.8);
        float streaks = 0.6 + 0.25 * sin(vUv.x * 37.0 + uTime * 0.2) + 0.15 * sin(vUv.x * 11.0 - uTime * 0.13);
        float a = uIntensity * fade * soft * streaks;
        gl_FragColor = vec4(uColor * a, a);
    }
`;

// Make instanced Lambert canopies sway in the wind, and make mushroom caps
// glow in their own (instance) color by a shared amount.
const addWind = (material: THREE.MeshLambertMaterial, time: { value: number }, amount: number) => {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = time;
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nuniform float uTime;")
            .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>
                vec4 iw = instanceMatrix[3];
                float w = sin(uTime * 0.7 + iw.x * 0.15 + iw.z * 0.11) + 0.4 * sin(uTime * 1.9 + iw.z * 0.4);
                transformed.x += w * ${amount.toFixed(3)} * (position.y + 1.0);
                transformed.z += w * ${(amount * 0.5).toFixed(3)} * (position.y + 1.0);`
            );
    };
};
const addGlow = (material: THREE.MeshLambertMaterial, glow: { value: number }) => {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uGlow = glow;
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\nuniform float uGlow;")
            .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance = diffuseColor.rgb * uGlow;");
    };
};

const softBlobTexture = (() => {
    let texture: THREE.Texture | null = null;
    return () => {
        if (texture) return texture;
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d")!;
        for (let i = 0; i < 14; i++) {
            const x = size / 2 + (Math.random() - 0.5) * size * 0.45;
            const y = size / 2 + (Math.random() - 0.5) * size * 0.25;
            const r = size * (0.18 + Math.random() * 0.22);
            const g = context.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, "rgba(255,255,255,0.35)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            context.fillStyle = g;
            context.fillRect(0, 0, size, size);
        }
        texture = new THREE.CanvasTexture(canvas);
        return texture;
    };
})();

// ---------------------------------------------------------------- pieces
const useInstances = <T,>(
    items: T[],
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    place: (item: T, matrix: THREE.Matrix4, color: THREE.Color) => boolean | void
) =>
    useMemo(() => {
        const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color(1, 1, 1);
        let useColor = false;
        items.forEach((item, i) => {
            color.setRGB(1, 1, 1);
            if (place(item, matrix, color)) useColor = true;
            mesh.setMatrixAt(i, matrix);
            if (useColor) mesh.setColorAt(i, color);
        });
        mesh.count = items.length;
        mesh.frustumCulled = false;
        return mesh;
    }, [items, geometry, material]); // eslint-disable-line react-hooks/exhaustive-deps

const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpScale = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
const compose = (m: THREE.Matrix4, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) =>
    m.compose(tmpPos.set(x, y, z), tmpQuat.setFromEuler(tmpEuler.set(rx, ry, rz)), tmpScale.set(sx, sy, sz));

const Trees: React.FC<{ layout: ForestLayout; time: { value: number } }> = ({ layout, time }) => {
    const resources = useMemo(() => {
        const trunkGeometry = new THREE.CylinderGeometry(0.7, 1, 1, 7, 1);
        trunkGeometry.translate(0, 0.5, 0);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff" });
        const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
        const canopyMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true });
        addWind(canopyMaterial, time, 0.06);
        return { trunkGeometry, trunkMaterial, canopyGeometry, canopyMaterial };
    }, [time]);

    const rand = useMemo(() => mulberry32(layout.trees.length * 31 + 7), [layout]);
    const canopyBlobs = useMemo(() => {
        const blobs: { x: number; y: number; z: number; s: number; tone: number }[] = [];
        layout.trees.forEach((t) => {
            const count = t.ancient ? 6 : 3 + Math.floor(rand() * 2);
            for (let i = 0; i < count; i++) {
                const a = rand() * Math.PI * 2;
                const spread = t.ancient ? 2.6 : 1.3;
                blobs.push({
                    x: t.x + Math.cos(a) * rand() * spread,
                    y: t.height * (0.68 + rand() * 0.32),
                    z: t.z + Math.sin(a) * rand() * spread,
                    s: (t.ancient ? 3 : 1.7) * (0.75 + rand() * 0.6),
                    tone: rand(),
                });
            }
        });
        return blobs;
    }, [layout, rand]);

    const trunks = useInstances(layout.trees, resources.trunkGeometry, resources.trunkMaterial, (t, m, c) => {
        compose(m, t.x, 0, t.z, 0, rand() * Math.PI, 0, t.radius, t.height, t.radius);
        c.setHSL(0.07 + rand() * 0.03, 0.25 + rand() * 0.15, t.ancient ? 0.13 : 0.16 + rand() * 0.08);
        return true;
    });
    const canopies = useInstances(canopyBlobs, resources.canopyGeometry, resources.canopyMaterial, (b, m, c) => {
        compose(m, b.x, b.y, b.z, rand(), rand() * 6, rand(), b.s * 1.15, b.s * 0.85, b.s * 1.15);
        // Deep Lost-Woods greens with a few teal and olive blobs
        c.setHSL(0.27 + b.tone * 0.14, 0.45 + b.tone * 0.2, 0.17 + b.tone * 0.1);
        return true;
    });

    return (
        <>
            <primitive object={trunks} />
            <primitive object={canopies} />
        </>
    );
};

const Undergrowth: React.FC<{ layout: ForestLayout; time: { value: number }; glow: { value: number } }> = ({ layout, time, glow }) => {
    const resources = useMemo(() => {
        const bushGeometry = new THREE.IcosahedronGeometry(1, 0);
        const bushMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true });
        addWind(bushMaterial, time, 0.03);
        const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
        const rockMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true });
        const stemGeometry = new THREE.CylinderGeometry(0.035, 0.045, 0.22, 6);
        stemGeometry.translate(0, 0.11, 0);
        const stemMaterial = new THREE.MeshLambertMaterial({ color: "#efe6d2" });
        const capGeometry = new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        capGeometry.translate(0, 0.2, 0);
        const capMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff" });
        addGlow(capMaterial, glow);
        return { bushGeometry, bushMaterial, rockGeometry, rockMaterial, stemGeometry, stemMaterial, capGeometry, capMaterial };
    }, [time, glow]);

    const bushes = useInstances(layout.bushes, resources.bushGeometry, resources.bushMaterial, (b, m, c) => {
        compose(m, b.x, b.s * 0.35, b.z, 0, b.x, 0, b.s * 1.3, b.s * 0.75, b.s * 1.3);
        c.setHSL(0.28 + (b.s % 0.1), 0.5, 0.16 + (b.s % 0.07));
        return true;
    });
    const rocks = useInstances(layout.rocks, resources.rockGeometry, resources.rockMaterial, (r, m, c) => {
        compose(m, r.x, r.s * 0.25, r.z, r.rot, r.rot * 2, 0, r.s, r.s * 0.65, r.s * 0.9);
        c.setHSL(0.25, 0.12, 0.3 + (r.rot % 0.1)); // mossy grey-green
        return true;
    });
    const stems = useInstances(layout.mushrooms, resources.stemGeometry, resources.stemMaterial, (s, m) => {
        compose(m, s.x, 0, s.z, 0, 0, 0, s.s, s.s, s.s);
    });
    const caps = useInstances(layout.mushrooms, resources.capGeometry, resources.capMaterial, (s, m, c) => {
        compose(m, s.x, 0, s.z, 0, 0, 0, s.s, s.s, s.s);
        // teal, violet or rose rings
        const hue = [0.5, 0.78, 0.93][Math.floor(s.hue * 3)];
        c.setHSL(hue, 0.85, 0.55);
        return true;
    });
    return (
        <>
            <primitive object={bushes} />
            <primitive object={rocks} />
            <primitive object={stems} />
            <primitive object={caps} />
        </>
    );
};

const Ground: React.FC<{ layout: ForestLayout }> = ({ layout }) => {
    const geometry = useMemo(() => {
        const size = (FOREST_RADIUS + 14) * 2;
        const g = new THREE.PlaneGeometry(size, size, 140, 140);
        g.rotateX(-Math.PI / 2);
        const position = g.attributes.position;
        const colors = new Float32Array(position.count * 3);
        const moss = new THREE.Color("#2f5a2a");
        const lush = new THREE.Color("#4c7a34");
        const dirt = new THREE.Color("#6b5235");
        const glade = new THREE.Color("#6a9a3e");
        const bank = new THREE.Color("#3a3324");
        const c = new THREE.Color();
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const z = position.getZ(i);
            c.copy(moss).lerp(lush, noise2(x * 0.12, z * 0.12));
            const inGlade = layout.clearings.some((cl) => Math.hypot(x - cl.x, z - cl.z) < cl.r);
            if (inGlade || Math.hypot(x, z) < 7) c.lerp(glade, 0.55);
            const d = distanceToPaths(x, z, layout.paths);
            if (d < 1.4) c.lerp(dirt, (1 - d / 1.4) * 0.85);
            const w = distanceToWater(x, z, layout);
            if (w < 1.6) c.lerp(bank, Math.min(1, (1.6 - w) / 1.6) * 0.9);
            c.toArray(colors, i * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
    }, [layout]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <mesh geometry={geometry} position={[0, 0.012, 0]}>
            <meshLambertMaterial vertexColors />
        </mesh>
    );
};

const Grass: React.FC<{ layout: ForestLayout; time: { value: number }; uniforms: Record<string, { value: unknown }> }> = ({ layout, time, uniforms }) => {
    const mesh = useMemo(() => {
        // A blade: tapered strip, 3 segments, uv.y = height along the blade
        const blade = new THREE.BufferGeometry();
        const w = 0.05;
        const rows = [0, 0.35, 0.7, 1];
        const verts: number[] = [];
        const uvs: number[] = [];
        rows.forEach((t, i) => {
            const half = w * (1 - t) + (i === rows.length - 1 ? 0 : 0.004);
            verts.push(-half, t, 0, half, t, 0);
            uvs.push(0, t, 1, t);
        });
        const index: number[] = [];
        for (let i = 0; i < rows.length - 1; i++) {
            const a = i * 2;
            index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        blade.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        blade.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        blade.setIndex(index);

        const rand = mulberry32(layout.trees.length + 99);
        const placements: { x: number; z: number; h: number; r: number; shade: number }[] = [];
        let attempts = 0;
        while (placements.length < 22000 && attempts < 90000) {
            attempts++;
            const a = rand() * Math.PI * 2;
            const d = Math.sqrt(rand()) * (FOREST_RADIUS - 2);
            const x = Math.cos(a) * d;
            const z = Math.sin(a) * d;
            const patchiness = noise2(x * 0.18 + 7, z * 0.18);
            const inGlade = Math.hypot(x, z) < 7 || layout.clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);
            if (!inGlade && rand() > patchiness * 0.9) continue;
            if (distanceToPaths(x, z, layout.paths) < 0.9) continue;
            if (distanceToWater(x, z, layout) < 0.3) continue;
            placements.push({ x, z, h: 0.25 + rand() * (inGlade ? 0.45 : 0.3), r: rand() * Math.PI, shade: rand() });
        }

        const material = new THREE.ShaderMaterial({
            vertexShader: grassVertex,
            fragmentShader: grassFragment,
            uniforms: {
                ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
                uTime: time,
                ...uniforms,
            },
            side: THREE.DoubleSide,
            fog: true,
        });
        const instanced = new THREE.InstancedMesh(blade, material, placements.length);
        const shades = new Float32Array(placements.length);
        const m = new THREE.Matrix4();
        placements.forEach((p, i) => {
            compose(m, p.x, 0, p.z, 0, p.r, 0, 1, p.h, 1);
            instanced.setMatrixAt(i, m);
            shades[i] = p.shade;
        });
        blade.setAttribute("aShade", new THREE.InstancedBufferAttribute(shades, 1));
        instanced.frustumCulled = false;
        return instanced;
    }, [layout, time, uniforms]);
    return <primitive object={mesh} />;
};

const Fairies: React.FC<{ layout: ForestLayout; time: { value: number }; bright: { value: number } }> = ({ layout, time, bright }) => {
    const points = useMemo(() => {
        const rand = mulberry32(4242 + layout.trees.length);
        const count = 650;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const seeds = new Float32Array(count);
        const palette = ["#8fe9ff", "#ff9de2", "#ffe58a", "#b6ff9d", "#c7b6ff"].map((c) => new THREE.Color(c));
        for (let i = 0; i < count; i++) {
            let x: number;
            let z: number;
            // Clustered near glades and paths, where you'd stop and look
            if (rand() < 0.5) {
                const c = layout.clearings[Math.floor(rand() * layout.clearings.length)];
                const a = rand() * Math.PI * 2;
                const d = rand() * c.r * 1.6;
                x = c.x + Math.cos(a) * d;
                z = c.z + Math.sin(a) * d;
            } else {
                const a = rand() * Math.PI * 2;
                const d = Math.sqrt(rand()) * FOREST_RADIUS;
                x = Math.cos(a) * d;
                z = Math.sin(a) * d;
            }
            positions.set([x, 0.4 + rand() * 3.2, z], i * 3);
            palette[Math.floor(rand() * palette.length)].toArray(colors, i * 3);
            seeds[i] = rand();
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
        const material = new THREE.ShaderMaterial({
            vertexShader: fairyVertex,
            fragmentShader: fairyFragment,
            uniforms: { uTime: time, uBright: bright, uPixelRatio: { value: Math.min(2, window.devicePixelRatio) } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const p = new THREE.Points(geometry, material);
        p.frustumCulled = false;
        return p;
    }, [layout, time, bright]);
    return <primitive object={points} />;
};

// Three bigger fairies that keep you company, flitting around you.
const Companions: React.FC<{ bright: { value: number } }> = ({ bright }) => {
    const camera = useThree((state) => state.camera);
    const refs = useRef<(THREE.Group | null)[]>([]);
    const colors = ["#8fe9ff", "#ff9de2", "#ffe58a"];
    const state = useRef(colors.map(() => ({ p: new THREE.Vector3(0, 2, 0), t: Math.random() * 10 })));
    useFrame((_, delta) => {
        state.current.forEach((s, i) => {
            s.t += delta;
            const target = new THREE.Vector3(
                camera.position.x + Math.sin(s.t * 0.7 + i * 2.1) * 2.2,
                camera.position.y - 0.2 + Math.sin(s.t * 1.3 + i) * 0.5,
                camera.position.z + Math.cos(s.t * 0.6 + i * 2.1) * 2.2
            );
            s.p.lerp(target, Math.min(1, delta * 1.4));
            const g = refs.current[i];
            if (g) {
                g.position.copy(s.p);
                const pulse = 0.85 + Math.sin(s.t * 6 + i) * 0.15;
                g.scale.setScalar(pulse * (0.6 + bright.value * 0.6));
            }
        });
    });
    return (
        <>
            {colors.map((color, i) => (
                <group key={color} ref={(g) => { refs.current[i] = g; }}>
                    <mesh>
                        <sphereGeometry args={[0.05, 10, 8]} />
                        <meshBasicMaterial color="#ffffff" toneMapped={false} />
                    </mesh>
                    <sprite scale={[0.55, 0.55, 1]}>
                        <spriteMaterial color={color} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} map={softBlobTexture()} />
                    </sprite>
                </group>
            ))}
        </>
    );
};

const FogBanks: React.FC<{ layout: ForestLayout; color: THREE.Color }> = ({ layout, color }) => {
    const refs = useRef<(THREE.Sprite | null)[]>([]);
    const material = useMemo(
        () =>
            new THREE.SpriteMaterial({
                map: softBlobTexture(),
                color,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
            }),
        [color]
    );
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        refs.current.forEach((sprite, i) => {
            if (!sprite) return;
            const bank = layout.fogBanks[i];
            sprite.position.x = bank.x + Math.sin(t * 0.05 + i) * 2.5;
            sprite.position.z = bank.z + Math.cos(t * 0.04 + i * 1.7) * 2.5;
        });
    });
    return (
        <>
            {layout.fogBanks.flatMap((bank, i) =>
                [0, 1].map((layer) => (
                    <sprite
                        key={`${i}-${layer}`}
                        ref={(s) => {
                            if (layer === 0) refs.current[i] = s;
                        }}
                        material={material}
                        position={[bank.x + layer * 2, 0.9 + layer * 0.8, bank.z - layer * 1.5]}
                        scale={[bank.s * (1 + layer * 0.4), bank.s * 0.35, 1]}
                    />
                ))
            )}
        </>
    );
};

const Shafts: React.FC<{ layout: ForestLayout; time: { value: number }; intensity: { value: number }; color: { value: THREE.Color } }> = ({ layout, time, intensity, color }) => {
    const groups = useRef<(THREE.Group | null)[]>([]);
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: shaftVertex,
                fragmentShader: shaftFragment,
                uniforms: { uTime: time, uIntensity: intensity, uColor: color },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            }),
        [time, intensity, color]
    );
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    useFrame(() => {
        groups.current.forEach((g) => g?.quaternion.setFromUnitVectors(up, sky.lightDir));
    });
    return (
        <>
            {layout.shafts.map((shaft, i) => (
                <group key={i} position={[shaft.x, 0, shaft.z]} ref={(g) => { groups.current[i] = g; }}>
                    <mesh material={material} raycast={() => null} position={[0, 0, 0]}>
                        <cylinderGeometry args={[shaft.r * 0.8, shaft.r * 1.25, 16, 32, 1, true]} />
                    </mesh>
                </group>
            ))}
        </>
    );
};

const ForestRupees: React.FC<{ layout: ForestLayout; seed: number }> = ({ layout, seed }) => {
    const rupees = useMemo<RupeeData[]>(() => {
        const rand = mulberry32(seed);
        const total = RUPEE_TYPES.reduce((sum, t) => sum + t.spawnWeight, 0);
        return layout.rupees.map(({ x, z }) => {
            let roll = rand() * total;
            const type = RUPEE_TYPES.find((t) => (roll -= t.spawnWeight) <= 0) ?? RUPEE_TYPES[0];
            return {
                position: new THREE.Vector3(x, 0.45, z),
                initialRotation: new THREE.Euler(0, rand() * Math.PI * 2, 0),
                // The rupee model is 5.2 units tall: 0.12 makes it ~60 cm, a
                // pickup in the grass rather than a 1.5 m monolith.
                scale: 0.12,
                color: new THREE.Color(type.color),
                value: type.value,
                type: type.name,
            };
        });
    }, [layout, seed]);
    return (
        <>
            {rupees.map((rupee, i) => (
                <Rupee key={i} rupee={rupee} animationType="rotating" sharedKey={`rupee:forest:${i}`} />
            ))}
        </>
    );
};

// ------------------------------------------------------------------ main
export const ForestExperience: React.FC = () => {
    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);
    // The forest everyone here is in (waits, behind the loading screen,
    // until the room's session is settled).
    const session = useRoomSession();
    const layout = useMemo(() => generateForest(sessionSeed(session, "forest")), [session]);

    // Shared, per-frame uniforms
    const time = useMemo(() => ({ value: 0 }), []);
    const glow = useMemo(() => ({ value: 0 }), []);
    const fairyBright = useMemo(() => ({ value: 0 }), []);
    const shaftIntensity = useMemo(() => ({ value: 0 }), []);
    const shaftColor = useMemo(() => ({ value: new THREE.Color() }), []);
    const grassUniforms = useMemo(
        () => ({
            uBase: { value: new THREE.Color("#1f3d1c") },
            uTip: { value: new THREE.Color("#7fae4a") },
            uLight: { value: new THREE.Color() },
            uAmbient: { value: new THREE.Color() },
        }),
        []
    );
    const fogColor = useMemo(() => new THREE.Color(), []);

    const skyMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: skyVertex,
                fragmentShader: skyFragment,
                uniforms: {
                    uTop: { value: sky.top },
                    uHorizon: { value: sky.horizon },
                    uSunDir: { value: sky.sunDir },
                    uSunColor: { value: sky.light },
                    uStars: { value: 0 },
                    uTime: time,
                },
                side: THREE.BackSide,
                depthWrite: false,
                fog: false,
            }),
        [time]
    );
    const skyMesh = useRef<THREE.Mesh>(null);
    const hemi = useRef<THREE.HemisphereLight>(null);
    const sun = useRef<THREE.DirectionalLight>(null);

    // Take over the scene's environment while the forest runs.
    useEffect(() => {
        const previousFog = scene.fog;
        const previousBackground = scene.background;
        scene.fog = new THREE.FogExp2(sky.fog.getHex(), 0.03);
        scene.background = null;
        const store = useSceneStore.getState();
        store.setCustomEnvironment(true);
        return () => {
            scene.fog = previousFog;
            scene.background = previousBackground;
            useSceneStore.getState().setCustomEnvironment(false);
        };
    }, [scene]);

    useFrame(() => {
        // Both from the session, so the wind and the hour are everyone's.
        const now = sessionSeconds();
        time.value = now;
        sampleSky(START_PHASE + now / CYCLE_SECONDS, sky);

        const fog = scene.fog as THREE.FogExp2 | null;
        if (fog && "density" in fog) {
            fog.color.copy(sky.fog);
            fog.density = sky.fogDensity;
        }
        fogColor.copy(sky.fog).lerp(new THREE.Color("#ffffff"), 0.15);
        glow.value = sky.glow * 1.4;
        fairyBright.value = 0.25 + sky.fairies * 1.2;
        shaftIntensity.value = sky.shafts;
        shaftColor.value.copy(sky.shaftColor);
        (skyMaterial.uniforms.uStars as { value: number }).value = sky.stars;

        if (hemi.current) {
            hemi.current.color.copy(sky.hemiSky);
            hemi.current.groundColor.copy(sky.hemiGround);
            hemi.current.intensity = sky.hemi * 1.6;
        }
        if (sun.current) {
            sun.current.color.copy(sky.light);
            sun.current.intensity = sky.lightIntensity * 1.6;
            sun.current.position.copy(camera.position).addScaledVector(sky.lightDir, 30);
            sun.current.target.position.copy(camera.position);
            sun.current.target.updateMatrixWorld();
        }
        // Grass uses its own simple lighting
        grassUniforms.uLight.value.copy(sky.light).multiplyScalar(sky.lightIntensity * 0.6);
        grassUniforms.uAmbient.value.copy(sky.hemiSky).multiplyScalar(sky.hemi * 0.75);
        // The sky dome rides along with the camera
        skyMesh.current?.position.copy(camera.position);
    });

    return (
        <group>
            <hemisphereLight ref={hemi} />
            <directionalLight ref={sun} />

            <mesh ref={skyMesh} material={skyMaterial} renderOrder={-10} frustumCulled={false} raycast={() => null}>
                <sphereGeometry args={[45, 32, 16]} />
            </mesh>

            {/* Physics: the forest floor, every trunk, and the edge of the world */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[FOREST_RADIUS + 20, 0.1, FOREST_RADIUS + 20]} position={[0, -0.1, 0]} />
                {layout.trees.map((t, i) => (
                    <CylinderCollider key={i} args={[1.6, t.radius * 0.95]} position={[t.x, 1.6, t.z]} />
                ))}
                {Array.from({ length: 48 }, (_, i) => {
                    const a = (i / 48) * Math.PI * 2;
                    const r = FOREST_RADIUS + 1.5;
                    return (
                        <CuboidCollider
                            key={`edge-${i}`}
                            args={[3.5, 4, 0.5]}
                            position={[Math.cos(a) * r, 4, Math.sin(a) * r]}
                            rotation={[0, -a + Math.PI / 2, 0]}
                        />
                    );
                })}
            </RigidBody>

            <Ground layout={layout} />
            <Grass layout={layout} time={time} uniforms={grassUniforms} />
            <Trees layout={layout} time={time} />
            <Undergrowth layout={layout} time={time} glow={glow} />
            <FogBanks layout={layout} color={fogColor} />
            <Shafts layout={layout} time={time} intensity={shaftIntensity} color={shaftColor} />
            <Fairies layout={layout} time={time} bright={fairyBright} />
            <Companions bright={fairyBright} />
            <ForestRupees layout={layout} seed={sessionSeed(session, "forest-rupees")} />
            <ForestWater layout={layout} time={time} />
            <ForestFairies layout={layout} />
        </group>
    );
};

export type { SkyState };
