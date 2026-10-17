import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { InteractionRaycaster } from "../../core/InteractionRaycaster";
import { GemPrompt } from "../../ui/GemPrompt";
import { playSound } from "../../../audio/soundManager";
import { useCosmicStore } from "./cosmicStore";
import { BotId, LADDER, OPPONENTS, isUnlocked, previousOnLadder } from "./opponents";
import { OPPONENT_ALTAR_POSITION, facePlaySpot } from "./cosmicLayout";
import { cosmicControl } from "./cosmicControl";
import { TravelerFigure } from "./TravelerFigure";

// A slab to your right with everyone who'll play you, easiest first, each
// on a small dais. Look at one and press E to have them sit down. Each is
// a shadow until you've beaten the one before.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TOP = 1.0;
const SPACING = 0.32;
const FIGURE_HEIGHT = 0.26;
const FACING = facePlaySpot(OPPONENT_ALTAR_POSITION);

// The Void, small: a gold ring with an eye in it.
const VoidToken: React.FC<{ gold: THREE.Material }> = ({ gold }) => {
    const ring = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.6;
    });
    return (
        <group position={[0, 0.13, 0]}>
            <mesh ref={ring} material={gold}>
                <torusGeometry args={[0.085, 0.006, 8, 48]} />
            </mesh>
            <mesh>
                <sphereGeometry args={[0.03, 16, 12]} />
                <meshBasicMaterial color="#f3efe6" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.028]}>
                <circleGeometry args={[0.016, 20]} />
                <meshBasicMaterial color="#e0a52a" toneMapped={false} />
            </mesh>
        </group>
    );
};

// Someone you haven't earned yet: a dark, slowly turning orb.
const Shadow: React.FC<{ material: THREE.Material }> = ({ material }) => {
    const orb = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (orb.current) orb.current.rotation.y = clock.elapsedTime * 0.5;
    });
    return (
        <mesh ref={orb} position={[0, 0.12, 0]} material={material}>
            <icosahedronGeometry args={[0.075, 1]} />
        </mesh>
    );
};

export const OpponentAltar: React.FC = () => {
    const opponent = useCosmicStore((s) => s.opponent);
    const beaten = useCosmicStore((s) => s.beaten);
    const records = useCosmicStore((s) => s.records);
    const modeKind = useCosmicStore((s) => s.mode.kind);
    const [hovered, setHovered] = useState<BotId | null>(null);
    const daises = useRef<(THREE.Group | null)[]>([]);
    const targets = useRef<THREE.Group>(null);

    const materials = useMemo(
        () => ({
            slab: new THREE.MeshPhysicalMaterial({
                color: "#0d0a14",
                roughness: 0.12,
                metalness: 0.4,
                clearcoat: 1,
                envMapIntensity: 1.6,
            }),
            gold: new THREE.MeshStandardMaterial({
                color: "#d9a94a",
                roughness: 0.25,
                metalness: 1,
                emissive: "#5a3a08",
                emissiveIntensity: 0.6,
            }),
            shadow: new THREE.MeshPhysicalMaterial({
                color: "#07050c",
                roughness: 0.05,
                metalness: 0.2,
                clearcoat: 1,
                flatShading: true,
                emissive: "#2a1650",
                emissiveIntensity: 0.4,
            }),
        }),
        []
    );
    useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

    useFrame((_, delta) => {
        LADDER.forEach((id, i) => {
            const g = daises.current[i];
            if (!g) return;
            const lift = id === opponent && modeKind === "bot" ? 0.06 : hovered === id ? 0.03 : 0;
            g.position.y += (TOP + lift - g.position.y) * Math.min(1, delta * 6);
        });
    });

    const offsetX = (i: number) => (i - (LADDER.length - 1) / 2) * SPACING;
    const hoveredUnlocked = hovered ? isUnlocked(hovered, beaten) : false;
    const promptFor = () => {
        if (!hovered) return "";
        const def = OPPONENTS[hovered];
        if (!hoveredUnlocked) {
            const before = previousOnLadder(hovered)!;
            return <GemPrompt accent="red" keyLabel={null} action={`Beat ${OPPONENTS[before].name} to unlock`} />;
        }
        if (hovered === opponent && modeKind === "bot") {
            return <GemPrompt accent="gold" keyLabel={null} action={`${def.name} (playing you)`} />;
        }
        return <GemPrompt accent="gold" action={`Play ${def.name} · ${def.difficulty}`} />;
    };

    return (
        <group position={OPPONENT_ALTAR_POSITION} rotation={[0, FACING, 0]}>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.slab}>
                <boxGeometry args={[1.42, 0.08, 0.42]} />
            </mesh>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.gold}>
                <boxGeometry args={[1.45, 0.018, 0.45]} />
            </mesh>
            <mesh position={[0, (TOP - 0.08) / 2, 0]} material={materials.slab}>
                <cylinderGeometry args={[0.12, 0.3, TOP - 0.08, 7]} />
            </mesh>
            <mesh position={[0, 0.03, 0]} material={materials.gold}>
                <cylinderGeometry args={[0.38, 0.42, 0.06, 7]} />
            </mesh>
            <Text
                font={DISPLAY_FONT}
                position={[0, TOP + 0.62, 0]}
                fontSize={0.075}
                letterSpacing={0.22}
                color="#e9c77a"
                anchorX="center"
                anchorY="middle"
            >
                CHOOSE YOUR OPPONENT
            </Text>

            {LADDER.map((id, i) => {
                const def = OPPONENTS[id];
                const open = isUnlocked(id, beaten);
                const chosen = id === opponent && modeKind === "bot";
                const record = records[id];
                return (
                    <group key={id}>
                        <group
                            ref={(g) => {
                                daises.current[i] = g;
                            }}
                            position={[offsetX(i), TOP, 0]}
                        >
                            <mesh position={[0, 0.01, 0]} material={materials.gold}>
                                <cylinderGeometry args={[0.1, 0.11, 0.02, 24]} />
                            </mesh>
                            {!open ? (
                                <Shadow material={materials.shadow} />
                            ) : def.body ? (
                                <group position={[0, 0.02, 0]} rotation={[0, Math.PI, 0]}>
                                    <TravelerFigure
                                        character={def.body.character}
                                        color={def.body.color}
                                        height={FIGURE_HEIGHT * (id === "king" ? 0.7 : 1)}
                                    />
                                </group>
                            ) : (
                                <VoidToken gold={materials.gold} />
                            )}
                            {chosen && (
                                <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                    <ringGeometry args={[0.115, 0.13, 32]} />
                                    <meshBasicMaterial color="#ffe2a0" toneMapped={false} />
                                </mesh>
                            )}
                        </group>
                        <Text
                            position={[offsetX(i), TOP + 0.005, 0.2]}
                            rotation={[-Math.PI / 2 + 0.5, 0, 0]}
                            fontSize={0.03}
                            maxWidth={SPACING * 0.95}
                            textAlign="center"
                            color={chosen ? "#ffe2a0" : open ? "#a99cc8" : "#5a5070"}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {`${open ? def.name.toUpperCase() : "???"}\n${def.difficulty.toUpperCase()}${
                                open && record ? `\n${record.wins}W ${record.losses}L` : ""
                            }`}
                        </Text>
                    </group>
                );
            })}

            <group ref={targets}>
                {LADDER.map((id, i) => (
                    <mesh key={id} visible={false} userData={{ bot: id }} position={[offsetX(i), TOP + 0.18, 0]}>
                        <boxGeometry args={[SPACING, 0.38, 0.3]} />
                    </mesh>
                ))}
            </group>
            <InteractionRaycaster
                target={targets}
                config={{
                    maxDistance: 4,
                    includeChildren: true,
                    rayOrigin: "center",
                    triggerActions: [
                        { type: "click", cooldown: 300 },
                        { type: "keypress", key: "e", cooldown: 300 },
                    ],
                }}
                callbacks={{
                    onRayStay: (hit) => {
                        const id = hit.object.userData.bot as BotId | undefined;
                        if (id && id !== hovered) {
                            setHovered(id);
                            playSound("ui-hover");
                        }
                    },
                    onRayExit: () => setHovered(null),
                    onTrigger: () => hovered && cosmicControl.current?.chooseOpponent(hovered),
                }}
                visual={{
                    prompt: {
                        content: promptFor(),
                        offset: [0, TOP + 0.55, 0],
                        visible: Boolean(hovered),
                        distanceScale: true,
                    },
                }}
            />
            <pointLight position={[0, TOP + 0.7, 0.4]} intensity={2.5} distance={3} decay={2} color="#c9b2ff" />
        </group>
    );
};
