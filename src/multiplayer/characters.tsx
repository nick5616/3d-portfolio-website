import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ButterflyFairy, FAIRY_KINDS } from "../components/rooms/experiences/forest/butterfly";
import { REGAL, RegalFairy, type RegalKind } from "../components/rooms/experiences/forest/regalFairy";

// The travelers visitors can pick: Pip and Wisp for anyone, and the forest's
// fairies - the four royals, the Queen and the King - for whoever has
// caught that one in the forest or paid the rupees for it.
//
// Every model stands on its origin facing -Z (the way the camera looks), and
// reads its motion from a shared mutable `Motion` each frame rather than
// from props, so nothing re-renders while it walks.
//
// The index into CHARACTERS goes over the wire: append new ones, never
// reorder or remove.

export interface Motion {
    /** Horizontal speed, m/s. */
    speed: number;
    /** 0 standing .. 1 fully crouched. */
    crouch: number;
    /** Head pitch, radians (+ looks up). */
    pitch: number;
}

export interface CharacterDef {
    name: string;
    tagline: string;
    /** Rough standing height, for framing the preview. */
    height: number;
    Model: React.FC<{ color: THREE.Color; motion: Motion }>;
    /** Preview camera override (defaults derive from height). */
    framing?: { eye: number; target: number; distance: number };
    /**
     * Fairies only: the key the forest records catches under, their own
     * color, and what they cost in rupees if you haven't caught one.
     */
    fairy?: { caughtKey: string; color: number; price: number };
    /** Has feet that touch the ground (others hear them walk). */
    walks?: boolean;
}

const ROYAL_PRICE = 100;
const REGAL_PRICE = 500;

export const newMotion = (): Motion => ({ speed: 0, crouch: 0, pitch: 0 });

const TAU = Math.PI * 2;
const DARK = "#14121c";

/** Walk-cycle phase that advances with distance covered (and a little with time). */
function useStride(perMetre: number) {
    const phase = useRef(0);
    return (motion: Motion, delta: number) => {
        phase.current += delta * motion.speed * perMetre * TAU;
        return phase.current;
    };
}

/** How much a character is walking, eased 0..1. */
function useWalkBlend(full = 2.5) {
    const blend = useRef(0);
    return (motion: Motion, delta: number) => {
        const target = Math.min(1, motion.speed / full);
        blend.current += (target - blend.current) * Math.min(1, delta * 6);
        return blend.current;
    };
}

function useCrouch(depth: number) {
    return (group: THREE.Object3D | null, motion: Motion) => {
        if (group) group.scale.y = 1 - motion.crouch * depth;
    };
}

const Body: React.FC<{ color: THREE.Color; glow?: number; opacity?: number }> = ({ color, glow = 0.12, opacity = 1 }) => (
    <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        roughness={0.65}
        transparent={opacity < 1}
        opacity={opacity}
    />
);

const Ink = () => <meshStandardMaterial color={DARK} roughness={0.3} />;

/** A pair of eyes on the -Z side of a head of radius r. */
const Eyes: React.FC<{ r: number; spread?: number; size?: number; y?: number }> = ({ r, spread = 0.38, size = 0.16, y = 0.1 }) => (
    <>
        {[-1, 1].map((side) => (
            <mesh key={side} position={[side * r * spread, r * y, -r * 0.9]}>
                <sphereGeometry args={[r * size, 10, 8]} />
                <Ink />
            </mesh>
        ))}
    </>
);

// --- Pip: a small round sprout, can't stand still ------------------------

const Pip: CharacterDef["Model"] = ({ color, motion }) => {
    const root = useRef<THREE.Group>(null);
    const bounce = useRef<THREE.Group>(null);
    const face = useRef<THREE.Group>(null);
    const sprout = useRef<THREE.Group>(null);
    const arms = useRef<(THREE.Mesh | null)[]>([]);
    const feet = useRef<(THREE.Mesh | null)[]>([]);
    const stride = useStride(1.6);
    const walk = useWalkBlend(2);
    const crouch = useCrouch(0.3);

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        const w = walk(motion, delta);
        const p = stride(motion, delta) + t * 2;
        // Idle: little hops in place. Walking: bigger, faster hops.
        const hop = Math.abs(Math.sin(p * (1 + w) + t * 5 * (1 - w)));
        bounce.current!.position.y = hop * (0.05 + w * 0.14);
        // Squash at the bottom of each hop.
        const squash = 1 - (1 - hop) * 0.12;
        bounce.current!.scale.set(2 - squash, squash, 2 - squash);
        bounce.current!.rotation.z = Math.sin(t * 3.7) * 0.08;
        // Pip is all head, so looking around turns the whole of it.
        face.current!.rotation.x = motion.pitch * 0.35;
        face.current!.rotation.y = Math.sin(t * 2.3) * 0.25 * (1 - w) + Math.sin(t * 7.1) * 0.05;
        sprout.current!.rotation.z = Math.sin(t * 9) * 0.3;
        sprout.current!.rotation.x = Math.sin(t * 6.3) * 0.2 + w * 0.35;
        arms.current.forEach((a, i) => a && (a.rotation.z = (i ? -1 : 1) * (0.5 + Math.sin(t * 11 + i * 2) * 0.35 + w * 0.4)));
        feet.current.forEach((f, i) => f && (f.position.z = Math.sin(p * 2 + i * Math.PI) * 0.08 * w));
        crouch(root.current, motion);
    });

    const cheek = useMemo(() => new THREE.Color("#ff8fa8"), []);
    const leaf = useMemo(() => new THREE.Color("#7ed957"), []);
    return (
        <group ref={root}>
            <group ref={bounce}>
                {[-1, 1].map((side, i) => (
                    <mesh key={side} ref={(m) => (feet.current[i] = m)} position={[side * 0.17, 0.04, -0.03]} scale={[1.2, 0.5, 1.5]}>
                        <sphereGeometry args={[0.07, 12, 8]} />
                        <Ink />
                    </mesh>
                ))}
                <group ref={face} position={[0, 0.4, 0]}>
                    {/* One round, squat body: wider than it is tall. */}
                    <mesh scale={[1.18, 0.95, 1.05]}>
                        <sphereGeometry args={[0.34, 24, 18]} />
                        <Body color={color} glow={0.18} />
                    </mesh>
                    <Eyes r={0.34} size={0.14} spread={0.36} y={0.15} />
                    {[-1, 1].map((side) => (
                        <mesh key={side} position={[side * 0.2, -0.02, -0.27]} scale={[1, 0.6, 0.4]}>
                            <sphereGeometry args={[0.05, 10, 8]} />
                            <meshStandardMaterial color={cheek} emissive={cheek} emissiveIntensity={0.3} roughness={0.8} />
                        </mesh>
                    ))}
                    {/* Little nub arms, always waving about. */}
                    {[-1, 1].map((side, i) => (
                        <mesh
                            key={side}
                            ref={(m) => (arms.current[i] = m)}
                            position={[side * 0.4, -0.06, 0]}
                            scale={[1.6, 0.8, 0.8]}
                        >
                            <sphereGeometry args={[0.055, 10, 8]} />
                            <Body color={color} />
                        </mesh>
                    ))}
                    {/* A two-leaf sprout on top. */}
                    <group ref={sprout} position={[0, 0.31, 0]}>
                        {[-1, 1].map((side) => (
                            <mesh key={side} position={[side * 0.06, 0.05, 0]} rotation={[0, 0, -side * 0.7]} scale={[1.6, 0.35, 0.9]}>
                                <sphereGeometry args={[0.05, 10, 8]} />
                                <meshStandardMaterial color={leaf} emissive={leaf} emissiveIntensity={0.25} roughness={0.6} />
                            </mesh>
                        ))}
                    </group>
                </group>
            </group>
        </group>
    );
};

// --- Wisp: drifts rather than walks ---------------------------------------

const Wisp: CharacterDef["Model"] = ({ color, motion }) => {
    const root = useRef<THREE.Group>(null);
    const float = useRef<THREE.Group>(null);
    const tail = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const motes = useRef<(THREE.Mesh | null)[]>([]);
    const walk = useWalkBlend(3);
    const crouch = useCrouch(0.3);

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        const w = walk(motion, delta);
        float.current!.position.y = 0.25 + Math.sin(t * 1.4) * 0.07;
        // Leans into the direction of travel, tail streaming behind.
        float.current!.rotation.x = -w * 0.25;
        tail.current!.rotation.x = w * 0.35 + Math.sin(t * 2.2) * 0.06;
        tail.current!.rotation.z = Math.sin(t * 1.7) * 0.1;
        head.current!.rotation.x = motion.pitch * 0.6;
        motes.current.forEach((m, i) => {
            if (!m) return;
            const a = t * (0.8 + i * 0.25) + (i * TAU) / 3;
            m.position.set(Math.cos(a) * 0.5, 0.9 + Math.sin(t * 1.9 + i * 2) * 0.25, Math.sin(a) * 0.5);
        });
        crouch(root.current, motion);
    });

    return (
        <group ref={root}>
            <group ref={float}>
                <group ref={head} position={[0, 1.05, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.3, 24, 18]} />
                        <Body color={color} glow={0.45} opacity={0.88} />
                    </mesh>
                    <Eyes r={0.3} size={0.13} spread={0.36} y={0.12} />
                </group>
                <group ref={tail} position={[0, 1.0, 0]}>
                    {/* Hangs from under the head, tapering to a point. */}
                    <mesh position={[0, -0.38, 0]} rotation={[Math.PI, 0, 0]}>
                        <coneGeometry args={[0.29, 0.75, 20, 1, true]} />
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={0.45}
                            transparent
                            opacity={0.6}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            </group>
            {[0, 1, 2].map((i) => (
                <mesh key={i} ref={(m) => (motes.current[i] = m)}>
                    <sphereGeometry args={[0.035, 8, 6]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={2} />
                </mesh>
            ))}
        </group>
    );
};

// --- Fairies: the forest's own, grown to traveler size ---------------------

/** The forest models are a hand-span across; as travelers they're person-sized. */
const FAIRY_SCALE = 4;
/**
 * In the forest they fly flat, like butterflies, which from eye height
 * across a room is just a line. As travelers they stand upright, wings on
 * their backs facing whoever's in front or behind.
 */
const UPRIGHT = Math.PI / 2 - 0.3;

const fairyModel = (kind: number | RegalKind): CharacterDef["Model"] => {
    const FairyModel: CharacterDef["Model"] = ({ motion }) => {
        const body = useRef<THREE.Group>(null);
        const flap = useRef(4);
        const walk = useWalkBlend(3);

        useFrame(({ clock }, delta) => {
            const t = clock.elapsedTime;
            const w = walk(motion, delta);
            // Flits: a little figure-of-eight in place, leaning into travel
            // and beating harder when it moves. Floats lower when crouching.
            const g = body.current!;
            g.position.set(
                Math.sin(t * 1.3) * 0.12 * (1 - w),
                1.3 - motion.crouch * 0.4 + Math.sin(t * 2.6) * 0.08,
                Math.sin(t * 2.6) * 0.06 * (1 - w)
            );
            g.rotation.x = UPRIGHT - w * 0.5 + motion.pitch * 0.3;
            g.rotation.z = Math.sin(t * 1.3) * 0.18 * (1 - w);
            flap.current = 4 + w * 9;
        });

        return (
            <group ref={body}>
                <group scale={FAIRY_SCALE}>
                    {typeof kind === "string" ? (
                        <RegalFairy kind={kind} flap={flap} />
                    ) : (
                        <ButterflyFairy kind={kind} flap={flap} glowSize={0.3} />
                    )}
                </group>
            </group>
        );
    };
    return FairyModel;
};

const hexNumber = (hex: string) => parseInt(hex.replace("#", ""), 16);
const FAIRY_FRAMING = { eye: 1.9, target: 1.2, distance: 3.4 };

const royals: CharacterDef[] = FAIRY_KINDS.map((k, i) => ({
    name: `${k.name} Royal`,
    tagline: "Flits, hovers, and does not hold still for photos.",
    height: 1.7,
    Model: fairyModel(i),
    framing: FAIRY_FRAMING,
    fairy: { caughtKey: k.name, color: hexNumber(k.glow), price: ROYAL_PRICE },
}));

const regals: CharacterDef[] = (["queen", "king"] as const).map((kind) => ({
    name: REGAL[kind].name,
    tagline: kind === "queen" ? "Pearl and rose and gold. Leaves glitter everywhere." : "Violet and sapphire. Wears the crown, trails the glitter.",
    height: 1.7,
    Model: fairyModel(kind),
    framing: FAIRY_FRAMING,
    fairy: { caughtKey: kind, color: hexNumber(REGAL[kind].glow), price: REGAL_PRICE },
}));

export const CHARACTERS: CharacterDef[] = [
    { name: "Pip", tagline: "Small. Round. Has had three espressos.", height: 0.95, Model: Pip, walks: true },
    { name: "Wisp", tagline: "Doesn't walk so much as drift.", height: 1.45, Model: Wisp },
    ...royals,
    ...regals,
];

export const characterAt = (index: number) => CHARACTERS[index] ?? CHARACTERS[0];

/** The color others see (and the minimap shows): fairies come in their own. */
export const lookFor = (character: number, color: number) => characterAt(character).fairy?.color ?? color;

/** Avatar colors on offer; chosen to stay readable in both bright and dark rooms. */
export const PALETTE = [0xff7a7a, 0xffb347, 0xf5e663, 0x7ee08a, 0x5ed3e8, 0x7f9cff, 0xc58cff, 0xff8fd1];
const COLOR_NAMES = ["coral", "orange", "yellow", "green", "teal", "blue", "violet", "pink"];

/** "a yellow Pip", "the Fairy Queen", "a Rose Royal" - how to mention a visitor. */
export const describeVisitor = (character: number, look: number, article: "a" | "the" = "a") => {
    const def = characterAt(character);
    const regal = def.fairy && (def.fairy.caughtKey === "queen" || def.fairy.caughtKey === "king");
    if (regal) return `the ${def.name}`;
    if (def.fairy) return `${article} ${def.name}`;
    const color = COLOR_NAMES[PALETTE.indexOf(look)];
    return color ? `${article} ${color} ${def.name}` : `${article} ${def.name}`;
};
