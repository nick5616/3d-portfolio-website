import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { GemPrompt } from "../../ui/GemPrompt";
import { useAimTargets } from "../../core/useAimTargets";
import { RupeeIcon } from "../../models/RupeeIcon";
import { useRupeeStore } from "../../../stores/rupeeStore";
import { useUnlockStore } from "../../../stores/unlockStore";
import { useAchievementStore } from "../../../stores/achievementStore";
import { playSound } from "../../../audio/soundManager";
import { SHOP_ITEMS, ShopItem, ShopItemId } from "./shopItems";

// The Rupee Shop, where the holodeck used to be. A cosy wooden shop kept by
// Pip, a round little owl behind the counter. Four upgrades under glass;
// everything you buy works in every room.

const HALF_X = 6;
const HALF_Z = 5;
const HEIGHT = 6;
const PEDESTALS: [number, number][] = [
    [1.2, -3.1],
    [1.8, -1.05],
    [1.8, 1.05],
    [1.2, 3.1],
];

const GREETINGS = ["Hoo! Welcome in.", "Everything here works everywhere. Hoo.", "Look around. Touch nothing. Well, touch everything."];
const THANKS = ["Pleasure doing business! Hoo!", "Wear it well.", "Excellent choice. I'd have bought it myself."];
const BROKE = ["Come back with a fuller wallet, friend.", "Rupees are out there. Lots of them. Hoo.", "Not quite enough. Keep exploring!"];
const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];

// --- Item models -------------------------------------------------------------------

const ItemModel: React.FC<{ id: ShopItemId; color: string }> = ({ id, color }) => {
    switch (id) {
        case "shop-fairy":
            return (
                <group>
                    <mesh>
                        <sphereGeometry args={[0.09, 16, 12]} />
                        <meshBasicMaterial color="#ffffff" toneMapped={false} />
                    </mesh>
                    <mesh>
                        <sphereGeometry args={[0.16, 16, 12]} />
                        <meshBasicMaterial color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                    </mesh>
                    {[-1, 1].map((side) => (
                        <mesh key={side} position={[side * 0.13, 0.05, 0]} rotation={[0, 0, side * 0.5]}>
                            <planeGeometry args={[0.16, 0.24]} />
                            <meshBasicMaterial color="#e8f6ff" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            );
        case "shop-magnet":
            return (
                <group rotation={[0, 0, Math.PI]}>
                    <mesh position={[0, 0.05, 0]}>
                        <torusGeometry args={[0.13, 0.05, 12, 24, Math.PI]} />
                        <meshStandardMaterial color={color} roughness={0.4} />
                    </mesh>
                    {[-0.13, 0.13].map((x) => (
                        <mesh key={x} position={[x, -0.06, 0]}>
                            <boxGeometry args={[0.1, 0.12, 0.1]} />
                            <meshStandardMaterial color="#d8d8e0" metalness={0.9} roughness={0.2} />
                        </mesh>
                    ))}
                </group>
            );
        case "shop-boots":
            return (
                <group>
                    {[-0.09, 0.09].map((x) => (
                        <group key={x} position={[x, 0, 0]}>
                            <mesh position={[0, 0, 0]}>
                                <boxGeometry args={[0.1, 0.2, 0.1]} />
                                <meshStandardMaterial color={color} roughness={0.5} />
                            </mesh>
                            <mesh position={[0, -0.08, 0.06]}>
                                <boxGeometry args={[0.1, 0.05, 0.2]} />
                                <meshStandardMaterial color={color} roughness={0.5} />
                            </mesh>
                            <mesh position={[x > 0 ? 0.08 : -0.08, 0.05, -0.02]} rotation={[0, 0, x > 0 ? -0.6 : 0.6]}>
                                <planeGeometry args={[0.12, 0.08]} />
                                <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} emissive="#ffffff" emissiveIntensity={0.3} />
                            </mesh>
                        </group>
                    ))}
                </group>
            );
        case "shop-disco":
            return (
                <mesh>
                    <icosahedronGeometry args={[0.17, 2]} />
                    <meshStandardMaterial color={color} metalness={1} roughness={0.08} flatShading envMapIntensity={2} />
                </mesh>
            );
    }
};

const Pedestal: React.FC<{
    item: ShopItem;
    position: [number, number];
    owned: boolean;
    bindRef: (o: THREE.Object3D | null) => void;
}> = ({ item, position, owned, bindRef }) => {
    const spin = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (spin.current) {
            spin.current.rotation.y = clock.elapsedTime * 0.8;
            spin.current.position.y = 1.28 + Math.sin(clock.elapsedTime * 1.6 + position[1]) * 0.03;
        }
    });
    return (
        <group position={[position[0], 0, position[1]]} ref={bindRef}>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.32, 0.4, 1, 8]} />
                <meshStandardMaterial color="#6b4428" roughness={0.6} />
            </mesh>
            <mesh position={[0, 1.02, 0]}>
                <cylinderGeometry args={[0.38, 0.38, 0.04, 24]} />
                <meshStandardMaterial color="#d9a94a" metalness={0.9} roughness={0.25} />
            </mesh>
            {/* Glass dome */}
            <mesh position={[0, 1.04, 0]}>
                <sphereGeometry args={[0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshPhysicalMaterial color="#ffffff" transparent opacity={0.16} roughness={0} metalness={0} clearcoat={1} depthWrite={false} />
            </mesh>
            <group ref={spin}>
                <ItemModel id={item.id} color={item.color} />
            </group>
            <pointLight position={[0, 1.7, 0.2]} intensity={1.2} distance={1.8} decay={2} color={item.color} />
            {/* Price tag, facing into the room (toward -X, where you come in) */}
            <group position={[-0.42, 0.75, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh>
                    <planeGeometry args={[0.62, 0.34]} />
                    <meshStandardMaterial color={owned ? "#2a5a3a" : "#f4ead8"} roughness={0.8} />
                </mesh>
                <Text position={[0, 0.07, 0.005]} fontSize={0.07} color={owned ? "#d8ffe4" : "#3a2414"} anchorX="center" maxWidth={0.58} textAlign="center">
                    {item.name}
                </Text>
                {owned ? (
                    <Text position={[0, -0.07, 0.005]} fontSize={0.08} color="#7dffa8" anchorX="center" fontWeight="bold">
                        OWNED
                    </Text>
                ) : (
                    <group position={[0, -0.07, 0.005]}>
                        <RupeeIcon position={[-0.08, 0, 0.01]} scale={0.03} color="#3ee58f" />
                        <Text position={[0.05, 0, 0]} fontSize={0.08} color="#3a2414" anchorX="center" anchorY="middle" fontWeight="bold">
                            {String(item.price)}
                        </Text>
                    </group>
                )}
            </group>
        </group>
    );
};

// Pip, the shopkeeper: a round owl who blinks and bobs.
const Pip: React.FC<{ line: string }> = ({ line }) => {
    const body = useRef<THREE.Group>(null);
    const eyes = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (body.current) {
            body.current.position.y = 1.32 + Math.abs(Math.sin(t * 1.5)) * 0.04;
            body.current.rotation.z = Math.sin(t * 0.8) * 0.06;
        }
        if (eyes.current) eyes.current.scale.y = t % 3.7 < 0.12 ? 0.1 : 1;
    });
    return (
        <group position={[4.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <group ref={body}>
                <mesh scale={[1, 1.1, 0.9]}>
                    <sphereGeometry args={[0.38, 24, 16]} />
                    <meshStandardMaterial color="#a8794e" roughness={0.9} />
                </mesh>
                <mesh position={[0, -0.05, 0.25]} scale={[1, 1.1, 0.5]}>
                    <sphereGeometry args={[0.26, 20, 12]} />
                    <meshStandardMaterial color="#efdcbc" roughness={0.9} />
                </mesh>
                <group ref={eyes} position={[0, 0.14, 0.3]}>
                    {[-0.12, 0.12].map((x) => (
                        <group key={x} position={[x, 0, 0]}>
                            <mesh>
                                <sphereGeometry args={[0.1, 16, 12]} />
                                <meshStandardMaterial color="#ffffff" />
                            </mesh>
                            <mesh position={[0, 0, 0.08]}>
                                <sphereGeometry args={[0.045, 12, 8]} />
                                <meshStandardMaterial color="#1a1208" />
                            </mesh>
                        </group>
                    ))}
                </group>
                <mesh position={[0, 0.03, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.04, 0.1, 8]} />
                    <meshStandardMaterial color="#ffb347" />
                </mesh>
                {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * 0.2, 0.42, 0]} rotation={[0, 0, side * -0.4]}>
                        <coneGeometry args={[0.07, 0.18, 8]} />
                        <meshStandardMaterial color="#8a5e3a" />
                    </mesh>
                ))}
            </group>
            {/* Speech */}
            <group position={[0, 2.25, 0]}>
                <mesh>
                    <planeGeometry args={[2.4, 0.5]} />
                    <meshBasicMaterial color="#fffaf0" transparent opacity={0.92} />
                </mesh>
                <Text position={[0, 0, 0.01]} fontSize={0.12} color="#3a2414" anchorX="center" anchorY="middle" maxWidth={2.25} textAlign="center">
                    {line}
                </Text>
            </group>
        </group>
    );
};

export const RupeeShop: React.FC = () => {
    const unlocked = useUnlockStore((s) => s.unlocked);
    const wallet = useRupeeStore((s) => s.totalValue);
    const [line, setLine] = useState(() => pick(GREETINGS));
    const aim = useAimTargets();

    useEffect(() => {
        const timer = window.setTimeout(() => setLine(pick(GREETINGS)), 9000);
        return () => window.clearTimeout(timer);
    }, [line]);

    const buy = (item: ShopItem) => {
        if (useUnlockStore.getState().unlocked[item.id]) return;
        if (useRupeeStore.getState().spendRupees(item.price)) {
            useUnlockStore.getState().unlock(item.id);
            playSound("rupee-spend");
            window.setTimeout(() => playSound("door-unlock"), 220);
            setLine(pick(THANKS));
            useAchievementStore.getState().unlock("shop-customer");
        } else {
            playSound("door-locked");
            setLine(pick(BROKE));
        }
    };

    return (
        <>
            <RoomEnvironmentReady />
            <ambientLight intensity={0.35} color="#ffe6c8" />
            <hemisphereLight intensity={0.45} color="#fff1d6" groundColor="#3a2414" />
            {[-3.5, 0, 3.5].map((z) => (
                <group key={z} position={[0, HEIGHT - 1.3, z]}>
                    <mesh>
                        <sphereGeometry args={[0.2, 16, 12]} />
                        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
                    </mesh>
                    <mesh position={[0, 0.6, 0]}>
                        <cylinderGeometry args={[0.01, 0.01, 1.2, 4]} />
                        <meshStandardMaterial color="#2a1a10" />
                    </mesh>
                    <pointLight intensity={4} distance={8} decay={1.8} color="#ffcf8a" />
                </group>
            ))}

            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[HALF_X, 0.25, HALF_Z]} position={[0, -0.25, 0]} />
                <CuboidCollider args={[HALF_X, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, -HALF_Z - 0.2]} />
                <CuboidCollider args={[HALF_X, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, HALF_Z + 0.2]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF_Z]} position={[-HALF_X - 0.2, HEIGHT / 2, 0]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF_Z]} position={[HALF_X + 0.2, HEIGHT / 2, 0]} />
                {/* Counter */}
                <CuboidCollider args={[0.45, 0.55, 2.6]} position={[3.6, 0.55, 0]} />
                {PEDESTALS.map(([x, z], i) => (
                    <CylinderCollider key={i} args={[0.6, 0.42]} position={[x, 0.6, z]} />
                ))}
            </RigidBody>

            {/* Floor, walls, ceiling */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
                <meshStandardMaterial color="#6b4428" roughness={0.65} />
            </mesh>
            {Array.from({ length: 19 }, (_, i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -HALF_Z + 0.52 * (i + 0.5)]}>
                    <planeGeometry args={[HALF_X * 2, 0.01]} />
                    <meshBasicMaterial color="#4a2e1a" />
                </mesh>
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.004, 0]}>
                <circleGeometry args={[2.6, 48]} />
                <meshStandardMaterial color="#2f6e48" roughness={1} />
            </mesh>
            {[
                { p: [0, HEIGHT / 2, -HALF_Z], r: [0, 0, 0], w: HALF_X * 2 },
                { p: [0, HEIGHT / 2, HALF_Z], r: [0, Math.PI, 0], w: HALF_X * 2 },
                { p: [-HALF_X, HEIGHT / 2, 0], r: [0, Math.PI / 2, 0], w: HALF_Z * 2 },
                { p: [HALF_X, HEIGHT / 2, 0], r: [0, -Math.PI / 2, 0], w: HALF_Z * 2 },
            ].map((w, i) => (
                <mesh key={i} position={w.p as [number, number, number]} rotation={w.r as [number, number, number]}>
                    <planeGeometry args={[w.w, HEIGHT]} />
                    <meshStandardMaterial color="#e8d6b8" roughness={0.9} />
                </mesh>
            ))}
            <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
                <meshStandardMaterial color="#5a3a22" roughness={0.9} />
            </mesh>
            {/* Ceiling beams */}
            {[-3, -1, 1, 3].map((x) => (
                <mesh key={x} position={[x * 1.4, HEIGHT - 0.15, 0]}>
                    <boxGeometry args={[0.25, 0.3, HALF_Z * 2]} />
                    <meshStandardMaterial color="#4a2e1a" roughness={0.9} />
                </mesh>
            ))}

            {/* Counter and the shelves behind it */}
            <mesh position={[3.6, 0.55, 0]}>
                <boxGeometry args={[0.9, 1.1, 5.2]} />
                <meshStandardMaterial color="#7a4e2c" roughness={0.6} />
            </mesh>
            <mesh position={[3.6, 1.12, 0]}>
                <boxGeometry args={[1.0, 0.06, 5.4]} />
                <meshStandardMaterial color="#3e2616" roughness={0.4} />
            </mesh>
            {[1.4, 2.3, 3.2].map((y) => (
                <mesh key={y} position={[HALF_X - 0.25, y, 0]}>
                    <boxGeometry args={[0.5, 0.05, 6]} />
                    <meshStandardMaterial color="#6b4428" />
                </mesh>
            ))}
            {/* Jars and bottles on the back shelves */}
            {Array.from({ length: 18 }, (_, i) => (
                <mesh key={i} position={[HALF_X - 0.25, [1.4, 2.3, 3.2][i % 3] + 0.16, -2.6 + Math.floor(i / 3) * 1.05]}>
                    <cylinderGeometry args={[0.09, 0.09, 0.26, 12]} />
                    <meshStandardMaterial
                        color={["#3ee58f", "#4da6ff", "#ff4d5e", "#ffd23c", "#b06bff"][i % 5]}
                        transparent
                        opacity={0.75}
                        roughness={0.1}
                    />
                </mesh>
            ))}
            <Pip line={line} />

            {/* Sign */}
            <group position={[HALF_X - 0.05, 4.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh>
                    <boxGeometry args={[3.6, 0.8, 0.06]} />
                    <meshStandardMaterial color="#2f6e48" roughness={0.7} />
                </mesh>
                <RupeeIcon position={[-1.45, 0, 0.06]} scale={0.07} color="#3ee58f" emissiveIntensity={1} />
                <RupeeIcon position={[1.45, 0, 0.06]} scale={0.07} color="#3ee58f" emissiveIntensity={1} />
                <Text position={[0, 0.06, 0.04]} fontSize={0.34} color="#fff4d6" anchorX="center" anchorY="middle" fontWeight="bold">
                    RUPEE SHOP
                </Text>
                <Text position={[0, -0.26, 0.04]} fontSize={0.11} color="#cfeedd" anchorX="center" anchorY="middle">
                    {`Everything here works in every room · you have ${Math.max(0, wallet)}`}
                </Text>
            </group>

            {SHOP_ITEMS.map((item, i) => {
                const owned = Boolean(unlocked[item.id]);
                return (
                    <Pedestal
                        key={item.id}
                        item={item}
                        position={PEDESTALS[i]}
                        owned={owned}
                        bindRef={aim.bind(item.id, {
                            reach: 3.5,
                            prompt: () =>
                                owned ? (
                                    <GemPrompt accent="green" keyLabel={null} action={`${item.name}: yours. ${item.blurb}`} />
                                ) : wallet >= item.price ? (
                                    <GemPrompt accent="gold" action={`Buy ${item.name} for ${item.price} rupees. ${item.blurb}`} />
                                ) : (
                                    <GemPrompt
                                        accent="red"
                                        keyLabel={null}
                                        action={`${item.name}: ${item.price} rupees (you have ${Math.max(0, wallet)}). ${item.blurb}`}
                                    />
                                ),
                            use: () => buy(item),
                        })}
                    />
                );
            })}

            <aim.Prompt />
        </>
    );
};
