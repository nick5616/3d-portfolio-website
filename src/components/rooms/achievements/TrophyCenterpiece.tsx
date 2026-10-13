import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { createRupeeGeometry } from "../../../utils/rupeeGeometry";
import { RUPEE_TYPES } from "../../../stores/rupeeStore";
import { EnhancedMaterialSystem } from "../../../configs/enhancedMaterials";

// The shared rupee model is 5.2 units tall (y -2.6..2.6), 2.25 wide and
// 0.5 deep, centered at the origin. RupeeGem sizes it to an exact height in
// meters so placement is predictable.
const MODEL_HEIGHT = 5.2;
const GEM_DEPTH = 1.8; // thicker front-to-back than the model, reads solid

const BIG_RING_Y = 0.96; // centerpiece cradle ring height
const BIG_GEM_HEIGHT = 0.95;
const RUPEE_Y = BIG_RING_Y + 0.12 + BIG_GEM_HEIGHT / 2; // hover center
const SMALL_RING_Y = 1.07; // plinth cradle ring height
const SMALL_GEM_HEIGHT = 0.36;
const SMALL_RUPEE_Y = SMALL_RING_Y + 0.07 + SMALL_GEM_HEIGHT / 2;

const RupeeGem: React.FC<{ color: string; height: number; glow?: number }> = ({
    color,
    height,
    glow = 1,
}) => {
    const geometry = useMemo(() => createRupeeGeometry(), []); // centered at the origin
    useEffect(() => () => geometry.dispose(), [geometry]);
    const s = height / MODEL_HEIGHT;
    return (
        <mesh geometry={geometry} scale={[s, s, s * GEM_DEPTH]}>
            <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.45 * glow}
                flatShading
                roughness={0.05}
                metalness={0.6}
                envMapIntensity={3}
                clearcoat={1}
                clearcoatRoughness={0.03}
                // Some of the model's faces are wound backwards, so both
                // sides must render or it goes see-through at some angles.
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// The small version of the centerpiece stand, on top of each plinth: a
// brass post with an open cradle ring and the rupee hovering above it,
// slowly spinning. A type you haven't found yet shows an empty ring with a
// faint question mark.
const RupeeHolder: React.FC<{
    color: string;
    found: boolean;
    brass: THREE.Material;
    phase: number;
}> = ({ color, found, brass, phase }) => {
    const gem = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (!gem.current) return;
        gem.current.rotation.y += delta * 0.8;
        gem.current.position.y = SMALL_RUPEE_Y + Math.sin(state.clock.elapsedTime * 1.3 + phase) * 0.02;
    });
    return (
        <group>
            <mesh position={[0, 0.99, 0]} material={brass}>
                <cylinderGeometry args={[0.025, 0.05, 0.14, 10]} />
            </mesh>
            <mesh position={[0, SMALL_RING_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={brass}>
                <torusGeometry args={[0.08, 0.01, 6, 24]} />
            </mesh>
            {found ? (
                <group ref={gem} position={[0, SMALL_RUPEE_Y, 0]}>
                    <RupeeGem color={color} height={SMALL_GEM_HEIGHT} />
                </group>
            ) : (
                <Text position={[0, SMALL_RUPEE_Y, 0]} fontSize={0.16} color="#6a5e52" anchorX="center" anchorY="middle">
                    ?
                </Text>
            )}
        </group>
    );
};

// The middle of the Hall of Achievements: a carpet runner from the door to
// a stepped dais, a big turning rupee over a ring that lights up one
// segment per unlocked achievement, an arc of vitrines holding one of each
// rupee type you've found, and a chandelier.
export const TrophyCenterpiece: React.FC<{
    height: number;
    depth: number;
    unlockedCount: number;
    totalCount: number;
    rupees: Record<string, { count: number }>;
    wallet: number;
}> = ({ height, depth, unlockedCount, totalCount, rupees, wallet }) => {
    const system = EnhancedMaterialSystem.getInstance();
    const materials = useMemo(
        () => ({
            // Dark veined stone (the marble set, tinted down to charcoal):
            // reads as heavy and quiet next to the warm wood and brass.
            stone: system.pbr("marble-white", {
                repeat: 1,
                fallbackColor: "#2e2925",
                tint: "#4a423b",
                roughness: 0.6,
                metalness: 0,
            }),
            brass: system.flat("trophy-brass", { color: "#b8924f", roughness: 0.3, metalness: 1 }),
            enamel: system.flat("trophy-enamel", {
                color: "#efe4c8",
                emissive: "#efe4c8",
                emissiveIntensity: 0.35,
                roughness: 0.55,
                metalness: 0,
            }),
            carpet: system.flat("trophy-carpet", { color: "#5c1420", roughness: 0.95, metalness: 0 }),
            gold: system.flat("trophy-gold-trim", { color: "#c9a14d", roughness: 0.4, metalness: 1 }),
        }),
        [system]
    );

    const rupeeRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (rupeeRef.current) {
            rupeeRef.current.rotation.y += delta * 0.6;
            rupeeRef.current.position.y = RUPEE_Y + Math.sin(state.clock.elapsedTime * 1.1) * 0.05;
        }
    });

    // Progress ring: one segment per achievement, lit when unlocked
    const segments = useMemo(() => {
        const gap = 0.025;
        const arc = (Math.PI * 2) / totalCount - gap;
        return Array.from({ length: totalCount }, (_, i) => ({
            start: (i / totalCount) * Math.PI * 2 + Math.PI / 2,
            arc,
        }));
    }, [totalCount]);

    const vitrines = useMemo(
        () =>
            RUPEE_TYPES.map((type, i) => {
                const t = (i / (RUPEE_TYPES.length - 1)) * 2 - 1; // -1..1
                const angle = -Math.PI / 2 + t * 0.95; // arc behind the dais (north)
                return { type, x: Math.cos(angle) * 4.4, z: Math.sin(angle) * 4.4, facing: -angle - Math.PI / 2 };
            }),
        []
    );

    const chandelier = useMemo(
        () => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2),
        []
    );

    return (
        <group>
            {/* Carpet runner from the door to the dais */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, depth / 4 + 0.6]} material={materials.carpet}>
                <planeGeometry args={[2.1, depth / 2 - 1.6]} />
            </mesh>
            {[-1.02, 1.02].map((x) => (
                <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, depth / 4 + 0.6]} material={materials.gold}>
                    <planeGeometry args={[0.05, depth / 2 - 1.6]} />
                </mesh>
            ))}

            {/* Dais: two stone steps with brass edges */}
            <RigidBody type="fixed" colliders={false}>
                <CylinderCollider args={[0.25, 2.2]} position={[0, 0.25, 0]} />
            </RigidBody>
            <mesh position={[0, 0.12, 0]} material={materials.stone}>
                <cylinderGeometry args={[2.2, 2.25, 0.24, 48]} />
            </mesh>
            <mesh position={[0, 0.36, 0]} material={materials.stone}>
                <cylinderGeometry args={[1.5, 1.55, 0.24, 48]} />
            </mesh>
            <mesh position={[0, 0.245, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
                <torusGeometry args={[2.2, 0.025, 6, 64]} />
            </mesh>
            <mesh position={[0, 0.485, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
                <torusGeometry args={[1.5, 0.025, 6, 64]} />
            </mesh>

            {/* Progress ring */}
            <group position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {segments.map((segment, i) => (
                    <mesh key={i}>
                        <ringGeometry args={[0.95, 1.18, 6, 1, segment.start, segment.arc]} />
                        <meshBasicMaterial
                            color={i < unlockedCount ? "#ffcc55" : "#3a3024"}
                            toneMapped={false}
                        />
                    </mesh>
                ))}
            </group>

            {/* The rupee: hovering over a short brass stand with an open
                cradle ring, clearly free-floating (not hanging from above). */}
            <mesh position={[0, 0.72, 0]} material={materials.brass}>
                <cylinderGeometry args={[0.05, 0.11, 0.44, 12]} />
            </mesh>
            <mesh position={[0, BIG_RING_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
                <torusGeometry args={[0.22, 0.022, 8, 40]} />
            </mesh>
            <group ref={rupeeRef} position={[0, RUPEE_Y, 0]}>
                <RupeeGem color="#3ee58f" height={BIG_GEM_HEIGHT} glow={1.4} />
            </group>
            <pointLight position={[0, RUPEE_Y, 0.4]} intensity={1.2} distance={3} decay={2} color="#3ee58f" />

            {/* Counts on a brass plaque standing on the lower step, leaning
                back against the upper step and facing the door */}
            <group position={[0, 0.44, 1.62]} rotation={[-0.25, 0, 0]}>
                <mesh material={materials.brass}>
                    <boxGeometry args={[1.5, 0.4, 0.03]} />
                </mesh>
                <mesh position={[0, 0, 0.016]}>
                    <planeGeometry args={[1.42, 0.32]} />
                    <meshStandardMaterial color="#1c1612" roughness={0.6} />
                </mesh>
                <Text
                    font="/fonts/Fraunces.ttf"
                    position={[0, 0.045, 0.02]}
                    fontSize={0.12}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffe2a0"
                    letterSpacing={0.04}
                >
                    {`${unlockedCount} of ${totalCount} achievements`}
                </Text>
                <Text position={[0, -0.09, 0.02]} fontSize={0.065} anchorX="center" anchorY="middle" color="#a8f5c9" letterSpacing={0.06}>
                    {`${wallet.toLocaleString()} RUPEES IN YOUR WALLET`}
                </Text>
            </group>

            {/* Rupee vitrines */}
            {vitrines.map(({ type, x, z, facing }) => {
                const count = rupees[type.name]?.count ?? 0;
                return (
                    <group key={type.name} position={[x, 0, z]} rotation={[0, facing, 0]}>
                        <RigidBody type="fixed" colliders={false}>
                            <CylinderCollider args={[0.6, 0.32]} position={[0, 0.6, 0]} />
                        </RigidBody>
                        <mesh position={[0, 0.45, 0]} material={materials.stone}>
                            <boxGeometry args={[0.55, 0.9, 0.55]} />
                        </mesh>
                        <mesh position={[0, 0.91, 0]} material={materials.brass}>
                            <boxGeometry args={[0.6, 0.03, 0.6]} />
                        </mesh>
                        <RupeeHolder
                            color={type.color}
                            found={count > 0}
                            brass={materials.brass}
                            phase={x * 1.7}
                        />
                        {/* Label: cream enamel plate in a thin brass frame. Not
                            metallic - polished brass reflects almost nothing in
                            this dim room and read as black. Slightly
                            self-lit so it stays legible anywhere. */}
                        <mesh position={[0, 0.6, 0.279]} material={materials.brass}>
                            <boxGeometry args={[0.5, 0.26, 0.008]} />
                        </mesh>
                        <mesh position={[0, 0.6, 0.284]} material={materials.enamel}>
                            <planeGeometry args={[0.46, 0.22]} />
                        </mesh>
                        <Text
                            font="/fonts/Fraunces.ttf"
                            position={[0, 0.635, 0.286]}
                            fontSize={0.075}
                            color="#1b140d"
                            anchorX="center"
                            anchorY="middle"
                            maxWidth={0.44}
                        >
                            {`${type.name} × ${count}`}
                        </Text>
                        <Text position={[0, 0.555, 0.286]} fontSize={0.045} color="#5a4630" anchorX="center" anchorY="middle" letterSpacing={0.08}>
                            {`${type.value > 0 ? "+" : ""}${type.value} EACH`}
                        </Text>
                    </group>
                );
            })}

            {/* Chandelier */}
            <group position={[0, height - 1.4, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
                    <torusGeometry args={[1.1, 0.03, 8, 48]} />
                </mesh>
                <mesh position={[0, 0.7, 0]} material={materials.brass}>
                    <cylinderGeometry args={[0.012, 0.012, 1.4, 6]} />
                </mesh>
                {chandelier.map((angle) => (
                    <mesh key={angle} position={[Math.cos(angle) * 1.1, 0.08, Math.sin(angle) * 1.1]}>
                        <sphereGeometry args={[0.055, 10, 8]} />
                        <meshBasicMaterial color="#ffe1a8" toneMapped={false} />
                    </mesh>
                ))}
            </group>
        </group>
    );
};
