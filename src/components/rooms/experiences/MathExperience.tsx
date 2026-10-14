import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore } from "../../../stores/sceneStore";
import { playSound } from "../../../audio/soundManager";
import { requestWorldPointerLock } from "../../../utils/mainCanvas";
import { GemPrompt } from "../../ui/GemPrompt";
import { useMeteorGame } from "./math/meteorStore";

// METEOR MULTIPLICATION - the classic, in 3D. You sit at a laser turret on
// a moon outpost guarding a domed city. Meteors fall carrying times-table
// problems; type the answer and press Enter to blast that meteor. Three
// meteors through the shield and it's game over.
//
// The game loop runs entirely in refs inside useFrame; React only
// re-renders when meteors spawn/die or the HUD changes.

const SEAT_POSITION = new THREE.Vector3(0, 1.75, 4.2);
const SEAT_LOOK = new THREE.Vector3(0, 7.5, -14);
const TURRET_POSITION = new THREE.Vector3(0, 0, 1.6);
const METEOR_COLORS = ["#ff7a3c", "#ffd23c", "#ff4f9a", "#45d4ff", "#8cff5a", "#b77bff"];

interface MeteorData {
    id: number;
    a: number;
    b: number;
    answer: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    born: number;
    duration: number;
    color: string;
}

interface Burst {
    id: number;
    position: THREE.Vector3;
    color: string;
    big: boolean;
}

// ---------------------------------------------------------------- shaders
const spaceVertex = /* glsl */ `
    varying vec3 vDir;
    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vDir = normalize(world.xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;
const spaceFragment = /* glsl */ `
    uniform float uTime;
    varying vec3 vDir;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main() {
        vec3 d = normalize(vDir);
        vec3 col = vec3(0.01, 0.012, 0.035);
        // Nebula: two colored clouds of fbm
        float n1 = fbm(d * 3.0 + vec3(0.0, uTime * 0.005, 0.0));
        float n2 = fbm(d * 5.0 + 11.0);
        col += vec3(0.35, 0.08, 0.45) * smoothstep(0.45, 0.85, n1) * 0.8;
        col += vec3(0.05, 0.25, 0.45) * smoothstep(0.5, 0.9, n2) * 0.7;
        // Stars at a couple of scales
        vec3 c1 = floor(d * 220.0);
        float s1 = step(0.996, hash(c1)) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(c1 + 1.0) * 40.0));
        vec3 c2 = floor(d * 90.0);
        float s2 = step(0.9985, hash(c2 + 7.0)) * 1.4;
        col += vec3(s1 + s2);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
    }
`;

const shieldVertex = /* glsl */ `
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    varying vec3 vPos;
    void main() {
        vPos = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;
const shieldFragment = /* glsl */ `
    uniform float uTime;
    uniform float uStrength;
    uniform float uHit;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    varying vec3 vPos;
    void main() {
        float rim = pow(1.0 - abs(dot(vNormalW, vViewDir)), 2.5);
        float hex = abs(sin(vPos.x * 6.0 + uTime) * sin(vPos.y * 6.0) * sin(vPos.z * 6.0 - uTime));
        float grid = smoothstep(0.85, 1.0, hex) * 0.5;
        vec3 col = mix(vec3(0.2, 0.8, 1.0), vec3(1.0, 0.3, 0.2), uHit);
        float a = (rim * 0.8 + grid * 0.25 + uHit * 0.4) * uStrength;
        gl_FragColor = vec4(col * a, a);
    }
`;

const trailVertex = /* glsl */ `
    varying float vT;
    void main() {
        vT = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const trailFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uTime;
    varying float vT;
    void main() {
        float flicker = 0.75 + 0.25 * sin(uTime * 30.0 + vT * 20.0);
        float a = pow(vT, 1.6) * flicker;
        vec3 col = mix(uColor, vec3(1.0, 0.95, 0.8), pow(vT, 4.0));
        gl_FragColor = vec4(col * a, a);
    }
`;

// ------------------------------------------------------------ geometry
const rockGeometries = (() => {
    let cache: THREE.BufferGeometry[] | null = null;
    return () => {
        if (cache) return cache;
        cache = [1, 2, 3].map((seed) => {
            const g = new THREE.IcosahedronGeometry(0.9, 1);
            const p = g.attributes.position;
            for (let i = 0; i < p.count; i++) {
                const v = new THREE.Vector3().fromBufferAttribute(p, i);
                const k = 1 + Math.sin(v.x * 4 + seed) * Math.cos(v.y * 3 - seed) * 0.18 + Math.sin(v.z * 5 + seed * 2) * 0.1;
                v.multiplyScalar(k);
                p.setXYZ(i, v.x, v.y, v.z);
            }
            g.computeVertexNormals();
            return g;
        });
        return cache;
    };
})();

let glowTexture: THREE.Texture | null = null;
const getGlowTexture = () => {
    if (glowTexture) return glowTexture;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const g = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = g;
    context.fillRect(0, 0, size, size);
    glowTexture = new THREE.CanvasTexture(canvas);
    return glowTexture;
};

// --------------------------------------------------------------- pieces
const Meteor: React.FC<{
    data: MeteorData;
    register: (id: number, group: THREE.Group | null) => void;
    time: { value: number };
}> = ({ data, register, time }) => {
    const spin = useRef<THREE.Mesh>(null);
    const trailMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: trailVertex,
                fragmentShader: trailFragment,
                uniforms: { uColor: { value: new THREE.Color(data.color) }, uTime: time },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            }),
        [data.color, time]
    );
    // Trail points back along the path the meteor came from
    const trailRotation = useMemo(() => {
        const back = data.from.clone().sub(data.to).normalize();
        return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), back);
    }, [data]);
    useFrame((_, delta) => {
        if (spin.current) {
            spin.current.rotation.x += delta * 1.3;
            spin.current.rotation.y += delta * 0.9;
        }
    });
    const geometry = rockGeometries()[data.id % 3];
    return (
        <group ref={(g) => register(data.id, g)} position={data.from}>
            <mesh ref={spin} geometry={geometry}>
                <meshStandardMaterial color="#3d332d" roughness={0.9} flatShading emissive={data.color} emissiveIntensity={0.45} />
            </mesh>
            <sprite scale={[3.6, 3.6, 1]}>
                <spriteMaterial map={getGlowTexture()} color={data.color} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            <group quaternion={trailRotation}>
                <mesh position={[0, 2.6, 0]} material={trailMaterial} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.95, 5.2, 16, 1, true]} />
                </mesh>
            </group>
            <Billboard position={[0, 1.9, 0]}>
                <Text fontSize={1.05} color="#ffffff" outlineWidth={0.09} outlineColor={data.color} anchorX="center" anchorY="middle" fontWeight="bold">
                    {`${data.a} × ${data.b}`}
                </Text>
            </Billboard>
        </group>
    );
};

const Explosion: React.FC<{ burst: Burst; onDone: (id: number) => void; time: { value: number } }> = ({ burst, onDone }) => {
    const age = useRef(0);
    const flash = useRef<THREE.Sprite>(null);
    const ring = useRef<THREE.Mesh>(null);
    const { points, velocities } = useMemo(() => {
        const count = burst.big ? 90 : 60;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const v = new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * (burst.big ? 10 : 7));
            velocities.set([v.x, v.y, v.z], i * 3);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: burst.color,
            size: burst.big ? 0.5 : 0.35,
            map: getGlowTexture(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        return { points: new THREE.Points(geometry, material), velocities };
    }, [burst]);
    useFrame((_, delta) => {
        age.current += delta;
        const t = age.current;
        const position = points.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < position.count; i++) {
            position.setXYZ(i, velocities[i * 3] * t, velocities[i * 3 + 1] * t - 4 * t * t, velocities[i * 3 + 2] * t);
        }
        position.needsUpdate = true;
        (points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - t / 1.1);
        if (flash.current) {
            flash.current.scale.setScalar((burst.big ? 9 : 6) * Math.min(1, t * 8));
            (flash.current.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - t * 3);
        }
        if (ring.current) {
            ring.current.scale.setScalar(1 + t * (burst.big ? 14 : 9));
            (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - t * 1.4);
        }
        if (t > 1.2) onDone(burst.id);
    });
    useEffect(
        () => () => {
            points.geometry.dispose();
            (points.material as THREE.Material).dispose();
        },
        [points]
    );
    return (
        <group position={burst.position}>
            <primitive object={points} />
            <sprite ref={flash}>
                <spriteMaterial map={getGlowTexture()} color="#fff4d6" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.45, 0.6, 48]} />
                <meshBasicMaterial color={burst.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
        </group>
    );
};

const City: React.FC<{ shield: { strength: { value: number }; hit: { value: number } }; time: { value: number } }> = ({ shield, time }) => {
    const buildings = useMemo(() => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        geometry.translate(0, 0.5, 0);
        const material = new THREE.MeshStandardMaterial({ color: "#2a3346", roughness: 0.6, metalness: 0.3, emissive: "#ffd27a", emissiveIntensity: 0 });
        // Lit windows: a procedural grid on the emissive term
        material.onBeforeCompile = (s) => {
            s.vertexShader = s.vertexShader
                .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
                .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = (instanceMatrix * vec4(position, 1.0)).xyz;");
            s.fragmentShader = s.fragmentShader
                .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
                .replace(
                    "#include <emissivemap_fragment>",
                    `vec2 cell = floor(vec2(vLocal.x * 3.0 + vLocal.z * 3.0, vLocal.y * 3.5));
                     float on = step(0.45, fract(sin(dot(cell, vec2(12.9, 78.2))) * 43758.5));
                     vec2 f = fract(vec2(vLocal.x * 3.0 + vLocal.z * 3.0, vLocal.y * 3.5));
                     float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.75);
                     totalEmissiveRadiance = vec3(1.0, 0.82, 0.5) * on * win * 1.6;`
                );
        };
        const count = 46;
        const mesh = new THREE.InstancedMesh(geometry, material, count);
        const m = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * 4.2;
            const h = 0.8 + Math.random() * (r < 1.5 ? 4 : 2.2);
            m.compose(
                new THREE.Vector3(Math.cos(a) * r, 0, -6 + Math.sin(a) * r * 0.7),
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random(), 0)),
                new THREE.Vector3(0.5 + Math.random() * 0.6, h, 0.5 + Math.random() * 0.6)
            );
            mesh.setMatrixAt(i, m);
        }
        return mesh;
    }, []);
    const shieldMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: shieldVertex,
                fragmentShader: shieldFragment,
                uniforms: { uTime: time, uStrength: shield.strength, uHit: shield.hit },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            }),
        [shield, time]
    );
    return (
        <group>
            <primitive object={buildings} />
            <mesh position={[0, 0, -6]} scale={[6, 5.5, 4.6]} material={shieldMaterial}>
                <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
        </group>
    );
};

const Turret: React.FC<{ aim: React.MutableRefObject<THREE.Vector3> }> = ({ aim }) => {
    const head = useRef<THREE.Group>(null);
    const target = useMemo(() => new THREE.Vector3(), []);
    useFrame((_, delta) => {
        if (!head.current) return;
        target.lerp(aim.current, Math.min(1, delta * 12));
        head.current.lookAt(target);
    });
    return (
        <group position={TURRET_POSITION}>
            <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.7, 0.9, 0.7, 12]} />
                <meshStandardMaterial color="#39414f" metalness={0.8} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.72, 0]}>
                <torusGeometry args={[0.62, 0.05, 8, 32]} />
                <meshBasicMaterial color="#45d4ff" toneMapped={false} />
            </mesh>
            <group ref={head} position={[0, 1.05, 0]}>
                <mesh>
                    <sphereGeometry args={[0.45, 20, 14]} />
                    <meshStandardMaterial color="#5a6578" metalness={0.85} roughness={0.25} />
                </mesh>
                {[-0.18, 0.18].map((x) => (
                    <mesh key={x} position={[x, 0, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.07, 0.09, 1.2, 10]} />
                        <meshStandardMaterial color="#9aa6bb" metalness={0.9} roughness={0.2} />
                    </mesh>
                ))}
                <mesh position={[0, 0, 1.38]}>
                    <sphereGeometry args={[0.09, 10, 8]} />
                    <meshBasicMaterial color="#9ff3ff" toneMapped={false} />
                </mesh>
            </group>
        </group>
    );
};

// ------------------------------------------------------------------ main
export const MathExperience: React.FC = () => {
    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);
    const seated = useMeteorGame((s) => s.seated);
    const phase = useMeteorGame((s) => s.phase);
    const [meteors, setMeteors] = useState<MeteorData[]>([]);
    const [bursts, setBursts] = useState<Burst[]>([]);
    const [near, setNear] = useState(false);
    const meteorGroups = useRef(new Map<number, THREE.Group>());
    const live = useRef<MeteorData[]>([]);
    const nextId = useRef(1);
    const clock = useRef(0);
    const lastSpawn = useRef(0);
    const time = useMemo(() => ({ value: 0 }), []);
    const shield = useMemo(() => ({ strength: { value: 1 }, hit: { value: 0 } }), []);
    const aim = useRef(new THREE.Vector3(0, 8, -10));
    const laser = useRef<THREE.Mesh>(null);
    const laserLife = useRef(0);
    const shake = useRef(0);
    const tween = useRef<{ from: THREE.Vector3; fromQ: THREE.Quaternion; to: THREE.Vector3; toQ: THREE.Quaternion; t: number; leaving: boolean } | null>(null);
    const saved = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion } | null>(null);
    const seatQuat = useMemo(() => {
        const m = new THREE.Matrix4().lookAt(SEAT_POSITION, SEAT_LOOK, new THREE.Vector3(0, 1, 0));
        return new THREE.Quaternion().setFromRotationMatrix(m);
    }, []);

    const spaceMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: spaceVertex,
                fragmentShader: spaceFragment,
                uniforms: { uTime: time },
                side: THREE.BackSide,
                depthWrite: false,
                fog: false,
            }),
        [time]
    );
    const spaceDome = useRef<THREE.Mesh>(null);

    // ---- environment takeover
    useEffect(() => {
        const previousFog = scene.fog;
        scene.fog = null;
        useSceneStore.getState().setCustomEnvironment(true);
        useMeteorGame.getState().set({ phase: "title", score: 0, level: 1, shields: 3, input: "", destroyed: 0 });
        return () => {
            scene.fog = previousFog;
            useSceneStore.getState().setCustomEnvironment(false);
            const s = useSceneStore.getState();
            if (useMeteorGame.getState().seated) {
                s.setCameraOverride(false);
                s.setIsInteracting(false);
            }
            useMeteorGame.getState().set({ phase: "off", seated: false });
        };
    }, [scene]);

    // ---- seat / unseat
    const sit = () => {
        if (useMeteorGame.getState().seated) return;
        const s = useSceneStore.getState();
        s.setIsInteracting(true);
        s.setCameraOverride(true);
        if (document.pointerLockElement) document.exitPointerLock();
        saved.current = { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
        tween.current = { from: camera.position.clone(), fromQ: camera.quaternion.clone(), to: SEAT_POSITION.clone(), toQ: seatQuat.clone(), t: 0, leaving: false };
        useMeteorGame.getState().set({ seated: true });
    };
    const stand = () => {
        if (!useMeteorGame.getState().seated || !saved.current) return;
        tween.current = { from: camera.position.clone(), fromQ: camera.quaternion.clone(), to: saved.current.position, toQ: saved.current.quaternion, t: 0, leaving: true };
        useMeteorGame.getState().set({ seated: false });
        if (useMeteorGame.getState().phase === "playing") {
            // Leaving mid-game pauses it at the title screen
            live.current = [];
            setMeteors([]);
            useMeteorGame.getState().set({ phase: "title" });
        }
    };
    // ---- game actions
    const startGame = () => {
        live.current = [];
        setMeteors([]);
        clock.current = 0;
        lastSpawn.current = -2;
        shield.strength.value = 1;
        useMeteorGame.getState().set({ phase: "playing", score: 0, destroyed: 0, level: 1, shields: 3, input: "" });
        useMeteorGame.getState().showBanner("LEVEL 1");
        playSound("math-levelup");
    };

    const addBurst = (position: THREE.Vector3, color: string, big: boolean) =>
        setBursts((b) => [...b, { id: nextId.current++, position: position.clone(), color, big }]);

    const fire = () => {
        const state = useMeteorGame.getState();
        const value = Number(state.input);
        state.set({ input: "" });
        if (!state.input) return;
        // Aim at the matching meteor closest to impact
        const now = clock.current;
        const targets = live.current
            .filter((m) => m.answer === value)
            .sort((x, y) => (now - y.born) / y.duration - (now - x.born) / x.duration);
        const target = targets[0];
        if (!target) {
            playSound("math-wrong");
            state.showFeedback("miss", `${value}? Nope!`);
            return;
        }
        const group = meteorGroups.current.get(target.id);
        const position = group ? group.position.clone() : target.to.clone();
        aim.current.copy(position);
        // Laser from the turret muzzle to the meteor
        if (laser.current) {
            const start = TURRET_POSITION.clone().add(new THREE.Vector3(0, 1.05, 0));
            const mid = start.clone().lerp(position, 0.5);
            laser.current.position.copy(mid);
            laser.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().sub(start).normalize());
            laser.current.scale.set(1, start.distanceTo(position), 1);
            laser.current.visible = true;
            laserLife.current = 0.16;
        }
        playSound("math-fire");
        setTimeout(() => playSound("math-explode"), 90);
        addBurst(position, target.color, false);
        live.current = live.current.filter((m) => m.id !== target.id);
        setMeteors([...live.current]);

        const destroyed = state.destroyed + 1;
        const level = 1 + Math.floor(destroyed / 8);
        const points = 10 * state.level;
        state.set({ score: state.score + points, destroyed, level });
        state.showFeedback("hit", `+${points}`);
        useSceneStore.getState().setMathGameScore(destroyed); // achievements
        if (level > state.level) {
            state.showBanner(`LEVEL ${level}!`);
            playSound("math-levelup");
        }
    };

    // ---- keyboard
    // One listener for the life of the game, always calling the latest
    // handlers through a ref. (Re-adding the listener on every render could
    // leave a stale duplicate attached across hot reloads, which typed every
    // digit twice: "20" came out as "220".)
    const handlers = useRef({ sit, stand, startGame, fire });
    handlers.current = { sit, stand, startGame, fire };
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            // Each keypress is handled once, even if another copy of this
            // listener is somehow attached.
            const marked = event as KeyboardEvent & { __meteorHandled?: boolean };
            if (marked.__meteorHandled) return;
            marked.__meteorHandled = true;

            const { sit, stand, startGame, fire } = handlers.current;
            const state = useMeteorGame.getState();
            if (!state.seated) {
                if (event.code === "KeyE" && !event.repeat && nearTurret.current && !useSceneStore.getState().isInteracting) {
                    event.stopPropagation();
                    sit();
                }
                return;
            }
            if (event.code === "Escape") {
                stand();
                return;
            }
            if (event.repeat) {
                event.preventDefault();
                return;
            }
            if (state.phase === "title" || state.phase === "gameover") {
                if (event.code === "Enter" || event.code === "NumpadEnter" || event.code === "Space") {
                    event.preventDefault();
                    startGame();
                }
                return;
            }
            if (/^[0-9]$/.test(event.key)) {
                if (state.input.length < 3) state.set({ input: state.input + event.key });
                playSound("ui-hover");
            } else if (event.code === "Backspace") {
                state.set({ input: state.input.slice(0, -1) });
            } else if (event.code === "Enter" || event.code === "NumpadEnter" || event.code === "Space") {
                fire();
            } else {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, []);

    // ---- per frame
    const nearTurret = useRef(false);
    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 1 / 30);
        time.value += delta;
        spaceDome.current?.position.copy(camera.position);
        const state = useMeteorGame.getState();

        // Seat tween + screen shake
        const tw = tween.current;
        if (tw) {
            tw.t = Math.min(1, tw.t + delta / 0.9);
            const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
            camera.position.lerpVectors(tw.from, tw.to, e);
            camera.quaternion.slerpQuaternions(tw.fromQ, tw.toQ, e);
            if (tw.t >= 1) {
                tween.current = null;
                if (tw.leaving) {
                    const s = useSceneStore.getState();
                    s.setCameraOverride(false);
                    s.setIsInteracting(false);
                    requestWorldPointerLock();
                }
            }
        } else if (state.seated) {
            camera.position.copy(SEAT_POSITION);
            if (shake.current > 0) {
                shake.current = Math.max(0, shake.current - delta * 1.8);
                camera.position.x += (Math.random() - 0.5) * shake.current * 0.5;
                camera.position.y += (Math.random() - 0.5) * shake.current * 0.5;
            }
        } else {
            const isNear = camera.position.distanceTo(TURRET_POSITION) < 3.4;
            if (isNear !== nearTurret.current) {
                nearTurret.current = isNear;
                setNear(isNear);
            }
        }

        if (laser.current && laserLife.current > 0) {
            laserLife.current -= delta;
            laser.current.visible = laserLife.current > 0;
        }
        shield.hit.value = Math.max(0, shield.hit.value - delta * 2);

        if (state.phase !== "playing" || !state.seated) return;
        clock.current += delta;
        const now = clock.current;
        const level = state.level;

        // Spawn
        const interval = Math.max(1.1, 3.6 - level * 0.32);
        const maxLive = Math.min(2 + Math.floor(level / 2), 6);
        if (now - lastSpawn.current > interval && live.current.length < maxLive) {
            lastSpawn.current = now;
            const maxFactor = Math.min(12, 4 + level);
            let a = 0;
            let b = 0;
            let tries = 0;
            do {
                a = 2 + Math.floor(Math.random() * (maxFactor - 1));
                b = 1 + Math.floor(Math.random() * maxFactor);
                tries++;
            } while (live.current.some((m) => m.answer === a * b) && tries < 20);
            const from = new THREE.Vector3((Math.random() - 0.5) * 18, 17 + Math.random() * 4, -26 + Math.random() * 8);
            const to = new THREE.Vector3((Math.random() - 0.5) * 7, 0.5, -6 + (Math.random() - 0.5) * 3);
            live.current.push({
                id: nextId.current++,
                a,
                b,
                answer: a * b,
                from,
                to,
                born: now,
                duration: Math.max(6.2, 13 - level * 0.85),
                color: METEOR_COLORS[Math.floor(Math.random() * METEOR_COLORS.length)],
            });
            setMeteors([...live.current]);
        }

        // Move + impacts
        let impacted = false;
        live.current.forEach((m) => {
            const t = (now - m.born) / m.duration;
            const group = meteorGroups.current.get(m.id);
            if (group) group.position.lerpVectors(m.from, m.to, Math.min(1, t * t * 0.35 + t * 0.65));
            if (t >= 1) {
                impacted = true;
                addBurst(m.to, "#ff6a3c", true);
            }
        });
        if (impacted) {
            const remaining = live.current.filter((m) => (now - m.born) / m.duration < 1);
            const hits = live.current.length - remaining.length;
            live.current = remaining;
            setMeteors([...remaining]);
            const shields = Math.max(0, state.shields - hits);
            shake.current = 1;
            shield.hit.value = 1;
            shield.strength.value = 0.35 + (shields / 3) * 0.65;
            playSound("math-impact");
            if (shields <= 0) {
                state.set({ shields: 0, phase: "gameover" });
                state.saveBest(state.score);
                state.showBanner("GAME OVER");
                playSound("math-gameover");
                live.current = [];
                setMeteors([]);
            } else {
                state.set({ shields });
                state.showFeedback("impact", "SHIELD HIT!");
            }
        }
    });

    const register = (id: number, group: THREE.Group | null) => {
        if (group) meteorGroups.current.set(id, group);
        else meteorGroups.current.delete(id);
    };

    return (
        <group>
            <mesh ref={spaceDome} material={spaceMaterial} renderOrder={-10} frustumCulled={false} raycast={() => null}>
                <sphereGeometry args={[44, 32, 16]} />
            </mesh>

            {/* A ringed gas giant hanging in the sky */}
            <group position={[-22, 16, -30]} rotation={[0.3, 0.2, 0.35]}>
                <mesh>
                    <sphereGeometry args={[6, 40, 24]} />
                    <meshStandardMaterial color="#c98a5a" emissive="#5a2d18" emissiveIntensity={0.35} roughness={0.9} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[8, 11.5, 64]} />
                    <meshBasicMaterial color="#e8c9a0" transparent opacity={0.45} side={THREE.DoubleSide} />
                </mesh>
            </group>

            {/* Light: cold starlight and a warm glow from the city */}
            <hemisphereLight intensity={0.55} color="#9fb4ff" groundColor="#1a1420" />
            <directionalLight position={[-10, 14, 6]} intensity={1.3} color="#dfe8ff" />
            <pointLight position={[0, 2.5, -6]} intensity={4} distance={14} decay={2} color="#ffcf8a" />

            {/* Moon surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -8]}>
                <circleGeometry args={[40, 64]} />
                <meshStandardMaterial color="#4d4a55" roughness={1} />
            </mesh>
            {[[-8, -14, 2.4], [9, -18, 3.2], [-14, -6, 1.6], [12, -4, 1.4], [3, -22, 2.8], [-4, 0, 1]].map(([x, z, r], i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
                    <ringGeometry args={[r * 0.75, r, 32]} />
                    <meshStandardMaterial color="#3a3842" roughness={1} />
                </mesh>
            ))}

            <City shield={shield} time={time} />
            <Turret aim={aim} />

            <mesh ref={laser} visible={false}>
                <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
                <meshBasicMaterial color="#9ff3ff" toneMapped={false} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
            </mesh>

            {meteors.map((m) => (
                <Meteor key={m.id} data={m} register={register} time={time} />
            ))}
            {bursts.map((b) => (
                <Explosion key={b.id} burst={b} time={time} onDone={(id) => setBursts((all) => all.filter((x) => x.id !== id))} />
            ))}

            {!seated && near && phase !== "off" && (
                <Html position={[TURRET_POSITION.x, 2.6, TURRET_POSITION.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                    <GemPrompt accent="gold" action="Man the cannon" />
                </Html>
            )}
        </group>
    );
};
