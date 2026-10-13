import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { ProjectStrand, STRAND_HEIGHT } from "../projects/ProjectStrand";
import {
    CATEGORY_COLORS,
    LAB_PROJECTS,
    familiesOf,
    familyOf,
} from "../projects/projectDna";
import { useProjectStore } from "../projects/projectStore";
import { BUTTON_TRAVEL_MS, useDnaFilterStore } from "../projects/dnaFilterStore";
import { DnaConsole } from "../projects/DnaConsole";
import { useSceneStore } from "../../stores/sceneStore";
import { playSound } from "../../audio/soundManager";
import { detectIsMobile } from "../../utils/deviceDetection";
import { GemPrompt } from "../ui/GemPrompt";
import { isWorldUnfocused } from "../../utils/worldFocus";

interface ProjectsRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

const RING_RADIUS = 7.1;
const DOOR_ANGLE = Math.PI / 2; // +Z in (cos, sin) space
const DOOR_GAP = 0.5; // radians kept clear around the door (south, +Z)
const BACK_ANGLE = DOOR_ANGLE + Math.PI; // back center, opposite the door
// Cards only appear once you walk up to a strand, not from across the room.
const REACH = 3;
const BUTTON_REACH = 3.2;

// Ring physics (see the simulation below). Units: meters along the ring,
// seconds.
const LANE_GRAVITY = 7; // downhill pull toward the back center
const ROLLING_FRICTION = 0.6; // per second
const LANDING_BOUNCE = 0.18; // fraction of impact speed bounced back
const GROW_RATE = 2.2; // how fast a returning helix claims its space (per s)
const FREEFALL_GRAVITY = 9.8; // the floor gives way under a hidden helix
const FALL_OUT_DEPTH = 9; // stop drawing it once it's this far down
const LIFT_STIFFNESS = 34; // rising back into place when shown again
const LIFT_DAMPING = 8;
const SINK_DEPTH = 3.6; // where a re-shown helix rises from

// The software lab: every project is a double helix on a ring around the
// Project DNA console. Rung colors = the stack. Switching a tech family off
// at the console swings the helixes that no longer have a lit color around
// to the back of the ring, where they sink into the floor; the rest
// re-space themselves.
export const ProjectsRoom: React.FC<ProjectsRoomProps> = ({ width, height, depth }) => {
    const camera = useThree((state) => state.camera);
    const aimedId = useProjectStore((s) => s.aimedId);
    const enabled = useDnaFilterStore((s) => s.enabled);
    const isMobile = useMemo(() => detectIsMobile(), []);

    const slots = useMemo(
        () => LAB_PROJECTS.map((project) => ({ project, families: familiesOf(project) })),
        []
    );
    const count = slots.length;

    // Pylons: one instanced mesh for all bases, one for their glow rings.
    const { bases, rings } = useMemo(() => {
        const bases = new THREE.InstancedMesh(
            new THREE.CylinderGeometry(0.34, 0.42, 0.5, 6),
            new THREE.MeshStandardMaterial({ color: "#1b2030", roughness: 0.35, metalness: 0.8 }),
            slots.length
        );
        const rings = new THREE.InstancedMesh(
            new THREE.TorusGeometry(0.36, 0.018, 6, 36),
            new THREE.MeshBasicMaterial({ toneMapped: false }),
            slots.length
        );
        const white = new THREE.Color("#eef3ff");
        slots.forEach((_, i) => rings.setColorAt(i, white));
        // Their instances move every frame; without this, three culls the
        // whole batch using the bounding sphere of where they *started*,
        // which made pedestals vanish depending on where you looked.
        bases.frustumCulled = false;
        rings.frustumCulled = false;
        return { bases, rings };
    }, [slots]);
    useEffect(
        () => () => {
            [bases, rings].forEach((mesh) => {
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
                mesh.dispose();
            });
        },
        [bases, rings]
    );

    // ---- Ring physics: helixes stacked under gravity -----------------------
    // The ring is two lanes that both run "downhill" to the back center
    // (opposite the door), where they meet. Each helix takes up exactly
    // one spacing of ring and can never overlap its neighbours (hard
    // constraints, solved every step). With every family lit the ring is
    // exactly full. Hide some and the ones above fall down their lane under
    // gravity, land on the helix below with a small bump, and stack up
    // toward the back; the open space ends up by the door. A returning
    // helix grows into its place and gradually pushes the ones above it up.
    const half = Math.ceil(count / 2);
    const laneLength = (Math.PI - DOOR_GAP) * RING_RADIUS; // back center -> door edge
    const spacing = laneLength / half;

    // Lane 0 goes from the back toward the door counterclockwise-from-door
    // side, lane 1 the other way; ring order still starts at the door.
    const laneOf = (i: number) => (i < half ? 0 : 1);
    // 0 = the helix resting lowest (closest to the back) in its lane
    const orderInLane = (i: number) => (i < half ? half - 1 - i : i - half);
    // u = distance along the ring from the back center
    const angleAt = (lane: number, u: number) =>
        lane === 0 ? BACK_ANGLE - u / RING_RADIUS : BACK_ANGLE + u / RING_RADIUS;

    const visibleNow = useMemo(
        () => slots.map((slot) => [...slot.families].some((id) => enabled[id] !== false)),
        [slots, enabled]
    );

    const bodies = useRef(
        slots.map((_, i) => ({
            lane: laneOf(i),
            order: orderInLane(i),
            u: spacing / 2 + orderInLane(i) * spacing,
            v: 0, // along the lane, + is uphill (toward the door)
            presence: 1, // how much ring space it takes (grows in on return)
            lean: 0,
            visible: true,
            y: 0, // height offset: 0 on the ring, negative while falling/rising
            yVelocity: 0,
            tip: 0, // tumble while falling
        }))
    );

    useEffect(() => {
        let changed = false;
        bodies.current.forEach((body, i) => {
            const visible = visibleNow[i];
            if (visible === body.visible) return;
            changed = true;
            body.visible = visible;
            if (visible) {
                // Come back in project order, between whoever is below and
                // above right now, taking up no space at first.
                const mates = bodies.current
                    .filter((b) => b.lane === body.lane && b.visible && b !== body)
                    .sort((a, b) => a.order - b.order);
                const below = [...mates].reverse().find((b) => b.order < body.order);
                const above = mates.find((b) => b.order > body.order);
                body.u = below ? below.u : above ? above.u : spacing / 2;
                body.v = 0;
                body.presence = 0;
                body.y = Math.max(body.y, -SINK_DEPTH);
                body.yVelocity = 0;
            }
        });
        if (changed) playSound("lab-swing");
    }, [visibleNow]);

    const strandGroups = useRef<(THREE.Group | null)[]>([]);
    const matrix = useMemo(() => new THREE.Matrix4(), []);
    const ringRotation = useMemo(
        () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
        []
    );
    const scratch = useMemo(() => new THREE.Vector3(), []);
    const unitScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 1 / 30);
        const all = bodies.current;
        const SUBSTEPS = 4;
        const h = delta / SUBSTEPS;

        for (let lane = 0; lane < 2; lane++) {
            const chain = all
                .filter((b) => b.lane === lane && b.visible)
                .sort((a, b) => a.order - b.order);
            for (let step = 0; step < SUBSTEPS; step++) {
                // Gravity pulls every helix downhill (toward the back).
                chain.forEach((b) => {
                    b.presence = Math.min(1, b.presence + h * GROW_RATE);
                    b.v -= LANE_GRAVITY * h;
                    b.v *= 1 - ROLLING_FRICTION * h;
                    b.u += b.v * h;
                });
                // Floor at the back center: the lowest helix in each lane
                // stops half a spacing short, so the two lanes meet exactly.
                // Then each helix rests on the one below - never closer
                // than their combined half-widths.
                chain.forEach((b, k) => {
                    const below = k > 0 ? chain[k - 1] : null;
                    const halfWidth = (spacing / 2) * b.presence;
                    const minU = below
                        ? below.u + (spacing / 2) * below.presence + halfWidth
                        : halfWidth;
                    if (b.u < minU) {
                        b.u = minU;
                        const supportV = below ? below.v : 0;
                        if (b.v < supportV) {
                            // Land on it: inelastic, with a small bump.
                            b.v = supportV + (supportV - b.v) * LANDING_BOUNCE;
                        }
                    }
                });
                // Never past the door edge.
                for (let k = chain.length - 1; k >= 0; k--) {
                    const above = k < chain.length - 1 ? chain[k + 1] : null;
                    const maxU = above
                        ? above.u - (spacing / 2) * (above.presence + chain[k].presence)
                        : laneLength - (spacing / 2) * chain[k].presence;
                    if (chain[k].u > maxU) {
                        chain[k].u = maxU;
                        if (chain[k].v > 0) chain[k].v = 0;
                    }
                }
            }
        }

        all.forEach((b, i) => {
            if (!b.visible) {
                // The floor gives way: real freefall, accelerating, tipping
                // outward as it goes.
                if (b.y > -FALL_OUT_DEPTH) {
                    b.yVelocity -= FREEFALL_GRAVITY * delta;
                    b.y += b.yVelocity * delta;
                    b.tip += delta * (0.4 + Math.abs(b.yVelocity) * 0.09);
                }
            } else {
                // Rise back into the ring on a spring (slight overshoot).
                b.yVelocity += (LIFT_STIFFNESS * -b.y - LIFT_DAMPING * b.yVelocity) * delta;
                b.y = Math.min(0.15, b.y + b.yVelocity * delta);
                b.tip += (0 - b.tip) * Math.min(1, delta * 10);
            }
            // Lean into the motion, like a loaded bottle sliding
            const leanTarget = THREE.MathUtils.clamp(b.v * 0.06, -0.25, 0.25) * (b.lane === 0 ? -1 : 1);
            b.lean += (leanTarget - b.lean) * Math.min(1, delta * 8);

            const angle = angleAt(b.lane, b.u);
            const x = Math.cos(angle) * RING_RADIUS;
            const z = Math.sin(angle) * RING_RADIUS;
            const y = Math.min(b.y, 0.15);
            const group = strandGroups.current[i];
            if (group) {
                group.position.set(x, y, z);
                // Yaw to face the center first, then tip/lean around the
                // helix's own axes: tip = tumble outward as it falls,
                // lean = sideways along the ring while sliding.
                group.rotation.order = "YXZ";
                group.rotation.set(-b.tip, Math.atan2(-x, -z), b.lean);
                group.visible = b.y > -FALL_OUT_DEPTH + 0.1;
            }
            matrix.makeTranslation(x, y + 0.25, z);
            bases.setMatrixAt(i, matrix);
            matrix.compose(scratch.set(x, y + 0.51, z), ringRotation, unitScale);
            rings.setMatrixAt(i, matrix);
        });
        bases.instanceMatrix.needsUpdate = true;
        rings.instanceMatrix.needsUpdate = true;
    });

    // Aiming: console buttons first (they're closer), then strands.
    const hitMeshes = useRef<(THREE.Mesh | null)[]>([]);
    const buttonHits = useRef(new Set<THREE.Mesh>());
    const registerButton = useMemo(
        () => (mesh: THREE.Mesh | null) => {
            if (mesh) buttonHits.current.add(mesh);
        },
        []
    );
    const raycaster = useRef(new THREE.Raycaster());
    const frame = useRef(0);
    useFrame(() => {
        if (frame.current++ % 2) return;
        const { setAimed, openId } = useProjectStore.getState();
        const { setAimedButton } = useDnaFilterStore.getState();
        if (openId || isWorldUnfocused()) {
            setAimed(null);
            setAimedButton(null);
            return;
        }
        raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);

        raycaster.current.far = BUTTON_REACH;
        const buttons = [...buttonHits.current].filter((mesh) => mesh.parent);
        const buttonHit = raycaster.current.intersectObjects(buttons, false)[0];
        const buttonId = (buttonHit?.object.userData.buttonId as string | undefined) ?? null;
        setAimedButton(buttonId);
        if (buttonId) {
            setAimed(null);
            return;
        }

        raycaster.current.far = REACH;
        const targetsToHit = hitMeshes.current.filter(
            (mesh, i) => mesh && bodies.current[i].visible && bodies.current[i].y > -0.2
        ) as THREE.Mesh[];
        const hit = raycaster.current.intersectObjects(targetsToHit, false)[0];
        const id = (hit?.object.userData.projectId as string | undefined) ?? null;
        if (id && id !== useProjectStore.getState().aimedId) playSound("project-focus");
        setAimed(id);
    });

    useEffect(() => {
        const act = () => {
            if (useSceneStore.getState().isInteracting) return false;
            const { aimedButton, toggle, enabled, pressButton } = useDnaFilterStore.getState();
            if (aimedButton) {
                const familyId = aimedButton.split(":")[1];
                pressButton(aimedButton);
                // The switch flips when the cap bottoms out, not on the keypress.
                setTimeout(() => {
                    playSound(enabled[familyId] === false ? "lab-toggle-on" : "lab-toggle-off");
                    toggle(familyId);
                }, BUTTON_TRAVEL_MS);
                return true;
            }
            const { aimedId, openId, open } = useProjectStore.getState();
            if (!aimedId || openId) return false;
            open(aimedId);
            return true;
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat && act()) event.stopPropagation();
        };
        const onTap = () => {
            if (isMobile) act();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("click", onTap);
        window.addEventListener("virtualtap", onTap);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("click", onTap);
            window.removeEventListener("virtualtap", onTap);
            useProjectStore.getState().setAimed(null);
            useDnaFilterStore.getState().setAimedButton(null);
        };
    }, [isMobile]);

    const aimedIndex = slots.findIndex((slot) => slot.project.id === aimedId);
    const aimedSlot = aimedIndex >= 0 ? slots[aimedIndex] : null;
    const aimedAngle =
        aimedIndex >= 0
            ? angleAt(bodies.current[aimedIndex].lane, bodies.current[aimedIndex].u)
            : 0;


    return (
        <>
            {/* Light: cool and low, the strands are the light show */}
            <hemisphereLight intensity={0.35} color="#9fc4ff" groundColor="#120d24" />
            <pointLight position={[0, height - 0.6, 0]} intensity={6} distance={14} decay={1.6} color="#8fd8ff" />
            <pointLight position={[0, 1.2, 0]} intensity={2} distance={6} decay={2} color="#b07bff" />

            {/* Floor ring under the strands */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
                <ringGeometry args={[RING_RADIUS - 0.75, RING_RADIUS + 0.75, 96]} />
                <meshStandardMaterial color="#0d1018" roughness={0.18} metalness={0.9} />
            </mesh>
            {[RING_RADIUS - 0.75, RING_RADIUS + 0.75, 2.4].map((r) => (
                <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <ringGeometry args={[r - 0.015, r + 0.015, 128]} />
                    <meshBasicMaterial color="#59b4ff" toneMapped={false} transparent opacity={0.8} />
                </mesh>
            ))}

            {/* Wall light strips */}
            {[0.25, height - 0.6].map((y) =>
                [
                    { position: [0, y, -depth / 2 + 0.08], size: [width - 0.4, 0.05, 0.02] },
                    { position: [0, y, depth / 2 - 0.08], size: [width - 0.4, 0.05, 0.02] },
                    { position: [-width / 2 + 0.08, y, 0], size: [0.02, 0.05, depth - 0.4] },
                    { position: [width / 2 - 0.08, y, 0], size: [0.02, 0.05, depth - 0.4] },
                ].map((strip, i) => (
                    <mesh key={`${y}-${i}`} position={strip.position as [number, number, number]}>
                        <boxGeometry args={strip.size as [number, number, number]} />
                        <meshBasicMaterial
                            color={y < 1 ? "#59b4ff" : "#b07bff"}
                            toneMapped={false}
                        />
                    </mesh>
                ))
            )}

            {/* Project DNA console: toggles for each tech family */}
            <DnaConsole registerHit={registerButton} />

            <primitive object={bases} />
            <primitive object={rings} />

            {slots.map((slot, i) => (
                <group
                    key={slot.project.id}
                    ref={(group) => {
                        strandGroups.current[i] = group;
                    }}
                >
                    <ProjectStrand
                        project={slot.project}
                        position={[0, 0, 0]}
                        facing={0}
                        aimed={slot.project.id === aimedId}
                        enabledFamilies={enabled}
                    />
                    <mesh
                        ref={(mesh) => {
                            hitMeshes.current[i] = mesh;
                        }}
                        position={[0, 0.55 + STRAND_HEIGHT / 2, 0]}
                        userData={{ projectId: slot.project.id }}
                        visible={false}
                    >
                        <cylinderGeometry args={[0.38, 0.38, STRAND_HEIGHT + 0.6, 8]} />
                    </mesh>
                </group>
            ))}

            {/* Holo card for the aimed project */}
            {aimedSlot && (
                <Html
                    position={[
                        Math.cos(aimedAngle) * RING_RADIUS * 0.86,
                        1.25,
                        Math.sin(aimedAngle) * RING_RADIUS * 0.86,
                    ]}
                    center
                    zIndexRange={[20, 0]}
                    style={{ pointerEvents: "none" }}
                >
                    <div className="gem gem--blue" style={{ width: 300, padding: "12px 14px" }}>
                        <div className="gem-label" style={{ color: CATEGORY_COLORS[aimedSlot.project.category] }}>
                            {aimedSlot.project.category}
                            {aimedSlot.project.date ? ` · ${aimedSlot.project.date.slice(0, 7)}` : ""}
                        </div>
                        <div className="gem-display" style={{ fontSize: 20, lineHeight: 1.15, margin: "2px 0 6px" }}>
                            {aimedSlot.project.title}
                        </div>
                        <div
                            style={{
                                fontSize: 12.5,
                                lineHeight: 1.45,
                                color: "var(--gem-ink-dim)",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {aimedSlot.project.description}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                            {aimedSlot.project.tech.slice(0, 6).map((tech) => (
                                <span key={tech} className="gem-chip" style={{ "--gem-accent": familyOf(tech).color } as React.CSSProperties}>
                                    {tech}
                                </span>
                            ))}
                        </div>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                            <GemPrompt
                                accent="blue"
                                keyLabel={isMobile ? null : "E"}
                                action={isMobile ? "Tap to open" : "Open"}
                            />
                        </div>
                    </div>
                </Html>
            )}
        </>
    );
};
