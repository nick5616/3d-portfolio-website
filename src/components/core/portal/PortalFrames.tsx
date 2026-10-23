import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { PortalFrameSpec, PortalFrameStyle } from "../../../configs/portalLooks";
import { PaperLantern, StripedAwning, ZeldaPot } from "../../models/shopDecor";
import { RupeeIcon } from "../../models/RupeeIcon";

// The frames portals stand in, one look per kind of room. Each is built in
// the doorway's own space: local +Z toward the viewer, threshold at y = 0,
// the arch's round top springing at `jamb` and peaking at `height`.

interface FrameProps {
    half: number;
    jamb: number;
    height: number;
    accent: string;
    label?: string;
    spec: PortalFrameSpec;
}

// Materials are shared by every frame that uses them (a handful in all).
const cache = new Map<string, THREE.Material>();
const shared = <T extends THREE.Material>(key: string, make: () => T): T => {
    let material = cache.get(key) as T | undefined;
    if (!material) {
        material = make();
        cache.set(key, material);
    }
    return material;
};
const standard = (key: string, params: THREE.MeshStandardMaterialParameters) =>
    shared(key, () => new THREE.MeshStandardMaterial(params));
const gold = () =>
    standard("gold", { color: "#d9a94a", roughness: 0.25, metalness: 1, emissive: "#5a3a08", emissiveIntensity: 0.6 });
const obsidian = () =>
    shared(
        "obsidian",
        () =>
            new THREE.MeshPhysicalMaterial({
                color: "#15111c",
                roughness: 0.2,
                metalness: 0.4,
                clearcoat: 1,
                clearcoatRoughness: 0.08,
            })
    );
const glow = (color: string, strength = 1) =>
    shared(
        `glow:${color}:${strength}`,
        () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false })
    );

// A glowing material of its own, for parts that pulse or blink.
const useOwnGlow = (color: string) => {
    const material = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), [color]);
    useEffect(() => () => material.dispose(), [material]);
    const base = useMemo(() => new THREE.Color(color), [color]);
    return { material, base };
};

// Deterministic jitter, so frames look the same every visit.
const seeded = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
};

// Evenly spaced points `out` metres outside the doorway's outline: up the
// left jamb, over the arch, down the right. `angle` points outward (0 = +X).
// `skip` metres are left bare at each foot.
const outline = (half: number, jamb: number, out: number, count: number, skip = 0) => {
    const r = half + out;
    const arc = Math.PI * r;
    const total = jamb * 2 + arc;
    return Array.from({ length: count }, (_, i) => {
        const s = skip + ((i + 0.5) / count) * (total - skip * 2);
        if (s < jamb) return { x: -r, y: s, angle: Math.PI };
        if (s < jamb + arc) {
            const theta = Math.PI - (s - jamb) / r;
            return { x: Math.cos(theta) * r, y: jamb + Math.sin(theta) * r, angle: theta };
        }
        return { x: r, y: total - s, angle: 0 };
    });
};

// One instanced mesh of many copies (studs, rivets, leaves, crystals).
const Scatter: React.FC<{ geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }> = ({
    geometry,
    material,
    matrices,
}) => {
    const mesh = useMemo(() => {
        const instanced = new THREE.InstancedMesh(geometry, material, matrices.length);
        matrices.forEach((m, i) => instanced.setMatrixAt(i, m));
        instanced.instanceMatrix.needsUpdate = true;
        instanced.computeBoundingSphere();
        return instanced;
    }, [geometry, material, matrices]);
    useEffect(
        () => () => {
            mesh.dispose();
        },
        [mesh]
    );
    return <primitive object={mesh} />;
};
const useGeometry = <T extends THREE.BufferGeometry>(make: () => T, deps: unknown[] = []) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const geometry = useMemo(make, deps);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return geometry;
};
const compose = (x: number, y: number, z: number, rz: number, scale: [number, number, number], ry = 0) =>
    new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)),
        new THREE.Vector3(...scale)
    );

// The common bones: two jambs and a half-ring over the top.
const Surround: React.FC<{
    half: number;
    jamb: number;
    out: number; // centre line, outside the opening
    width: number; // jamb width / ring tube diameter
    depth?: number;
    z?: number;
    material: THREE.Material;
    radial?: number;
    tubular?: number;
}> = ({ half, jamb, out, width, depth = width, z = 0, material, radial = 10, tubular = 40 }) => (
    <group position={[0, 0, z]}>
        {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (half + out), jamb / 2, 0]} material={material}>
                <boxGeometry args={[width, jamb, depth]} />
            </mesh>
        ))}
        <mesh position={[0, jamb, 0]} material={material}>
            <torusGeometry args={[half + out, width / 2, radial, tubular, Math.PI]} />
        </mesh>
    </group>
);
// Same, with round pipes for jambs.
const Pipe: React.FC<{ half: number; jamb: number; out: number; radius: number; z?: number; material: THREE.Material }> = ({
    half,
    jamb,
    out,
    radius,
    z = 0,
    material,
}) => (
    <group position={[0, 0, z]}>
        {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (half + out), jamb / 2, 0]} material={material}>
                <cylinderGeometry args={[radius, radius, jamb, 12]} />
            </mesh>
        ))}
        <mesh position={[0, jamb, 0]} material={material}>
            <torusGeometry args={[half + out, radius, 10, 40, Math.PI]} />
        </mesh>
    </group>
);
const Sill: React.FC<{ width: number; depth: number; height?: number; material: THREE.Material }> = ({
    width,
    depth,
    height = 0.06,
    material,
}) => (
    <mesh position={[0, height / 2, 0]} material={material}>
        <boxGeometry args={[width, height, depth]} />
    </mesh>
);

// --- The styles ------------------------------------------------------------------

const ObsidianFrame: React.FC<FrameProps> = ({ half, jamb }) => (
    <group>
        <Surround half={half} jamb={jamb} out={0.15} width={0.3} depth={0.34} material={obsidian()} />
        <Surround half={half} jamb={jamb} out={0.02} width={0.05} z={0.03} material={gold()} />
        <Sill width={half * 2 + 0.8} depth={0.7} height={0.08} material={gold()} />
    </group>
);

// The observatory's: obsidian, studded with stars that twinkle.
const StarstoneFrame: React.FC<FrameProps> = (props) => {
    const { half, jamb, height } = props;
    const { material, base } = useOwnGlow("#cfdcff");
    const stud = useGeometry(() => new THREE.SphereGeometry(0.035, 10, 8));
    const star = useGeometry(() => new THREE.OctahedronGeometry(0.11, 0));
    const studs = useMemo(
        () =>
            outline(half, jamb, 0.15, 15, 0.4).map((p, i) => {
                const s = 0.7 + seeded(i) * 0.7;
                return compose(p.x, p.y, 0.17, 0, [s, s, s]);
            }),
        [half, jamb]
    );
    useFrame(({ clock }) => {
        material.color.copy(base).multiplyScalar(1.1 + 0.5 * Math.sin(clock.elapsedTime * 2.3));
    });
    return (
        <group>
            <ObsidianFrame {...props} />
            <Scatter geometry={stud} material={material} matrices={studs} />
            <mesh geometry={star} material={material} position={[0, height + 0.14, 0.12]} scale={[0.7, 1.4, 0.4]} />
        </group>
    );
};

// The moon outpost's: an airlock. Bolted plate, hazard stripes, a beacon.
const hazardTexture = (width: number) =>
    shared(`hazard:${width.toFixed(2)}`, () => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#17171a";
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = "#f2c230";
        for (let k = -2; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(k * 64, 128);
            ctx.lineTo(k * 64 + 32, 128);
            ctx.lineTo(k * 64 + 160, 0);
            ctx.lineTo(k * 64 + 128, 0);
            ctx.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(width / 0.5, 1);
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.2 });
    });
const AirlockFrame: React.FC<FrameProps> = ({ half, jamb, height }) => {
    const metal = standard("airlock-metal", { color: "#8d939c", metalness: 0.85, roughness: 0.35 });
    const seal = standard("airlock-seal", { color: "#2a2d33", metalness: 0.6, roughness: 0.5 });
    const { material: beacon, base } = useOwnGlow("#ffae3a");
    const bolt = useGeometry(() => {
        const g = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8);
        g.rotateX(Math.PI / 2);
        return g;
    });
    const bolts = useMemo(
        () => outline(half, jamb, 0.18, 16, 0.25).map((p) => compose(p.x, p.y, 0.22, 0, [1, 1, 1])),
        [half, jamb]
    );
    useFrame(({ clock }) => {
        const on = Math.sin(clock.elapsedTime * 3.4) > 0.2 ? 1.6 : 0.25;
        beacon.color.copy(base).multiplyScalar(on);
    });
    const sillWidth = half * 2 + 1;
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.18} width={0.36} depth={0.42} material={metal} radial={6} tubular={24} />
            <Surround half={half} jamb={jamb} out={0.03} width={0.09} depth={0.1} z={0.05} material={seal} />
            <Scatter geometry={bolt} material={metal} matrices={bolts} />
            <Sill width={sillWidth} depth={0.8} height={0.08} material={hazardTexture(sillWidth)} />
            <mesh position={[0, height + 0.36, 0.05]} material={seal}>
                <cylinderGeometry args={[0.09, 0.11, 0.1, 12]} />
            </mesh>
            <mesh position={[0, height + 0.46, 0.05]} material={beacon}>
                <sphereGeometry args={[0.07, 14, 10]} />
            </mesh>
        </group>
    );
};

// The gallery wing's: white marble, an inlay and a keystone gem in the
// colour of wherever it leads.
const MarbleFrame: React.FC<FrameProps> = ({ half, jamb, height, accent }) => {
    const marble = shared(
        "marble",
        () =>
            new THREE.MeshPhysicalMaterial({
                color: "#efe9df",
                roughness: 0.32,
                metalness: 0,
                clearcoat: 0.6,
                clearcoatRoughness: 0.25,
            })
    );
    const gem = standard(`gem:${accent}`, {
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        metalness: 0.3,
        flatShading: true,
    });
    const x = half + 0.17;
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.17} width={0.32} depth={0.3} material={marble} radial={12} />
            {[-1, 1].map((side) => (
                <group key={side}>
                    <mesh position={[side * x, 0.11, 0]} material={marble}>
                        <boxGeometry args={[0.46, 0.22, 0.38]} />
                    </mesh>
                    <mesh position={[side * x, jamb - 0.04, 0]} material={marble}>
                        <boxGeometry args={[0.48, 0.16, 0.4]} />
                    </mesh>
                </group>
            ))}
            <Surround half={half} jamb={jamb} out={0.015} width={0.035} depth={0.03} z={0.05} material={glow(accent, 0.9)} />
            <mesh position={[0, height + 0.1, 0.02]} material={marble}>
                <boxGeometry args={[0.3, 0.44, 0.38]} />
            </mesh>
            <mesh position={[0, height + 0.1, 0.22]} material={gem} scale={[1, 1.3, 0.6]}>
                <octahedronGeometry args={[0.085, 0]} />
            </mesh>
            <mesh position={[0, height + 0.38, 0]} material={marble}>
                <boxGeometry args={[half * 2 + 1, 0.12, 0.34]} />
            </mesh>
            <Sill width={half * 2 + 0.9} depth={0.6} material={marble} />
        </group>
    );
};

// The paintings' (and the atrium's door to the gallery): a carved gold
// picture frame, three mouldings deep.
const GildedFrame: React.FC<FrameProps> = ({ half, jamb, height }) => {
    const gilt = standard("gilt", {
        color: "#d4a843",
        metalness: 1,
        roughness: 0.28,
        emissive: "#4a3008",
        emissiveIntensity: 0.5,
    });
    const wood = standard("gilt-wood", { color: "#3a2410", roughness: 0.6, metalness: 0.1 });
    const bead = useGeometry(() => new THREE.SphereGeometry(0.03, 8, 6));
    const beads = useMemo(
        () => outline(half, jamb, 0.17, 34, 0.15).map((p) => compose(p.x, p.y, 0.05, 0, [1, 1, 1])),
        [half, jamb]
    );
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.06} width={0.12} material={gilt} />
            <Surround half={half} jamb={jamb} out={0.17} width={0.1} depth={0.08} z={-0.02} material={wood} />
            <Surround half={half} jamb={jamb} out={0.29} width={0.14} material={gilt} />
            <Scatter geometry={bead} material={gilt} matrices={beads} />
            {[-1, 1].map((side) => (
                <mesh key={side} position={[side * (half + 0.17), jamb, 0.06]} material={gilt}>
                    <sphereGeometry args={[0.1, 14, 10]} />
                </mesh>
            ))}
            <mesh position={[0, height + 0.3, 0.02]} material={gilt} scale={[1.4, 1, 0.6]}>
                <sphereGeometry args={[0.14, 16, 12]} />
            </mesh>
            {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.27, height + 0.26, 0.02]} rotation={[0, 0, side * 0.6]} material={gilt}>
                    <torusGeometry args={[0.1, 0.028, 8, 20, Math.PI * 1.4]} />
                </mesh>
            ))}
            <Sill width={half * 2 + 0.9} depth={0.55} material={gilt} />
        </group>
    );
};

// The music rooms': two neon tubes on a dark backing, a strip of light on
// the floor.
const NeonFrame: React.FC<FrameProps> = ({ half, jamb, accent }) => {
    const backing = standard("neon-back", { color: "#121018", roughness: 0.4, metalness: 0.5 });
    const pale = useMemo(() => "#" + new THREE.Color(accent).lerp(new THREE.Color("#ffffff"), 0.55).getHexString(), [accent]);
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.16} width={0.14} depth={0.12} material={backing} />
            <Pipe half={half} jamb={jamb} out={0.06} radius={0.028} z={0.07} material={glow(accent, 1.6)} />
            <Pipe half={half} jamb={jamb} out={0.27} radius={0.02} z={0.05} material={glow(pale, 1.3)} />
            <mesh position={[0, 0.012, 0.32]} material={glow(accent, 1)}>
                <boxGeometry args={[half * 2 + 0.6, 0.02, 0.06]} />
            </mesh>
        </group>
    );
};

// The studio's: neon, with an ON AIR sign over it.
const OnAirFrame: React.FC<FrameProps> = (props) => {
    const { height } = props;
    const backing = standard("neon-back", { color: "#121018", roughness: 0.4, metalness: 0.5 });
    const { material: sign, base } = useOwnGlow("#ff2a3d");
    useFrame(({ clock }) => {
        sign.color.copy(base).multiplyScalar(1.25 + 0.15 * Math.sin(clock.elapsedTime * 1.7));
    });
    return (
        <group>
            <NeonFrame {...props} />
            <group position={[0, height + 0.5, 0.04]}>
                <mesh material={backing}>
                    <boxGeometry args={[1.05, 0.34, 0.12]} />
                </mesh>
                <mesh position={[0, 0, 0.062]} material={sign}>
                    <planeGeometry args={[0.95, 0.26]} />
                </mesh>
                <Text
                    font="/fonts/Fraunces.ttf"
                    position={[0, 0, 0.07]}
                    fontSize={0.15}
                    letterSpacing={0.22}
                    color="#fff2f2"
                    anchorX="center"
                    anchorY="middle"
                >
                    ON AIR
                </Text>
            </group>
        </group>
    );
};

// The marble machine's: brass and copper pipework, rivets, turning gears.
const Gear: React.FC<{ radius: number; teeth: number; speed: number; position: [number, number, number] }> = ({
    radius,
    teeth,
    speed,
    position,
}) => {
    const brass = standard("brass", { color: "#c8963c", metalness: 1, roughness: 0.3, emissive: "#3a2406", emissiveIntensity: 0.3 });
    const dark = standard("brass-dark", { color: "#3b2a18", metalness: 0.7, roughness: 0.5 });
    const group = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (group.current) group.current.rotation.z += delta * speed;
    });
    return (
        <group ref={group} position={position}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={brass}>
                <cylinderGeometry args={[radius, radius, 0.06, 28]} />
            </mesh>
            {Array.from({ length: teeth }, (_, i) => {
                const a = (i / teeth) * Math.PI * 2;
                return (
                    <mesh
                        key={i}
                        position={[Math.cos(a) * (radius + 0.03), Math.sin(a) * (radius + 0.03), 0]}
                        rotation={[0, 0, a]}
                        material={brass}
                    >
                        <boxGeometry args={[0.08, radius * 0.32, 0.06]} />
                    </mesh>
                );
            })}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={dark}>
                <cylinderGeometry args={[radius * 0.28, radius * 0.28, 0.1, 16]} />
            </mesh>
        </group>
    );
};
const BrassFrame: React.FC<FrameProps> = ({ half, jamb, height }) => {
    const brass = standard("brass", { color: "#c8963c", metalness: 1, roughness: 0.3, emissive: "#3a2406", emissiveIntensity: 0.3 });
    const copper = standard("copper", { color: "#b8673a", metalness: 1, roughness: 0.35 });
    const rivet = useGeometry(() => new THREE.SphereGeometry(0.028, 8, 6));
    const rivets = useMemo(
        () => outline(half, jamb, 0.12, 18, 0.2).map((p) => compose(p.x, p.y, 0.075, 0, [1, 1, 1])),
        [half, jamb]
    );
    return (
        <group>
            <Pipe half={half} jamb={jamb} out={0.12} radius={0.075} material={brass} />
            <Pipe half={half} jamb={jamb} out={0.32} radius={0.035} z={-0.03} material={copper} />
            <Scatter geometry={rivet} material={brass} matrices={rivets} />
            {[-1, 1].map((side) =>
                [0.1, jamb].map((y) => (
                    <mesh key={`${side}${y}`} position={[side * (half + 0.12), y, 0]} material={brass}>
                        <sphereGeometry args={[0.11, 14, 10]} />
                    </mesh>
                ))
            )}
            <Gear radius={0.24} teeth={10} speed={0.6} position={[-(half + 0.5), jamb + half * 0.5, 0.06]} />
            <Gear radius={0.17} teeth={8} speed={-0.85} position={[half + 0.46, jamb + half * 0.62, 0.06]} />
            <Gear radius={0.13} teeth={7} speed={1.1} position={[0, height + 0.3, 0.06]} />
            <Sill width={half * 2 + 0.8} depth={0.5} height={0.05} material={brass} />
        </group>
    );
};

// The rupee shop's: dark rock bristling with crystals, a big rupee on top.
const CrystalFrame: React.FC<FrameProps> = ({ half, jamb, height, accent }) => {
    const rock = standard("crystal-rock", { color: "#1f2a24", roughness: 0.85, metalness: 0.1, flatShading: true });
    const crystal = shared(
        `crystal:${accent}`,
        () =>
            new THREE.MeshPhysicalMaterial({
                color: accent,
                emissive: accent,
                emissiveIntensity: 0.35,
                roughness: 0.08,
                metalness: 0.1,
                clearcoat: 1,
                flatShading: true,
            })
    );
    const shard = useGeometry(() => new THREE.OctahedronGeometry(1, 0));
    const shards = useMemo(
        () =>
            outline(half, jamb, 0.26, 28, 0.35).map((p, i) => {
                const length = 0.16 + seeded(i * 3.1) * 0.24;
                const tilt = (seeded(i * 7.7) - 0.5) * 0.7;
                const out = 0.06 + length * 0.5;
                return compose(
                    p.x + Math.cos(p.angle) * out,
                    p.y + Math.sin(p.angle) * out,
                    (seeded(i * 1.9) - 0.5) * 0.2,
                    p.angle - Math.PI / 2 + tilt,
                    [0.06 + seeded(i) * 0.03, length, 0.06]
                );
            }),
        [half, jamb]
    );
    const rupee = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (rupee.current) rupee.current.rotation.y += delta * 0.9;
    });
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.16} width={0.32} depth={0.36} material={rock} radial={7} tubular={20} />
            <Scatter geometry={shard} material={crystal} matrices={shards} />
            <mesh ref={rupee} geometry={shard} material={crystal} position={[0, height + 0.55, 0.05]} scale={[0.17, 0.32, 0.08]} />
            <Sill width={half * 2 + 0.8} depth={0.6} material={rock} />
        </group>
    );
};

// The Hall of Achievements': gold, laurels, a star.
const starShape = (outer: number, inner: number) => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    return shape;
};
const LaurelFrame: React.FC<FrameProps> = ({ half, jamb, height }) => {
    const leafMaterial = standard("laurel", { color: "#c2ad55", metalness: 0.9, roughness: 0.3, emissive: "#2a2208", emissiveIntensity: 0.4 });
    const leaf = useGeometry(() => new THREE.SphereGeometry(1, 8, 6));
    const star = useGeometry(() => {
        const g = new THREE.ExtrudeGeometry(starShape(0.22, 0.09), {
            depth: 0.05,
            bevelEnabled: true,
            bevelSize: 0.015,
            bevelThickness: 0.015,
            bevelSegments: 2,
        });
        g.center();
        return g;
    });
    const leaves = useMemo(() => {
        const points = outline(half, jamb, 0.24, 30, jamb * 0.45);
        return points.flatMap((p, i) => {
            // Each sprig points up the arch from its side toward the top.
            const tangent = p.angle + (p.x < 0 ? -Math.PI / 2 : Math.PI / 2);
            return [-1, 1].map((side) =>
                compose(
                    p.x + Math.cos(p.angle) * side * 0.06,
                    p.y + Math.sin(p.angle) * side * 0.06,
                    0.02 + seeded(i) * 0.03,
                    tangent - Math.PI / 2 + side * 0.55 * (p.x < 0 ? 1 : -1),
                    [0.05, 0.13, 0.018]
                )
            );
        });
    }, [half, jamb]);
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.12} width={0.13} material={gold()} />
            <Scatter geometry={leaf} material={leafMaterial} matrices={leaves} />
            <mesh geometry={star} material={gold()} position={[0, height + 0.42, 0.05]} />
            <Sill width={half * 2 + 0.7} depth={0.55} material={gold()} />
        </group>
    );
};

// The lab's: gunmetal with circuit traces pulsing along it.
const CircuitFrame: React.FC<FrameProps> = ({ half, jamb, accent }) => {
    const gun = standard("gunmetal", { color: "#1b2130", metalness: 0.8, roughness: 0.3 });
    const { material: trace, base } = useOwnGlow(accent);
    useFrame(({ clock }) => {
        trace.color.copy(base).multiplyScalar(0.9 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2), 3));
    });
    const lower = jamb * 0.6;
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.13} width={0.26} depth={0.22} material={gun} radial={4} tubular={32} />
            <mesh position={[0, jamb, 0]} material={trace}>
                <torusGeometry args={[half + 0.13, 0.012, 6, 48, Math.PI]} />
            </mesh>
            {[-1, 1].map((side) => (
                <group key={side} position={[side * (half + 0.13), 0, 0.115]}>
                    <mesh position={[-side * 0.05, jamb / 2 + 0.15, 0]} material={trace}>
                        <boxGeometry args={[0.016, jamb - 0.3, 0.01]} />
                    </mesh>
                    <mesh position={[side * 0.06, 0.2 + lower / 2, 0]} material={trace}>
                        <boxGeometry args={[0.016, lower, 0.01]} />
                    </mesh>
                    <mesh position={[0.005 * side, 0.2 + lower, 0]} material={trace}>
                        <boxGeometry args={[0.11, 0.016, 0.01]} />
                    </mesh>
                    {[0.3, 0.2].map((y, i) => (
                        <mesh key={y} position={[(i === 0 ? -0.05 : 0.06) * side, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={trace}>
                            <cylinderGeometry args={[0.03, 0.03, 0.01, 12]} />
                        </mesh>
                    ))}
                </group>
            ))}
            <Sill width={half * 2 + 0.7} depth={0.5} height={0.05} material={gun} />
            <mesh position={[0, 0.03, 0.26]} material={trace}>
                <boxGeometry args={[half * 2 + 0.7, 0.012, 0.012]} />
            </mesh>
        </group>
    );
};

// The sky course's: a bank of cloud, gently bobbing.
const CloudFrame: React.FC<FrameProps> = ({ half, jamb }) => {
    const cloud = standard("cloud", { color: "#ffffff", roughness: 1, metalness: 0, emissive: "#dfefff", emissiveIntensity: 0.35 });
    const puff = useGeometry(() => new THREE.SphereGeometry(1, 16, 12));
    const puffs = useMemo(() => {
        const ring = outline(half, jamb, 0.22, 24, 0.1).map((p, i) => {
            const r = 0.18 + seeded(i * 2.3) * 0.18;
            return compose(p.x, p.y, (seeded(i * 5.1) - 0.5) * 0.16, 0, [r, r * 0.85, r]);
        });
        const feet = [-1, 1].flatMap((side) =>
            [0, 1, 2].map((k) => {
                const r = 0.3 + seeded(side * 11 + k) * 0.12;
                return compose(side * (half + 0.15 + k * 0.32), 0.12, 0.1 - k * 0.05, 0, [r, r * 0.7, r]);
            })
        );
        return [...ring, ...feet];
    }, [half, jamb]);
    const group = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (group.current) group.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.04;
    });
    return (
        <group ref={group}>
            <Scatter geometry={puff} material={cloud} matrices={puffs} />
        </group>
    );
};

// The notes app's: a doodled outline, drawn twice, not quite on top.
const InkFrame: React.FC<FrameProps> = ({ half, jamb }) => {
    const ink = shared("ink", () => new THREE.MeshBasicMaterial({ color: "#151515" }));
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.05} width={0.036} depth={0.02} z={0.02} material={ink} />
            <group position={[0.02, 0.01, 0.025]} rotation={[0, 0, 0.012]}>
                <Surround half={half} jamb={jamb * 0.985} out={0.11} width={0.018} depth={0.015} material={ink} />
            </group>
            <mesh position={[0.03, 0.02, 0.05]} rotation={[0, 0, -0.01]} material={ink}>
                <boxGeometry args={[half * 2 + 0.35, 0.018, 0.02]} />
            </mesh>
        </group>
    );
};

// Software projects': a matte black rack, server LEDs blinking up both
// sides, a cursor over the top.
const TerminalFrame: React.FC<FrameProps> = ({ half, jamb, height, accent }) => {
    const black = standard("terminal-black", { color: "#0b0e0c", roughness: 0.55, metalness: 0.5 });
    const { material: cursor, base } = useOwnGlow(accent);
    const leds = useMemo(() => {
        const geometry = new THREE.BoxGeometry(0.05, 0.025, 0.02);
        const material = new THREE.MeshBasicMaterial({ toneMapped: false });
        const spots: THREE.Matrix4[] = [];
        [-1, 1].forEach((side) =>
            [0.09, 0.21].forEach((inset) => {
                for (let y = 0.3; y < jamb - 0.15; y += 0.12) {
                    spots.push(compose(side * (half + inset), y, 0.155, 0, [1, 1, 1]));
                }
            })
        );
        const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
        spots.forEach((m, i) => mesh.setMatrixAt(i, m));
        const off = new THREE.Color("#0a1a10");
        spots.forEach((_, i) => mesh.setColorAt(i, off));
        mesh.computeBoundingSphere();
        return mesh;
    }, [half, jamb]);
    useEffect(
        () => () => {
            leds.geometry.dispose();
            (leds.material as THREE.Material).dispose();
            leds.dispose();
        },
        [leds]
    );
    const palette = useMemo(
        () => [new THREE.Color(accent).multiplyScalar(1.4), new THREE.Color("#ffb347").multiplyScalar(1.3), new THREE.Color("#0a1a10")],
        [accent]
    );
    const next = useRef(0);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        cursor.color.copy(base).multiplyScalar(Math.sin(t * 10) > 0 ? 1.5 : 0.05);
        if (t < next.current) return;
        next.current = t + 0.09;
        // a few LEDs change each tick: mostly green, the odd amber
        for (let k = 0; k < 6; k++) {
            const i = Math.floor(Math.random() * leds.count);
            const roll = Math.random();
            leds.setColorAt(i, palette[roll < 0.55 ? 0 : roll < 0.62 ? 1 : 2]);
        }
        if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
    });
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.16} width={0.32} depth={0.3} material={black} />
            <Surround half={half} jamb={jamb} out={0.015} width={0.03} depth={0.02} z={0.06} material={glow(accent, 1.3)} />
            <primitive object={leds} />
            <mesh position={[0, height + 0.3, 0.09]} material={cursor}>
                <boxGeometry args={[0.11, 0.18, 0.02]} />
            </mesh>
            <Sill width={half * 2 + 0.7} depth={0.5} height={0.05} material={black} />
        </group>
    );
};

// The Rupee Shop's: a little shop front. Wooden posts, a striped awning
// with a sign on it, lanterns at the corners, pots by the door.
const ShopFrame: React.FC<FrameProps> = ({ half, jamb, height, label }) => {
    const wood = standard("shop-wood", { color: "#8a5a34", roughness: 0.75 });
    const pale = standard("shop-wood-pale", { color: "#d0a06a", roughness: 0.7 });
    const awningTop = height + 0.36;
    const tilt = 0.42;
    const reach = 0.8;
    const front: [number, number] = [awningTop - reach * Math.sin(tilt), -0.05 + reach * Math.cos(tilt)];
    const signWidth = Math.min(half * 2 + 0.5, 2.6);
    return (
        <group>
            <Surround half={half} jamb={jamb} out={0.15} width={0.28} depth={0.3} material={wood} />
            <Surround half={half} jamb={jamb} out={0.02} width={0.05} depth={0.06} z={0.04} material={pale} />
            <group position={[0, awningTop, -0.05]}>
                <StripedAwning width={half * 2 + 1.0} length={reach} tilt={tilt} />
            </group>
            {/* the sign, standing on the awning */}
            <group position={[0, awningTop + 0.3, -0.02]}>
                <mesh material={wood}>
                    <boxGeometry args={[signWidth, 0.46, 0.06]} />
                </mesh>
                <mesh position={[0, 0, 0.032]} material={pale}>
                    <planeGeometry args={[signWidth - 0.1, 0.36]} />
                </mesh>
                {[-1, 1].map((side) => (
                    <RupeeIcon key={side} position={[side * (signWidth / 2 - 0.16), 0, 0.06]} scale={0.055} color="#3ee58f" />
                ))}
                {label && (
                    <Text
                        font="/fonts/Fraunces.ttf"
                        position={[0, 0, 0.04]}
                        fontSize={0.17}
                        letterSpacing={0.08}
                        maxWidth={signWidth - 0.5}
                        color="#4a2a12"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {label.toUpperCase()}
                    </Text>
                )}
            </group>
            {[-1, 1].map((side) => (
                <PaperLantern key={side} position={[side * (half + 0.4), front[0] - 0.02, front[1] - 0.06]} radius={0.15} cord={0.2} />
            ))}
            {[-1, 1].map((side) => (
                <group key={side}>
                    <ZeldaPot position={[side * (half + 0.55), 0, 0.35]} rotation={side} />
                    <ZeldaPot position={[side * (half + 0.98), 0, 0.22]} scale={0.72} rotation={side * 2} />
                </group>
            ))}
            <Sill width={half * 2 + 0.7} depth={0.55} height={0.05} material={wood} />
        </group>
    );
};

// Your own frame, painted as a PNG (docs/door-frames.md): its clear middle
// shows the portal, a band of light slides across it now and then, and
// where the paint thins at its edges the portal's glow comes through.
const IMAGE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const IMAGE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform vec3 uGlow;
varying vec2 vUv;
void main() {
    vec4 tex = texture2D(uMap, vUv);
    float fringe = smoothstep(0.02, 0.5, tex.a) * (1.0 - smoothstep(0.5, 0.98, tex.a));
    float alpha = max(tex.a, fringe);
    if (alpha < 0.02) discard;
    vec3 col = tex.rgb * 0.95;
    float sweep = fract(uTime * 0.12) * 3.0 - 1.0;
    col += vec3(1.0, 0.97, 0.9) * exp(-pow((vUv.x + vUv.y * 0.6 - sweep) * 9.0, 2.0)) * 0.25 * tex.a;
    col += uGlow * fringe * (0.8 + 0.4 * sin(uTime * 2.0));
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
}
`;
const ImageFrame: React.FC<FrameProps> = ({ spec, accent }) => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    useEffect(() => {
        if (!spec.src) return;
        let alive = true;
        new THREE.TextureLoader().load(
            spec.src,
            (loaded) => {
                if (!alive) return loaded.dispose();
                loaded.colorSpace = THREE.SRGBColorSpace;
                loaded.anisotropy = 8;
                setTexture(loaded);
            },
            undefined,
            () => console.warn(`Door frame image missing: ${spec.src}`)
        );
        return () => {
            alive = false;
        };
    }, [spec.src]);
    const material = useMemo(
        () =>
            texture &&
            new THREE.ShaderMaterial({
                uniforms: { uMap: { value: texture }, uTime: { value: 0 }, uGlow: { value: new THREE.Color(accent) } },
                vertexShader: IMAGE_VERTEX,
                fragmentShader: IMAGE_FRAGMENT,
                transparent: true,
                toneMapped: false,
            }),
        [texture, accent]
    );
    useEffect(
        () => () => {
            material?.dispose();
            texture?.dispose();
        },
        [material, texture]
    );
    useFrame(({ clock }) => {
        if (material) material.uniforms.uTime.value = clock.elapsedTime;
    });
    if (!material || !spec.size) return null;
    const [w, h] = spec.size;
    return (
        <mesh position={[0, h / 2, 0.03]} material={material}>
            <planeGeometry args={[w, h]} />
        </mesh>
    );
};

const FRAMES: Record<Exclude<PortalFrameStyle, "none">, React.FC<FrameProps>> = {
    obsidian: ObsidianFrame,
    starstone: StarstoneFrame,
    airlock: AirlockFrame,
    marble: MarbleFrame,
    gilded: GildedFrame,
    neon: NeonFrame,
    onair: OnAirFrame,
    brass: BrassFrame,
    crystal: CrystalFrame,
    laurel: LaurelFrame,
    circuit: CircuitFrame,
    terminal: TerminalFrame,
    shop: ShopFrame,
    image: ImageFrame,
    cloud: CloudFrame,
    ink: InkFrame,
};

// How the room's name is lettered over each frame: how far above the top
// of the opening (clear of keystones, signs and stars), in what colour and
// face. `accent`: in the frame's own accent colour. `inFrame`: the frame
// letters it itself (the shop's sign).
interface Lettering {
    lift: number;
    color?: string;
    accent?: boolean;
    font?: string;
    format?: (label: string) => string;
    inFrame?: boolean;
}
export const FRAME_LABEL: Record<PortalFrameStyle, Lettering> = {
    none: { lift: 0.5 },
    obsidian: { lift: 0.5 },
    starstone: { lift: 0.55, color: "#cfdcff" },
    airlock: { lift: 0.75, color: "#e6ebf2" },
    marble: { lift: 0.66, color: "#c9a45c" },
    gilded: { lift: 0.72 },
    neon: { lift: 0.55, accent: true },
    onair: { lift: 0.95, accent: true },
    brass: { lift: 0.62 },
    crystal: { lift: 1.0, color: "#bfffe0" },
    laurel: { lift: 0.82 },
    circuit: { lift: 0.5 },
    terminal: {
        lift: 0.62,
        accent: true,
        font: "/fonts/IBMPlexMono-Medium.ttf",
        format: (label) => `cd ~/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    },
    shop: { lift: 0.95, inFrame: true },
    image: { lift: 0.3 },
    cloud: { lift: 0.82, color: "#ffffff" },
    ink: { lift: 0.4, color: "#151515" },
};

// Above the opening, where the lettering sits (an image frame is as tall as
// its picture).
export const labelLift = (spec: PortalFrameSpec, height: number) =>
    spec.style === "image" && spec.size ? Math.max(0.3, spec.size[1] - height + 0.2) : FRAME_LABEL[spec.style].lift;

export const PortalFrame: React.FC<{
    spec: PortalFrameSpec;
    half: number;
    jamb: number;
    height: number;
    fallbackAccent: string;
    label?: string;
}> = ({ spec, half, jamb, height, fallbackAccent, label }) => {
    if (spec.style === "none") return null;
    const Frame = FRAMES[spec.style];
    return <Frame half={half} jamb={jamb} height={height} accent={spec.accent ?? fallbackAccent} label={label} spec={spec} />;
};
