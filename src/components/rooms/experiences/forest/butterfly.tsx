import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The forest's butterfly fairies: a speck of light with two pairs of soft,
// veined wings. Shared by the one at the keyboard and the wild ones.
// Geometry, textures and materials are made once and kept for the session.

const glowTexture = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

// A soft colour gradient spreading from the body, with dark veins.
const wingTexture = (inner: string, middle: string, outer: string, edge: string) => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(0, size / 2, 4, 0, size / 2, size);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, middle);
    g.addColorStop(0.8, outer);
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(60, 30, 90, 0.35)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.quadraticCurveTo(size * 0.5, size * (0.15 + k * 0.18), size, size * (0.05 + k * 0.22));
        ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

// Wing shapes in the +X half, lying flat, with the body along Z (head -Z).
const wingGeometry = (shape: THREE.Shape) => {
    const g = new THREE.ShapeGeometry(shape, 12);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = pos.getX(i) / 0.15;
        uv[i * 2 + 1] = 0.5 - pos.getZ(i) / 0.25;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
};

const makeWings = () => {
    const fore = new THREE.Shape();
    fore.moveTo(0, 0.01);
    fore.bezierCurveTo(0.04, 0.09, 0.13, 0.11, 0.14, 0.06);
    fore.bezierCurveTo(0.15, 0.02, 0.09, -0.01, 0, -0.005);
    const hind = new THREE.Shape();
    hind.moveTo(0, -0.005);
    hind.bezierCurveTo(0.07, -0.01, 0.1, -0.05, 0.08, -0.08);
    hind.bezierCurveTo(0.06, -0.1, 0.02, -0.06, 0, -0.02);
    return { fore: wingGeometry(fore), hind: wingGeometry(hind) };
};

// Colourways, each a "<colour> Royal Fairy" when caught.
export const FAIRY_KINDS = [
    { name: "Rose", glow: "#ffe58a", wing: ["#fff6c8", "#ffc2e8", "#9fd8ff", "#6a4aa8"] },
    { name: "Seafoam", glow: "#9ff7e0", wing: ["#eafff8", "#9ff7e0", "#5ab8e8", "#2a4a8a"] },
    { name: "Ember", glow: "#ffb070", wing: ["#fff0d0", "#ffc070", "#ff7a5a", "#7a2a3a"] },
    { name: "Lilac", glow: "#d0b8ff", wing: ["#f6eeff", "#d0b8ff", "#8f8aff", "#3a2a6a"] },
] as const;

let shared: {
    glow: THREE.Texture;
    wings: { fore: THREE.BufferGeometry; hind: THREE.BufferGeometry };
    wingMaterials: THREE.MeshBasicMaterial[];
    glowMaterials: THREE.SpriteMaterial[];
    body: THREE.BufferGeometry;
    bodyMaterial: THREE.MeshBasicMaterial;
} | null = null;

export const butterflyAssets = () => {
    if (shared) return shared;
    const glow = glowTexture();
    shared = {
        glow,
        wings: makeWings(),
        wingMaterials: FAIRY_KINDS.map(
            (k) =>
                new THREE.MeshBasicMaterial({
                    map: wingTexture(k.wing[0], k.wing[1], k.wing[2], k.wing[3]),
                    transparent: true,
                    opacity: 0.88,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    toneMapped: false,
                })
        ),
        glowMaterials: FAIRY_KINDS.map(
            (k) =>
                new THREE.SpriteMaterial({
                    map: glow,
                    color: k.glow,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    toneMapped: false,
                })
        ),
        body: new THREE.CapsuleGeometry(0.007, 0.03, 4, 8).rotateX(Math.PI / 2),
        bodyMaterial: new THREE.MeshBasicMaterial({ color: "#fff6e0", toneMapped: false }),
    };
    return shared;
};

// One fairy. The parent positions and turns it; `flap` sets how fast the
// wings beat (radians per second), so it can be quickened when frightened.
export const ButterflyFairy: React.FC<{
    kind?: number;
    flap?: React.MutableRefObject<number>;
    glowSize?: number;
}> = ({ kind = 0, flap, glowSize = 0.16 }) => {
    const assets = butterflyAssets();
    const sides = useRef<(THREE.Group | null)[]>([]);
    const phase = useRef(Math.random() * 10);
    useFrame((_, delta) => {
        phase.current += delta * (flap?.current ?? 4);
        const open = Math.sin(phase.current) * 0.55 + 0.35;
        sides.current.forEach((side, i) => {
            if (side) side.rotation.z = (i === 0 ? 1 : -1) * open;
        });
    });
    const k = kind % FAIRY_KINDS.length;
    return (
        <group>
            <mesh geometry={assets.body} material={assets.bodyMaterial} raycast={() => null} />
            <sprite material={assets.glowMaterials[k]} scale={[glowSize, glowSize, 1]} raycast={() => null} />
            {[1, -1].map((side, i) => (
                <group
                    key={side}
                    ref={(g) => {
                        sides.current[i] = g;
                    }}
                    scale={[side, 1, 1]}
                >
                    <mesh geometry={assets.wings.fore} material={assets.wingMaterials[k]} raycast={() => null} />
                    <mesh geometry={assets.wings.hind} material={assets.wingMaterials[k]} raycast={() => null} />
                </group>
            ))}
        </group>
    );
};
