import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { trackMeta, waveformNow } from "./crate";
import { engineRef } from "./djEngine";
import { DeckId, DjShared, isRolling, positionAt, now, useDj } from "./djStore";

// The booth as the room sees it: two CDJs either side of a DJM, every knob,
// fader, pad and platter where the shared booth state says it is. So when
// someone's at the decks, everyone watching sees their hands' work - the
// platter dragged back in a scratch, the low EQ killed, the crossfader cut.
//
// Nothing here re-renders as the music plays; it's all moved per frame.
// The DJ stands on the -Z side looking +Z, so "their left" is +X.

const DECK_COLOR: Record<DeckId, string> = { a: "#ff2975", b: "#00ffdd" };
const HOT_COLORS = ["#3ee58f", "#ff3b4e", "#ff9a1f", "#ffd23c", "#3fa9ff", "#b07bff", "#ff5cd1", "#30e3ca"];
export const CDJ_SIZE: [number, number] = [0.95, 0.75];
export const MIXER_SIZE: [number, number] = [0.72, 0.76];
const SECONDS_PER_TURN = 1.8;
// Flat labels read the right way up for the DJ.
const DJ_LABEL: [number, number, number] = [-Math.PI / 2, 0, Math.PI];

const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#1c1c22", roughness: 0.4, metalness: 0.5 });
const plateMaterial = new THREE.MeshStandardMaterial({ color: "#26252d", roughness: 0.45, metalness: 0.55 });
const slotMaterial = new THREE.MeshBasicMaterial({ color: "#060608" });
const capMaterial = new THREE.MeshStandardMaterial({ color: "#d8d6de", roughness: 0.3, metalness: 0.7 });
const knobMaterial = new THREE.MeshStandardMaterial({ color: "#18171d", roughness: 0.35, metalness: 0.6 });
const platterMaterial = new THREE.MeshStandardMaterial({ color: "#0d0d11", roughness: 0.22, metalness: 0.4 });
const ringMetal = new THREE.MeshStandardMaterial({ color: "#6a6974", roughness: 0.25, metalness: 0.9 });
const white = new THREE.MeshBasicMaterial({ color: "#f4f2ff" });

const led = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
const setLed = (material: THREE.MeshBasicMaterial, color: string, level: number) => {
    material.color.set(color).multiplyScalar(0.08 + level * 0.92);
};

// The deck's screen: the track's waveform, the played part dimmed, the
// playhead, and the title.
const useDeckScreen = (id: DeckId) => {
    const { canvas, texture } = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 128;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return { canvas, texture };
    }, []);
    useEffect(() => () => texture.dispose(), [texture]);
    const draw = (s: DjShared) => {
        const g = canvas.getContext("2d")!;
        const { width: w, height: h } = canvas;
        g.fillStyle = "#06070b";
        g.fillRect(0, 0, w, h);
        const deck = s.decks[id];
        const meta = trackMeta(deck.track);
        g.font = "700 18px Manrope, sans-serif";
        g.fillStyle = DECK_COLOR[id];
        g.fillText(id === "a" ? "1" : "2", 10, 24);
        if (!meta || !deck.track) {
            g.fillStyle = "#5f5b70";
            g.fillText("NO TRACK", 34, 24);
        } else {
            g.fillStyle = "#e9e6f2";
            g.fillText(meta.title.slice(0, 22), 34, 24);
            const wave = waveformNow(deck.track);
            const top = 40;
            const lane = h - top - 8;
            const mid = top + lane / 2;
            if (wave) {
                const colors = ["#2b6cff", "#ff9a1f", "#f4f2ff"];
                const scales = [1, 0.7, 0.42];
                for (let band = 0; band < 3; band++) {
                    g.fillStyle = colors[band];
                    for (let x = 0; x < w; x++) {
                        const c = Math.floor((x / w) * wave.columns);
                        const v = (wave.data[c * 3 + band] / 255) * (lane / 2) * scales[band];
                        if (v > 0.5) g.fillRect(x, mid - v, 1, v * 2);
                    }
                }
            }
            const x = (positionAt(s, id, now()) / meta.duration) * w;
            g.fillStyle = "rgba(6, 7, 11, 0.6)";
            g.fillRect(0, top, x, lane);
            g.fillStyle = "#ff3b4e";
            g.fillRect(x - 1, top, 3, lane);
        }
        texture.needsUpdate = true;
    };
    return { texture, draw };
};

const Cdj: React.FC<{
    id: DeckId;
    position: [number, number, number];
    bindRef?: (o: THREE.Object3D | null) => void;
    fallbackSpin: React.MutableRefObject<boolean>;
}> = ({ id, position, bindRef, fallbackSpin }) => {
    const platter = useRef<THREE.Group>(null);
    const tempoCap = useRef<THREE.Mesh>(null);
    const materials = useMemo(
        () => ({
            ring: led(DECK_COLOR[id]),
            play: led("#3ee58f"),
            cue: led("#ff9a1f"),
            sync: led("#3fa9ff"),
            pads: HOT_COLORS.map(led),
        }),
        [id]
    );
    useEffect(() => () => Object.values(materials).flat().forEach((m) => m.dispose()), [materials]);
    const screen = useDeckScreen(id);
    const frame = useRef(0);

    useFrame((state, delta) => {
        const s = useDj.getState();
        const deck = s.decks[id];
        const t = state.clock.elapsedTime;
        const rolling = isRolling(s, id);
        if (platter.current) {
            if (deck.track) platter.current.rotation.y = -(positionAt(s, id, now()) / SECONDS_PER_TURN) * Math.PI * 2;
            else if (fallbackSpin.current) platter.current.rotation.y -= ((Math.PI * 2) / SECONDS_PER_TURN) * delta;
        }
        if (tempoCap.current) tempoCap.current.position.z = 0.08 + deck.tempo * 0.1;
        const blink = Math.floor(t * 2) % 2 === 0 ? 1 : 0.15;
        setLed(materials.ring, deck.scratch ? "#ffffff" : DECK_COLOR[id], rolling || fallbackSpin.current ? 1 : deck.track ? 0.35 : 0.1);
        setLed(materials.play, "#3ee58f", rolling ? 1 : deck.track ? blink : 0.05);
        setLed(materials.cue, "#ff9a1f", deck.track ? (rolling ? 0.6 : blink) : 0.05);
        setLed(materials.sync, "#3fa9ff", deck.sync ? 1 : 0.05);
        deck.hot.forEach((at, i) => setLed(materials.pads[i], HOT_COLORS[i], at !== null ? 1 : 0.08));
        if (++frame.current % 6 === 0) screen.draw(s);
    });

    const [w, d] = CDJ_SIZE;
    return (
        <group position={position}>
            <mesh position={[0, 0.045, 0]} material={bodyMaterial} ref={bindRef}>
                <boxGeometry args={[w, 0.09, d]} />
            </mesh>
            {/* Screen, raised along the far edge and tilted toward the DJ */}
            <group position={[0, 0.13, d / 2 - 0.07]} rotation={[0.5, Math.PI, 0]}>
                <mesh material={bodyMaterial}>
                    <boxGeometry args={[0.62, 0.22, 0.03]} />
                </mesh>
                <mesh position={[0, 0, 0.016]}>
                    <planeGeometry args={[0.56, 0.2]} />
                    <meshBasicMaterial map={screen.texture} toneMapped={false} />
                </mesh>
            </group>
            {/* Hot cue pads across the top */}
            {HOT_COLORS.map((_, i) => (
                <mesh key={i} position={[0.245 - i * 0.07, 0.093, 0.17]} material={materials.pads[i]}>
                    <boxGeometry args={[0.052, 0.008, 0.04]} />
                </mesh>
            ))}
            {/* Jog wheel */}
            <mesh position={[0, 0.095, -0.08]} rotation={[-Math.PI / 2, 0, 0]} material={materials.ring}>
                <ringGeometry args={[0.235, 0.25, 48]} />
            </mesh>
            <mesh position={[0, 0.098, -0.08]} material={ringMetal}>
                <cylinderGeometry args={[0.232, 0.232, 0.014, 48]} />
            </mesh>
            <group ref={platter} position={[0, 0.108, -0.08]}>
                <mesh material={platterMaterial}>
                    <cylinderGeometry args={[0.2, 0.2, 0.012, 48]} />
                </mesh>
                <mesh position={[0, 0.0065, -0.13]} material={white}>
                    <boxGeometry args={[0.012, 0.002, 0.11]} />
                </mesh>
                <mesh position={[0, 0.007, 0]}>
                    <cylinderGeometry args={[0.07, 0.07, 0.002, 32]} />
                    <meshBasicMaterial color="#05060a" />
                </mesh>
            </group>
            {/* PLAY and CUE, the DJ's near-left corner */}
            {[
                { z: -0.3, material: materials.cue, text: "CUE" },
                { z: -0.19, material: materials.play, text: "PLAY" },
            ].map((b) => (
                <group key={b.text} position={[0.37, 0.093, b.z]}>
                    <mesh material={b.material}>
                        <cylinderGeometry args={[0.04, 0.04, 0.012, 24]} />
                    </mesh>
                    <Text position={[-0.06, 0.008, 0]} rotation={DJ_LABEL} fontSize={0.022} color="#9a96a8" anchorX="center" anchorY="middle">
                        {b.text}
                    </Text>
                </group>
            ))}
            {/* Tempo fader down the right side, SYNC above it */}
            <mesh position={[-0.39, 0.0905, 0.08]} material={slotMaterial}>
                <boxGeometry args={[0.014, 0.002, 0.24]} />
            </mesh>
            <mesh ref={tempoCap} position={[-0.39, 0.1, 0.08]} material={capMaterial}>
                <boxGeometry args={[0.05, 0.016, 0.026]} />
            </mesh>
            <mesh position={[-0.39, 0.093, 0.25]} material={materials.sync}>
                <boxGeometry args={[0.05, 0.008, 0.03]} />
            </mesh>
        </group>
    );
};

const Mixer: React.FC<{ position: [number, number, number]; bindRef?: (o: THREE.Object3D | null) => void }> = ({ position, bindRef }) => {
    const knobs = useRef<Record<string, THREE.Group | null>>({});
    const faders = useRef<Record<string, THREE.Mesh | null>>({});
    const xfader = useRef<THREE.Mesh>(null);
    const vu = useRef<(THREE.Mesh | null)[]>([]);
    const fxMaterial = useMemo(() => led("#3fa9ff"), []);
    const vuMaterials = useMemo(() => [led(DECK_COLOR.a), led(DECK_COLOR.b), led("#3ee58f"), led("#3ee58f")], []);
    useEffect(
        () => () => {
            fxMaterial.dispose();
            vuMaterials.forEach((m) => m.dispose());
        },
        [fxMaterial, vuMaterials]
    );
    const level = useRef([0, 0, 0, 0]);

    // Channel 1 sits on the DJ's left (+X).
    const columns: { id: DeckId; x: number }[] = [
        { id: "a", x: 0.2 },
        { id: "b", x: -0.2 },
    ];
    const rows = ["trim", "hi", "mid", "low", "color"] as const;
    const rowZ = (i: number) => 0.3 - i * 0.085;

    useFrame((_, delta) => {
        const s = useDj.getState();
        columns.forEach(({ id }) => {
            rows.forEach((key) => {
                const g = knobs.current[`${id}-${key}`];
                if (g) g.rotation.y = -s.ch[id][key] * Math.PI * 0.75;
            });
            const f = faders.current[id];
            if (f) f.position.z = -0.27 + s.ch[id].fader * 0.14;
        });
        if (xfader.current) xfader.current.position.x = -s.xfader * 0.11; // B is to the DJ's right (-X)
        setLed(fxMaterial, "#3fa9ff", s.fx.on ? 1 : 0.06);
        const levels = engineRef.current?.levels();
        const raw = levels ? [levels.a, levels.b, levels.l, levels.r] : [0, 0, 0, 0];
        raw.forEach((v, i) => {
            const target = v > 0 ? Math.max(0, 1 + (20 * Math.log10(v)) / 45) : 0;
            level.current[i] = target > level.current[i] ? target : Math.max(target, level.current[i] - delta * 1.5);
            const bar = vu.current[i];
            if (bar) {
                const l = Math.max(0.02, level.current[i]);
                bar.scale.z = l;
                bar.position.z = -0.27 + 0.07 * l; // filling away from the DJ
            }
        });
    });

    const [w, d] = MIXER_SIZE;
    return (
        <group position={position}>
            <mesh position={[0, 0.04, 0]} material={plateMaterial} ref={bindRef}>
                <boxGeometry args={[w, 0.08, d]} />
            </mesh>
            {columns.map(({ id, x }) => (
                <group key={id}>
                    {rows.map((key, i) => (
                        <group
                            key={key}
                            position={[x, 0.08, rowZ(i)]}
                            ref={(g) => {
                                knobs.current[`${id}-${key}`] = g;
                            }}
                        >
                            <mesh position={[0, 0.018, 0]} material={knobMaterial}>
                                <cylinderGeometry args={[key === "color" ? 0.04 : 0.03, key === "color" ? 0.044 : 0.034, 0.036, 20]} />
                            </mesh>
                            <mesh position={[0, 0.037, 0.018]} material={white}>
                                <boxGeometry args={[0.006, 0.003, 0.022]} />
                            </mesh>
                        </group>
                    ))}
                    {/* Channel fader */}
                    <mesh position={[x, 0.081, -0.2]} material={slotMaterial}>
                        <boxGeometry args={[0.012, 0.002, 0.16]} />
                    </mesh>
                    <mesh
                        position={[x, 0.09, -0.2]}
                        material={capMaterial}
                        ref={(m) => {
                            faders.current[id] = m;
                        }}
                    >
                        <boxGeometry args={[0.05, 0.016, 0.024]} />
                    </mesh>
                </group>
            ))}
            {/* Meters: channel 1, channel 2, master L and R */}
            {[0.075, -0.075, 0.02, -0.02].map((x, i) => (
                <group key={i}>
                    <mesh position={[x, 0.081, -0.2]} material={slotMaterial}>
                        <boxGeometry args={[0.014, 0.002, 0.15]} />
                    </mesh>
                    <mesh
                        position={[x, 0.083, -0.27]}
                        material={vuMaterials[i]}
                        ref={(m) => {
                            vu.current[i] = m;
                        }}
                    >
                        <boxGeometry args={[0.01, 0.002, 0.14]} />
                    </mesh>
                </group>
            ))}
            {/* Crossfader */}
            <mesh position={[0, 0.081, -0.335]} material={slotMaterial}>
                <boxGeometry args={[0.26, 0.002, 0.012]} />
            </mesh>
            <mesh ref={xfader} position={[0, 0.09, -0.335]} material={capMaterial}>
                <boxGeometry args={[0.024, 0.016, 0.05]} />
            </mesh>
            {/* Beat FX button */}
            <mesh position={[0, 0.084, 0.3]} material={fxMaterial}>
                <boxGeometry args={[0.06, 0.008, 0.035]} />
            </mesh>
            <Text position={[0, 0.082, 0.25]} rotation={DJ_LABEL} fontSize={0.02} color="#9a96a8" anchorX="center" anchorY="middle">
                BEAT FX
            </Text>
        </group>
    );
};

export const DjBooth3D: React.FC<{
    deckX: number;
    bindCdj?: (id: DeckId) => ((o: THREE.Object3D | null) => void) | undefined;
    bindMixer?: (o: THREE.Object3D | null) => void;
    // SoundCloud fallback: no booth state, just spin while the music plays.
    fallbackPlaying?: boolean;
}> = ({ deckX, bindCdj, bindMixer, fallbackPlaying = false }) => {
    const spin = useRef(fallbackPlaying);
    spin.current = fallbackPlaying;
    return (
        <>
            <Cdj id="a" position={[deckX, 0, 0]} bindRef={bindCdj?.("a")} fallbackSpin={spin} />
            <Cdj id="b" position={[-deckX, 0, 0]} bindRef={bindCdj?.("b")} fallbackSpin={spin} />
            <Mixer position={[0, 0, 0]} bindRef={bindMixer} />
        </>
    );
};
