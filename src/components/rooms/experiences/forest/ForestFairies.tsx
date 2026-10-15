import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore } from "../../../../stores/sceneStore";
import { useAchievementStore } from "../../../../stores/achievementStore";
import { playSound } from "../../../../audio/soundManager";
import { GemPrompt } from "../../../ui/GemPrompt";
import { ButterflyFairy, FAIRY_KINDS, butterflyAssets } from "./butterfly";
import { REGAL, RegalFairy, RegalKind } from "./regalFairy";
import { ForestLayout, SPAWN_CLEARING, distanceToWater, mulberry32 } from "./forestGen";
import { forestSky } from "./dayCycle";
import { useFairyStore } from "./fairyStore";

// Royal fairies living wild in the forest: a handful scattered through the
// woods, more around the ponds and creeks, hovering close to the ground.
// Walk up close and they lift and drift out of your way; run, and they
// scatter, high and fast. Sneak up (crouch-walking is slow enough) and
// press E to catch one. Very occasionally the Fairy Queen or the Fairy King
// is about too - warier, and much harder to catch.

const WOODS_FAIRIES = 10;
const WALK_SPEED = 2.5; // m/s: walking (4) unsettles them; crouching (2) doesn't
const RUN_SPEED = 6; // sprinting (8) scares them off
const REACH = 1.9; // how close you have to be to catch one
const QUEEN_CHANCE = 0.12; // per visit
const KING_CHANCE = 0.12;

type Mood = "idle" | "wary" | "fled";
type Kind = number | RegalKind; // a colourway index, or royalty

interface Fairy {
    home: THREE.Vector3;
    kind: Kind;
    seed: number;
}

const isRegal = (kind: Kind): kind is RegalKind => typeof kind === "string";
const nameOf = (kind: Kind) => (isRegal(kind) ? REGAL[kind].name : `${FAIRY_KINDS[kind].name} Royal Fairy`);

interface FairyState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    target: THREE.Vector3;
    mood: Mood;
    moodSince: number;
    fleeTo: THREE.Vector3;
    caughtAt: number; // clock time, or -1
}

const placeFairies = (layout: ForestLayout): Fairy[] => {
    const rand = mulberry32(layout.trees.length * 13 + 5);
    const fairies: Fairy[] = [];
    const hover = () => 0.25 + rand() * 0.4;
    // By the water: several round every pond, a few along each creek.
    layout.ponds.forEach((pond) => {
        const count = 3 + Math.floor(rand() * 3);
        for (let i = 0; i < count; i++) {
            const a = rand() * Math.PI * 2;
            const d = pond.r * (0.6 + rand() * 0.6);
            fairies.push({ home: new THREE.Vector3(pond.x + Math.cos(a) * d, hover(), pond.z + Math.sin(a) * d), kind: Math.floor(rand() * 4), seed: rand() * 100 });
        }
    });
    layout.creeks.forEach((creek) => {
        for (let i = 0; i < 3; i++) {
            const [x, z] = creek[Math.floor(rand() * creek.length)];
            fairies.push({ home: new THREE.Vector3(x + (rand() - 0.5) * 1.5, hover(), z + (rand() - 0.5) * 1.5), kind: 1, seed: rand() * 100 });
        }
    });
    // A few out in the woods, away from the water and the arrival glade.
    const dryWoods = () => {
        for (let tries = 0; tries < 300; tries++) {
            const a = rand() * Math.PI * 2;
            const d = SPAWN_CLEARING + 4 + rand() * 30;
            const x = Math.cos(a) * d;
            const z = Math.sin(a) * d;
            if (distanceToWater(x, z, layout) < 4) continue;
            if (layout.trees.some((t) => Math.hypot(t.x - x, t.z - z) < t.radius + 0.6)) continue;
            return new THREE.Vector3(x, hover(), z);
        }
        return null;
    };
    for (let i = 0; i < WOODS_FAIRIES; i++) {
        const home = dryWoods();
        if (home) fairies.push({ home, kind: Math.floor(rand() * 4), seed: rand() * 100 });
    }
    // Royalty: rare, and not the same every visit. The Queen keeps to the
    // water; the King to the deep woods.
    if (Math.random() < QUEEN_CHANCE && layout.ponds.length) {
        const pond = layout.ponds[Math.floor(Math.random() * layout.ponds.length)];
        fairies.push({ home: new THREE.Vector3(pond.x, 0.75, pond.z), kind: "queen", seed: Math.random() * 100 });
    }
    if (Math.random() < KING_CHANCE) {
        const home = dryWoods();
        if (home) fairies.push({ home: home.setY(0.8), kind: "king", seed: Math.random() * 100 });
    }
    return fairies;
};

const WildFairy: React.FC<{ fairy: Fairy; register: (state: FairyState) => void }> = ({ fairy, register }) => {
    const group = useRef<THREE.Group>(null);
    const flap = useRef(4);
    const regal = isRegal(fairy.kind);
    const state = useMemo<FairyState>(
        () => ({
            position: fairy.home.clone(),
            velocity: new THREE.Vector3(),
            target: new THREE.Vector3(),
            mood: "idle",
            moodSince: 0,
            fleeTo: new THREE.Vector3(),
            caughtAt: -1,
        }),
        [fairy]
    );
    useEffect(() => register(state), [register, state]);
    const away = useMemo(() => new THREE.Vector3(), []);
    const steer = useMemo(() => new THREE.Vector3(), []);

    useFrame(({ clock }, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        const now = clock.elapsedTime;
        const g = group.current;
        const s = state;

        // Caught: a bright flash, a little spiral up, and gone.
        if (s.caughtAt >= 0) {
            if (!g) return;
            const k = Math.min(1, (now - s.caughtAt) / 0.7);
            g.scale.setScalar(Math.max(0.001, (1 + Math.sin(k * Math.PI) * 0.8) * (1 - k)));
            g.position.y = s.position.y + k * 0.6;
            g.rotation.y += delta * 14;
            g.visible = k < 1;
            return;
        }

        const t = now + fairy.seed;
        const scene = useSceneStore.getState();
        const [px, , pz] = scene.playerPosition;
        const [vx, , vz] = scene.playerVelocity;
        const speed = Math.hypot(vx, vz);
        const distance = Math.hypot(s.position.x - px, s.position.z - pz);
        away.set(s.position.x - px, 0, s.position.z - pz);
        if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
        away.normalize();

        // Royalty notice you from further off.
        const scareRange = regal ? 13 : 9;
        const waryRange = regal ? 5 : 3.5;
        if (speed > RUN_SPEED && distance < scareRange && s.mood !== "fled") {
            s.mood = "fled";
            s.moodSince = now;
            s.fleeTo
                .copy(s.position)
                .addScaledVector(away, 8 + Math.random() * 6)
                .add(steer.set((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4));
        } else if (s.mood === "fled") {
            const calm = speed < RUN_SPEED || distance > 16;
            if (calm && now - s.moodSince > (regal ? 12 : 7)) s.mood = "idle";
            else if (!calm) s.moodSince = now;
        } else if (speed > WALK_SPEED && distance < waryRange) {
            s.mood = "wary";
            s.moodSince = now;
        } else if (s.mood === "wary" && (speed <= WALK_SPEED || distance > waryRange + 1.5) && now - s.moodSince > 2) {
            s.mood = "idle";
        }

        const bob = Math.sin(t * 1.7) * 0.06;
        const loop = regal ? 1.4 : 0.8;
        if (s.mood === "fled") {
            s.target.copy(s.fleeTo);
            s.target.y += bob;
        } else if (s.mood === "wary") {
            s.target
                .copy(fairy.home)
                .addScaledVector(away, Math.max(0, waryRange - distance) + 1.2)
                .setY(fairy.home.y + 0.8 + bob);
        } else {
            s.target.set(
                fairy.home.x + Math.sin(t * 0.37) * loop + Math.sin(t * 0.91) * 0.25,
                fairy.home.y + bob + Math.sin(t * 0.53) * 0.08,
                fairy.home.z + Math.cos(t * 0.31) * loop + Math.cos(t * 0.83) * 0.25
            );
        }
        if (distance < 0.6 && s.mood !== "fled") s.target.addScaledVector(away, 0.6);
        s.target.y = Math.max(0.15, s.target.y);

        const maxSpeed = s.mood === "fled" ? 9 : s.mood === "wary" ? 2.6 : regal ? 0.7 : 0.9;
        const responsiveness = s.mood === "fled" ? 5 : 2.2;
        steer.copy(s.target).sub(s.position).multiplyScalar(responsiveness);
        if (steer.length() > maxSpeed) steer.setLength(maxSpeed);
        s.velocity.lerp(steer, Math.min(1, delta * 4));
        s.position.addScaledVector(s.velocity, delta);

        flap.current = s.mood === "fled" ? 16 : s.mood === "wary" ? 8 : regal ? 3 : 4;
        if (g) {
            g.position.copy(s.position);
            if (s.velocity.lengthSq() > 0.01) {
                const heading = Math.atan2(-s.velocity.x, -s.velocity.z);
                g.rotation.y += Math.atan2(Math.sin(heading - g.rotation.y), Math.cos(heading - g.rotation.y)) * Math.min(1, delta * 5);
                g.rotation.z = THREE.MathUtils.clamp(-s.velocity.x * 0.05, -0.4, 0.4);
            }
        }
    });

    return (
        <group ref={group} position={fairy.home}>
            {regal ? <RegalFairy kind={fairy.kind as RegalKind} flap={flap} /> : <ButterflyFairy kind={fairy.kind as number} flap={flap} glowSize={0.22} />}
        </group>
    );
};

export const ForestFairies: React.FC<{ layout: ForestLayout }> = ({ layout }) => {
    const fairies = useMemo(() => placeFairies(layout), [layout]);
    const states = useRef<(FairyState | null)[]>([]);
    const registers = useMemo(() => fairies.map((_, i) => (state: FairyState) => (states.current[i] = state)), [fairies]);
    const [reachable, setReachable] = useState<number | null>(null);
    const reachableRef = useRef<number | null>(null);
    const promptAnchor = useRef<THREE.Group>(null);
    const [toast, setToast] = useState<{ key: number; text: string; at: [number, number, number] } | null>(null);
    const clockRef = useRef(0);

    // Fairies glow brighter as the light goes.
    useFrame(({ clock }) => {
        clockRef.current = clock.elapsedTime;
        const brightness = 0.45 + forestSky.fairies * 0.55;
        butterflyAssets().glowMaterials.forEach((m) => (m.opacity = brightness));

        // The nearest fairy you could catch right now.
        const [px, py, pz] = useSceneStore.getState().playerPosition;
        const hands = py + 1.1; // roughly where your hands are
        let best: number | null = null;
        let bestDistance = REACH;
        states.current.forEach((s, i) => {
            if (!s || s.caughtAt >= 0 || s.mood === "fled") return;
            const d = Math.hypot(s.position.x - px, (s.position.y - hands) * 0.7, s.position.z - pz);
            if (d < bestDistance) {
                bestDistance = d;
                best = i;
            }
        });
        if (useSceneStore.getState().showStartPrompt) best = null;
        if (best !== reachableRef.current) {
            reachableRef.current = best;
            setReachable(best);
        }
        if (best !== null && promptAnchor.current) {
            promptAnchor.current.position.copy(states.current[best]!.position).y += 0.35;
        }
    });

    useEffect(() => {
        const tryCatch = () => {
            const i = reachableRef.current;
            if (i === null) return;
            const s = states.current[i];
            if (!s || s.caughtAt >= 0) return;
            s.caughtAt = clockRef.current;
            const fairy = fairies[i];
            const name = nameOf(fairy.kind);
            const key = isRegal(fairy.kind) ? fairy.kind : FAIRY_KINDS[fairy.kind].name;
            const count = useFairyStore.getState().catchOne(key);
            playSound(isRegal(fairy.kind) ? "fairy-catch-regal" : "fairy-catch");
            setToast({
                key: Date.now(),
                // The first of each kind also unlocks it as a traveler.
                text: count > 1 ? `Caught a ${name}! (${count} so far)` : `Caught a ${name}! You can travel as one now.`,
                at: [s.position.x, s.position.y + 0.5, s.position.z],
            });
            const achievements = useAchievementStore.getState();
            achievements.unlock("fairy-catch");
            if (fairy.kind === "queen") achievements.unlock("fairy-queen");
            if (fairy.kind === "king") achievements.unlock("fairy-king");
            const caught = useFairyStore.getState().caught;
            if (FAIRY_KINDS.every((k) => caught[k.name])) achievements.unlock("fairy-collection");
            reachableRef.current = null;
            setReachable(null);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat) tryCatch();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("virtualtap", tryCatch);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("virtualtap", tryCatch);
        };
    }, [fairies]);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 2600);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const target = reachable !== null ? fairies[reachable] : null;
    return (
        <>
            {fairies.map((fairy, i) => (
                <WildFairy key={i} fairy={fairy} register={registers[i]} />
            ))}
            <group ref={promptAnchor}>
                {target && (
                    <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                        <GemPrompt accent={isRegal(target.kind) ? "gold" : "green"} action={`Catch the ${nameOf(target.kind)}`} />
                    </Html>
                )}
            </group>
            {toast && (
                <group key={toast.key} position={toast.at}>
                    <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                        <GemPrompt accent="gold" keyLabel={null} action={toast.text} />
                    </Html>
                </group>
            )}
        </>
    );
};
