import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { InteractionRaycaster } from "../../core/InteractionRaycaster";
import { GemPrompt } from "../../ui/GemPrompt";
import { playSound } from "../../../audio/soundManager";
import { CHIP_DESIGNS, ChipDesignId, getChipLook, getGlowTexture } from "./chipDesigns";
import { useCosmicStore } from "./cosmicStore";
import { ALTAR_POSITION } from "./cosmicLayout";

// A floating slab to your left with every chip you could play, each
// turning slowly on a thread of light. Look at one and press E to take it
// up; your chips on the board change with it.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TOP = 1.0; // slab top
const SPACING = 0.19;
const DISPLAY_SCALE = 1.7;
// Face the spot where you stand to play.
const FACING = Math.atan2(0 - ALTAR_POSITION[0], 2.4 - ALTAR_POSITION[2]);

export const ChipAltar: React.FC = () => {
    const design = useCosmicStore((s) => s.design);
    const [hovered, setHovered] = useState<ChipDesignId | null>(null);
    const chips = useRef<(THREE.Group | null)[]>([]);
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
            thread: new THREE.MeshBasicMaterial({
                color: "#ffe2a0",
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            }),
        }),
        []
    );
    const halos = useMemo(
        () =>
            CHIP_DESIGNS.map(
                (d) =>
                    new THREE.SpriteMaterial({
                        map: getGlowTexture(),
                        color: d.glow,
                        transparent: true,
                        opacity: 0.8,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        toneMapped: false,
                    })
            ),
        []
    );
    useEffect(
        () => () => {
            Object.values(materials).forEach((m) => m.dispose());
            halos.forEach((m) => m.dispose());
        },
        [materials, halos]
    );

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        CHIP_DESIGNS.forEach((d, i) => {
            const g = chips.current[i];
            if (!g) return;
            const chosen = d.id === design;
            const lift = chosen ? 0.12 : hovered === d.id ? 0.06 : 0;
            g.position.y += (TOP + 0.2 + lift + Math.sin(t * 1.4 + i) * 0.01 - g.position.y) * Math.min(1, delta * 6);
            g.rotation.y = t * (chosen ? 1.2 : 0.4) + i;
            const halo = g.children[g.children.length - 1] as THREE.Sprite;
            halo.visible = chosen || hovered === d.id;
            halo.scale.setScalar(chosen ? 0.42 : 0.3);
        });
    });

    const choose = (id: ChipDesignId) => {
        const store = useCosmicStore.getState();
        if (store.design === id) return;
        store.setDesign(id);
        const info = CHIP_DESIGNS.find((d) => d.id === id)!;
        store.say(info.remark);
        playSound("c4-chip-select");
    };

    const hoveredInfo = CHIP_DESIGNS.find((d) => d.id === hovered);
    const offsetX = (i: number) => (i - (CHIP_DESIGNS.length - 1) / 2) * SPACING;

    return (
        <group position={ALTAR_POSITION} rotation={[0, FACING, 0]}>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.slab}>
                <boxGeometry args={[1.32, 0.08, 0.42]} />
            </mesh>
            <mesh position={[0, TOP - 0.04, 0]} material={materials.gold}>
                <boxGeometry args={[1.35, 0.018, 0.45]} />
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
                CHOOSE YOUR STONE
            </Text>

            {CHIP_DESIGNS.map((d, i) => {
                const look = getChipLook(d.id);
                return (
                    <group key={d.id}>
                        {/* The thread of light it turns on */}
                        <mesh position={[offsetX(i), TOP + 0.09, 0]} material={materials.thread}>
                            <cylinderGeometry args={[0.003, 0.003, 0.18, 4]} />
                        </mesh>
                        <group
                            ref={(g) => {
                                chips.current[i] = g;
                            }}
                            position={[offsetX(i), TOP + 0.2, 0]}
                            scale={DISPLAY_SCALE}
                        >
                            <mesh geometry={look.geometry} material={look.material} />
                            {look.core && <mesh geometry={look.core.geometry} material={look.core.material} />}
                            <sprite material={halos[i]} />
                        </group>
                        <Text
                            position={[offsetX(i), TOP + 0.005, 0.2]}
                            rotation={[-Math.PI / 2 + 0.5, 0, 0]}
                            fontSize={0.028}
                            maxWidth={SPACING * 0.95}
                            textAlign="center"
                            color={d.id === design ? "#ffe2a0" : "#a99cc8"}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {d.name.toUpperCase()}
                        </Text>
                    </group>
                );
            })}

            <group ref={targets}>
                {CHIP_DESIGNS.map((d, i) => (
                    <mesh key={d.id} visible={false} userData={{ design: d.id }} position={[offsetX(i), TOP + 0.24, 0]}>
                        <boxGeometry args={[SPACING, 0.42, 0.3]} />
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
                        const id = hit.object.userData.design as ChipDesignId | undefined;
                        if (id && id !== hovered) {
                            setHovered(id);
                            playSound("ui-hover");
                        }
                    },
                    onRayExit: () => setHovered(null),
                    onTrigger: () => hovered && choose(hovered),
                }}
                visual={{
                    prompt: {
                        content: hoveredInfo ? (
                            hoveredInfo.id === design ? (
                                <GemPrompt accent="gold" keyLabel={null} action={`${hoveredInfo.name} (in hand)`} />
                            ) : (
                                <GemPrompt accent="gold" action={`Take up ${hoveredInfo.name}`} />
                            )
                        ) : (
                            ""
                        ),
                        offset: [0, TOP + 0.55, 0],
                        visible: Boolean(hoveredInfo),
                        distanceScale: true,
                    },
                }}
            />
            <pointLight position={[0, TOP + 0.7, 0.4]} intensity={2.5} distance={3} decay={2} color="#c9b2ff" />
        </group>
    );
};
