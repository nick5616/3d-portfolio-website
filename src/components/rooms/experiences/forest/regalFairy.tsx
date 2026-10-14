import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { butterflyAssets } from "./butterfly";

// The Fairy King and the Fairy Queen: rare, larger and ornate. Swallowtail
// wings with long trailing tails, eye-spots and gold veins, a gold rim that
// shimmers as they beat, a crown, and a stream of glitter behind them. The
// Queen is pearl, rose and gold; the King deep violet, sapphire and gold.

export type RegalKind = "queen" | "king";

export const REGAL = {
    queen: { name: "Fairy Queen", glow: "#ffd6f0", colors: ["#fffaf2", "#ffd1ea", "#f2b8ff", "#d9a94a"], eye: "#7a3a8a" },
    king: { name: "Fairy King", glow: "#b8c8ff", colors: ["#e8e0ff", "#7a6aff", "#2a3aa8", "#e8c25a"], eye: "#ffd23c" },
} as const;

const wingTexture = (kind: RegalKind) => {
    const { colors, eye } = REGAL[kind];
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(0, size / 2, 6, 0, size / 2, size);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.4, colors[1]);
    g.addColorStop(0.78, colors[2]);
    g.addColorStop(0.9, colors[3]);
    g.addColorStop(1, colors[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // Fine gold veins
    ctx.strokeStyle = "rgba(255, 220, 140, 0.55)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.quadraticCurveTo(size * 0.55, size * (0.08 + k * 0.12), size, size * (k * 0.14));
        ctx.stroke();
    }
    // Eye-spots toward the outer edge
    [
        [0.72, 0.3, 0.07],
        [0.62, 0.72, 0.06],
        [0.84, 0.55, 0.045],
    ].forEach(([x, y, r]) => {
        const spot = ctx.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
        spot.addColorStop(0, "#ffffff");
        spot.addColorStop(0.35, eye);
        spot.addColorStop(0.7, colors[3]);
        spot.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = spot;
        ctx.beginPath();
        ctx.arc(x * size, y * size, r * size, 0, Math.PI * 2);
        ctx.fill();
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

const makeWings = () => {
    // Swallowtail forewing: broad, with a pointed tip.
    const fore = new THREE.Shape();
    fore.moveTo(0, 0.012);
    fore.bezierCurveTo(0.03, 0.12, 0.14, 0.17, 0.21, 0.15);
    fore.bezierCurveTo(0.2, 0.09, 0.16, 0.02, 0, -0.006);
    // Hindwing with a long trailing tail.
    const hind = new THREE.Shape();
    hind.moveTo(0, -0.006);
    hind.bezierCurveTo(0.09, -0.01, 0.14, -0.06, 0.11, -0.1);
    hind.bezierCurveTo(0.1, -0.14, 0.09, -0.2, 0.07, -0.27);
    hind.bezierCurveTo(0.055, -0.2, 0.04, -0.12, 0, -0.03);
    const geometry = (shape: THREE.Shape) => {
        const g = new THREE.ShapeGeometry(shape, 16);
        g.rotateX(-Math.PI / 2);
        const pos = g.attributes.position as THREE.BufferAttribute;
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            uv[i * 2] = pos.getX(i) / 0.22;
            uv[i * 2 + 1] = 0.5 - pos.getZ(i) / 0.45;
        }
        g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        return g;
    };
    return { fore: geometry(fore), hind: geometry(hind) };
};

// Made once per session and shared.
let wings: ReturnType<typeof makeWings> | null = null;
const materialsFor: Partial<Record<RegalKind, { wing: THREE.MeshBasicMaterial; shimmer: THREE.MeshBasicMaterial; glow: THREE.SpriteMaterial }>> = {};
const assets = (kind: RegalKind) => {
    wings ??= makeWings();
    let materials = materialsFor[kind];
    if (!materials) {
        const map = wingTexture(kind);
        materials = {
            wing: new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
            // An additive copy of the wing that pulses: the shimmer.
            shimmer: new THREE.MeshBasicMaterial({
                map,
                color: REGAL[kind].colors[3],
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false,
                toneMapped: false,
            }),
            glow: new THREE.SpriteMaterial({
                map: butterflyAssets().glow,
                color: REGAL[kind].glow,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            }),
        };
        materialsFor[kind] = materials;
    }
    return { wings, materials };
};

const GOLD = new THREE.MeshStandardMaterial({ color: "#e8c25a", metalness: 1, roughness: 0.25, emissive: "#8a6010", emissiveIntensity: 0.6 });

const Crown: React.FC<{ kind: RegalKind }> = ({ kind }) =>
    kind === "queen" ? (
        // A tiara: a fine band of gold with pearls and one rose gem.
        <group position={[0, 0.03, -0.035]} rotation={[0.4, 0, 0]}>
            <mesh material={GOLD} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.018, 0.0025, 6, 24, Math.PI]} />
            </mesh>
            {[-0.8, -0.4, 0, 0.4, 0.8].map((a) => (
                <mesh key={a} position={[Math.sin(a) * 0.018, 0.004 + Math.cos(a) * 0.006, -Math.cos(a) * 0.004]}>
                    <sphereGeometry args={[a === 0 ? 0.0055 : 0.0035, 8, 6]} />
                    <meshBasicMaterial color={a === 0 ? "#ff6ab4" : "#fff6f0"} toneMapped={false} />
                </mesh>
            ))}
        </group>
    ) : (
        // A crown: a gold ring with five points, each tipped with a gem.
        <group position={[0, 0.03, -0.035]}>
            <mesh material={GOLD}>
                <cylinderGeometry args={[0.016, 0.016, 0.01, 16, 1, true]} />
            </mesh>
            {Array.from({ length: 5 }, (_, i) => {
                const a = (i / 5) * Math.PI * 2;
                return (
                    <group key={i} position={[Math.cos(a) * 0.016, 0.01, Math.sin(a) * 0.016]}>
                        <mesh material={GOLD}>
                            <coneGeometry args={[0.004, 0.012, 6]} />
                        </mesh>
                        <mesh position={[0, 0.008, 0]}>
                            <sphereGeometry args={[0.0028, 6, 4]} />
                            <meshBasicMaterial color={i % 2 ? "#4da6ff" : "#ff4d5e"} toneMapped={false} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );

const TRAIL = 40;

export const RegalFairy: React.FC<{ kind: RegalKind; flap?: React.MutableRefObject<number> }> = ({ kind, flap }) => {
    const { wings: geometry, materials } = assets(kind);
    const sides = useRef<(THREE.Group | null)[]>([]);
    const phase = useRef(Math.random() * 10);
    const root = useRef<THREE.Group>(null);
    const trail = useMemo(() => {
        const positions = new Float32Array(TRAIL * 3);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const m = new THREE.PointsMaterial({
            map: butterflyAssets().glow,
            color: REGAL[kind].colors[3],
            size: 0.05,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
        });
        return { positions, g, m, history: [] as THREE.Vector3[] };
    }, [kind]);
    useEffect(
        () => () => {
            trail.g.dispose();
            trail.m.dispose();
        },
        [trail]
    );
    const world = useMemo(() => new THREE.Vector3(), []);
    const local = useMemo(() => new THREE.Vector3(), []);

    useFrame(({ clock }, delta) => {
        phase.current += delta * (flap?.current ?? 3.5) * 0.85; // big wings beat slower
        const open = Math.sin(phase.current) * 0.6 + 0.3;
        sides.current.forEach((side, i) => {
            if (side) side.rotation.z = (i === 0 ? 1 : -1) * open;
        });
        materials.shimmer.opacity = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3 + phase.current));
        // Glitter streaming out behind: remember where it's been (in the
        // world), and draw those spots relative to where it is now.
        const r = root.current;
        if (!r) return;
        r.getWorldPosition(world);
        trail.history.unshift(world.clone());
        if (trail.history.length > TRAIL) trail.history.length = TRAIL;
        for (let i = 0; i < TRAIL; i++) {
            const p = trail.history[Math.min(i, trail.history.length - 1)];
            local.set(
                p.x + Math.sin(i * 1.7 + clock.elapsedTime * 3) * 0.02,
                p.y - i * 0.006,
                p.z + Math.cos(i * 1.3 + clock.elapsedTime * 2) * 0.02
            );
            r.worldToLocal(local);
            trail.positions.set([local.x, local.y, local.z], i * 3);
        }
        trail.g.attributes.position.needsUpdate = true;
    });

    return (
        <group ref={root}>
            <mesh raycast={() => null} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.009, 0.05, 4, 8]} />
                <meshBasicMaterial color="#fffaf0" toneMapped={false} />
            </mesh>
            <Crown kind={kind} />
            <sprite material={materials.glow} scale={[0.45, 0.45, 1]} raycast={() => null} />
            {[1, -1].map((side, i) => (
                <group
                    key={side}
                    ref={(g) => {
                        sides.current[i] = g;
                    }}
                    scale={[side, 1, 1]}
                >
                    <mesh geometry={geometry.fore} material={materials.wing} raycast={() => null} />
                    <mesh geometry={geometry.hind} material={materials.wing} raycast={() => null} />
                    <mesh geometry={geometry.fore} material={materials.shimmer} position={[0, 0.001, 0]} raycast={() => null} />
                    <mesh geometry={geometry.hind} material={materials.shimmer} position={[0, 0.001, 0]} raycast={() => null} />
                </group>
            ))}
            <pointLight intensity={1.2} distance={3} decay={2} color={REGAL[kind].glow} />
            <points geometry={trail.g} material={trail.m} frustumCulled={false} raycast={() => null} />
        </group>
    );
};
