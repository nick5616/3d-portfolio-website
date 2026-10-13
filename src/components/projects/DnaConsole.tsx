import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { TECH_FAMILIES } from "./projectDna";
import { BUTTON_TRAVEL_MS, useDnaFilterStore } from "./dnaFilterStore";
import { getLightPoolMaterial } from "../models/artFrameParts";
import { GemPrompt } from "../ui/GemPrompt";

// The Project DNA console in the middle of the lab: a solid two-sided
// statue. Each side has an angled control deck with one physical button per
// tech family; the indicator lamp to the left of each button blazes when
// that family is switched on. Both decks drive the same filter.

const DECK_TILT = 0.62; // radians, far edge raised toward the reader
const DECK_Y = 1.02;
const DECK_Z = 0.36;

const metal = new THREE.MeshStandardMaterial({ color: "#1a1f2c", roughness: 0.32, metalness: 0.9 });
const darkMetal = new THREE.MeshStandardMaterial({ color: "#0e1119", roughness: 0.5, metalness: 0.8 });
const brass = new THREE.MeshStandardMaterial({ color: "#b08d57", roughness: 0.3, metalness: 1 });
const deckSurface = new THREE.MeshStandardMaterial({ color: "#12161f", roughness: 0.6, metalness: 0.4 });
const CAP_TRAVEL = 0.018; // how far a button cap sinks when pressed

// Grid for the buttons on a deck (deck-local x/z; the deck surface is y=0.031)
const controlLayout = TECH_FAMILIES.map((family, i) => {
    const column = i < 4 ? 0 : 1;
    const row = i < 4 ? i : i - 4;
    return { family, x: column === 0 ? -0.62 : 0.18, z: -0.27 + row * 0.18 };
});

export const buttonId = (side: "front" | "back", familyId: string) => `${side}:${familyId}`;

const ControlButton: React.FC<{
    side: "front" | "back";
    family: (typeof TECH_FAMILIES)[number];
    x: number;
    z: number;
    on: boolean;
    aimed: boolean;
    registerHit: (mesh: THREE.Mesh | null) => void;
}> = ({ side, family, x, z, on, aimed, registerHit }) => {
    const cap = useRef<THREE.Group>(null);
    const halo = useRef<THREE.Mesh>(null);
    const myId = buttonId(side, family.id);
    const press = useRef({ y: 0, v: 0, phase: "idle" as "idle" | "down" | "hold" | "up", t: 0, seen: 0 });
    const lamp = useRef({ level: on ? 1 : 0, igniteT: on ? 1 : -1, last: on });
    const offColor = useMemo(() => new THREE.Color("#20242c"), []);
    const onColor = useMemo(() => new THREE.Color(family.color), [family.color]);
    const lampMaterial = useMemo(
        () => new THREE.MeshBasicMaterial({ color: on ? family.color : "#20242c", toneMapped: false }),
        [family.color] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const buttonMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: family.color,
                emissive: family.color,
                emissiveIntensity: on ? 1.1 : 0.08,
                roughness: 0.35,
                metalness: 0.1,
            }),
        [family.color] // eslint-disable-line react-hooks/exhaustive-deps
    );

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 1 / 30);

        // --- Cap travel: ease down, bottom out, hold, spring back up ---
        const lastPress = useDnaFilterStore.getState().lastPress;
        const p = press.current;
        if (lastPress && lastPress.id === myId && lastPress.at !== p.seen) {
            p.seen = lastPress.at;
            p.phase = "down";
            p.t = 0;
        }
        p.t += delta;
        if (p.phase === "down") {
            const k = Math.min(1, p.t / (BUTTON_TRAVEL_MS / 1000));
            p.y = -CAP_TRAVEL * k * k; // accelerate into the bottom
            if (k >= 1) {
                p.phase = "hold";
                p.t = 0;
            }
        } else if (p.phase === "hold") {
            p.y = -CAP_TRAVEL;
            if (p.t > 0.11) {
                p.phase = "up";
                p.v = 0;
            }
        } else if (p.phase === "up") {
            // A soft spring with a little overshoot, like a real keycap.
            p.v += (-p.y * 220 - p.v * 13) * delta;
            p.y += p.v * delta;
            if (Math.abs(p.y) < 0.0002 && Math.abs(p.v) < 0.002) {
                p.y = 0;
                p.phase = "idle";
            }
        }
        if (cap.current) cap.current.position.y = 0.045 + p.y;

        // --- Lamp: ignite with a flicker, or fade out slowly ---
        const l = lamp.current;
        if (l.last !== on) {
            l.last = on;
            l.igniteT = on ? 0 : -1;
        }
        let target = on ? 1 : 0;
        if (on && l.igniteT >= 0 && l.igniteT < 0.32) {
            l.igniteT += delta;
            const t = l.igniteT;
            target = t < 0.07 ? 0.85 : t < 0.12 ? 0.12 : t < 0.19 ? 1 : t < 0.23 ? 0.35 : 1;
            l.level = target; // flicker is instant, that's what makes it read
        } else {
            l.level += (target - l.level) * Math.min(1, delta * (on ? 10 : 2.6));
        }
        lampMaterial.color.copy(offColor).lerp(onColor, l.level);
        if (halo.current) {
            halo.current.visible = l.level > 0.02;
            halo.current.scale.setScalar(0.4 + l.level * 0.8);
        }
        buttonMaterial.emissiveIntensity = THREE.MathUtils.lerp(
            buttonMaterial.emissiveIntensity,
            (l.level * 1.1 + (aimed ? 0.5 : 0)) * (on ? 1 : 0.35) + 0.06,
            Math.min(1, delta * 6)
        );
    });

    return (
        <group position={[x, 0, z]}>
            {/* Indicator lamp, left of the button */}
            <mesh position={[0, 0.045, 0]} material={lampMaterial}>
                <sphereGeometry args={[0.032, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[0, 0.033, 0]} material={brass}>
                <cylinderGeometry args={[0.042, 0.046, 0.012, 16]} />
            </mesh>
            <mesh ref={halo} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={getLightPoolMaterial(family.color, 0.95)}>
                <planeGeometry args={[0.26, 0.26]} />
            </mesh>
            {/* The button */}
            <group position={[0.13, 0, 0]}>
                <mesh position={[0, 0.036, 0]} material={darkMetal}>
                    <cylinderGeometry args={[0.064, 0.068, 0.014, 20]} />
                </mesh>
                <group ref={cap} position={[0, 0.045, 0]}>
                    <mesh material={buttonMaterial}>
                        <cylinderGeometry args={[0.052, 0.055, 0.026, 20]} />
                    </mesh>
                </group>
                <mesh
                    ref={registerHit}
                    position={[0, 0.05, 0]}
                    visible={false}
                    userData={{ buttonId: buttonId(side, family.id), familyId: family.id }}
                >
                    <boxGeometry args={[0.2, 0.08, 0.16]} />
                </mesh>
            </group>
            <Text
                position={[0.22, 0.034, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.05}
                anchorX="left"
                anchorY="middle"
                color={on ? "#ffffff" : "#6c7486"}
                maxWidth={0.5}
            >
                {family.label}
            </Text>
            {aimed && (
                <Html position={[0.13, 0.22, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                    <GemPrompt accent="blue" action={`${on ? "Hide" : "Show"} ${family.label}`} />
                </Html>
            )}
        </group>
    );
};

const Deck: React.FC<{
    side: "front" | "back";
    registerHit: (mesh: THREE.Mesh | null) => void;
}> = ({ side, registerHit }) => {
    const enabled = useDnaFilterStore((s) => s.enabled);
    const aimedButton = useDnaFilterStore((s) => s.aimedButton);
    const litCount = TECH_FAMILIES.filter((f) => enabled[f.id]).length;

    return (
        <group rotation={[0, side === "front" ? 0 : Math.PI, 0]}>
            <group position={[0, DECK_Y, DECK_Z]} rotation={[DECK_TILT, 0, 0]}>
                {/* Deck slab with a brass lip */}
                <mesh material={metal}>
                    <boxGeometry args={[1.7, 0.06, 0.86]} />
                </mesh>
                <mesh position={[0, 0.031, 0]} rotation={[-Math.PI / 2, 0, 0]} material={deckSurface}>
                    <planeGeometry args={[1.58, 0.76]} />
                </mesh>
                <mesh position={[0, 0.02, 0.44]} material={brass}>
                    <boxGeometry args={[1.72, 0.05, 0.03]} />
                </mesh>
                {/* Corner bolts */}
                {[-0.8, 0.8].flatMap((bx) =>
                    [-0.38, 0.38].map((bz) => (
                        <mesh key={`${bx},${bz}`} position={[bx, 0.036, bz]} material={brass}>
                            <cylinderGeometry args={[0.016, 0.016, 0.01, 10]} />
                        </mesh>
                    ))
                )}
                {/* Header: title + how many families are lit */}
                <Text position={[-0.74, 0.034, -0.36]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.06} anchorX="left" anchorY="middle" color="#d8e6ff" letterSpacing={0.18}>
                    PROJECT DNA
                </Text>
                <Text position={[0.74, 0.034, -0.36]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.045} anchorX="right" anchorY="middle" color="#8fd8ff">
                    {`${litCount}/${TECH_FAMILIES.length} LIT`}
                </Text>
                {controlLayout.map(({ family, x, z }) => (
                    <ControlButton
                        key={family.id}
                        side={side}
                        family={family}
                        x={x}
                        z={z}
                        on={enabled[family.id] !== false}
                        aimed={aimedButton === buttonId(side, family.id)}
                        registerHit={registerHit}
                    />
                ))}
                <Text position={[0.18, 0.034, 0.33]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.034} anchorX="left" anchorY="middle" color="#7f8aa3" maxWidth={0.6}>
                    Rung colors = each project's stack. A helix stays while any of its colors is lit.
                </Text>
            </group>
        </group>
    );
};

export const DnaConsole: React.FC<{
    registerHit: (mesh: THREE.Mesh | null) => void;
}> = ({ registerHit }) => {
    const core = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (core.current) {
            const pulse = 0.75 + Math.sin(state.clock.elapsedTime * 1.4) * 0.25;
            (core.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * pulse;
        }
    });

    return (
        <group>
            <RigidBody type="fixed" colliders={false}>
                <CylinderCollider args={[0.8, 1.15]} position={[0, 0.8, 0]} />
            </RigidBody>
            {/* Octagonal plinth with a brass band */}
            <mesh position={[0, 0.17, 0]} material={darkMetal}>
                <cylinderGeometry args={[1.12, 1.22, 0.34, 8]} />
            </mesh>
            <mesh position={[0, 0.35, 0]} material={brass}>
                <cylinderGeometry args={[1.1, 1.12, 0.03, 8]} />
            </mesh>
            {/* Body between the two decks */}
            <mesh position={[0, 0.72, 0]} material={metal}>
                <boxGeometry args={[1.5, 0.74, 0.62]} />
            </mesh>
            {/* Side vents */}
            {[-0.76, 0.76].map((x) =>
                [0.55, 0.65, 0.75, 0.85].map((y) => (
                    <mesh key={`${x},${y}`} position={[x, y, 0]} material={darkMetal}>
                        <boxGeometry args={[0.02, 0.035, 0.42]} />
                    </mesh>
                ))
            )}
            <Deck side="front" registerHit={registerHit} />
            <Deck side="back" registerHit={registerHit} />
            {/* Crest: spine between the decks and a glowing core */}
            <mesh position={[0, 1.36, 0]} material={metal}>
                <boxGeometry args={[1.76, 0.1, 0.12]} />
            </mesh>
            <mesh position={[0, 1.42, 0]} material={brass}>
                <boxGeometry args={[1.78, 0.02, 0.14]} />
            </mesh>
            <mesh position={[0, 1.62, 0]} material={brass}>
                <cylinderGeometry args={[0.05, 0.09, 0.38, 12]} />
            </mesh>
            <mesh ref={core} position={[0, 2.4, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 1.3, 8]} />
                <meshBasicMaterial color="#8fd8ff" toneMapped={false} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, 1.86, 0]}>
                <sphereGeometry args={[0.11, 20, 14]} />
                <meshBasicMaterial color="#cfefff" toneMapped={false} />
            </mesh>
        </group>
    );
};
