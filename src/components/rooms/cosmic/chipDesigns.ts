import * as THREE from "three";
import { CHIP_RADIUS as R, CHIP_THICKNESS as T } from "./cosmicLayout";

// The chips. Yours are cut gems you choose at the altar; Nothing's are
// discs of gold light. Every chip is built facing +Z (a disc standing on
// its rim in the board's plane), centred on the origin.

export type ChipDesignId = "ruby" | "sapphire" | "rupee" | "obsidian" | "moonstone" | "bismuth";

export interface ChipDesign {
    id: ChipDesignId;
    name: string;
    glow: string; // for light, the replica and the hover beam
    // What Nothing says when you pick it up.
    remark: string;
}

export const CHIP_DESIGNS: ChipDesign[] = [
    { id: "ruby", name: "Ruby", glow: "#ff2a3d", remark: "Red. Of course. You always reach for the one that looks like it bleeds." },
    { id: "sapphire", name: "Sapphire", glow: "#3d6bff", remark: "Sapphire. Cold, patient. I approve, though you shouldn't care that I do." },
    { id: "rupee", name: "Rupee", glow: "#2bff8a", remark: "Currency. You'd wager money against me? How small. How charming." },
    { id: "obsidian", name: "Obsidian Ember", glow: "#ff6a1a", remark: "Stone that remembers being fire. Something in you recognised it." },
    { id: "moonstone", name: "Moonstone", glow: "#bcd4ff", remark: "Moonstone. Borrowed light. Like mine, if you think about it. Don't." },
    { id: "bismuth", name: "Bismuth", glow: "#d58bff", remark: "It grows in staircases. You came up one. Fitting." },
];

export const designById = (id: string) => CHIP_DESIGNS.find((d) => d.id === id) ?? CHIP_DESIGNS[0];

export const NOTHING_GLOW = "#ffcc55";

// --- Geometry ---------------------------------------------------------------

// Profiles below are written top to bottom; LatheGeometry faces outward
// when the profile climbs, so flip them. Then turn the disc to face +Z.
const lathe = (topDown: THREE.Vector2[], segments: number, phiStart = 0) => {
    const geometry = new THREE.LatheGeometry([...topDown].reverse(), segments, phiStart);
    geometry.rotateX(Math.PI / 2);
    geometry.computeVertexNormals();
    return geometry;
};

// A cut gem in profile: flat table, sloped crown, girdle, mirrored pavilion.
// Lathed around Y with few segments so the facets read, then turned to
// face +Z.
const gemGeometry = (segments: number, table = 0.62, crown = 0.14) => {
    const points = [
        new THREE.Vector2(0, T / 2),
        new THREE.Vector2(R * table, T / 2),
        new THREE.Vector2(R, T * crown),
        new THREE.Vector2(R, -T * crown),
        new THREE.Vector2(R * table, -T / 2),
        new THREE.Vector2(0, -T / 2),
    ];
    return lathe(points, segments, Math.PI / segments);
};

// Smooth disc with a rounded edge.
const roundedDisc = (segments = 48, radius = R) => {
    const points: THREE.Vector2[] = [new THREE.Vector2(0, T / 2)];
    const edge = T / 2;
    points.push(new THREE.Vector2(radius - edge, T / 2));
    for (let i = 1; i < 8; i++) {
        const a = Math.PI / 2 - (i / 8) * Math.PI;
        points.push(new THREE.Vector2(radius - edge + Math.cos(a) * edge, Math.sin(a) * edge));
    }
    points.push(new THREE.Vector2(radius - edge, -T / 2));
    points.push(new THREE.Vector2(0, -T / 2));
    return lathe(points, segments);
};

// Bismuth's terraced hopper faces: steps climbing toward the centre.
const terracedGeometry = () => {
    const steps = 4;
    const drop = (T * 0.35) / steps;
    // Upper half, centre outward: each terrace a step lower than the last.
    const top: THREE.Vector2[] = [];
    for (let s = 1; s <= steps; s++) {
        const r = (R * 0.92 * s) / steps;
        const y = T / 2 - (s - 1) * drop;
        top.push(new THREE.Vector2(r, y), new THREE.Vector2(r, y - drop));
    }
    top.push(new THREE.Vector2(R, T * 0.12));
    const points = [new THREE.Vector2(0, T / 2), ...top];
    for (let i = top.length - 1; i >= 0; i--) points.push(new THREE.Vector2(top[i].x, -top[i].y));
    points.push(new THREE.Vector2(0, -T / 2));
    return lathe(points, 8, Math.PI / 8);
};

// Obsidian's ember veins: bright branching cracks on black, painted once.
const emberTexture = () => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    let seed = 7;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    ctx.lineCap = "round";
    for (let k = 0; k < 18; k++) {
        let x = rand() * size;
        let y = rand() * size;
        let a = rand() * Math.PI * 2;
        const width = 1 + rand() * 3;
        ctx.strokeStyle = `rgba(255, ${120 + Math.floor(rand() * 90)}, 40, ${0.6 + rand() * 0.4})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 14; s++) {
            a += (rand() - 0.5) * 1.1;
            x += Math.cos(a) * 9;
            y += Math.sin(a) * 9;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
};

// --- Looks ------------------------------------------------------------------

export interface ChipLook {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    // A glowing core inside translucent gems: their fire.
    core?: { geometry: THREE.BufferGeometry; material: THREE.Material };
}

const gemMaterial = (color: string, emissive: string, opacity = 0.84) =>
    new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 0.9,
        roughness: 0.06,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        specularIntensity: 1,
        flatShading: true,
        transparent: opacity < 1,
        opacity,
        envMapIntensity: 2.2,
    });

const coreOf = (color: string, scale = 0.62) => ({
    geometry: (() => {
        const g = roundedDisc(24, R * scale);
        g.scale(1, 1, 0.55);
        return g;
    })(),
    material: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
    }),
});

const build = (id: ChipDesignId): ChipLook => {
    switch (id) {
        case "ruby":
            return { geometry: gemGeometry(12), material: gemMaterial("#a3001a", "#5a0010"), core: coreOf("#ff2a40") };
        case "sapphire":
            return { geometry: gemGeometry(10, 0.55, 0.18), material: gemMaterial("#0a2aa8", "#06124f"), core: coreOf("#4a7dff") };
        case "rupee":
            return { geometry: gemGeometry(6, 0.5, 0.2), material: gemMaterial("#0c9a4c", "#03401c"), core: coreOf("#3dff95", 0.55) };
        case "obsidian": {
            const veins = emberTexture();
            return {
                geometry: roundedDisc(40),
                material: new THREE.MeshPhysicalMaterial({
                    color: "#0b0907",
                    roughness: 0.12,
                    metalness: 0.2,
                    clearcoat: 1,
                    clearcoatRoughness: 0.03,
                    emissive: "#ff5a1a",
                    emissiveMap: veins,
                    emissiveIntensity: 2.2,
                    envMapIntensity: 1.6,
                }),
            };
        }
        case "moonstone":
            return {
                geometry: roundedDisc(48),
                material: new THREE.MeshPhysicalMaterial({
                    color: "#e7ecfb",
                    emissive: "#8fb4ff",
                    emissiveIntensity: 0.25,
                    roughness: 0.22,
                    metalness: 0,
                    iridescence: 1,
                    iridescenceIOR: 1.7,
                    iridescenceThicknessRange: [200, 600],
                    sheen: 1,
                    sheenColor: new THREE.Color("#7fb0ff"),
                    sheenRoughness: 0.4,
                    clearcoat: 1,
                    transparent: true,
                    opacity: 0.93,
                    envMapIntensity: 1.8,
                }),
                core: coreOf("#9cc0ff", 0.7),
            };
        case "bismuth":
            return {
                geometry: terracedGeometry(),
                material: new THREE.MeshPhysicalMaterial({
                    color: "#d9c2ff",
                    roughness: 0.16,
                    metalness: 1,
                    iridescence: 1,
                    iridescenceIOR: 2.2,
                    iridescenceThicknessRange: [150, 900],
                    flatShading: true,
                    envMapIntensity: 2.4,
                    emissive: "#2a0f45",
                    emissiveIntensity: 0.6,
                }),
            };
    }
};

const looks = new Map<ChipDesignId, ChipLook>();
export const getChipLook = (id: ChipDesignId): ChipLook => {
    let look = looks.get(id);
    if (!look) {
        look = build(id);
        looks.set(id, look);
    }
    return look;
};

// Nothing's chips: discs of living gold light. Rays wheel across the
// faces, rings pulse outward from a white-hot centre, and the rim burns.
// One shared material; the room ticks its clock.
let nothingLook: (ChipLook & { uniforms: { uTime: { value: number }; uFlare: { value: number } } }) | null = null;
export const getNothingChipLook = () => {
    if (nothingLook) return nothingLook;
    const uniforms = { uTime: { value: 0 }, uFlare: { value: 0 } };
    const material = new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uRadius: { value: R } },
        vertexShader: /* glsl */ `
            varying vec3 vLocal;
            varying vec3 vNormalView;
            varying vec3 vViewDir;
            void main() {
                vLocal = position;
                // Also drawn instanced, on the giant replica board.
                #ifdef USE_INSTANCING
                    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                    vNormalView = normalize(normalMatrix * mat3(instanceMatrix) * normal);
                #else
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vNormalView = normalize(normalMatrix * normal);
                #endif
                vViewDir = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uFlare;
            uniform float uRadius;
            varying vec3 vLocal;
            varying vec3 vNormalView;
            varying vec3 vViewDir;
            void main() {
                float r = length(vLocal.xy) / uRadius;
                float a = atan(vLocal.y, vLocal.x);
                float rays = pow(abs(sin(a * 7.0 + uTime * 1.7 + r * 5.0)), 10.0);
                rays += pow(abs(sin(a * 11.0 - uTime * 2.3 - r * 8.0)), 14.0) * 0.6;
                float rings = 0.5 + 0.5 * sin(r * 26.0 - uTime * 5.0);
                float core = exp(-r * r * 9.0);
                vec3 gold = vec3(1.0, 0.72, 0.22);
                vec3 white = vec3(1.0, 0.96, 0.85);
                vec3 col = gold * (0.55 + rays * 0.9 + rings * 0.25 * (1.0 - r));
                col = mix(col, white * 2.2, core);
                float rim = pow(1.0 - abs(dot(vNormalView, vViewDir)), 2.0);
                col += gold * rim * 1.6;
                col *= 1.0 + uFlare * 1.5;
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        toneMapped: false,
    });
    nothingLook = { geometry: roundedDisc(48), material, uniforms };
    return nothingLook;
};

// A soft radial glow for halos (additive sprites).
let glowTexture: THREE.Texture | null = null;
export const getGlowTexture = () => {
    if (glowTexture) return glowTexture;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.2, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.14)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    glowTexture = new THREE.CanvasTexture(canvas);
    return glowTexture;
};
