import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CoefficientCombineRule, CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { GemPrompt } from "../../ui/GemPrompt";
import { useAimTargets } from "../../core/useAimTargets";
import { useAchievementStore } from "../../../stores/achievementStore";
import { playSound } from "../../../audio/soundManager";
import {
    SOUNDCLOUD_PROFILE,
    Track,
    closeStudioMusic,
    nextTrack,
    openStudioMusic,
    playTrack,
    previousTrack,
    togglePlayback,
    useStudioMusic,
} from "./soundcloud";
import { Signal, StudioSignal } from "./studioSignal";
import { LedWall, PALETTES, PALETTE_NAMES, WALL_MODES } from "./ledWall";
import { MODES_3D, MODE_NAMES, Visuals3D } from "./Visuals3D";
import { StageShow } from "./StageShow";

// Bird Dog's studio. Half recording studio, half DJ booth: foam on the
// walls, a production desk and a couch to one side, a wall of records to
// the other, and at the far end a booth on a riser in front of an LED wall.
// The music is Bird Dog's own, streamed from SoundCloud; the LED wall runs
// Bird Dog's song-visualizer, and the same visuals float over the stage in
// the middle of the room. Walking in starts the first track.

const HALF_X = 8;
const HALF_Z = 7;
const HEIGHT = 7;
// The floating visuals hang out over the dance floor, sized and turned for
// the person at the decks (who's who it's really for).
const STAGE: [number, number, number] = [0, 3.3, 0.8];
const BOOTH_Z = -4.55;
const RISER = 0.3;
// The stage: a low riser from the LED wall out to just past the decks,
// reached by a ramp at each front corner beside the desk. (The player
// capsule can't climb a step, and ramps need frictionless colliders - see
// the atrium stair.)
const STAGE_FRONT = -4.2;
const STAGE_HALF_X = 4.2;
const DESK_HALF: [number, number, number] = [1.7, 0.45, 0.45];
const RAMP_RUN = 0.9;
const RAMP_WIDTH = 1.8;
const RAMP_X = 3.0; // centre of each ramp, either side of the desk
const RAMP_ANGLE = Math.atan2(RISER, RAMP_RUN);
const RAMP_LENGTH = Math.hypot(RISER, RAMP_RUN) + 0.12;
const MIXER_WIDTH = 0.72;
const DECK_X = MIXER_WIDTH / 2 + 0.475 + 0.01; // decks butt up against the mixer
// Turn the laptop in toward where the DJ stands (centre of the desk, a
// step back from it): its screen faces local +Z.
const LAPTOP_YAW = Math.atan2(-2.0, -0.85);
const RECORD_COLUMNS = 4;
const RECORD_ROWS = 4;

// --- Record sleeves ------------------------------------------------------------

const sleeveColors = ["#ff2975", "#00ffdd", "#f222ff", "#ffd700", "#00bbf9", "#05ffa1"];

const Sleeve: React.FC<{ track: Track; playing: boolean; bindRef: (o: THREE.Object3D | null) => void }> = ({
    track,
    playing,
    bindRef,
}) => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    useEffect(() => {
        if (!track.artwork) return;
        let alive = true;
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
            track.artwork,
            (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                if (alive) setTexture(t);
                else t.dispose();
            },
            undefined,
            () => {}
        );
        return () => {
            alive = false;
        };
    }, [track.artwork]);
    useEffect(() => () => texture?.dispose(), [texture]);
    const color = sleeveColors[track.index % sleeveColors.length];
    return (
        <group>
            <mesh ref={bindRef}>
                <boxGeometry args={[0.62, 0.62, 0.03]} />
                <meshStandardMaterial color={texture ? "#ffffff" : color} map={texture} roughness={0.5} />
            </mesh>
            {/* The record peeking out of the sleeve */}
            <mesh position={[0.12, 0.08, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.29, 0.29, 0.01, 40]} />
                <meshStandardMaterial color="#0c0c10" roughness={0.3} metalness={0.4} />
            </mesh>
            {playing && (
                <mesh position={[0, 0, -0.03]}>
                    <planeGeometry args={[0.8, 0.8]} />
                    <meshBasicMaterial color="#ff2975" toneMapped={false} />
                </mesh>
            )}
            <Text position={[0, -0.42, 0.02]} fontSize={0.055} maxWidth={0.7} textAlign="center" color={playing ? "#ffd1e8" : "#d8cff0"} anchorX="center" anchorY="top">
                {track.title}
            </Text>
        </group>
    );
};

// --- Turntable -------------------------------------------------------------------

const Turntable: React.FC<{ position: [number, number, number]; spinning: boolean; label: string; bindRef?: (o: THREE.Object3D | null) => void }> = ({
    position,
    spinning,
    label,
    bindRef,
}) => {
    const platter = useRef<THREE.Group>(null);
    const speed = useRef(0);
    useFrame((_, delta) => {
        speed.current += ((spinning ? 3.5 : 0) - speed.current) * Math.min(1, delta * 2);
        if (platter.current) platter.current.rotation.y -= speed.current * delta;
    });
    return (
        <group position={position}>
            <mesh position={[0, 0.04, 0]} ref={bindRef}>
                <boxGeometry args={[0.95, 0.08, 0.75]} />
                <meshStandardMaterial color="#1c1c22" roughness={0.4} metalness={0.5} />
            </mesh>
            <group ref={platter} position={[-0.08, 0.1, 0]}>
                <mesh>
                    <cylinderGeometry args={[0.31, 0.31, 0.03, 48]} />
                    <meshStandardMaterial color="#0b0b0e" roughness={0.25} metalness={0.3} />
                </mesh>
                <mesh position={[0, 0.017, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.004, 32]} />
                    <meshStandardMaterial color={label} emissive={label} emissiveIntensity={0.4} />
                </mesh>
                <mesh position={[0.06, 0.02, 0]}>
                    <boxGeometry args={[0.03, 0.002, 0.01]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            </group>
            {/* Tonearm */}
            <mesh position={[0.32, 0.13, 0.2]} rotation={[0, -0.5, 0]}>
                <boxGeometry args={[0.03, 0.02, 0.4]} />
                <meshStandardMaterial color="#c8c8d0" metalness={0.9} roughness={0.2} />
            </mesh>
        </group>
    );
};

// Flat labels on the gear read the right way up for the DJ, who stands on
// the -Z side looking toward +Z.
const DJ_LABEL: [number, number, number] = [-Math.PI / 2, 0, Math.PI];

const DeckButton: React.FC<{
    position: [number, number, number];
    radius: number;
    color: string;
    text: string;
    square?: boolean;
    bindRef: (o: THREE.Object3D | null) => void;
}> = ({ position, radius, color, text, square, bindRef }) => (
    <group position={position}>
        <mesh ref={bindRef}>
            {square ? <boxGeometry args={[radius * 2, 0.02, radius * 2]} /> : <cylinderGeometry args={[radius, radius, 0.02, 24]} />}
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
        <Text position={[0, 0.012, -radius - 0.03]} rotation={DJ_LABEL} fontSize={0.026} color="#d8d0e8" anchorX="center" anchorY="middle">
            {text}
        </Text>
    </group>
);

const MixerKnob: React.FC<{
    position: [number, number, number];
    color: string;
    text: string;
    turn: number; // 0..1, where the pointer sits
    bindRef: (o: THREE.Object3D | null) => void;
}> = ({ position, color, text, turn, bindRef }) => (
    <group position={position}>
        {/* Glowing ring round the knob */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.062, 0.075, 32]} />
            <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <group rotation={[0, -turn * Math.PI * 1.5 + Math.PI * 0.75, 0]} ref={bindRef}>
            <mesh position={[0, 0.025, 0]}>
                <cylinderGeometry args={[0.05, 0.055, 0.05, 24]} />
                <meshStandardMaterial color="#1a1a22" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.051, -0.03]}>
                <boxGeometry args={[0.008, 0.004, 0.035]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
        </group>
        <Text position={[0, 0.003, -0.11]} rotation={DJ_LABEL} fontSize={0.026} color="#d8d0e8" anchorX="center" anchorY="middle">
            {text}
        </Text>
    </group>
);

// --- The room ----------------------------------------------------------------------

export const BirdDogStudio: React.FC = () => {
    const status = useStudioMusic((s) => s.status);
    const tracks = useStudioMusic((s) => s.tracks);
    const current = useStudioMusic((s) => s.current);
    const playing = useStudioMusic((s) => s.playing);
    const [modeIndex, setModeIndex] = useState(0);
    const [paletteIndex, setPaletteIndex] = useState(PALETTE_NAMES.indexOf("synthwave"));
    const aim = useAimTargets();
    const clock = useThree((s) => s.clock);

    // Open the player and start the first track on arrival.
    useEffect(() => {
        openStudioMusic(() => {
            window.setTimeout(() => {
                const { tracks: list, current: now } = useStudioMusic.getState();
                if (now === null && list.length) playTrack(list[0].index);
            }, 600);
        });
        return () => closeStudioMusic();
    }, []);
    useEffect(() => {
        if (playing) useAchievementStore.getState().unlock("studio-listen");
    }, [playing]);

    const studio = useMemo(() => new StudioSignal(), []);
    const signal = useRef<Signal>(studio.value);
    const wall = useMemo(() => new LedWall(), []);
    useEffect(() => () => wall.dispose(), [wall]);

    const paletteName = PALETTE_NAMES[paletteIndex];
    const palette = useMemo(() => PALETTES[paletteName].map((c) => new THREE.Color(c)), [paletteName]);
    const mode = MODES_3D[modeIndex];

    // Auto-advance the look every so often, on a drop if one comes.
    const lastChange = useRef(0);
    const frame = useRef(0);
    const speakers = useRef<(THREE.Mesh | null)[]>([]);
    const beams = useRef<(THREE.Group | null)[]>([]);
    const beamMaterials = useMemo(
        () =>
            Array.from(
                { length: 4 },
                () =>
                    new THREE.MeshBasicMaterial({
                        transparent: true,
                        opacity: 0.12,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        side: THREE.DoubleSide,
                        toneMapped: false,
                        fog: false,
                    })
            ),
        []
    );
    useEffect(() => () => beamMaterials.forEach((m) => m.dispose()), [beamMaterials]);
    const stageRing = useRef<THREE.Mesh>(null);
    const vu = useRef<(THREE.Mesh | null)[]>([]);
    const lights = useRef<(THREE.PointLight | null)[]>([]);

    useFrame(({ clock }, delta) => {
        const b = studio.update(Math.min(delta, 0.1));
        const t = clock.elapsedTime;
        // The canvas wall at 30 fps is plenty.
        frame.current++;
        if (frame.current % 2 === 0) wall.draw(WALL_MODES[modeIndex % WALL_MODES.length], PALETTES[paletteName], b);

        if (b.playing && b.drop > 0.8 && t - lastChange.current > 24) {
            lastChange.current = t;
            setModeIndex((i) => (i + 1) % MODES_3D.length);
            setPaletteIndex((i) => (i + 1) % PALETTE_NAMES.length);
        }

        speakers.current.forEach((cone) => {
            if (cone) cone.scale.setScalar(1 + b.bass * 0.12);
        });
        beams.current.forEach((beam, i) => {
            if (!beam) return;
            const sweep = t * (0.4 + i * 0.07) + i * 1.7;
            beam.rotation.set(0.5 + Math.sin(sweep) * 0.35, 0, Math.cos(sweep * 0.8) * 0.5);
            beamMaterials[i].opacity = b.playing ? 0.05 + b.total * 0.2 + b.drop * 0.15 : 0.03;
            beamMaterials[i].color.copy(palette[i % palette.length]);
        });
        if (stageRing.current) {
            const m = stageRing.current.material as THREE.MeshBasicMaterial;
            m.color.copy(palette[0]).multiplyScalar(0.4 + b.bass * 1.2);
        }
        vu.current.forEach((bar, i) => {
            if (!bar) return;
            const level = Math.min(1, 0.05 + (i % 2 ? b.mid : b.bass) * 1.2);
            bar.scale.z = level;
            bar.position.z = -0.15 * (1 - level); // anchored at the DJ's end
        });
        lights.current.forEach((light, i) => {
            if (!light) return;
            light.color.copy(palette[i % palette.length]);
            light.intensity = 2 + b.bass * 6 + b.drop * 6;
        });
    });

    const nowPlaying = tracks.find((t) => t.index === current);
    const statusLine =
        status === "error"
            ? "Couldn't reach SoundCloud right now."
            : status !== "ready"
            ? "Tuning in to Bird Dog on SoundCloud…"
            : nowPlaying
            ? `${playing ? "▶" : "❚❚"}  ${nowPlaying.title}`
            : "Pick a record, or press play on the decks.";

    const prompt = (action: string, accent: "gold" | "green" | "purple" = "gold") => () => <GemPrompt accent={accent} action={action} />;

    // Records: a face-out wall display on the east wall.
    const records = tracks.slice(0, RECORD_COLUMNS * RECORD_ROWS);

    const foam = useMemo(() => {
        // Acoustic foam: wedge panels tiled on both side walls.
        const geometry = new THREE.ConeGeometry(0.26, 0.12, 4, 1);
        geometry.rotateX(Math.PI / 2);
        geometry.rotateZ(Math.PI / 4);
        const material = new THREE.MeshStandardMaterial({ color: "#2a2436", roughness: 1, flatShading: true });
        const spots: THREE.Matrix4[] = [];
        for (let side = -1; side <= 1; side += 2) {
            for (let row = 0; row < 7; row++) {
                for (let col = 0; col < 14; col++) {
                    const z = -6.2 + col * 0.37;
                    if (side > 0 && z > -2.6) continue; // the record wall is there
                    const y = 2.4 + row * 0.37;
                    const m = new THREE.Matrix4().makeRotationY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
                    m.setPosition(side * (HALF_X - 0.07), y, z);
                    spots.push(m);
                }
            }
        }
        const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
        spots.forEach((m, i) => mesh.setMatrixAt(i, m));
        return mesh;
    }, []);
    useEffect(() => () => {
        foam.geometry.dispose();
        (foam.material as THREE.Material).dispose();
    }, [foam]);

    return (
        <>
            <RoomEnvironmentReady />
            <ambientLight intensity={0.25} color="#b8a8ff" />
            <hemisphereLight intensity={0.35} color="#ffd6f0" groundColor="#140c20" />
            {[
                [-4, 4.5, -2],
                [4, 4.5, -2],
                [0, 5, 3],
            ].map((p, i) => (
                <pointLight
                    key={i}
                    ref={(l) => {
                        lights.current[i] = l;
                    }}
                    position={p as [number, number, number]}
                    intensity={3}
                    distance={12}
                    decay={1.6}
                />
            ))}
            {/* Warm lamp by the couch */}
            <pointLight position={[-6.6, 1.6, 4.4]} intensity={4} distance={5} decay={2} color="#ffb070" />

            {/* ---- Shell ---- */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[HALF_X, 0.25, HALF_Z]} position={[0, -0.25, 0]} />
                <CuboidCollider args={[HALF_X, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, -HALF_Z - 0.2]} />
                <CuboidCollider args={[HALF_X, HEIGHT / 2, 0.2]} position={[0, HEIGHT / 2, HALF_Z + 0.2]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF_Z]} position={[-HALF_X - 0.2, HEIGHT / 2, 0]} />
                <CuboidCollider args={[0.2, HEIGHT / 2, HALF_Z]} position={[HALF_X + 0.2, HEIGHT / 2, 0]} />
                {/* The stage you can walk onto, the desk you can't walk through */}
                <CuboidCollider args={[STAGE_HALF_X, RISER / 2, (STAGE_FRONT + HALF_Z) / 2]} position={[0, RISER / 2, (STAGE_FRONT - HALF_Z) / 2]} />
                <CuboidCollider args={DESK_HALF} position={[0, RISER + DESK_HALF[1], BOOTH_Z]} />
                {/* Production desk, couch */}
                <CuboidCollider args={[0.55, 0.5, 1.6]} position={[-7.3, 0.5, -1.6]} />
                <CuboidCollider args={[0.5, 0.45, 1.3]} position={[-7.35, 0.45, 4.3]} />
                {/* PA speakers */}
                <CuboidCollider args={[0.45, 1.1, 0.45]} position={[-5.1, 1.1, -4.6]} />
                <CuboidCollider args={[0.45, 1.1, 0.45]} position={[5.1, 1.1, -4.6]} />
            </RigidBody>

            <RigidBody type="fixed" colliders={false}>
                {[-1, 1].map((side) => (
                    <CuboidCollider
                        key={side}
                        args={[RAMP_WIDTH / 2, 0.05, RAMP_LENGTH / 2]}
                        position={[side * RAMP_X, RISER / 2 - 0.05 * Math.cos(RAMP_ANGLE), STAGE_FRONT + RAMP_RUN / 2 - 0.05 * Math.sin(RAMP_ANGLE)]}
                        rotation={[RAMP_ANGLE, 0, 0]}
                        friction={0}
                        frictionCombineRule={CoefficientCombineRule.Min}
                    />
                ))}
            </RigidBody>
            {[-1, 1].map((side) => (
                <group key={side} position={[side * RAMP_X, RISER / 2, STAGE_FRONT + RAMP_RUN / 2]} rotation={[RAMP_ANGLE, 0, 0]}>
                    <mesh position={[0, -0.05, 0]}>
                        <boxGeometry args={[RAMP_WIDTH, 0.1, RAMP_LENGTH]} />
                        <meshStandardMaterial color="#141218" roughness={0.6} />
                    </mesh>
                    {[-1, 1].map((edge) => (
                        <mesh key={edge} position={[edge * (RAMP_WIDTH / 2 - 0.04), 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.03, RAMP_LENGTH]} />
                            <meshBasicMaterial color="#ff2975" toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            ))}

            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
                <meshStandardMaterial color="#2b1d16" roughness={0.55} />
            </mesh>
            {/* Floorboards */}
            {Array.from({ length: 28 }, (_, i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-HALF_X + 0.57 * i + 0.28, 0.001, 0]}>
                    <planeGeometry args={[0.012, HALF_Z * 2]} />
                    <meshBasicMaterial color="#1a110c" />
                </mesh>
            ))}
            {[
                { p: [0, HEIGHT / 2, -HALF_Z], r: [0, 0, 0], w: HALF_X * 2 },
                { p: [0, HEIGHT / 2, HALF_Z], r: [0, Math.PI, 0], w: HALF_X * 2 },
                { p: [-HALF_X, HEIGHT / 2, 0], r: [0, Math.PI / 2, 0], w: HALF_Z * 2 },
                { p: [HALF_X, HEIGHT / 2, 0], r: [0, -Math.PI / 2, 0], w: HALF_Z * 2 },
            ].map((w, i) => (
                <mesh key={i} position={w.p as [number, number, number]} rotation={w.r as [number, number, number]}>
                    <planeGeometry args={[w.w, HEIGHT]} />
                    <meshStandardMaterial color="#17121f" roughness={0.95} />
                </mesh>
            ))}
            <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
                <meshStandardMaterial color="#0e0b14" roughness={1} />
            </mesh>
            <primitive object={foam} />

            {/* ---- LED wall ---- */}
            <mesh position={[0, 3.6, -HALF_Z + 0.06]}>
                <planeGeometry args={[10, 5]} />
                <meshBasicMaterial map={wall.texture} toneMapped={false} />
            </mesh>
            <mesh position={[0, 3.6, -HALF_Z + 0.03]}>
                <boxGeometry args={[10.3, 5.3, 0.04]} />
                <meshStandardMaterial color="#0a0a0e" metalness={0.6} roughness={0.4} />
            </mesh>

            {/* ---- Riser and booth ---- */}
            <mesh position={[0, RISER / 2, -5.6]}>
                <boxGeometry args={[8.4, RISER, 2.8]} />
                <meshStandardMaterial color="#121016" roughness={0.6} />
            </mesh>
            <mesh position={[0, RISER + 0.005, -4.2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8.4, 0.04]} />
                <meshBasicMaterial color="#ff2975" toneMapped={false} />
            </mesh>
            <group position={[0, RISER, BOOTH_Z]}>
                {/* Desk */}
                <mesh position={[0, 0.45, 0]}>
                    <boxGeometry args={[3.4, 0.9, 0.9]} />
                    <meshStandardMaterial color="#0f0e13" roughness={0.45} metalness={0.3} />
                </mesh>
                <mesh position={[0, 0.45, 0.452]}>
                    <planeGeometry args={[3.3, 0.4]} />
                    <meshBasicMaterial color="#1b1030" />
                </mesh>
                <Text position={[0, 0.48, 0.46]} fontSize={0.13} color="#ffd1e8" anchorX="center" anchorY="middle" maxWidth={3.1}>
                    {statusLine}
                </Text>

                {/* Two decks butted up against the mixer. The DJ stands on the
                    stage side (-Z), so "left" for them is +X. Each deck has
                    its transport buttons in the corner nearest the DJ, the way
                    a real deck does. */}
                {[
                    { x: DECK_X, label: "#ff2975", second: { id: "prev", text: "PREV", use: previousTrack, prompt: "Previous track" } },
                    { x: -DECK_X, label: "#00ffdd", second: { id: "next", text: "NEXT", use: nextTrack, prompt: "Next track" } },
                ].map((deck) => (
                    <group key={deck.x} position={[deck.x, 0.9, 0]}>
                        <Turntable position={[0, 0, 0]} spinning={playing} label={deck.label} />
                        <DeckButton
                            position={[0.33, 0.085, -0.27]}
                            radius={0.06}
                            color={playing ? "#3ee58f" : "#ffd23c"}
                            text={playing ? "PAUSE" : "PLAY"}
                            bindRef={aim.bind(`play-${deck.x}`, { reach: 4.5, prompt: prompt(playing ? "Pause" : "Play"), use: togglePlayback })}
                        />
                        <DeckButton
                            position={[0.33, 0.085, -0.08]}
                            radius={0.042}
                            color="#00bbf9"
                            text={deck.second.text}
                            square
                            bindRef={aim.bind(deck.second.id, { reach: 4.5, prompt: prompt(deck.second.prompt), use: deck.second.use })}
                        />
                        {/* Pitch fader, for looks */}
                        <mesh position={[0.4, 0.083, 0.17]}>
                            <boxGeometry args={[0.025, 0.004, 0.22]} />
                            <meshStandardMaterial color="#0a0a0e" />
                        </mesh>
                        <mesh position={[0.4, 0.092, 0.17]}>
                            <boxGeometry args={[0.05, 0.014, 0.03]} />
                            <meshStandardMaterial color="#d8d8e0" metalness={0.8} roughness={0.3} />
                        </mesh>
                    </group>
                ))}

                {/* Mixer: level meters, channel faders, a crossfader, and the
                    two big knobs that change the show */}
                <group position={[0, 0.9, 0]}>
                    <mesh position={[0, 0.04, 0]}>
                        <boxGeometry args={[MIXER_WIDTH, 0.08, 0.76]} />
                        <meshStandardMaterial color="#26222e" roughness={0.4} metalness={0.5} />
                    </mesh>
                    {[-0.22, -0.16, 0.16, 0.22].map((x, i) => (
                        <group key={x} position={[x, 0.082, 0.04]}>
                            <mesh>
                                <boxGeometry args={[0.026, 0.002, 0.3]} />
                                <meshBasicMaterial color="#0a0a10" />
                            </mesh>
                            {/* The meter fills from the DJ's end */}
                            <mesh
                                position={[0, 0.002, 0]}
                                ref={(m) => {
                                    vu.current[i] = m;
                                }}
                            >
                                <boxGeometry args={[0.02, 0.003, 0.3]} />
                                <meshBasicMaterial color={i % 2 ? "#00ffdd" : "#ff2975"} toneMapped={false} />
                            </mesh>
                        </group>
                    ))}
                    {[-0.07, 0.07].map((x) => (
                        <group key={x} position={[x, 0.082, -0.08]}>
                            <mesh>
                                <boxGeometry args={[0.02, 0.002, 0.2]} />
                                <meshBasicMaterial color="#0a0a10" />
                            </mesh>
                            <mesh position={[0, 0.012, 0.03]}>
                                <boxGeometry args={[0.06, 0.02, 0.025]} />
                                <meshStandardMaterial color="#e8e4dc" />
                            </mesh>
                        </group>
                    ))}
                    <mesh position={[0, 0.082, -0.31]}>
                        <boxGeometry args={[0.3, 0.002, 0.02]} />
                        <meshBasicMaterial color="#0a0a10" />
                    </mesh>
                    <mesh position={[0, 0.094, -0.31]}>
                        <boxGeometry args={[0.03, 0.022, 0.06]} />
                        <meshStandardMaterial color="#e8e4dc" />
                    </mesh>
                    <MixerKnob
                        position={[0.11, 0.08, 0.24]}
                        color="#f222ff"
                        text="VISUALS"
                        turn={modeIndex / MODES_3D.length}
                        bindRef={aim.bind("mode", {
                            reach: 4.5,
                            prompt: prompt(`Visuals: ${MODE_NAMES[mode]} (turn)`, "purple"),
                            use: () => {
                                setModeIndex((i) => (i + 1) % MODES_3D.length);
                                lastChange.current = clock.elapsedTime; // hold your choice a while
                                playSound("ui-select");
                            },
                        })}
                    />
                    <MixerKnob
                        position={[-0.11, 0.08, 0.24]}
                        color="#ffd700"
                        text="COLOURS"
                        turn={paletteIndex / PALETTE_NAMES.length}
                        bindRef={aim.bind("palette", {
                            reach: 4.5,
                            prompt: prompt(`Colours: ${paletteName} (turn)`, "purple"),
                            use: () => {
                                setPaletteIndex((i) => (i + 1) % PALETTE_NAMES.length);
                                playSound("ui-select");
                            },
                        })}
                    />
                </group>

                {/* The laptop: off the DJ's left end of the desk on its own
                    stand, turned in to face them, showing the LED wall */}
                <group position={[2.0, 0, -0.25]} rotation={[0, LAPTOP_YAW, 0]}>
                    <mesh position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.025, 0.04, 1.0, 10]} />
                        <meshStandardMaterial color="#2a2a33" metalness={0.8} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, 0.02, 0]}>
                        <cylinderGeometry args={[0.22, 0.25, 0.04, 20]} />
                        <meshStandardMaterial color="#2a2a33" metalness={0.8} roughness={0.3} />
                    </mesh>
                    <group position={[0, 1.0, 0]} rotation={[0.12, 0, 0]}>
                        <mesh position={[0, -0.01, 0]}>
                            <boxGeometry args={[0.66, 0.02, 0.46]} />
                            <meshStandardMaterial color="#2a2a33" metalness={0.8} roughness={0.3} />
                        </mesh>
                        <mesh position={[0, 0.012, 0]}>
                            <boxGeometry args={[0.62, 0.024, 0.42]} />
                            <meshStandardMaterial color="#b8bcc6" metalness={0.8} roughness={0.35} />
                        </mesh>
                        <mesh position={[0, 0.025, 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.52, 0.2]} />
                            <meshStandardMaterial color="#1a1a20" roughness={0.6} />
                        </mesh>
                        {/* Lid hinged at the far edge, leaning back past upright */}
                        <group position={[0, 0.024, -0.2]} rotation={[-0.26, 0, 0]}>
                            <mesh position={[0, 0.2, -0.008]}>
                                <boxGeometry args={[0.62, 0.4, 0.014]} />
                                <meshStandardMaterial color="#b8bcc6" metalness={0.8} roughness={0.35} />
                            </mesh>
                            <mesh position={[0, 0.2, 0.0005]}>
                                <planeGeometry args={[0.57, 0.35]} />
                                <meshBasicMaterial map={wall.texture} toneMapped={false} />
                            </mesh>
                        </group>
                    </group>
                </group>
            </group>
            <Text position={[0, 6.55, -HALF_Z + 0.08]} fontSize={0.36} color="#ff71ce" anchorX="center" fontWeight="bold" outlineWidth={0.01} outlineColor="#ff2975">
                BIRD DOG
            </Text>

            {/* PA speakers */}
            {[-5.1, 5.1].map((x, i) => (
                <group key={x} position={[x, 0, -4.6]}>
                    <mesh position={[0, 1.1, 0]}>
                        <boxGeometry args={[0.9, 2.2, 0.9]} />
                        <meshStandardMaterial color="#111116" roughness={0.6} />
                    </mesh>
                    {[0.6, 1.55].map((y, k) => (
                        <mesh
                            key={y}
                            position={[0, y, 0.46]}
                            rotation={[Math.PI / 2, 0, 0]}
                            ref={(m) => {
                                speakers.current[i * 2 + k] = m;
                            }}
                        >
                            <cylinderGeometry args={[k ? 0.16 : 0.32, k ? 0.16 : 0.32, 0.04, 32]} />
                            <meshStandardMaterial color="#2a2a33" roughness={0.3} metalness={0.4} />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* Truss and moving-head beams over the booth */}
            <mesh position={[0, HEIGHT - 0.5, -3.6]}>
                <boxGeometry args={[9, 0.15, 0.15]} />
                <meshStandardMaterial color="#3a3a44" metalness={0.8} roughness={0.3} />
            </mesh>
            {[-3, -1, 1, 3].map((x, i) => (
                <group
                    key={x}
                    position={[x, HEIGHT - 0.6, -3.6]}
                    ref={(g) => {
                        beams.current[i] = g;
                    }}
                >
                    <mesh position={[0, -3.2, 0]} material={beamMaterials[i]} raycast={() => null}>
                        <coneGeometry args={[0.9, 6.4, 24, 1, true]} />
                    </mesh>
                </group>
            ))}

            {/* ---- The stage, and the visuals over it ---- */}
            <mesh position={[0, 0.012, STAGE[2]]} rotation={[-Math.PI / 2, 0, 0]} ref={stageRing}>
                <ringGeometry args={[2.0, 2.15, 96]} />
                <meshBasicMaterial toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.008, STAGE[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[2.0, 64]} />
                <meshStandardMaterial color="#0c0a12" roughness={0.3} metalness={0.5} />
            </mesh>
            <StageShow signal={signal} palette={palette} screen={wall.texture} stageTop={RISER} roomHalf={[HALF_X, HALF_Z]} height={HEIGHT} />
            <group position={STAGE} rotation={[0, Math.PI, 0]} scale={1.25}>
                <Visuals3D key={mode} mode={mode} signal={signal} palette={palette} />
            </group>

            {/* ---- West: production desk and couch ---- */}
            <group position={[-7.3, 0, -1.6]}>
                <mesh position={[0, 0.85, 0]}>
                    <boxGeometry args={[1.1, 0.08, 3.2]} />
                    <meshStandardMaterial color="#3a2618" roughness={0.6} />
                </mesh>
                {[-1.3, 1.3].map((z) => (
                    <mesh key={z} position={[0, 0.42, z]}>
                        <boxGeometry args={[1, 0.84, 0.08]} />
                        <meshStandardMaterial color="#2a1a10" />
                    </mesh>
                ))}
                {/* Screen with an arrangement on it */}
                <mesh position={[-0.25, 1.35, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[1.6, 0.9]} />
                    <meshBasicMaterial color="#141820" />
                </mesh>
                {Array.from({ length: 18 }, (_, k) => (
                    <mesh key={k} position={[-0.24, 1.15 + (k % 6) * 0.07, -0.6 + Math.floor(k / 6) * 0.35 + (k % 3) * 0.06]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[0.28 - (k % 4) * 0.04, 0.05]} />
                        <meshBasicMaterial color={sleeveColors[k % sleeveColors.length]} toneMapped={false} />
                    </mesh>
                ))}
                {/* Monitors */}
                {[-1.0, 1.0].map((z) => (
                    <group key={z} position={[-0.1, 1.2, z]}>
                        <mesh>
                            <boxGeometry args={[0.35, 0.55, 0.32]} />
                            <meshStandardMaterial color="#1b1b20" />
                        </mesh>
                        <mesh position={[0.18, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.11, 0.11, 0.02, 24]} />
                            <meshStandardMaterial color="#d8c060" metalness={0.6} roughness={0.3} />
                        </mesh>
                    </group>
                ))}
                {/* MIDI keyboard */}
                <mesh position={[0.25, 0.92, 0]}>
                    <boxGeometry args={[0.32, 0.05, 1.1]} />
                    <meshStandardMaterial color="#e8e4dc" />
                </mesh>
            </group>
            <group position={[-7.35, 0, 4.3]}>
                <mesh position={[0, 0.25, 0]}>
                    <boxGeometry args={[1, 0.5, 2.6]} />
                    <meshStandardMaterial color="#5a2a3a" roughness={0.9} />
                </mesh>
                <mesh position={[-0.38, 0.7, 0]}>
                    <boxGeometry args={[0.25, 0.9, 2.6]} />
                    <meshStandardMaterial color="#5a2a3a" roughness={0.9} />
                </mesh>
                {[-1.2, 1.2].map((z) => (
                    <mesh key={z} position={[0, 0.5, z]}>
                        <boxGeometry args={[1, 0.6, 0.22]} />
                        <meshStandardMaterial color="#4a2230" roughness={0.9} />
                    </mesh>
                ))}
            </group>
            {/* Guitar on a stand */}
            <group position={[-6.6, 0, 1.6]} rotation={[0, Math.PI / 2, -0.12]}>
                <mesh position={[0, 0.45, 0]} scale={[1, 1.25, 0.35]}>
                    <sphereGeometry args={[0.22, 24, 16]} />
                    <meshStandardMaterial color="#c0392b" roughness={0.35} />
                </mesh>
                <mesh position={[0, 0.95, 0]}>
                    <boxGeometry args={[0.06, 0.75, 0.04]} />
                    <meshStandardMaterial color="#3a2210" />
                </mesh>
            </group>

            {/* ---- East: the record wall ---- */}
            <Text position={[HALF_X - 0.05, 5.0, 2.0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.3} color="#ffd1e8" anchorX="center" fontWeight="bold">
                RECORDS
            </Text>
            <Text position={[HALF_X - 0.05, 4.62, 2.0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.13} color="#a99cc8" anchorX="center">
                {status === "ready" ? "Look at a record and press E to play it" : "Loading the crate…"}
            </Text>
            {records.map((track, i) => {
                const col = i % RECORD_COLUMNS;
                const row = Math.floor(i / RECORD_COLUMNS);
                return (
                    <group key={track.id} position={[HALF_X - 0.06, 3.85 - row * 0.95, 0.35 + col * 1.1]} rotation={[0, -Math.PI / 2, 0]}>
                        <Sleeve
                            track={track}
                            playing={track.index === current}
                            bindRef={aim.bind(`record-${track.id}`, {
                                reach: 5,
                                prompt: prompt(track.index === current ? (playing ? "Playing" : "Resume") : `Play "${track.title}"`),
                                use: () => (track.index === current ? togglePlayback() : playTrack(track.index)),
                            })}
                        />
                    </group>
                );
            })}
            {/* SoundCloud link */}
            <group position={[HALF_X - 0.06, 1.2, 5.6]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh
                    ref={aim.bind("soundcloud", {
                        reach: 5,
                        prompt: prompt("Open Bird Dog on SoundCloud", "green"),
                        use: () => window.open(SOUNDCLOUD_PROFILE, "_blank", "noopener"),
                    })}
                >
                    <boxGeometry args={[1.5, 0.5, 0.05]} />
                    <meshStandardMaterial color="#ff5500" emissive="#ff5500" emissiveIntensity={0.5} />
                </mesh>
                <Text position={[0, 0, 0.03]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
                    LISTEN ON SOUNDCLOUD
                </Text>
            </group>

            <aim.Prompt />
        </>
    );
};
