import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { GemPrompt } from "../../ui/GemPrompt";
import { useAimTargets } from "../../core/useAimTargets";
import { useAchievementStore } from "../../../stores/achievementStore";
import { CHILDYLLIC, closeStudioMusic, currentPositionMs, openStudioMusic, syncPlayback, useStudioMusic } from "../studio/soundcloud";
import { getRoomPart, sessionSeconds, setRoomPart, useRoomSessionStore } from "../../../multiplayer/roomSession";
import { ButterflyFairy, butterflyAssets } from "./forest/butterfly";
import noteMap from "../../../data/songOfTheForestNotes.json";

// A little keyboard lying on a mossy stump in the glade beside the fairy
// stone - knee height, so you look down at it - with a butterfly-winged
// fairy keeping it company while the Song of the Forest plays (Bird Dog's
// piano piece "Childyllic", streamed from SoundCloud). The fairy isn't really playing:
// every two seconds (30 BPM) it drifts to another key and settles on it a
// moment. The music starts when you arrive; press E at the keyboard to
// stop or start it.
//
// Everyone in the forest hears the same song at the same moment: it runs
// on the room session's clock, from when the forest was grown, and
// stopping or starting it at the keyboard does so for everyone (the "song"
// room part, see multiplayer/roomSession.ts).

const PIANO_AT: [number, number, number] = [3.1, 0, 4.7];
// Keys toward the middle of the glade, where you arrive.
const PIANO_YAW = Math.atan2(-PIANO_AT[0], -PIANO_AT[2]);
const STUMP_TOP = 0.42;
const KEYS = 13;
const KEY_WIDTH = 0.05;
const KEYS_Y = STUMP_TOP + 0.045;
const BEAT = 2; // seconds: 30 BPM, the fallback if there's no note map
const NOTES = 24;

// The song's note map (scripts/analyze-pitch.mjs, run on the recording):
// when each note starts and its pitch. The fairy skips the quickest runs -
// it's a fairy, not a pianist - and maps the song's range onto its keys.
const FAIRY_NOTES = (() => {
    const kept: { t: number; midi: number }[] = [];
    for (const note of noteMap.notes) {
        const last = kept[kept.length - 1];
        if (!last || note.t - last.t >= 0.22 || note.v >= 0.55) kept.push(note);
    }
    return kept;
})();
const [LOW, HIGH] = noteMap.range;
const keyForMidi = (midi: number) =>
    Math.round(Math.max(0, Math.min(1, (midi - LOW) / Math.max(1, HIGH - LOW))) * (KEYS - 1));

// The song as the room has it: playing from a session time (when it was
// at 0:00), or stopped at a point. No part yet: playing since the forest grew.
type Song = { playing: true; from: number } | { playing: false; at: number };
const SONG_KEY = "song";
const DRIFT_CHECK_MS = 4000;

const songNow = (): Song => getRoomPart<Song>(SONG_KEY) ?? { playing: true, from: 0 };
const songPositionMs = (song: Song) => {
    const length = useStudioMusic.getState().tracks[0]?.duration || 0;
    const ms = song.playing ? (sessionSeconds() - song.from) * 1000 : song.at;
    return length ? ((ms % length) + length) % length : Math.max(0, ms);
};
const followSong = () => {
    const track = useStudioMusic.getState().tracks[0];
    if (!track) return;
    const song = songNow();
    syncPlayback(track.id, song.playing, songPositionMs(song));
};
const toggleSong = () => {
    const song = songNow();
    const at = songPositionMs(song);
    setRoomPart(SONG_KEY, song.playing ? { playing: false, at } : { playing: true, from: sessionSeconds() - at / 1000 });
    followSong();
};

export const ForestPiano: React.FC = () => {
    const playing = useStudioMusic((s) => s.playing);
    const status = useStudioMusic((s) => s.status);
    const aim = useAimTargets();

    // Join the Song of the Forest wherever it's got to; stop it on the way
    // out. Kept in line with the room's clock (and anyone's stop/start).
    useEffect(() => {
        let ready = false;
        openStudioMusic(() => {
            window.setTimeout(() => {
                ready = true;
                followSong();
            }, 600);
        }, CHILDYLLIC);
        const drift = window.setInterval(() => ready && followSong(), DRIFT_CHECK_MS);
        const unsubscribe = useRoomSessionStore.subscribe((st, prev) => {
            if (ready && st.parts[SONG_KEY] !== prev.parts[SONG_KEY]) followSong();
        });
        return () => {
            window.clearInterval(drift);
            unsubscribe();
            closeStudioMusic();
        };
    }, []);
    useEffect(() => {
        if (playing) useAchievementStore.getState().unlock("forest-childyllic");
    }, [playing]);

    const resources = useMemo(() => {
        const positions = new Float32Array(NOTES * 3).fill(-100);
        const notes = new THREE.BufferGeometry();
        notes.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return { glow: butterflyAssets().glow, notes, positions, life: new Float32Array(NOTES), next: 0, lastSpawn: 0 };
    }, []);
    useEffect(() => () => resources.notes.dispose(), [resources]);

    const keys = useRef<(THREE.Mesh | null)[]>([]);
    const pressed = useRef(new Float32Array(KEYS));
    const fairy = useRef<THREE.Group>(null);
    const fairyLight = useRef<THREE.PointLight>(null);
    const flap = useRef(3.2);
    const route = useRef({ from: 6, to: 6, beat: -1 });
    // Where we are in the note map: the next note the fairy is heading for.
    const cursor = useRef({ next: 0, key: 6, lastSong: -1 });

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        const isPlaying = useStudioMusic.getState().playing;
        const keyX = (i: number) => (i - (KEYS - 1) / 2) * KEY_WIDTH;

        if (fairy.current) {
            const song = currentPositionMs() / 1000;
            if (isPlaying && FAIRY_NOTES.length) {
                // Read ahead: rest on the key of the note just played; when
                // the next note is close enough, glide over so as to land on
                // its key exactly as it sounds.
                const c = cursor.current;
                if (song < c.lastSong - 0.5 || c.lastSong < 0) {
                    // Started, or someone seeked: find our place again.
                    c.next = FAIRY_NOTES.findIndex((n) => n.t > song);
                    if (c.next < 0) c.next = FAIRY_NOTES.length;
                    c.key = c.next > 0 ? keyForMidi(FAIRY_NOTES[c.next - 1].midi) : c.key;
                }
                c.lastSong = song;
                while (c.next < FAIRY_NOTES.length && FAIRY_NOTES[c.next].t <= song) {
                    // Landed: the key goes down and a note floats up.
                    c.key = keyForMidi(FAIRY_NOTES[c.next].midi);
                    pressed.current[c.key] = 1;
                    const i = resources.next;
                    resources.next = (resources.next + 1) % NOTES;
                    resources.positions.set([keyX(c.key), KEYS_Y + 0.08, 0], i * 3);
                    resources.life[i] = 1;
                    c.next++;
                }
                const upcoming = FAIRY_NOTES[c.next];
                let x = keyX(c.key);
                let lift = 0;
                if (upcoming) {
                    const target = keyForMidi(upcoming.midi);
                    const previous = c.next > 0 ? FAIRY_NOTES[c.next - 1].t : 0;
                    const travel = Math.min(upcoming.t - previous, Math.max(0.16, Math.min(0.55, 0.12 + Math.abs(target - c.key) * 0.06)));
                    const k = Math.max(0, Math.min(1, 1 - (upcoming.t - song) / travel));
                    const ease = k * k * (3 - 2 * k);
                    x = keyX(c.key) + (keyX(target) - keyX(c.key)) * ease;
                    lift = Math.sin(k * Math.PI) * (0.03 + Math.abs(target - c.key) * 0.012);
                    fairy.current.rotation.y = (target - c.key) * 0.12 * Math.sin(k * Math.PI);
                }
                const breathe = Math.sin(t * 2.2) * 0.006;
                fairy.current.position.set(x, KEYS_Y + 0.05 + lift + breathe, 0.02);
                flap.current = lift > 0.005 ? 7 : 4;
            } else if (isPlaying) {
                // No note map: one gentle move per beat (30 BPM).
                const beat = Math.floor(t / BEAT);
                const phase = (t % BEAT) / BEAT;
                const r = route.current;
                if (beat !== r.beat) {
                    r.beat = beat;
                    r.from = r.to;
                    const step = 1 + Math.floor(((Math.sin(beat * 12.9898) + 1) / 2) * 4);
                    r.to = Math.max(0, Math.min(KEYS - 1, r.from + (Math.sin(beat * 78.233) > 0 ? step : -step)));
                    pressed.current[r.from] = 1; // the key it rested on springs back
                }
                const glide = phase < 0.6 ? phase / 0.6 : 1;
                const ease = glide * glide * (3 - 2 * glide);
                const x = keyX(r.from) + (keyX(r.to) - keyX(r.from)) * ease;
                const lift = Math.sin(Math.min(1, phase / 0.6) * Math.PI) * 0.09;
                const settled = phase >= 0.6;
                fairy.current.position.set(x, KEYS_Y + 0.05 + lift + (settled ? 0 : 0.02), 0.02);
                fairy.current.rotation.y = (keyX(r.to) - keyX(r.from)) * 2;
                if (settled) pressed.current[r.to] = Math.min(1, pressed.current[r.to] + delta * 4);
            } else {
                // Resting: hovering slowly over the keys.
                fairy.current.position.set(Math.sin(t * 0.4) * 0.1, KEYS_Y + 0.22 + Math.sin(t * 0.9) * 0.03, 0.02);
                fairy.current.rotation.y = Math.sin(t * 0.3) * 0.4;
                cursor.current.lastSong = -1;
                flap.current = 3.2;
            }
        }
        if (fairyLight.current) fairyLight.current.intensity = isPlaying ? 0.9 + Math.sin((t / BEAT) * Math.PI * 2) * 0.3 : 0.6;

        keys.current.forEach((key, i) => {
            const held = isPlaying && (FAIRY_NOTES.length ? i === cursor.current.key : i === route.current.to);
            if (!held) pressed.current[i] = Math.max(0, pressed.current[i] - delta * 3);
            if (key) key.position.y = KEYS_Y - pressed.current[i] * 0.008;
        });

        // Without a note map, a note floats up on each beat.
        if (isPlaying && !FAIRY_NOTES.length && t - resources.lastSpawn > BEAT) {
            resources.lastSpawn = t;
            const i = resources.next;
            resources.next = (resources.next + 1) % NOTES;
            resources.positions.set([keyX(route.current.to), KEYS_Y + 0.1, 0], i * 3);
            resources.life[i] = 1;
        }
        for (let i = 0; i < NOTES; i++) {
            if (resources.life[i] <= 0) continue;
            resources.life[i] -= delta * 0.18;
            resources.positions[i * 3] += Math.sin(t + i) * delta * 0.05;
            resources.positions[i * 3 + 1] += delta * 0.18;
            if (resources.life[i] <= 0) resources.positions[i * 3 + 1] = -100;
        }
        resources.notes.attributes.position.needsUpdate = true;
    });

    const width = KEYS * KEY_WIDTH;

    return (
        <>
            <RigidBody type="fixed" colliders={false} position={PIANO_AT}>
                <CylinderCollider args={[STUMP_TOP / 2, 0.36]} position={[0, STUMP_TOP / 2, 0]} />
            </RigidBody>
            <group
                position={PIANO_AT}
                rotation={[0, PIANO_YAW, 0]}
                ref={aim.bind("piano", {
                    reach: 3,
                    prompt: () =>
                        status === "error" ? (
                            <GemPrompt accent="red" keyLabel={null} action="The keyboard can't reach SoundCloud right now" />
                        ) : (
                            <GemPrompt accent="green" action={playing ? "Let the fairy rest" : "Play the Song of the Forest"} />
                        ),
                    use: toggleSong,
                })}
            >
                {/* The stump, with a ring of moss on top */}
                <mesh position={[0, STUMP_TOP / 2, 0]}>
                    <cylinderGeometry args={[0.32, 0.4, STUMP_TOP, 14]} />
                    <meshStandardMaterial color="#6b4a2e" roughness={1} flatShading />
                </mesh>
                <mesh position={[0, STUMP_TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.18, 0.33, 24]} />
                    <meshStandardMaterial color="#4c7a34" roughness={1} />
                </mesh>
                {/* Roots */}
                {[0.4, 2.1, 3.6, 5.0].map((a) => (
                    <mesh key={a} position={[Math.cos(a) * 0.38, 0.05, Math.sin(a) * 0.38]} rotation={[0, -a, 0.9]}>
                        <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
                        <meshStandardMaterial color="#5a3c24" roughness={1} />
                    </mesh>
                ))}

                {/* The keyboard: just keys, in a thin wooden frame */}
                <group position={[0, 0, 0.03]}>
                    <mesh position={[0, KEYS_Y - 0.02, -0.02]}>
                        <boxGeometry args={[width + 0.06, 0.03, 0.17]} />
                        <meshStandardMaterial color="#3a2414" roughness={0.5} />
                    </mesh>
                    {Array.from({ length: KEYS }, (_, i) => (
                        <mesh
                            key={i}
                            ref={(m) => {
                                keys.current[i] = m;
                            }}
                            position={[(i - (KEYS - 1) / 2) * KEY_WIDTH, KEYS_Y, 0]}
                        >
                            <boxGeometry args={[KEY_WIDTH * 0.9, 0.018, 0.13]} />
                            <meshStandardMaterial color="#f6f1e4" roughness={0.4} />
                        </mesh>
                    ))}
                    {Array.from({ length: KEYS - 1 }, (_, i) => i)
                        .filter((i) => [0, 1, 3, 4, 5].includes(i % 7))
                        .map((i) => (
                            <mesh key={`b${i}`} position={[(i + 0.5 - (KEYS - 1) / 2) * KEY_WIDTH, KEYS_Y + 0.014, -0.03]}>
                                <boxGeometry args={[KEY_WIDTH * 0.5, 0.02, 0.075]} />
                                <meshStandardMaterial color="#161012" roughness={0.3} />
                            </mesh>
                        ))}
                    {/* Carved end cheeks curling into vines */}
                    {[-1, 1].map((side) => (
                        <group key={side} position={[side * (width / 2 + 0.035), KEYS_Y, -0.02]}>
                            <mesh>
                                <boxGeometry args={[0.025, 0.06, 0.17]} />
                                <meshStandardMaterial color="#4a2e18" roughness={0.5} />
                            </mesh>
                            <mesh position={[side * 0.02, 0.06, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
                                <torusGeometry args={[0.04, 0.008, 6, 20, Math.PI * 1.5]} />
                                <meshStandardMaterial color="#5c8a3a" roughness={0.8} />
                            </mesh>
                            <mesh position={[side * 0.05, 0.1, -0.06]}>
                                <sphereGeometry args={[0.018, 8, 6]} />
                                <meshStandardMaterial color={side < 0 ? "#ff9de2" : "#ffe58a"} emissive={side < 0 ? "#ff9de2" : "#ffe58a"} emissiveIntensity={0.6} />
                            </mesh>
                        </group>
                    ))}
                    {/* A strip of gold inlay along the back */}
                    <mesh position={[0, KEYS_Y + 0.001, -0.095]}>
                        <boxGeometry args={[width + 0.04, 0.004, 0.008]} />
                        <meshStandardMaterial color="#d9b25a" metalness={1} roughness={0.3} emissive="#6a4810" emissiveIntensity={0.5} />
                    </mesh>
                </group>

                {/* Little flowers and a glowing mushroom on the stump */}
                {[
                    [-0.22, 0.16, "#ff9de2"],
                    [0.24, 0.14, "#8fe9ff"],
                    [0.1, -0.2, "#ffe58a"],
                ].map(([x, z, c]) => (
                    <group key={`${x}`} position={[x as number, STUMP_TOP, z as number]}>
                        <mesh position={[0, 0.03, 0]}>
                            <cylinderGeometry args={[0.004, 0.004, 0.06, 4]} />
                            <meshStandardMaterial color="#4c7a34" />
                        </mesh>
                        <mesh position={[0, 0.065, 0]}>
                            <sphereGeometry args={[0.016, 8, 6]} />
                            <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={0.5} />
                        </mesh>
                    </group>
                ))}
                <group position={[-0.24, STUMP_TOP, -0.12]}>
                    <mesh position={[0, 0.04, 0]}>
                        <cylinderGeometry args={[0.012, 0.016, 0.08, 6]} />
                        <meshStandardMaterial color="#efe6d2" />
                    </mesh>
                    <mesh position={[0, 0.08, 0]} scale={[1, 0.6, 1]}>
                        <sphereGeometry args={[0.04, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial color="#c7b6ff" emissive="#c7b6ff" emissiveIntensity={0.9} />
                    </mesh>
                </group>

                {/* The fairy: a speck of light with butterfly wings */}
                <group ref={fairy} position={[0, KEYS_Y + 0.22, 0.02]}>
                    <ButterflyFairy kind={0} flap={flap} />
                    <pointLight ref={fairyLight} intensity={0.6} distance={2} decay={2} color="#ffe58a" />
                </group>

                <points geometry={resources.notes} frustumCulled={false} raycast={() => null}>
                    <pointsMaterial
                        map={resources.glow}
                        color="#ffd6f5"
                        size={0.06}
                        transparent
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </points>
                {/* An invisible box so aiming anywhere at it works */}
                <mesh visible={false} position={[0, 0.3, 0]}>
                    <boxGeometry args={[0.9, 0.7, 0.8]} />
                </mesh>
            </group>
            <aim.Prompt />
        </>
    );
};
