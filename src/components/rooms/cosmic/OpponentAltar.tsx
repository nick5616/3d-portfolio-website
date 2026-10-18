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
import { characterAt } from "../../../multiplayer/characters";

// A slab to your right with everyone who'll play you, easiest first, each
// on a small dais. Look at one and press E to have them sit down. Each is
// a shadow until you've beaten the one before. Last comes Anyone: join
// whoever in the room has a seat open, or open yours for anyone to take.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TOP = 1.0;
const SPACING = 0.32;
const FIGURE_HEIGHT = 0.26;
const SLAB_WIDTH = 1.75;
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

// Anyone: a seat of light, for playing whoever else is in the room.
const AnyoneToken: React.FC<{ material: THREE.Material; open: boolean }> = ({ material, open }) => {
    const ring = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (ring.current) {
            ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.9) * 0.3;
            ring.current.scale.setScalar(1 + (open ? Math.sin(t * 5) * 0.12 : 0));
        }
    });
    return (
        <group position={[0, 0.13, 0]}>
            <mesh material={material}>
                <sphereGeometry args={[0.035, 16, 12]} />
            </mesh>
            <mesh ref={ring} material={material}>
                <torusGeometry args={[0.075, 0.005, 8, 40]} />
            </mesh>
        </group>
    );
};

type Choice = BotId | "anyone";
const CHOICES: Choice[] = [...LADDER, "anyone"];

export const OpponentAltar: React.FC = () => {
    const opponent = useCosmicStore((s) => s.opponent);
    const beaten = useCosmicStore((s) => s.beaten);
    const records = useCosmicStore((s) => s.records);
    const modeKind = useCosmicStore((s) => s.mode.kind);
    const tables = useCosmicStore((s) => s.tables);
    const [hovered, setHovered] = useState<Choice | null>(null);
    // Other visitors with a seat open, first come first served.
    const openPeers = Object.keys(tables)
        .sort()
        .filter((id) => tables[id].open);
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
            light: new THREE.MeshBasicMaterial({ color: "#f3efe6", toneMapped: false }),
        }),
        []
    );
    useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

    const isChosen = (id: Choice) =>
        id === "anyone" ? modeKind === "open" || modeKind === "versus" : id === opponent && modeKind === "bot";

    useFrame((_, delta) => {
        CHOICES.forEach((id, i) => {
            const g = daises.current[i];
            if (!g) return;
            const lift = isChosen(id) ? 0.06 : hovered === id ? 0.03 : 0;
            g.position.y += (TOP + lift - g.position.y) * Math.min(1, delta * 6);
        });
    });

    const offsetX = (i: number) => (i - (CHOICES.length - 1) / 2) * SPACING;
    const hoveredUnlocked = hovered && hovered !== "anyone" ? isUnlocked(hovered, beaten) : true;
    const promptFor = () => {
        if (!hovered) return "";
        if (hovered === "anyone") {
            if (modeKind === "open") return <GemPrompt accent="red" action="Close your open seat" />;
            if (openPeers.length) {
                const name = characterAt(tables[openPeers[0]].character).name;
                return <GemPrompt accent="gold" action={`Join ${name}'s table`} />;
            }
            return <GemPrompt accent="gold" action="Open your seat to anyone" />;
        }
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
                <boxGeometry args={[SLAB_WIDTH, 0.08, 0.42]} />
            </mesh>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.gold}>
                <boxGeometry args={[SLAB_WIDTH + 0.03, 0.018, 0.45]} />
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

            {/* Last on the slab: anyone else in the room. */}
            <group>
                <group
                    ref={(g) => {
                        daises.current[LADDER.length] = g;
                    }}
                    position={[offsetX(LADDER.length), TOP, 0]}
                >
                    <mesh position={[0, 0.01, 0]} material={materials.gold}>
                        <cylinderGeometry args={[0.1, 0.11, 0.02, 24]} />
                    </mesh>
                    <AnyoneToken material={materials.light} open={modeKind === "open" || openPeers.length > 0} />
                    {isChosen("anyone") && (
                        <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <ringGeometry args={[0.115, 0.13, 32]} />
                            <meshBasicMaterial color="#ffe2a0" toneMapped={false} />
                        </mesh>
                    )}
                </group>
                <Text
                    position={[offsetX(LADDER.length), TOP + 0.005, 0.2]}
                    rotation={[-Math.PI / 2 + 0.5, 0, 0]}
                    fontSize={0.03}
                    maxWidth={SPACING * 0.95}
                    textAlign="center"
                    color={isChosen("anyone") || openPeers.length ? "#ffe2a0" : "#a99cc8"}
                    anchorX="center"
                    anchorY="middle"
                >
                    {`ANYONE\n${
                        modeKind === "open" ? "WAITING" : openPeers.length ? `${openPeers.length} WAITING` : "PEOPLE"
                    }`}
                </Text>
            </group>

            <group ref={targets}>
                {CHOICES.map((id, i) => (
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
                        const id = hit.object.userData.bot as Choice | undefined;
                        if (id && id !== hovered) {
                            setHovered(id);
                            playSound("ui-hover");
                        }
                    },
                    onRayExit: () => setHovered(null),
                    onTrigger: () => {
                        if (!hovered) return;
                        if (hovered === "anyone") cosmicControl.current?.playAnyone();
                        else cosmicControl.current?.chooseOpponent(hovered);
                    },
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
