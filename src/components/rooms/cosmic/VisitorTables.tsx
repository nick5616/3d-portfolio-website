import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { selfId } from "trystero";
import { InteractionRaycaster } from "../../core/InteractionRaycaster";
import { GemPrompt } from "../../ui/GemPrompt";
import { playSound } from "../../../audio/soundManager";
import { characterAt } from "../../../multiplayer/characters";
import { useCosmicStore } from "./cosmicStore";
import type { TableState } from "./cosmicSync";
import { OPPONENTS } from "./opponents";
import { TABLES_POSITION, facePlaySpot } from "./cosmicLayout";
import { cosmicControl } from "./cosmicControl";
import { TravelerFigure } from "./TravelerFigure";

// Behind you on the right: a stand with everyone else in the room, each
// as their own traveler on a little dais. Look at one and press E to watch
// their game on your board; look at the plaque under them to challenge
// them (or to answer their challenge).

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TOP = 1.0;
const SPACING = 0.3;
const MAX_SHOWN = 6;
const FIGURE_HEIGHT = 0.28;
const FACING = facePlaySpot(TABLES_POSITION);

type Target = { peer: string; action: "watch" | "challenge" };

const statusOf = (t: TableState) => {
    if (t.watching) return "watching\na game";
    if (t.open) return "seat open\nanyone can join";
    const against =
        t.opponent.kind === "bot"
            ? OPPONENTS[t.opponent.bot].name
            : t.opponent.peer === selfId
              ? "you"
              : characterAt(t.opponent.character).name;
    const state =
        t.result === null ? (t.moves.length ? `move ${t.moves.length}` : "starting") : t.result === 1 ? "won" : t.result === 2 ? "lost" : "draw";
    return `vs ${against}\n${state}`;
};

export const VisitorTables: React.FC = () => {
    const tables = useCosmicStore((s) => s.tables);
    const invites = useCosmicStore((s) => s.invites);
    const outgoing = useCosmicStore((s) => s.outgoing);
    const mode = useCosmicStore((s) => s.mode);
    const [hovered, setHovered] = useState<Target | null>(null);
    const targets = useRef<THREE.Group>(null);
    const beacons = useRef<(THREE.Mesh | null)[]>([]);

    const peers = Object.keys(tables).sort().slice(0, MAX_SHOWN);
    const width = Math.max(1.0, peers.length * SPACING + 0.2);
    const offsetX = (i: number) => (i - (peers.length - 1) / 2) * SPACING;

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
            beacon: new THREE.MeshBasicMaterial({
                color: "#ffe2a0",
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            }),
        }),
        []
    );
    useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

    // Someone challenging you: their ring pulses.
    useFrame(({ clock }) => {
        const pulse = 0.5 + Math.sin(clock.elapsedTime * 5) * 0.5;
        beacons.current.forEach((b) => {
            if (b) b.scale.setScalar(1 + pulse * 0.25);
        });
        materials.beacon.opacity = 0.4 + pulse * 0.5;
    });

    const watching = mode.kind === "watch" ? mode.peer : null;
    const playing = mode.kind === "versus" ? mode.peer : null;

    const promptFor = (target: Target | null) => {
        if (!target || !tables[target.peer]) return "";
        const name = characterAt(tables[target.peer].character).name;
        if (target.action === "watch") {
            if (watching === target.peer) return <GemPrompt accent="gold" action="Stop watching" />;
            return <GemPrompt accent="gold" action={`Watch ${name}'s game`} />;
        }
        if (playing === target.peer) return <GemPrompt accent="gold" keyLabel={null} action={`Playing ${name}`} />;
        if (invites[target.peer]) return <GemPrompt accent="gold" action={`Accept ${name}'s challenge`} />;
        if (tables[target.peer].open) return <GemPrompt accent="gold" action={`Join ${name}'s table`} />;
        if (outgoing?.peer === target.peer) return <GemPrompt accent="red" action="Take back your challenge" />;
        return <GemPrompt accent="gold" action={`Challenge ${name}`} />;
    };

    const trigger = (target: Target) => {
        const control = cosmicControl.current;
        if (!control) return;
        if (target.action === "watch") return control.watch(target.peer);
        if (playing === target.peer) return;
        if (invites[target.peer]) return control.accept(target.peer);
        if (tables[target.peer]?.open) return control.join(target.peer);
        control.challenge(target.peer);
    };

    return (
        <group position={TABLES_POSITION} rotation={[0, FACING, 0]}>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.slab}>
                <boxGeometry args={[width, 0.08, 0.42]} />
            </mesh>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.gold}>
                <boxGeometry args={[width + 0.03, 0.018, 0.45]} />
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
                OTHER TABLES
            </Text>
            {peers.length === 0 && (
                <Text
                    font={DISPLAY_FONT}
                    position={[0, TOP + 0.2, 0]}
                    fontSize={0.045}
                    maxWidth={0.9}
                    textAlign="center"
                    color="#8a7fa8"
                    anchorX="center"
                    anchorY="middle"
                >
                    No one else is here. When someone comes, they'll stand here: watch their game, or challenge them.
                </Text>
            )}

            {peers.map((peer, i) => {
                const t = tables[peer];
                const lit = watching === peer || playing === peer;
                return (
                    <group key={peer} position={[offsetX(i), TOP, 0]}>
                        <mesh position={[0, 0.01, 0]} material={materials.gold}>
                            <cylinderGeometry args={[0.1, 0.11, 0.02, 24]} />
                        </mesh>
                        <group position={[0, 0.02, 0]} rotation={[0, Math.PI, 0]}>
                            <TravelerFigure
                                key={`${t.character}:${t.look}`}
                                character={t.character}
                                color={t.look}
                                height={FIGURE_HEIGHT * (characterAt(t.character).fairy ? 0.7 : 1)}
                            />
                        </group>
                        {(lit || invites[peer]) && (
                            <mesh
                                ref={(m) => {
                                    beacons.current[i] = invites[peer] ? m : null;
                                }}
                                position={[0, 0.022, 0]}
                                rotation={[-Math.PI / 2, 0, 0]}
                                material={materials.beacon}
                            >
                                <ringGeometry args={[0.115, 0.13, 32]} />
                            </mesh>
                        )}
                        <Text
                            position={[0, 0.005, 0.2]}
                            rotation={[-Math.PI / 2 + 0.5, 0, 0]}
                            fontSize={0.026}
                            maxWidth={SPACING * 0.95}
                            textAlign="center"
                            color={lit ? "#ffe2a0" : "#a99cc8"}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {`${characterAt(t.character).name.toUpperCase()}\n${statusOf(t)}`}
                        </Text>
                        {/* The plaque: challenge */}
                        <mesh position={[0, -0.06, 0.215]} material={materials.gold}>
                            <boxGeometry args={[SPACING * 0.8, 0.07, 0.01]} />
                        </mesh>
                        <Text
                            font={DISPLAY_FONT}
                            position={[0, -0.06, 0.222]}
                            fontSize={0.026}
                            letterSpacing={0.12}
                            color="#1a0f05"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {playing === peer
                                ? "PLAYING"
                                : invites[peer]
                                  ? "ACCEPT"
                                  : t.open
                                    ? "JOIN"
                                    : outgoing?.peer === peer
                                      ? "SENT"
                                      : "CHALLENGE"}
                        </Text>
                    </group>
                );
            })}

            <group ref={targets}>
                {peers.map((peer, i) => (
                    <group key={peer}>
                        <mesh visible={false} userData={{ peer, action: "watch" }} position={[offsetX(i), TOP + 0.18, 0]}>
                            <boxGeometry args={[SPACING, 0.36, 0.3]} />
                        </mesh>
                        <mesh visible={false} userData={{ peer, action: "challenge" }} position={[offsetX(i), TOP - 0.06, 0.24]}>
                            <boxGeometry args={[SPACING * 0.85, 0.1, 0.06]} />
                        </mesh>
                    </group>
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
                        const { peer, action } = hit.object.userData as Partial<Target>;
                        if (!peer || !action) return;
                        if (peer !== hovered?.peer || action !== hovered?.action) {
                            setHovered({ peer, action });
                            playSound("ui-hover");
                        }
                    },
                    onRayExit: () => setHovered(null),
                    onTrigger: () => hovered && trigger(hovered),
                }}
                visual={{
                    prompt: {
                        content: promptFor(hovered),
                        offset: [0, TOP + 0.55, 0],
                        visible: Boolean(hovered && tables[hovered.peer]),
                        distanceScale: true,
                    },
                }}
            />
            <pointLight position={[0, TOP + 0.7, 0.4]} intensity={2.5} distance={3} decay={2} color="#c9b2ff" />
        </group>
    );
};
