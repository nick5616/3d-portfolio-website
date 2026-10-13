import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Shared, module-level materials for every art frame. One material per
// look (instead of new ones per frame) means one shader program and far
// fewer state changes when a hall full of frames draws.
export const frameMaterials = {
    moulding: new THREE.MeshStandardMaterial({
        color: "#2b211b",
        roughness: 0.45,
        metalness: 0.1,
    }),
    mat: new THREE.MeshStandardMaterial({
        color: "#f2eee6",
        roughness: 0.95,
        metalness: 0,
    }),
    brass: new THREE.MeshStandardMaterial({
        color: "#b08d57",
        roughness: 0.35,
        metalness: 1,
    }),
    placeholder: new THREE.MeshBasicMaterial({
        color: "#d9d4ca",
        toneMapped: false,
    }),
};

export const FRAME_DEPTH = 0.06;
export const MOULDING_WIDTH = 0.07;
export const MAT_WIDTH = 0.12;

// Four mitred-looking bars around (width x height) inner opening, with a
// small raised lip on the inner edge so light catches the profile.
export const buildMouldingGeometry = (
    innerWidth: number,
    innerHeight: number
) => {
    const w = MOULDING_WIDTH;
    const outerW = innerWidth + w * 2;
    const bars: THREE.BufferGeometry[] = [];
    const bar = (sx: number, sy: number, x: number, y: number, z: number, d: number) => {
        const geometry = new THREE.BoxGeometry(sx, sy, d);
        geometry.translate(x, y, z);
        bars.push(geometry);
    };
    // outer body
    bar(outerW, w, 0, (innerHeight + w) / 2, 0, FRAME_DEPTH);
    bar(outerW, w, 0, -(innerHeight + w) / 2, 0, FRAME_DEPTH);
    bar(w, innerHeight, -(innerWidth + w) / 2, 0, 0, FRAME_DEPTH);
    bar(w, innerHeight, (innerWidth + w) / 2, 0, 0, FRAME_DEPTH);
    // inner lip
    const lip = 0.018;
    const lipZ = FRAME_DEPTH / 2 + 0.006;
    bar(innerWidth + lip * 2, lip, 0, innerHeight / 2 + lip / 2, lipZ, 0.012);
    bar(innerWidth + lip * 2, lip, 0, -innerHeight / 2 - lip / 2, lipZ, 0.012);
    bar(lip, innerHeight, -innerWidth / 2 - lip / 2, 0, lipZ, 0.012);
    bar(lip, innerHeight, innerWidth / 2 + lip / 2, 0, lipZ, 0.012);
    const merged = mergeGeometries(bars)!;
    bars.forEach((geometry) => geometry.dispose());
    return merged;
};

// A brass gallery picture light: a bar shade on a short arm, unit width
// (scaled per frame along X).
export const pictureLightGeometry = (() => {
    const shade = new THREE.CylinderGeometry(0.035, 0.045, 1, 16, 1, false, 0, Math.PI);
    shade.rotateZ(Math.PI / 2);
    shade.rotateX(-Math.PI / 2);
    shade.translate(0, 0, 0.22);
    const arm = new THREE.CylinderGeometry(0.01, 0.01, 0.24, 8);
    arm.rotateX(Math.PI / 2);
    arm.translate(0, 0.0, 0.11);
    const mount = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);
    mount.rotateX(Math.PI / 2);
    mount.translate(0, 0, 0.01);
    const merged = mergeGeometries([
        shade.toNonIndexed(),
        arm.toNonIndexed(),
        mount.toNonIndexed(),
    ])!;
    return merged;
})();

// Soft pool of light washing the wall around a painting. A single additive
// quad with a radial gradient - it looks like a spotlight hitting the wall,
// but costs one cheap draw instead of a real light in every shader.
const makePoolTexture = () => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;
    // Elliptical falloff, brighter toward the top (where the light is).
    const gradient = context.createRadialGradient(
        size / 2,
        size * 0.42,
        0,
        size / 2,
        size * 0.5,
        size / 2
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

let poolTexture: THREE.Texture | null = null;
const poolMaterials = new Map<string, THREE.MeshBasicMaterial>();

export const getLightPoolMaterial = (color: string, opacity: number) => {
    const key = `${color}:${opacity}`;
    let material = poolMaterials.get(key);
    if (!material) {
        poolTexture ??= makePoolTexture();
        material = new THREE.MeshBasicMaterial({
            map: poolTexture,
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
        });
        poolMaterials.set(key, material);
    }
    return material;
};
