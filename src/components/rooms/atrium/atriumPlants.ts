import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { seeded } from "./atriumLayout";

// Every plant in the rotunda (shrubs, palms, ferns, ivy, lily pads) is baked
// into ONE merged, vertex-colored geometry drawn with one material, so the
// whole garden costs a single draw call. A per-vertex "aSway" weight (0 at
// the roots, up to ~1.5 at the tips) drives a gentle breeze in the vertex
// shader.

const LEAF_GREENS = ["#2f7a45", "#3d8f4f", "#2a6b3c", "#4f9a55", "#24603a", "#5aa860"];
const FLOWER_COLORS = ["#fff6ea", "#f6c1cf", "#ffd98a", "#f2a3b9"];

const color = new THREE.Color();

// Strip a geometry down to position + color + aSway so every piece merges.
const finish = (
    source: THREE.BufferGeometry,
    tint: THREE.ColorRepresentation | ((p: THREE.Vector3, i: number) => THREE.Color),
    sway: number | ((p: THREE.Vector3, i: number) => number)
) => {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute("uv");
    geometry.deleteAttribute("normal");
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const sways = new Float32Array(position.count);
    const p = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i);
        const c = typeof tint === "function" ? tint(p, i) : color.set(tint);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        sways[i] = typeof sway === "function" ? sway(p, i) : sway;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSway", new THREE.BufferAttribute(sways, 1));
    return geometry;
};

const pick = <T,>(list: T[], seed: number) => list[Math.floor(seeded(seed) * list.length) % list.length];

export class GardenBuilder {
    private parts: THREE.BufferGeometry[] = [];

    // A rounded clump of faceted leaves, with a few flowers on top.
    shrub(x: number, y: number, z: number, scale: number, seed: number, flowers = 0) {
        const height = 1.1 * scale;
        for (let i = 0; i < 14; i++) {
            const s = seed * 31 + i;
            const size = (0.22 + seeded(s) * 0.22) * scale;
            const leaf = new THREE.IcosahedronGeometry(size, 0);
            const a = seeded(s + 7) * Math.PI * 2;
            const r = seeded(s + 13) * 0.45 * scale;
            const h = 0.2 * scale + seeded(s + 19) * 0.8 * scale;
            leaf.translate(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r);
            const shade = pick(LEAF_GREENS, s + 3);
            this.parts.push(
                finish(leaf, () => color.set(shade).multiplyScalar(0.85 + seeded(s + 5) * 0.3), (p) =>
                    Math.max(0, (p.y - y) / height) * 0.9
                )
            );
        }
        for (let i = 0; i < flowers; i++) {
            const s = seed * 17 + i + 400;
            const bloom = new THREE.IcosahedronGeometry(0.06 * scale + seeded(s) * 0.03, 0);
            const a = seeded(s + 1) * Math.PI * 2;
            const r = (0.25 + seeded(s + 2) * 0.35) * scale;
            bloom.translate(x + Math.cos(a) * r, y + (0.75 + seeded(s + 3) * 0.45) * scale, z + Math.sin(a) * r);
            this.parts.push(finish(bloom, pick(FLOWER_COLORS, s + 4), 0.8));
        }
    }

    // One arching, V-folded leaf blade from `origin` heading out along `azimuth`.
    frond(
        origin: THREE.Vector3,
        azimuth: number,
        length: number,
        width: number,
        lift: number, // how high it arcs before drooping
        droop: number,
        baseColor: string,
        tipColor: string,
        swayScale: number
    ) {
        const segments = 8;
        const out = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
        const side = new THREE.Vector3(-out.z, 0, out.x);
        const up = new THREE.Vector3(0, 1, 0);
        const rows: THREE.Vector3[][] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const center = origin
                .clone()
                .addScaledVector(out, length * t)
                .addScaledVector(up, length * (lift * t - droop * t * t));
            const w = width * Math.sin(Math.PI * Math.min(1, t * 1.08)) + 0.004;
            rows.push([
                center.clone().addScaledVector(side, w).addScaledVector(up, -0.3 * w),
                center.clone().addScaledVector(up, 0.08 * w),
                center.clone().addScaledVector(side, -w).addScaledVector(up, -0.3 * w),
            ]);
        }
        const positions: number[] = [];
        const along: number[] = []; // 0 at the stem, 1 at the tip, per vertex
        const push = (v: THREE.Vector3, t: number) => {
            positions.push(v.x, v.y, v.z);
            along.push(t);
        };
        for (let i = 0; i < segments; i++) {
            const [l0, m0, r0] = rows[i];
            const [l1, m1, r1] = rows[i + 1];
            const t0 = i / segments;
            const t1 = (i + 1) / segments;
            push(l0, t0); push(m0, t0); push(l1, t1);
            push(m0, t0); push(m1, t1); push(l1, t1);
            push(m0, t0); push(r0, t0); push(m1, t1);
            push(r0, t0); push(r1, t1); push(m1, t1);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        const base = new THREE.Color(baseColor);
        const tip = new THREE.Color(tipColor);
        this.parts.push(
            finish(
                geometry,
                (_, i) => color.copy(base).lerp(tip, along[i]),
                (_, i) => swayScale * (0.3 + along[i])
            )
        );
    }

    // A slim trunk topped with a crown of arching fronds.
    palm(x: number, y: number, z: number, height: number, seed: number) {
        const lean = (seeded(seed) - 0.5) * 0.25;
        const trunk = new THREE.CylinderGeometry(0.06, 0.1, height, 7, 5);
        trunk.translate(0, height / 2, 0);
        trunk.rotateZ(lean);
        trunk.translate(x, y, z);
        this.parts.push(
            finish(trunk, (p) => color.set("#6b4f35").multiplyScalar(0.8 + 0.4 * ((p.y - y) / height)), (p) =>
                Math.max(0, (p.y - y) / height) * 0.35
            )
        );
        const top = new THREE.Vector3(x - Math.sin(lean) * height, y + height * Math.cos(lean), z);
        const count = 9;
        for (let i = 0; i < count; i++) {
            const s = seed * 13 + i;
            this.frond(
                top,
                (i / count) * Math.PI * 2 + seeded(s) * 0.5,
                1.25 + seeded(s + 1) * 0.5,
                0.2 + seeded(s + 2) * 0.06,
                0.75 + seeded(s + 3) * 0.3,
                1.25,
                "#2d6a3a",
                "#7fc06a",
                1.2
            );
        }
    }

    // A low fountain of narrow fronds, for pots on the balconies.
    fern(x: number, y: number, z: number, scale: number, seed: number) {
        const origin = new THREE.Vector3(x, y, z);
        for (let i = 0; i < 14; i++) {
            const s = seed * 7 + i;
            this.frond(
                origin,
                (i / 14) * Math.PI * 2 + seeded(s) * 0.4,
                (0.6 + seeded(s + 1) * 0.35) * scale,
                0.09 * scale,
                1.3,
                1.5,
                "#2a6b3c",
                "#8fcb6b",
                1
            );
        }
    }

    // A strand of ivy draped along `profile` - [inward, up] offsets from
    // `anchor`, `inward` being the horizontal direction away from the rail -
    // so it hugs whatever it climbs over, then hangs free for `hang` metres
    // below the profile's last point.
    ivy(anchor: THREE.Vector3, inward: THREE.Vector3, profile: [number, number][], hang: number, seed: number) {
        const tangent = new THREE.Vector3(-inward.z, 0, inward.x);
        const points = profile.map(([i, u]) => anchor.clone().addScaledVector(inward, i).add(new THREE.Vector3(0, u, 0)));
        const lengths = [0];
        for (let k = 1; k < points.length; k++) lengths.push(lengths[k - 1] + points[k].distanceTo(points[k - 1]));
        const draped = lengths[lengths.length - 1];
        const count = Math.floor((draped + hang) / 0.15);
        const p = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
            const s = seed * 101 + i;
            const d = i * 0.15;
            if (d < draped) {
                let k = 1;
                while (lengths[k] < d) k++;
                p.lerpVectors(points[k - 1], points[k], (d - lengths[k - 1]) / (lengths[k] - lengths[k - 1]));
            } else {
                // Past the edge it hangs free, with a slow wiggle off the wall.
                const free = d - draped;
                p.copy(points[points.length - 1])
                    .addScaledVector(inward, 0.04 + Math.sin(free * 2.1 + seed) * 0.04)
                    .add(new THREE.Vector3(0, -free, 0));
            }
            // Meander sideways along the rail, never off the surface.
            p.addScaledVector(tangent, Math.sin(d * 1.7 + seed) * 0.05 + (seeded(s + 4) - 0.5) * 0.08);
            const leaf = new THREE.OctahedronGeometry(1, 0);
            const size = 0.07 + seeded(s) * 0.05;
            leaf.scale(size * 1.3, size * 0.35, size);
            leaf.rotateX(seeded(s + 1) * Math.PI);
            leaf.rotateY(seeded(s + 2) * Math.PI * 2);
            leaf.rotateZ((seeded(s + 3) - 0.5) * 1.2);
            leaf.translate(p.x, p.y, p.z);
            const shade = pick(LEAF_GREENS, s + 6);
            // Clinging leaves barely stir; the free end swings.
            const sway = d < draped ? 0.1 : 0.3 + ((d - draped) / Math.max(hang, 0.01)) * 1.3;
            this.parts.push(finish(leaf, () => color.set(shade).multiplyScalar(0.8 + seeded(s + 8) * 0.35), sway));
        }
    }

    // A floating pad with its notch, and sometimes a lotus bloom.
    lilyPad(x: number, y: number, z: number, radius: number, seed: number, bloom: boolean) {
        const pad = new THREE.CircleGeometry(radius, 14, 0.3, Math.PI * 2 - 0.3);
        pad.rotateX(-Math.PI / 2);
        pad.rotateY(seeded(seed) * Math.PI * 2);
        pad.translate(x, y, z);
        this.parts.push(finish(pad, pick(["#3f7d3a", "#4b8a3f", "#356d34"], seed + 1), 0.12));
        if (bloom) {
            for (let i = 0; i < 6; i++) {
                const petal = new THREE.OctahedronGeometry(1, 0);
                petal.scale(0.05, 0.11, 0.025);
                petal.rotateZ(0.5);
                petal.rotateY((i / 6) * Math.PI * 2);
                petal.translate(x, y + 0.08, z);
                this.parts.push(finish(petal, i % 2 ? "#f6c1cf" : "#fbe3ea", 0.12));
            }
            const heart = new THREE.IcosahedronGeometry(0.03, 0);
            heart.translate(x, y + 0.1, z);
            this.parts.push(finish(heart, "#ffd25e", 0.12));
        }
    }

    build() {
        const merged = mergeGeometries(this.parts)!;
        this.parts.forEach((part) => part.dispose());
        this.parts = [];
        merged.computeVertexNormals();
        merged.computeBoundingSphere();
        return merged;
    }
}

// Flat-shaded, vertex-colored foliage with a breeze in the vertex shader.
export const createGardenMaterial = () => {
    const time = { value: 0 };
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.72,
        metalness: 0,
        side: THREE.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = time;
        shader.vertexShader = shader.vertexShader
            .replace(
                "#include <common>",
                "#include <common>\nuniform float uTime;\nattribute float aSway;"
            )
            .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>
                float gust = 0.6 + 0.4 * sin(uTime * 0.35 + position.x * 0.11);
                transformed.x += sin(uTime * 1.1 + position.y * 0.9 + position.x * 0.4) * 0.045 * aSway * gust;
                transformed.z += cos(uTime * 0.9 + position.y * 0.7 + position.z * 0.4) * 0.045 * aSway * gust;`
            );
    };
    material.customProgramCacheKey = () => "atrium-garden";
    return { material, time };
};
