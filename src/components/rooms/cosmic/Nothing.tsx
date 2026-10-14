import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useCosmicStore } from "./cosmicStore";
import { getGlowTexture } from "./chipDesigns";
import { NOTHING_POSITION } from "./cosmicLayout";
import { seeded } from "../atrium/atriumLayout";

// Across the table: Nothing. There is no one there. Wheels of gold turn
// around an empty middle with a single eye at its centre, light drifts up
// into it, and eyes hang open in the dark around it, more of them as the
// game tightens, all following you. Its chips simply appear over the board.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TYPE_RATE = 34; // characters per second
const PRESENCE_Y = 3.9; // centre of the wheels, above the board

// The eye at the centre of the wheels, always half-awake, then the eyes
// hanging in the void around it (all relative to Nothing).
const CENTRAL_EYE = {
    position: [0, PRESENCE_Y, 0] as [number, number, number],
    size: 0.55,
    wakes: 0,
    blinkOffset: 0,
};
const EYES = [CENTRAL_EYE, ...Array.from({ length: 11 }, (_, i) => {
    const angle = -Math.PI * 0.95 + seeded(i + 31) * Math.PI * 0.9 + (i % 2 ? Math.PI : 0) * 0.08;
    const radius = 3.2 + seeded(i + 47) * 5;
    return {
        position: [
            Math.cos(angle) * radius,
            1.2 + seeded(i + 59) * 7.5,
            Math.sin(angle) * radius * 0.7 - 1.5,
        ] as [number, number, number],
        size: 0.14 + Math.pow(seeded(i + 71), 1.6) * 0.5,
        // Lower numbers open first as the tension rises.
        wakes: seeded(i + 83),
        blinkOffset: seeded(i + 97) * 10,
    };
})];

const Eye: React.FC<{
    position: [number, number, number];
    size: number;
    wakes: number;
    blinkOffset: number;
    materials: { sclera: THREE.Material; iris: THREE.Material; pupil: THREE.Material };
}> = ({ position, size, wakes, blinkOffset, materials }) => {
    const group = useRef<THREE.Group>(null);
    const lid = useRef(0);
    const camera = useThree((s) => s.camera);
    const target = useMemo(() => new THREE.Vector3(), []);

    useFrame(({ clock }, delta) => {
        const g = group.current;
        if (!g) return;
        const t = clock.elapsedTime + blinkOffset;
        const intensity = useCosmicStore.getState().intensity;
        const awake = intensity + 0.15 > wakes;
        // A blink every few seconds, a little out of step with the others.
        const blinking = (t % (4.5 + wakes * 3)) < 0.14;
        const open = awake && !blinking ? 1 : 0;
        lid.current += (open - lid.current) * Math.min(1, delta * (open ? 4 : 18));
        g.scale.set(size, size * Math.max(0.03, lid.current), size);
        g.visible = lid.current > 0.02;
        // Watch the player, with a slight lag.
        target.copy(camera.position);
        g.lookAt(target);
    });

    return (
        <group ref={group} position={position}>
            <mesh material={materials.sclera}>
                <sphereGeometry args={[1, 24, 16]} />
            </mesh>
            <mesh position={[0, 0, 1.005]} material={materials.iris}>
                <circleGeometry args={[0.55, 32]} />
            </mesh>
            <mesh position={[0, 0, 1.01]} material={materials.pupil}>
                <planeGeometry args={[0.16, 0.8]} />
            </mesh>
        </group>
    );
};

// Nothing's words, typed out above its head, then left to fade.
const Speech: React.FC = () => {
    const speech = useCosmicStore((s) => s.speech);
    const [shown, setShown] = useState("");
    const typed = useRef(0);
    const age = useRef(0);
    const opacity = useRef(0);
    const textRef = useRef<THREE.Mesh & { fillOpacity: number; outlineOpacity: number }>(null);

    useEffect(() => {
        typed.current = 0;
        age.current = 0;
        setShown("");
    }, [speech?.key]);

    useFrame((_, delta) => {
        if (!speech) return;
        const full = speech.text;
        if (typed.current < full.length) {
            const before = Math.floor(typed.current);
            typed.current = Math.min(full.length, typed.current + delta * TYPE_RATE);
            const after = Math.floor(typed.current);
            if (after !== before) setShown(full.slice(0, after));
        } else {
            age.current += delta;
        }
        const target = age.current > 4 + full.length * 0.03 ? 0 : 1;
        opacity.current += (target - opacity.current) * Math.min(1, delta * 3);
        if (textRef.current) {
            textRef.current.fillOpacity = opacity.current;
            textRef.current.outlineOpacity = opacity.current;
        }
    });

    return (
        <Text
            ref={textRef}
            font={DISPLAY_FONT}
            position={[0, PRESENCE_Y + 2.35, 0.6]}
            fontSize={0.22}
            maxWidth={4.2}
            lineHeight={1.25}
            textAlign="center"
            color="#f6e6c0"
            outlineWidth={0.012}
            outlineColor="#120822"
            anchorX="center"
            anchorY="bottom"
        >
            {shown}
        </Text>
    );
};

export const Nothing: React.FC = () => {
    const haloMaterial = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: "#ffcf73",
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
                toneMapped: false,
            }),
        []
    );
    const eyeMaterials = useMemo(
        () => ({
            sclera: new THREE.MeshBasicMaterial({ color: "#f3efe6", toneMapped: false }),
            iris: new THREE.MeshBasicMaterial({ color: "#e0a52a", toneMapped: false }),
            pupil: new THREE.MeshBasicMaterial({ color: "#000000" }),
        }),
        []
    );

    // Ticks around the middle halo ring, merged.
    const mergedTicks = useMemo(() => {
        const ticks: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            const long = i % 4 === 0;
            const tick = new THREE.PlaneGeometry(0.025, long ? 0.22 : 0.1);
            tick.translate(0, 1.72 + (long ? 0.11 : 0.05), 0);
            tick.rotateZ(a);
            ticks.push(tick);
        }
        const merged = mergeGeometries(ticks)!;
        ticks.forEach((t) => t.dispose());
        return merged;
    }, []);

    // Motes of light drawn up out of the dark into the empty middle.
    const motes = useMemo(() => {
        const count = 260;
        const positions = new Float32Array(count * 3);
        const seeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const a = seeded(i + 1) * Math.PI * 2;
            const r = 0.4 + seeded(i + 2) * 1.2;
            positions.set([Math.cos(a) * r * 1.2, 0, Math.sin(a) * r * 0.7], i * 3);
            seeds[i] = seeded(i + 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
        const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uMap: { value: getGlowTexture() } },
            vertexShader: /* glsl */ `
                #define PRESENCE_Y ${PRESENCE_Y.toFixed(2)}
                attribute float aSeed;
                uniform float uTime;
                varying float vFade;
                void main() {
                    float life = fract(uTime * (0.08 + aSeed * 0.07) + aSeed * 7.0);
                    vec3 p = position;
                    p.y = 1.0 + life * (PRESENCE_Y - 1.0);
                    p.xz *= 1.0 - life * 0.75;
                    p.x += sin(uTime * 0.7 + aSeed * 30.0) * 0.15 * life;
                    vFade = sin(life * 3.14159);
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    gl_PointSize = (30.0 + aSeed * 40.0) / -mv.z;
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D uMap;
                varying float vFade;
                void main() {
                    vec4 tex = texture2D(uMap, gl_PointCoord);
                    gl_FragColor = vec4(vec3(1.0, 0.8, 0.45) * tex.a * vFade * 1.4, 1.0);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        });
        return { geometry: g, material };
    }, []);

    useEffect(
        () => () => {
            [haloMaterial, motes.material, ...Object.values(eyeMaterials)].forEach((m) => m.dispose());
            [motes.geometry, mergedTicks].forEach((g) => g.dispose());
        },
        [haloMaterial, eyeMaterials, motes, mergedTicks]
    );

    const root = useRef<THREE.Group>(null);
    const halo = useRef<THREE.Group[]>([]);
    const smoothedIntensity = useRef(0);

    useFrame(({ clock }, delta) => {
        const t = clock.elapsedTime;
        const target = useCosmicStore.getState().intensity;
        smoothedIntensity.current += (target - smoothedIntensity.current) * Math.min(1, delta * 1.5);
        const intensity = smoothedIntensity.current;
        motes.material.uniforms.uTime.value = t;
        // The whole presence drifts a little in place.
        if (root.current) root.current.position.y = Math.sin(t * 0.37) * 0.06;
        halo.current.forEach((ring, i) => {
            if (!ring) return;
            ring.rotation.z = t * (i % 2 ? -0.05 : 0.08) * (1 + intensity * 2) + i;
        });
        haloMaterial.opacity = 0.4 + intensity * 0.4 + Math.sin(t * 1.3) * 0.05;
    });

    return (
        <group position={NOTHING_POSITION}>
            <group ref={root}>
                {/* Wheels of gold turning around an empty middle */}
                <group position={[0, PRESENCE_Y, 0]}>
                    {[1.25, 1.6, 2.05].map((radius, i) => (
                        <group key={radius} ref={(g) => g && (halo.current[i] = g)}>
                            <mesh material={haloMaterial}>
                                <ringGeometry args={[radius, radius + (i === 1 ? 0.035 : 0.018), 96]} />
                            </mesh>
                            {i === 1 && <mesh geometry={mergedTicks} material={haloMaterial} />}
                            {i === 2 &&
                                Array.from({ length: 7 }, (_, k) => (
                                    <mesh
                                        key={k}
                                        position={[
                                            Math.cos((k / 7) * Math.PI * 2) * radius,
                                            Math.sin((k / 7) * Math.PI * 2) * radius,
                                            0,
                                        ]}
                                        material={haloMaterial}
                                    >
                                        <circleGeometry args={[0.07, 16]} />
                                    </mesh>
                                ))}
                        </group>
                    ))}
                </group>
                <points geometry={motes.geometry} material={motes.material} frustumCulled={false} />
                <pointLight position={[0, PRESENCE_Y - 0.6, 1.2]} intensity={6} distance={9} decay={1.6} color="#ffd89a" />
            </group>

            {EYES.map((eye, i) => (
                <Eye key={i} {...eye} materials={eyeMaterials} />
            ))}

            <Speech />
        </group>
    );
};
