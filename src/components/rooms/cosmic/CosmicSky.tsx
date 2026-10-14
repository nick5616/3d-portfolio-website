import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL, SPACE_GLSL } from "./cosmicShaders";
import { getGlowTexture } from "./chipDesigns";
import { useCosmicStore } from "./cosmicStore";
import { seeded } from "../atrium/atriumLayout";

// Deep space all around: a nebula sky that drifts and shifts hue (and
// warps when Nothing grows intent), a spiral galaxy, near stars for
// parallax, and slow rocks tumbling around the platform.

const SKY_RADIUS = 42; // inside the camera's 50 m far plane
const GALAXY_DIR = new THREE.Vector3(0.75, 0.42, -0.52).normalize();

const skyMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: 0 },
            uGalaxyDir: { value: GALAXY_DIR },
        },
        vertexShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
                vDir = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uIntensity;
            uniform vec3 uGalaxyDir;
            varying vec3 vDir;
            ${NOISE_GLSL}
            ${SPACE_GLSL}
            vec3 galaxy(vec3 dir) {
                // Project onto a plane facing the galaxy's direction.
                vec3 up = vec3(0.0, 1.0, 0.0);
                vec3 right = normalize(cross(uGalaxyDir, up));
                vec3 top = cross(right, uGalaxyDir);
                float facing = dot(dir, uGalaxyDir);
                if (facing < 0.0) return vec3(0.0);
                vec2 p = vec2(dot(dir, right), dot(dir, top)) / facing;
                p = mat2(0.9, 0.35, -0.35, 0.9) * p * vec2(1.0, 2.2); // tilted disc
                float r = length(p) * 5.5;
                float a = atan(p.y, p.x);
                float arms = 0.5 + 0.5 * sin(a * 2.0 - log(r + 0.001) * 4.0 + uTime * 0.03);
                float dust = fbm(vec3(p * 9.0, uTime * 0.01));
                float body = exp(-r * 1.6) * (0.35 + arms * 0.9) * (0.6 + dust * 0.8);
                float core = exp(-r * r * 30.0) * 2.0;
                return vec3(1.0, 0.82, 0.62) * core + mix(vec3(0.55, 0.45, 1.0), vec3(1.0, 0.6, 0.85), arms) * body;
            }
            void main() {
                vec3 dir = normalize(vDir);
                // When Nothing is intent, space itself starts to swim.
                float warp = uIntensity * 0.35;
                dir += warp * vec3(
                    sin(dir.y * 6.0 + uTime * 0.7),
                    sin(dir.z * 6.0 + uTime * 0.6),
                    sin(dir.x * 6.0 + uTime * 0.8)
                ) * 0.15;
                dir = normalize(dir);
                vec3 col = spaceColor(dir, uTime) + galaxy(dir);
                // Darker below the platform, so it feels like a drop.
                col *= mix(0.45, 1.0, smoothstep(-0.7, 0.1, dir.y));
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        fog: false,
    });

export const CosmicSky: React.FC = () => {
    const { scene, camera } = useThree();
    const sky = useRef<THREE.Mesh>(null);
    const stars = useRef<THREE.Points>(null);
    const rocks = useRef<THREE.InstancedMesh>(null);

    const material = useMemo(skyMaterial, []);
    const geometry = useMemo(() => new THREE.SphereGeometry(SKY_RADIUS, 48, 32), []);

    // Deep violet haze, far enough out that only the giant board and the
    // rocks pick it up. Re-asserted every frame: SceneManager's own fog
    // effect runs after ours on a fresh load (see AtriumAtmosphere).
    const fog = useMemo(() => new THREE.Fog("#0b0424", 30, 100), []);
    const previousFog = useRef<THREE.Scene["fog"]>(null);

    const starGeometry = useMemo(() => {
        const count = 700;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const u = seeded(i * 3 + 1) * 2 - 1;
            const theta = seeded(i * 3 + 2) * Math.PI * 2;
            const r = 14 + seeded(i * 3 + 3) * 22;
            const s = Math.sqrt(1 - u * u);
            positions.set([Math.cos(theta) * s * r, u * r, Math.sin(theta) * s * r], i * 3);
            color.setHSL(0.6 + seeded(i * 7) * 0.5, 0.6, 0.75 + seeded(i * 11) * 0.25);
            colors.set([color.r, color.g, color.b], i * 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
    }, []);
    const starMaterial = useMemo(
        () =>
            new THREE.PointsMaterial({
                size: 0.22,
                map: getGlowTexture(),
                vertexColors: true,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true,
                fog: false,
                toneMapped: false,
            }),
        []
    );

    // Tumbling rocks in orbit around the platform.
    const rockData = useMemo(
        () =>
            Array.from({ length: 36 }, (_, i) => ({
                radius: 12 + seeded(i + 100) * 14,
                angle: seeded(i + 200) * Math.PI * 2,
                y: -7 + seeded(i + 300) * 16,
                size: 0.2 + Math.pow(seeded(i + 400), 2) * 1.3,
                speed: (0.006 + seeded(i + 500) * 0.02) * (seeded(i + 600) > 0.3 ? 1 : -1),
                spin: new THREE.Vector3(seeded(i + 700), seeded(i + 800), seeded(i + 900)).normalize(),
                spinRate: 0.05 + seeded(i + 1000) * 0.3,
            })),
        []
    );
    const rockGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
    const rockMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#2a2235",
                roughness: 0.85,
                metalness: 0.1,
                flatShading: true,
                emissive: "#3a1d6e",
                emissiveIntensity: 0.35,
            }),
        []
    );

    useEffect(
        () => () => {
            [material, geometry, starGeometry, starMaterial, rockGeometry, rockMaterial].forEach((d) => d.dispose());
            if (scene.fog === fog) scene.fog = previousFog.current;
        },
        [material, geometry, starGeometry, starMaterial, rockGeometry, rockMaterial, scene, fog]
    );

    const matrix = useMemo(() => new THREE.Matrix4(), []);
    const quat = useMemo(() => new THREE.Quaternion(), []);
    const pos = useMemo(() => new THREE.Vector3(), []);
    const scl = useMemo(() => new THREE.Vector3(), []);

    useFrame(({ clock }) => {
        if (scene.fog !== fog) {
            previousFog.current = scene.fog;
            scene.fog = fog;
        }
        const t = clock.elapsedTime;
        material.uniforms.uTime.value = t;
        const target = useCosmicStore.getState().intensity;
        material.uniforms.uIntensity.value += (target - material.uniforms.uIntensity.value) * 0.02;
        sky.current?.position.copy(camera.position);
        if (stars.current) stars.current.rotation.y = t * 0.004;

        const mesh = rocks.current;
        if (mesh) {
            rockData.forEach((rock, i) => {
                const a = rock.angle + t * rock.speed;
                pos.set(Math.cos(a) * rock.radius, rock.y + Math.sin(t * 0.2 + i) * 0.4, Math.sin(a) * rock.radius);
                quat.setFromAxisAngle(rock.spin, t * rock.spinRate + i);
                scl.setScalar(rock.size);
                matrix.compose(pos, quat, scl);
                mesh.setMatrixAt(i, matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <>
            <mesh ref={sky} geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />
            <points ref={stars} geometry={starGeometry} material={starMaterial} frustumCulled={false} />
            <instancedMesh
                ref={rocks}
                args={[rockGeometry, rockMaterial, rockData.length]}
                frustumCulled={false}
            />
        </>
    );
};
