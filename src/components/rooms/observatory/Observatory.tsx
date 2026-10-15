import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { GemPrompt } from "../../ui/GemPrompt";
import { useAimTargets } from "../../core/useAimTargets";
import { useSceneStore } from "../../../stores/sceneStore";
import { useAchievementStore } from "../../../stores/achievementStore";
import { useKeyboardControls } from "../../../hooks/useKeyboardControls";
import { playSound } from "../../../audio/soundManager";
import { PROJECTS, PortfolioProject, formatDate } from "../../../data/portfolio";
import { EnhancedMaterialSystem } from "../../../configs/enhancedMaterials";

// The Observatory: a rooftop terrace above the atrium under a clear night
// sky. Every star pattern up there is one of my projects. Look at one to
// read its name; use the telescope in the middle to get closer, and press E
// on a constellation to open the project.

const TERRACE = 10;
const SKY_RADIUS = 40;
const STAR_RADIUS = 34;
const TELESCOPE_FOV = 22;

const hash = (text: string) => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
};

const categoryColor = (category: string) => {
    const r = hash(category);
    return new THREE.Color().setHSL(r(), 0.65, 0.78);
};

interface Constellation {
    project: PortfolioProject;
    center: THREE.Vector3; // unit direction
    stars: THREE.Vector3[]; // unit directions
    color: THREE.Color;
}

// Spread the projects evenly over the upper sky (a golden-angle spiral),
// each with a little pattern of 4-7 stars drawn from its id.
const buildConstellations = (): Constellation[] =>
    PROJECTS.map((project, i) => {
        const n = PROJECTS.length;
        const elevation = THREE.MathUtils.degToRad(14 + (62 * (i + 0.5)) / n);
        const azimuth = i * 2.39996;
        const center = new THREE.Vector3(
            Math.cos(elevation) * Math.cos(azimuth),
            Math.sin(elevation),
            Math.cos(elevation) * Math.sin(azimuth)
        );
        const r = hash(project.id);
        const tangentA = new THREE.Vector3(0, 1, 0).cross(center).normalize();
        const tangentB = center.clone().cross(tangentA).normalize();
        const count = 4 + Math.floor(r() * 4);
        const stars: THREE.Vector3[] = [];
        let u = 0;
        let v = 0;
        for (let k = 0; k < count; k++) {
            stars.push(center.clone().addScaledVector(tangentA, u).addScaledVector(tangentB, v).normalize());
            const angle = r() * Math.PI * 2;
            const step = 0.035 + r() * 0.03;
            u += Math.cos(angle) * step;
            v += Math.sin(angle) * step;
        }
        const mid = stars.reduce((sum, s) => sum.add(s), new THREE.Vector3()).normalize();
        return { project, center: mid, stars, color: categoryColor(project.category) };
    });

const skyMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
                vDir = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            varying vec3 vDir;
            float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
            float noise(vec3 p) {
                vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                           mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
            }
            void main() {
                vec3 d = normalize(vDir);
                vec3 col = mix(vec3(0.02, 0.03, 0.08), vec3(0.005, 0.008, 0.03), smoothstep(-0.1, 0.8, d.y));
                // The Milky Way: a band of soft, mottled light across the sky.
                vec3 band = normalize(vec3(0.35, 0.25, 1.0));
                float across = abs(dot(d, band));
                float milky = smoothstep(0.35, 0.0, across) * (0.55 + 0.45 * noise(d * 9.0)) * (0.6 + 0.4 * noise(d * 23.0));
                col += vec3(0.32, 0.3, 0.42) * milky * 0.5;
                // Background stars
                vec3 cell = floor(d * 260.0);
                float star = step(0.9965, hash(cell)) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(cell + 2.0) * 40.0));
                col += vec3(star) * smoothstep(-0.05, 0.1, d.y);
                vec3 cell2 = floor(d * 600.0);
                col += vec3(step(0.997, hash(cell2)) * 0.4) * (0.4 + milky * 2.0);
                // City glow on the horizon
                col += vec3(0.25, 0.14, 0.08) * smoothstep(0.25, -0.05, d.y) * 0.6;
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
    });

const glowSprite = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

export const Observatory: React.FC = () => {
    const { camera, scene } = useThree();
    const { movement } = useKeyboardControls();
    const aim = useAimTargets();
    const constellations = useMemo(buildConstellations, []);
    const [hovered, setHovered] = useState<number | null>(null);
    const hoveredRef = useRef<number | null>(null);
    const [zoomed, setZoomed] = useState(false);
    const zoomedRef = useRef(false);
    const seen = useRef(new Set<string>());

    const sky = useMemo(skyMaterial, []);
    // Shared, cached material: the terrace is a disc 20 m across, so the
    // texture repeats 8 times over it. Lilac tint for the night light.
    const terraceFloor = useMemo(
        () =>
            EnhancedMaterialSystem.getInstance().pbr("stone-floor", {
                repeat: 8,
                fallbackColor: "#4a4652",
                tint: "#c8c0d8",
                metalness: 0,
                anisotropy: 8,
            }),
        []
    );
    const skyMesh = useRef<THREE.Mesh>(null);
    const heavens = useRef<THREE.Group>(null);
    const barrel = useRef<THREE.Group>(null);
    const resources = useMemo(() => {
        const texture = glowSprite();
        const positions: number[] = [];
        const colors: number[] = [];
        const linePositions: number[] = [];
        constellations.forEach((c) => {
            c.stars.forEach((s, k) => {
                positions.push(s.x * STAR_RADIUS, s.y * STAR_RADIUS, s.z * STAR_RADIUS);
                colors.push(c.color.r, c.color.g, c.color.b);
                if (k > 0) {
                    const p = c.stars[k - 1];
                    linePositions.push(p.x * STAR_RADIUS, p.y * STAR_RADIUS, p.z * STAR_RADIUS, s.x * STAR_RADIUS, s.y * STAR_RADIUS, s.z * STAR_RADIUS);
                }
            });
        });
        const stars = new THREE.BufferGeometry();
        stars.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        stars.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        const lines = new THREE.BufferGeometry();
        lines.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
        return { texture, stars, lines };
    }, [constellations]);
    const fog = useMemo(() => new THREE.Fog("#0a0e20", 40, 90), []);
    const originalFov = useRef((camera as THREE.PerspectiveCamera).fov);

    useEffect(() => {
        const previousFog = scene.fog;
        const perspective = camera as THREE.PerspectiveCamera;
        const fov = originalFov.current;
        return () => {
            if (scene.fog === fog) scene.fog = previousFog;
            perspective.fov = fov;
            perspective.updateProjectionMatrix();
            sky.dispose();
            resources.texture.dispose();
            resources.stars.dispose();
            resources.lines.dispose();
        };
    }, [scene, camera, fog, sky, resources]);

    const zoomedAt = useRef(0);
    const setZoom = (on: boolean) => {
        zoomedRef.current = on;
        zoomedAt.current = performance.now();
        setZoomed(on);
        playSound(on ? "ui-inspect-open" : "ui-inspect-close");
        if (on) useAchievementStore.getState().unlock("observatory-telescope");
    };

    // Through the telescope, E on a constellation opens its project; E on
    // empty sky (or walking away) steps back.
    useEffect(() => {
        const use = () => {
            // (Not the same press that just raised the telescope.)
            if (!zoomedRef.current || performance.now() - zoomedAt.current < 250) return;
            const i = hoveredRef.current;
            if (i === null) {
                setZoom(false);
                return;
            }
            const project = constellations[i].project;
            const url = project.url ?? project.source;
            if (url) window.open(url, "_blank", "noopener");
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat) use();
        };
        const onTap = () => use();
        window.addEventListener("keydown", onKey);
        window.addEventListener("virtualtap", onTap);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("virtualtap", onTap);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [constellations]);

    const forward = useMemo(() => new THREE.Vector3(), []);
    const labelAnchor = useRef<THREE.Group>(null);
    useFrame(({ clock }, delta) => {
        if (scene.fog !== fog) scene.fog = fog;
        sky.uniforms.uTime.value = clock.elapsedTime;
        skyMesh.current?.position.copy(camera.position);
        heavens.current?.position.copy(camera.position);

        // Telescope: narrow the view; walking away ends it.
        const perspective = camera as THREE.PerspectiveCamera;
        const targetFov = zoomedRef.current ? TELESCOPE_FOV : originalFov.current;
        if (Math.abs(perspective.fov - targetFov) > 0.05) {
            perspective.fov += (targetFov - perspective.fov) * Math.min(1, delta * 5);
            perspective.updateProjectionMatrix();
        }
        if (zoomedRef.current && (movement.forward || movement.backward || movement.left || movement.right)) setZoom(false);
        camera.getWorldDirection(forward);
        if (barrel.current) {
            // Swing to wherever you look, and get out of the way of your eye.
            if (zoomedRef.current) barrel.current.rotation.set(-Math.asin(forward.y), Math.atan2(forward.x, forward.z), 0, "YXZ");
            barrel.current.visible = !zoomedRef.current;
        }

        // Which constellation is closest to the middle of your view?
        let best = -1;
        let bestDot = Math.cos(THREE.MathUtils.degToRad(zoomedRef.current ? 3 : 7));
        constellations.forEach((c, i) => {
            const dot = forward.dot(c.center);
            if (dot > bestDot) {
                bestDot = dot;
                best = i;
            }
        });
        if (useSceneStore.getState().showStartPrompt) best = -1;
        const next = best < 0 ? null : best;
        if (next !== hoveredRef.current) {
            hoveredRef.current = next;
            setHovered(next);
            if (next !== null) {
                seen.current.add(constellations[next].project.id);
                if (seen.current.size >= 10) useAchievementStore.getState().unlock("observatory-stargazer");
            }
        }
        if (labelAnchor.current && next !== null) {
            labelAnchor.current.position.copy(constellations[next].center).multiplyScalar(STAR_RADIUS - 2);
        }
    });

    const card = hovered !== null ? constellations[hovered] : null;

    return (
        <>
            <RoomEnvironmentReady />
            <mesh ref={skyMesh} material={sky} renderOrder={-10} frustumCulled={false} raycast={() => null}>
                <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
            </mesh>
            {/* The constellations ride with you, like real stars. */}
            <group ref={heavens}>
                <points geometry={resources.stars} frustumCulled={false} raycast={() => null}>
                    <pointsMaterial
                        map={resources.texture}
                        size={1.1}
                        vertexColors
                        transparent
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        toneMapped={false}
                        fog={false}
                    />
                </points>
                <lineSegments geometry={resources.lines} raycast={() => null}>
                    <lineBasicMaterial color="#9fb4ff" transparent opacity={0.28} fog={false} depthWrite={false} />
                </lineSegments>
                {card && (
                    <group ref={labelAnchor}>
                        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                            <div
                                style={{
                                    width: 280,
                                    padding: "10px 14px",
                                    borderRadius: 14,
                                    background: "rgba(10, 14, 32, 0.55)",
                                    backdropFilter: "blur(8px)",
                                    border: `1px solid #${card.color.getHexString()}88`,
                                    color: "#eef2ff",
                                    fontFamily: "Manrope, sans-serif",
                                    transform: "translateY(-90px)",
                                }}
                            >
                                <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, textTransform: "uppercase" }}>
                                    {card.project.category}
                                    {card.project.date ? ` · ${formatDate(card.project.date)}` : ""}
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 4px", color: `#${card.color.getHexString()}` }}>
                                    {card.project.title}
                                </div>
                                {zoomed && (
                                    <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9 }}>
                                        {card.project.description.length > 180
                                            ? `${card.project.description.slice(0, 177)}…`
                                            : card.project.description}
                                    </div>
                                )}
                                <div style={{ marginTop: 6 }}>
                                    {zoomed ? (
                                        card.project.url || card.project.source ? (
                                            <GemPrompt accent="gold" action="Open this project" />
                                        ) : null
                                    ) : (
                                        <span style={{ fontSize: 12, opacity: 0.75 }}>Use the telescope to read more</span>
                                    )}
                                </div>
                            </div>
                        </Html>
                    </group>
                )}
            </group>

            <hemisphereLight intensity={0.35} color="#8fa8ff" groundColor="#1a1410" />
            <directionalLight position={[-10, 18, -6]} intensity={0.6} color="#c8d6ff" />
            {/* The moon */}
            <mesh position={[-22, 20, -24]}>
                <sphereGeometry args={[2.2, 32, 16]} />
                <meshBasicMaterial color="#f4f0e0" toneMapped={false} fog={false} />
            </mesh>

            {/* Terrace */}
            <RigidBody type="fixed" colliders={false}>
                <CylinderCollider args={[0.25, TERRACE + 0.3]} position={[0, -0.25, 0]} />
                {Array.from({ length: 36 }, (_, k) => {
                    const a = (k / 36) * Math.PI * 2;
                    return (
                        <CuboidCollider
                            key={k}
                            args={[0.15, 0.9, TERRACE * Math.sin(Math.PI / 36) * 1.15]}
                            position={[Math.cos(a) * (TERRACE + 0.15), 0.9, Math.sin(a) * (TERRACE + 0.15)]}
                            rotation={[0, -a, 0]}
                        />
                    );
                })}
                <CylinderCollider args={[0.7, 0.9]} position={[0, 0.7, 0]} />
            </RigidBody>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={terraceFloor}>
                <circleGeometry args={[TERRACE, 96]} />
            </mesh>
            {[3, 6, 9].map((r) => (
                <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
                    <ringGeometry args={[r - 0.03, r + 0.03, 128]} />
                    <meshStandardMaterial color="#c39a55" metalness={1} roughness={0.3} />
                </mesh>
            ))}
            {Array.from({ length: 12 }, (_, k) => (
                <mesh key={k} rotation={[-Math.PI / 2, 0, -(k / 12) * Math.PI * 2]} position={[0, 0.003, 0]}>
                    <planeGeometry args={[0.04, 18]} />
                    <meshStandardMaterial color="#c39a55" metalness={1} roughness={0.3} />
                </mesh>
            ))}
            {/* Parapet */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[TERRACE + 0.3, TERRACE + 0.3, 1, 96, 1, true]} />
                <meshStandardMaterial color="#6a6470" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[TERRACE + 0.3, 0.12, 8, 128]} />
                <meshStandardMaterial color="#8a8490" roughness={0.6} />
            </mesh>
            {/* Lanterns on the parapet */}
            {Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
                return (
                    <group key={k} position={[Math.cos(a) * TERRACE, 1.2, Math.sin(a) * TERRACE]}>
                        <mesh>
                            <sphereGeometry args={[0.12, 12, 8]} />
                            <meshBasicMaterial color="#ffcf8a" toneMapped={false} />
                        </mesh>
                        <pointLight intensity={1.4} distance={4} decay={2} color="#ffbf70" />
                    </group>
                );
            })}

            {/* The telescope */}
            <group position={[0, 0, 0]}>
                <mesh position={[0, 0.7, 0]}>
                    <cylinderGeometry args={[0.35, 0.8, 1.4, 16]} />
                    <meshStandardMaterial color="#3a3440" roughness={0.6} />
                </mesh>
                <group
                    ref={barrel}
                    position={[0, 1.55, 0]}
                    rotation={[-0.7, 2.4, 0, "YXZ"]}
                >
                    <mesh
                        rotation={[Math.PI / 2, 0, 0]}
                        position={[0, 0, 0.4]}
                        ref={aim.bind("telescope", {
                            reach: zoomed ? 0 : 3,
                            prompt: () => <GemPrompt accent="gold" action="Look through the telescope" />,
                            use: () => setZoom(!zoomedRef.current),
                        })}
                    >
                        <cylinderGeometry args={[0.16, 0.12, 2, 24]} />
                        <meshStandardMaterial color="#c39a55" metalness={1} roughness={0.25} />
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.4]}>
                        <torusGeometry args={[0.165, 0.03, 8, 24]} />
                        <meshStandardMaterial color="#e8c76a" metalness={1} roughness={0.2} />
                    </mesh>
                </group>
            </group>
            <Text position={[0, 0.02, 3.6]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#c8d6ff" anchorX="center">
                Every constellation is one of my projects
            </Text>

            {zoomed && (
                <Html fullscreen zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "radial-gradient(circle at 50% 50%, transparent 38%, rgba(0,0,0,0.92) 62%)",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: 28,
                            width: "100%",
                            textAlign: "center",
                            color: "rgba(220, 228, 255, 0.75)",
                            fontFamily: "Manrope, sans-serif",
                            fontSize: 13,
                        }}
                    >
                        Look around the sky · E on a constellation opens it · walk to step back
                    </div>
                </Html>
            )}

            <aim.Prompt />
        </>
    );
};
