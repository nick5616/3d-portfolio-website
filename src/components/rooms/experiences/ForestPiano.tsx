import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { GemPrompt } from "../../ui/GemPrompt";
import { useAimTargets } from "../../core/useAimTargets";
import { useAchievementStore } from "../../../stores/achievementStore";
import { CHILDYLLIC, closeStudioMusic, openStudioMusic, playTrack, togglePlayback, useStudioMusic } from "../studio/soundcloud";

// A little keyboard lying on a mossy stump in the glade beside the fairy
// stone - knee height, so you look down at it - with a butterfly-winged
// fairy keeping it company while the Song of the Forest plays (Bird Dog's
// piano piece "Childyllic", streamed from SoundCloud). The fairy isn't really playing:
// every two seconds (30 BPM) it drifts to another key and settles on it a
// moment. The music starts when you arrive; press E at the keyboard to
// stop or start it.

const PIANO_AT: [number, number, number] = [3.1, 0, 4.7];
// Keys toward the middle of the glade, where you arrive.
const PIANO_YAW = Math.atan2(-PIANO_AT[0], -PIANO_AT[2]);
const STUMP_TOP = 0.42;
const KEYS = 13;
const KEY_WIDTH = 0.05;
const KEYS_Y = STUMP_TOP + 0.045;
const BEAT = 2; // seconds: 30 BPM
const NOTES = 24;

const glowTexture = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

// Butterfly wings: a big rounded forewing and a smaller hindwing per side,
// drawn as shapes with a soft colour gradient and dark veined edges.
const wingTexture = () => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(0, size / 2, 4, 0, size / 2, size);
    g.addColorStop(0, "#fff6c8");
    g.addColorStop(0.45, "#ffc2e8");
    g.addColorStop(0.8, "#9fd8ff");
    g.addColorStop(1, "#6a4aa8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(60, 30, 90, 0.35)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.quadraticCurveTo(size * 0.5, size * (0.15 + k * 0.18), size, size * (0.05 + k * 0.22));
        ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

const wingShapes = () => {
    // Built in the +X half; the body runs along Z.
    const fore = new THREE.Shape();
    fore.moveTo(0, 0.01);
    fore.bezierCurveTo(0.04, 0.09, 0.13, 0.11, 0.14, 0.06);
    fore.bezierCurveTo(0.15, 0.02, 0.09, -0.01, 0, -0.005);
    const hind = new THREE.Shape();
    hind.moveTo(0, -0.005);
    hind.bezierCurveTo(0.07, -0.01, 0.1, -0.05, 0.08, -0.08);
    hind.bezierCurveTo(0.06, -0.1, 0.02, -0.06, 0, -0.02);
    const toGeometry = (shape: THREE.Shape) => {
        const g = new THREE.ShapeGeometry(shape, 12);
        g.rotateX(-Math.PI / 2); // lie flat; the shape's +Y becomes forward (-Z)
        // UVs from position so the gradient spreads out from the body.
        const pos = g.attributes.position as THREE.BufferAttribute;
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            uv[i * 2] = pos.getX(i) / 0.15;
            uv[i * 2 + 1] = 0.5 - pos.getZ(i) / 0.25;
        }
        g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        return g;
    };
    return { fore: toGeometry(fore), hind: toGeometry(hind) };
};

export const ForestPiano: React.FC = () => {
    const playing = useStudioMusic((s) => s.playing);
    const status = useStudioMusic((s) => s.status);
    const aim = useAimTargets();

    // Start the Song of the Forest on arrival; stop it on the way out.
    useEffect(() => {
        openStudioMusic(() => {
            window.setTimeout(() => {
                if (useStudioMusic.getState().current === null) playTrack(0);
            }, 600);
        }, CHILDYLLIC);
        return () => closeStudioMusic();
    }, []);
    useEffect(() => {
        if (playing) useAchievementStore.getState().unlock("forest-childyllic");
    }, [playing]);

    const resources = useMemo(() => {
        const glow = glowTexture();
        const wingMap = wingTexture();
        const wings = wingShapes();
        const wingMaterial = new THREE.MeshBasicMaterial({
            map: wingMap,
            transparent: true,
            opacity: 0.88,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
        });
        const positions = new Float32Array(NOTES * 3).fill(-100);
        const notes = new THREE.BufferGeometry();
        notes.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return { glow, wingMap, wings, wingMaterial, notes, positions, life: new Float32Array(NOTES), next: 0, lastSpawn: 0 };
    }, []);
    useEffect(
        () => () => {
            resources.glow.dispose();
            resources.wingMap.dispose();
            resources.wings.fore.dispose();
            resources.wings.hind.dispose();
            resources.wingMaterial.dispose();
            resources.notes.dispose();
        },
        [resources]
    );

    const keys = useRef<(THREE.Mesh | null)[]>([]);
    const pressed = useRef(new Float32Array(KEYS));
    const fairy = useRef<THREE.Group>(null);
    const wingSides = useRef<(THREE.Group | null)[]>([]);
    const fairyLight = useRef<THREE.PointLight>(null);
    const route = useRef({ from: 6, to: 6, beat: -1 });

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        const isPlaying = useStudioMusic.getState().playing;
        const keyX = (i: number) => (i - (KEYS - 1) / 2) * KEY_WIDTH;

        if (fairy.current) {
            if (isPlaying) {
                // One move per beat: lift off, drift over, settle down.
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
            }
        }
        // Slow, soft wingbeats - a butterfly, not a bee.
        const flap = Math.sin(t * (isPlaying ? 5 : 3.2)) * 0.55 + 0.35;
        wingSides.current.forEach((side, i) => {
            if (side) side.rotation.z = (i === 0 ? 1 : -1) * flap;
        });
        if (fairyLight.current) fairyLight.current.intensity = isPlaying ? 0.9 + Math.sin((t / BEAT) * Math.PI * 2) * 0.3 : 0.6;

        keys.current.forEach((key, i) => {
            if (i !== route.current.to || !isPlaying) pressed.current[i] = Math.max(0, pressed.current[i] - delta * 3);
            if (key) key.position.y = KEYS_Y - pressed.current[i] * 0.008;
        });

        // A note floats up off the keys on each beat.
        if (isPlaying && t - resources.lastSpawn > BEAT) {
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
                    use: togglePlayback,
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
                    <mesh raycast={() => null}>
                        <capsuleGeometry args={[0.007, 0.03, 4, 8]} />
                        <meshBasicMaterial color="#fff6e0" toneMapped={false} />
                    </mesh>
                    <sprite scale={[0.16, 0.16, 1]} raycast={() => null}>
                        <spriteMaterial map={resources.glow} color="#ffe58a" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                    </sprite>
                    {[1, -1].map((side, i) => (
                        <group
                            key={side}
                            ref={(g) => {
                                wingSides.current[i] = g;
                            }}
                            scale={[side, 1, 1]}
                        >
                            <mesh geometry={resources.wings.fore} material={resources.wingMaterial} raycast={() => null} />
                            <mesh geometry={resources.wings.hind} material={resources.wingMaterial} raycast={() => null} />
                        </group>
                    ))}
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
