import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { buyCharacter, isCharacterUnlocked, useCharacterStore } from "../../stores/characterStore";
import { useUnlockStore } from "../../stores/unlockStore";
import { useRupeeStore } from "../../stores/rupeeStore";
import { useFairyStore } from "../rooms/experiences/forest/fairyStore";
import { CHARACTERS, PALETTE, characterAt, lookFor, newMotion } from "../../multiplayer/characters";
import { RupeeGlyph } from "./RupeeGlyph";
import { playSound } from "../../audio/soundManager";

// Picked before stepping into the world. The world itself is already
// mounted underneath and loading its starting room the whole time, so by
// the time someone's chosen, there's usually nothing left to wait for.

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const isFairy = (i: number) => Boolean(CHARACTERS[i].fairy);
const FAIRIES = CHARACTERS.map((_, i) => i).filter(isFairy);
/** "Rose", "Queen", ... - short enough for a button. */
const fairyLabel = (i: number) => {
    const key = CHARACTERS[i].fairy!.caughtKey;
    return key[0].toUpperCase() + key.slice(1);
};

export const CharacterSelect: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
    const { character, color, setCharacter, setColor, entered } = useCharacterStore(
        useShallow((s) => ({
            character: s.character,
            color: s.color,
            setCharacter: s.setCharacter,
            setColor: s.setColor,
            entered: s.entered,
        }))
    );
    const caught = useFairyStore((s) => s.caught);
    const purchased = useUnlockStore((s) => s.unlocked);
    const wallet = useRupeeStore((s) => s.totalValue);
    const unlocked = (i: number) => isCharacterUnlocked(i, caught, purchased);
    const { progress, active } = useProgress();
    const ready = !active || progress >= 100;
    const def = characterAt(character);
    const canEnter = unlocked(character);
    const price = def.fairy?.price ?? 0;
    const regal = def.fairy?.caughtKey === "queen" || def.fairy?.caughtKey === "king";

    const pick = (i: number) => {
        setCharacter(i);
        playSound("ui-select");
    };
    const confirm = () => {
        if (useCharacterStore.getState().character === character && canEnter) onConfirm();
    };
    const buy = () => {
        if (buyCharacter(character)) {
            playSound("rupee-spend");
            window.setTimeout(() => playSound("door-unlock"), 220);
        } else {
            playSound("door-locked");
        }
    };

    // Arrow keys / A-D flip through characters, Enter confirms.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const step = event.key === "ArrowRight" || event.key === "d" ? 1 : event.key === "ArrowLeft" || event.key === "a" ? -1 : 0;
            if (step) {
                pick((useCharacterStore.getState().character + step + CHARACTERS.length) % CHARACTERS.length);
            } else if (event.key === "Enter") {
                confirm();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const kinds = [
        { label: "Pip", selected: character === 0, onClick: () => pick(0) },
        { label: "Wisp", selected: character === 1, onClick: () => pick(1) },
        {
            label: "Fairy",
            selected: isFairy(character),
            // Straight to one you've got, if any.
            onClick: () => pick(isFairy(character) ? character : FAIRIES.find(unlocked) ?? FAIRIES[0]),
        },
    ];

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 guide-backdrop overflow-y-auto"
            // Keep clicks from reaching the document-level "click to lock".
            onClick={(event) => event.stopPropagation()}
        >
            <div
                className="gem gem--lg gem--purple w-full max-w-[880px] p-5 md:p-7 guide-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="character-title"
            >
                <div className="gem-label">{entered ? "Change who you are" : "Before you step in"}</div>
                <h2 id="character-title" className="botw-title text-3xl md:text-4xl leading-none mt-1">
                    Choose your traveler
                </h2>
                <div className="botw-rule botw-rule--left" />

                <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                    <div className="flex flex-col rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                        <div className="relative aspect-[4/3] md:aspect-auto md:flex-1 md:min-h-[300px]">
                            <Canvas
                                dpr={[1, 2]}
                                camera={{ fov: 32, position: [0, 1.4, 4.2] }}
                                gl={{ antialias: true, alpha: true }}
                                style={{ position: "absolute", inset: 0 }}
                            >
                                <Preview character={character} color={lookFor(character, color)} />
                            </Canvas>
                            {!canEnter && (
                                <div className="absolute top-3 left-3 gem-chip text-xs" aria-hidden>
                                    🔒 Locked
                                </div>
                            )}
                        </div>
                        <div className="px-3 pb-3 pt-1 text-center">
                            <div className="botw-title text-2xl leading-none">{def.name}</div>
                            <div className="text-xs mt-1 text-[color:var(--gem-ink-dim)]">{def.tagline}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 min-w-0">
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Character">
                            {kinds.map((k) => (
                                <button
                                    key={k.label}
                                    role="radio"
                                    aria-checked={k.selected}
                                    className={`gem-btn !justify-center !py-2.5 !text-sm ${k.selected ? "gem-btn--solid gem--purple" : ""}`}
                                    onClick={k.onClick}
                                >
                                    <span className="gem-glint" />
                                    {k.label}
                                </button>
                            ))}
                        </div>

                        {isFairy(character) ? (
                            <div>
                                <div className="gem-label mb-2">Which fairy</div>
                                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Fairy">
                                    {FAIRIES.map((i) => (
                                        <button
                                            key={i}
                                            role="radio"
                                            aria-checked={i === character}
                                            className={`gem-btn !justify-start !py-1.5 !text-xs ${i === character ? "gem-btn--solid gem--gold" : ""}`}
                                            onClick={() => pick(i)}
                                        >
                                            <span className="gem-glint" />
                                            <span
                                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ background: hex(CHARACTERS[i].fairy!.color), boxShadow: `0 0 8px ${hex(CHARACTERS[i].fairy!.color)}` }}
                                            />
                                            {fairyLabel(i)}
                                            {!unlocked(i) && <span className="ml-auto opacity-70" aria-label="locked">🔒</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="gem-label mb-2">Color</div>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
                                    {PALETTE.map((c) => (
                                        <button
                                            key={c}
                                            role="radio"
                                            aria-checked={c === color}
                                            aria-label={hex(c)}
                                            onClick={() => setColor(c)}
                                            className="w-8 h-8 rounded-full transition-transform"
                                            style={{
                                                background: hex(c),
                                                boxShadow:
                                                    c === color
                                                        ? `0 0 0 2px rgba(10,8,22,0.9), 0 0 0 4px #fff, 0 0 14px ${hex(c)}`
                                                        : "inset 0 0 0 1px rgba(255,255,255,0.25)",
                                                transform: c === color ? "scale(1.1)" : undefined,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {canEnter ? (
                            <p className="text-sm leading-relaxed text-[color:var(--gem-ink-dim)]">
                                Other visitors in the same room will see you as this, and you&rsquo;ll see them.
                                You can change it any time from the pause menu.
                            </p>
                        ) : (
                            <div className="gem gem--sm gem--gold p-3 text-sm">
                                <p className="leading-relaxed">
                                    {regal ? "Catch the " : /^[AEIOU]/.test(def.name) ? "Catch an " : "Catch a "}
                                    <strong>{regal ? def.name : `${def.name} Fairy`}</strong> in the forest to travel as{" "}
                                    {regal ? "them" : "one"}, or buy it now.
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-xs text-[color:var(--gem-ink-dim)] flex items-center gap-1">
                                        You have <RupeeGlyph size={14} /> {wallet}
                                    </span>
                                    <button
                                        className="gem-btn gem-btn--solid gem--gold !text-sm !py-1.5"
                                        onClick={buy}
                                        disabled={wallet < price}
                                        style={wallet < price ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                    >
                                        <span className="gem-glint" />
                                        Buy for <RupeeGlyph size={14} /> {price}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                            <div className="text-xs text-[color:var(--gem-ink-dim)] flex items-center gap-2" aria-live="polite">
                                <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ background: ready ? "#3ee58f" : "#ffd36b" }}
                                />
                                {ready ? "World ready" : `World loading… ${Math.round(progress)}%`}
                            </div>
                            <button
                                className="gem-btn gem-btn--solid gem--green !text-base !px-6 !py-3"
                                onClick={confirm}
                                disabled={!canEnter}
                                style={canEnter ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
                                autoFocus
                            >
                                <span className="gem-glint" />
                                {entered ? "Done" : "Step in"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** The chosen character on a little turntable, alternating idle and walking. */
const Preview: React.FC<{ character: number; color: number }> = ({ character, color }) => {
    const turntable = useRef<THREE.Group>(null);
    const motion = useMemo(newMotion, []);
    const tint = useMemo(() => new THREE.Color(color), [color]);
    const def = characterAt(character);
    const camera = useThree((s) => s.camera);

    // Frame each character by its height so Pip isn't a speck; fairies
    // (whose wings lie flat) are seen from a little above.
    const target = useRef(new THREE.Vector3());
    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        turntable.current!.rotation.y = Math.PI + Math.sin(t * 0.35) * 0.7;
        // A few seconds standing, a few seconds walking, to show both moods.
        motion.speed = Math.sin(t * 0.6) > 0.2 ? 2.4 : 0;
        motion.pitch = Math.sin(t * 0.5) * 0.25;
        const h = def.height;
        const f = def.framing ?? { eye: h * 0.62, target: h * 0.48, distance: 1.6 + h * 1.35 };
        const k = Math.min(1, delta * 4);
        camera.position.lerp(new THREE.Vector3(0, f.eye, f.distance), k);
        target.current.lerp(new THREE.Vector3(0, f.target, 0), k);
        camera.lookAt(target.current);
    });

    return (
        <>
            <ambientLight intensity={0.55} />
            <directionalLight position={[2, 4, 3]} intensity={1.6} />
            <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#9fb8ff" />
            <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
                <circleGeometry args={[1.1, 48]} />
                <meshStandardMaterial color="#1c1830" roughness={0.9} transparent opacity={0.85} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
                <ringGeometry args={[1.05, 1.1, 64]} />
                <meshBasicMaterial color={tint} transparent opacity={0.7} />
            </mesh>
            <group ref={turntable}>
                <def.Model key={character} color={tint} motion={motion} />
            </group>
        </>
    );
};
