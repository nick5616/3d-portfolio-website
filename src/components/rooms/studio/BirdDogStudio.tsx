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
    PlaybackIntent,
    SOUNDCLOUD_PROFILE,
    closeStudioMusic,
    currentPlayback,
    nextTrack,
    openStudioMusic,
    playTrack,
    syncPlayback,
    togglePlayback,
    useStudioMusic,
} from "./soundcloud";
import { useShallow } from "zustand/react/shallow";
import { StudioSync, connectStudio, positionNow } from "./studioSync";
import { Signal, StudioSignal } from "./studioSignal";
import { LedWall, PALETTES, PALETTE_NAMES, WALL_MODES } from "./ledWall";
import { MODES_3D, MODE_NAMES, Visuals3D } from "./Visuals3D";
import { StageShow } from "./StageShow";
import { getEnhancedRoomMaterials } from "../../../configs/enhancedMaterials";
import { loadCrate, trackMeta, useCrate } from "./dj/crate";
import { DjEngine, engineRef } from "./dj/djEngine";
import { createDjSync } from "./dj/djSync";
import { DECKS, DeckId, dj, freeDeck, initialShared, isRolling, useDj } from "./dj/djStore";
import { closeDjConsole, openDjConsole } from "./dj/consoleGate";
import { DjBooth3D } from "./dj/DjBooth3D";

// Bird Dog's studio. Half recording studio, half DJ booth: foam on the
// walls, a production desk and a couch to one side, a wall of records to
// the other, and at the far end a booth on a riser in front of an LED wall.
// The booth is two CDJs and a DJM that really work (dj/: step up and press
// E), playing Bird Dog's own masters; the LED wall runs Bird Dog's
// song-visualizer off the live mix, and the same visuals float over the
// stage in the middle of the room. Walking in starts the first record -
// unless other people are already in, in which case you hear whatever
// they're playing (studioSync.ts: the booth and the lights are shared by
// everyone here). If the records can't be reached, the studio falls back to
// streaming Bird Dog's SoundCloud.

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

interface WallRecord {
    key: string;
    title: string;
    artwork: string | null;
    colorIndex: number;
}

const Sleeve: React.FC<{ record: WallRecord; playing: boolean; bindRef: (o: THREE.Object3D | null) => void }> = ({
    record: track,
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
    const color = sleeveColors[track.colorIndex % sleeveColors.length];
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

// Flat labels on the gear read the right way up for the DJ, who stands on
// the -Z side looking toward +Z.
const DJ_LABEL: [number, number, number] = [-Math.PI / 2, 0, Math.PI];

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
    const [listeners, setListeners] = useState(0);
    const aim = useAimTargets();
    const clock = useThree((s) => s.clock);
    const visualsRef = useRef({ mode: 0, palette: paletteIndex });
    visualsRef.current = { mode: modeIndex, palette: paletteIndex };
    const sync = useRef<StudioSync | null>(null);
    // Set once someone already here has told us what's playing.
    const heardRoom = useRef(false);
    const crateStatus = useCrate((s) => s.status);
    const crate = useCrate((s) => s.tracks);
    const djMode = crateStatus === "ready";
    const scMode = crateStatus === "error";
    // What the room needs to re-render for: which records are on the
    // decks and whether they're rolling (the gear itself moves per frame).
    const booth = useDj(
        useShallow((s) => ({
            a: s.decks.a.track,
            b: s.decks.b.track,
            aRolling: isRolling(s, "a"),
            bRolling: isRolling(s, "b"),
        }))
    );
    const studio = useMemo(() => new StudioSignal(), []);

    // Join the shared room and get the music going: the decks if the crate
    // loads, SoundCloud if it doesn't. On arrival, if nobody's here to tell
    // us what's on, start the first record ourselves - after a moment,
    // since finding the others can take a few seconds.
    useEffect(() => {
        heardRoom.current = false;
        const booth = createDjSync();
        const link = connectStudio(
            visualsRef.current,
            {
                onVisuals: ({ mode, palette }) => {
                    setModeIndex(mode % MODES_3D.length);
                    setPaletteIndex(palette % PALETTE_NAMES.length);
                    lastChange.current = clock.elapsedTime;
                },
                onTransport: (t) => {
                    if (useCrate.getState().status === "ready") return;
                    heardRoom.current = true;
                    syncPlayback(t.track, t.playing, positionNow(t));
                },
                onPeers: setListeners,
                currentTransport: currentPlayback,
            },
            booth
        );
        sync.current = link;
        let cancelled = false;
        let startTimer: number | undefined;
        let engineTimer: number | undefined;

        // The engine needs a running AudioContext (after the first click or
        // key anywhere), so keep trying until there is one.
        const startEngine = async () => {
            if (cancelled || engineRef.current) return;
            const engine = await DjEngine.create().catch(() => null);
            if (cancelled) return engine?.dispose();
            if (!engine) {
                engineTimer = window.setTimeout(startEngine, 500);
                return;
            }
            engineRef.current = engine;
            studio.live = { analyser: engine.analyser, playing: () => DECKS.some((id) => isRolling(useDj.getState(), id)) };
        };

        loadCrate().then((tracks) => {
            if (cancelled) return;
            if (!tracks) {
                openStudioMusic(() => {
                    startTimer = window.setTimeout(() => {
                        const { tracks: list, current: now } = useStudioMusic.getState();
                        if (!heardRoom.current && now === null && list.length) playTrack(list[0].index);
                    }, 2500);
                });
                return;
            }
            startEngine();
            startTimer = window.setTimeout(() => {
                const s = useDj.getState();
                if (booth.heard() || DECKS.some((id) => s.decks[id].track)) return;
                if (dj.load("a", tracks[0].id)) dj.play("a");
            }, 2500);
        });

        return () => {
            cancelled = true;
            window.clearTimeout(startTimer);
            window.clearTimeout(engineTimer);
            closeDjConsole();
            link.leave();
            sync.current = null;
            engineRef.current?.dispose();
            engineRef.current = null;
            studio.live = null;
            // The booth is the room's; we start fresh next visit.
            useDj.setState(initialShared());
            closeStudioMusic();
        };
    }, [clock, studio]);

    // When a record runs out and the other deck isn't going, put the next
    // one on so the room isn't left in silence. One visitor does it.
    useEffect(() => {
        if (!djMode) return;
        const id = window.setInterval(() => {
            if (!(sync.current?.isLeader() ?? true)) return;
            const s = useDj.getState();
            DECKS.forEach((deck) => {
                const d = s.decks[deck];
                if (!d.track || !d.anchor.playing || isRolling(s, deck)) return;
                const other: DeckId = deck === "a" ? "b" : "a";
                if (isRolling(s, other)) return dj.stop(deck);
                const list = useCrate.getState().tracks;
                const next = list[(list.findIndex((t) => t.id === d.track) + 1) % list.length];
                if (next && dj.load(deck, next.id)) dj.play(deck);
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [djMode]);

    // A record off the wall goes on whichever deck the crowd can't hear;
    // if nothing's playing, it starts.
    const loadRecord = (trackId: string) => {
        const deck = freeDeck();
        if (!deck) return;
        const silent = !DECKS.some((id) => isRolling(useDj.getState(), id));
        if (dj.load(deck, trackId) && silent) {
            dj.channel(deck, "fader", 1);
            dj.play(deck);
        }
        playSound("ui-select");
    };

    // The controls: act here, then tell everyone else in the room.
    const share = (intent: PlaybackIntent | null) => {
        if (intent) sync.current?.setTransport(intent);
    };
    const shareVisuals = (mode: number, palette: number) => {
        setModeIndex(mode);
        setPaletteIndex(palette);
        sync.current?.setVisuals({ mode, palette });
    };
    const listening = playing || booth.aRolling || booth.bRolling;
    useEffect(() => {
        if (listening) useAchievementStore.getState().unlock("studio-listen");
    }, [listening]);

    const signal = useRef<Signal>(studio.value);
    const wall = useMemo(() => new LedWall(), []);
    // Shared, cached materials - not ours to dispose.
    const shell = useMemo(() => getEnhancedRoomMaterials("bird-dog-studio"), []);
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
    const lights = useRef<(THREE.PointLight | null)[]>([]);

    useFrame(({ clock }, delta) => {
        const b = studio.update(Math.min(delta, 0.1));
        const t = clock.elapsedTime;
        // The canvas wall at 30 fps is plenty.
        frame.current++;
        if (frame.current % 2 === 0) wall.draw(WALL_MODES[modeIndex % WALL_MODES.length], PALETTES[paletteName], b);

        // With company, only one visitor makes the call, and tells the rest.
        if (b.playing && b.drop > 0.8 && t - lastChange.current > 24 && (sync.current?.isLeader() ?? true)) {
            lastChange.current = t;
            const { mode: m, palette: p } = visualsRef.current;
            shareVisuals((m + 1) % MODES_3D.length, (p + 1) % PALETTE_NAMES.length);
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
        lights.current.forEach((light, i) => {
            if (!light) return;
            light.color.copy(palette[i % palette.length]);
            light.intensity = 2 + b.bass * 6 + b.drop * 6;
        });
    });

    const nowPlaying = tracks.find((t) => t.index === current);
    const company = listeners ? `  ·  ${listeners + 1} here` : "";
    const deckLine = (id: DeckId) => {
        const meta = trackMeta(booth[id]);
        return meta ? `${id === "a" ? "1" : "2"} ${booth[`${id}Rolling`] ? "▶" : "❚❚"} ${meta.title}` : null;
    };
    const onDecks = [deckLine("a"), deckLine("b")].filter(Boolean).join("     ");
    const statusLine = djMode
        ? onDecks
            ? onDecks + company
            : "Step up to the decks, or pick a record off the wall."
        : !scMode
        ? "Digging through the crate…"
        : status === "error"
            ? "Couldn't reach SoundCloud right now."
            : status !== "ready"
            ? "Tuning in to Bird Dog on SoundCloud…"
            : nowPlaying
            ? `${playing ? "▶" : "❚❚"}  ${nowPlaying.title}${listeners ? `  ·  ${listeners + 1} listening` : ""}`
            : "Pick a record, or press play on the decks.";

    const prompt = (action: string, accent: "gold" | "green" | "purple" = "gold") => () => <GemPrompt accent={accent} action={action} />;

    // Records: a face-out wall display on the east wall - the crate, or
    // the SoundCloud list when the studio is streaming instead.
    const records: (WallRecord & { playing: boolean; prompt: string; use: () => void })[] = (
        djMode
            ? crate.map((t, i) => {
                  const on = DECKS.find((id) => booth[id] === t.id) ?? null;
                  const free = freeDeck();
                  return {
                      key: t.id,
                      title: t.title,
                      artwork: null,
                      colorIndex: i,
                      playing: on !== null && booth[`${on}Rolling`],
                      prompt: on ? `On deck ${on === "a" ? 1 : 2}` : free ? `Put "${t.title}" on deck ${free === "a" ? 1 : 2}` : "Both decks are playing",
                      use: () => !on && loadRecord(t.id),
                  };
              })
            : tracks.map((t) => ({
                  key: String(t.id),
                  title: t.title,
                  artwork: t.artwork,
                  colorIndex: t.index,
                  playing: t.index === current,
                  prompt: t.index === current ? (playing ? "Playing" : "Resume") : `Play "${t.title}"`,
                  use: () => share(t.index === current ? togglePlayback() : playTrack(t.index)),
              }))
    ).slice(0, RECORD_COLUMNS * RECORD_ROWS);

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

            <mesh rotation={[-Math.PI / 2, 0, 0]} material={shell.floor}>
                <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
            </mesh>
            {[
                { p: [0, HEIGHT / 2, -HALF_Z], r: [0, 0, 0], w: HALF_X * 2 },
                { p: [0, HEIGHT / 2, HALF_Z], r: [0, Math.PI, 0], w: HALF_X * 2 },
                { p: [-HALF_X, HEIGHT / 2, 0], r: [0, Math.PI / 2, 0], w: HALF_Z * 2 },
                { p: [HALF_X, HEIGHT / 2, 0], r: [0, -Math.PI / 2, 0], w: HALF_Z * 2 },
            ].map((w, i) => (
                <mesh key={i} position={w.p as [number, number, number]} rotation={w.r as [number, number, number]} material={shell.walls}>
                    <planeGeometry args={[w.w, HEIGHT]} />
                </mesh>
            ))}
            <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} material={shell.ceiling}>
                <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
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

                {/* Two CDJs either side of a DJM (dj/DjBooth3D.tsx), every
                    control where the shared booth has it. The DJ stands on
                    the stage side (-Z), so "left" for them is +X: deck 1. */}
                <group position={[0, 0.9, 0]}>
                    <DjBooth3D
                        deckX={DECK_X}
                        fallbackPlaying={scMode && playing}
                        bindCdj={(id) =>
                            aim.bind(`cdj-${id}`, {
                                reach: 4.5,
                                ...(djMode
                                    ? { prompt: prompt("Step up to the decks", "purple"), use: openDjConsole }
                                    : scMode && id === "a"
                                    ? { prompt: prompt(playing ? "Pause" : "Play"), use: () => share(togglePlayback()) }
                                    : scMode
                                    ? { prompt: prompt("Next track"), use: () => share(nextTrack()) }
                                    : { prompt: prompt("Digging through the crate…"), use: () => {} }),
                            })
                        }
                        bindMixer={aim.bind("mixer", {
                            reach: 4.5,
                            prompt: prompt(djMode ? "Step up to the decks" : "The decks are warming up", "purple"),
                            use: () => djMode && openDjConsole(),
                        })}
                    />
                </group>

                {/* The light desk, at the DJ's right hand: the two big knobs
                    that change the show */}
                <group position={[-1.5, 0.9, -0.05]}>
                    <mesh position={[0, 0.04, 0]}>
                        <boxGeometry args={[0.32, 0.08, 0.62]} />
                        <meshStandardMaterial color="#26222e" roughness={0.4} metalness={0.5} />
                    </mesh>
                    <Text position={[0, 0.082, 0.27]} rotation={DJ_LABEL} fontSize={0.026} color="#9a96a8" anchorX="center" anchorY="middle">
                        LIGHTS
                    </Text>
                    <MixerKnob
                        position={[0, 0.08, 0.1]}
                        color="#f222ff"
                        text="VISUALS"
                        turn={modeIndex / MODES_3D.length}
                        bindRef={aim.bind("mode", {
                            reach: 4.5,
                            prompt: prompt(`Visuals: ${MODE_NAMES[mode]} (turn)`, "purple"),
                            use: () => {
                                shareVisuals((modeIndex + 1) % MODES_3D.length, paletteIndex);
                                lastChange.current = clock.elapsedTime; // hold your choice a while
                                playSound("ui-select");
                            },
                        })}
                    />
                    <MixerKnob
                        position={[0, 0.08, -0.14]}
                        color="#ffd700"
                        text="COLOURS"
                        turn={paletteIndex / PALETTE_NAMES.length}
                        bindRef={aim.bind("palette", {
                            reach: 4.5,
                            prompt: prompt(`Colours: ${paletteName} (turn)`, "purple"),
                            use: () => {
                                shareVisuals(modeIndex, (paletteIndex + 1) % PALETTE_NAMES.length);
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
                {djMode
                    ? "Look at a record and press E to put it on a deck"
                    : status === "ready"
                    ? "Look at a record and press E to play it"
                    : "Loading the crate…"}
            </Text>
            {records.map((record, i) => {
                const col = i % RECORD_COLUMNS;
                const row = Math.floor(i / RECORD_COLUMNS);
                return (
                    <group key={record.key} position={[HALF_X - 0.06, 3.85 - row * 0.95, 0.35 + col * 1.1]} rotation={[0, -Math.PI / 2, 0]}>
                        <Sleeve
                            record={record}
                            playing={record.playing}
                            bindRef={aim.bind(`record-${record.key}`, { reach: 5, prompt: prompt(record.prompt), use: record.use })}
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
