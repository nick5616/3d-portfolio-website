import * as THREE from "three";

// Shaders and shared maths for the Notes App room: a white void, a black
// eye, ink tendrils radiating from it, and drawings that pour in and out of
// the eye along those tendrils like the old Mac OS "genie" minimize.

export const EYE_CENTER = new THREE.Vector3(0, 2.8, -2.5);
export const EYE_RADIUS = 0.85;
export const INK = new THREE.Color("#0b0b0c");

// ---------------------------------------------------------------- tendrils
// A tendril starts at the eye's rim and wanders outward. The same formula
// runs on the GPU (to draw it) and on the CPU (so the drawings riding it
// and the genie paths line up with it exactly).

export interface Tendril {
    dir: THREE.Vector3; // outward
    p1: THREE.Vector3; // two sideways axes for the wandering
    p2: THREE.Vector3;
    length: number;
    phase: number;
    freq: number;
    amp: number;
}

const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

// Radiating like the sketch: spread round the circle in the plane facing
// the entrance, each leaning a little toward or away from you.
export const buildTendrils = (count = 13): Tendril[] => {
    const random = seeded(7);
    return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.35;
        const dir = new THREE.Vector3(
            Math.cos(angle),
            Math.sin(angle) * 0.85,
            (random() - 0.5) * 0.7
        ).normalize();
        const p1 = new THREE.Vector3(0, 0, 1).cross(dir);
        if (p1.lengthSq() < 1e-4) p1.set(1, 0, 0);
        p1.normalize();
        const p2 = dir.clone().cross(p1).normalize();
        return {
            dir,
            p1,
            p2,
            length: 7 + random() * 5,
            phase: random() * Math.PI * 2,
            freq: 2.2 + random() * 2.2,
            amp: 0.35 + random() * 0.45,
        };
    });
};

export const tendrilPoint = (
    tendril: Tendril,
    t: number,
    time: number,
    target = new THREE.Vector3()
) => {
    const { dir, p1, p2, length, phase, freq, amp } = tendril;
    const r = EYE_RADIUS * 0.96 + t * length;
    const w1 =
        Math.sin(t * freq + time * 0.6 + phase) * amp * t +
        Math.sin(t * freq * 2.3 + time * 0.9 + phase * 1.7) * amp * 0.35 * t;
    const w2 = Math.cos(t * freq * 0.7 + time * 0.45 + phase * 0.6) * amp * 0.6 * t;
    target
        .copy(EYE_CENTER)
        .addScaledVector(dir, r)
        .addScaledVector(p1, w1)
        .addScaledVector(p2, w2);
    target.y = Math.max(target.y, 0.02);
    return target;
};

const TENDRIL_GLSL = /* glsl */ `
    uniform float uTime;
    uniform vec3 uEye;
    uniform float uEyeR;
    attribute float aT;
    attribute vec2 aRing;
    attribute vec3 aDir;
    attribute vec3 aP1;
    attribute vec3 aP2;
    attribute vec4 aShape; // length, phase, freq, amp
    vec3 tendrilPoint(float t) {
        float r = uEyeR * 0.96 + t * aShape.x;
        float w1 = sin(t * aShape.z + uTime * 0.6 + aShape.y) * aShape.w * t
                 + sin(t * aShape.z * 2.3 + uTime * 0.9 + aShape.y * 1.7) * aShape.w * 0.35 * t;
        float w2 = cos(t * aShape.z * 0.7 + uTime * 0.45 + aShape.y * 0.6) * aShape.w * 0.6 * t;
        vec3 p = uEye + aDir * r + aP1 * w1 + aP2 * w2;
        p.y = max(p.y, 0.02);
        return p;
    }
`;

// One merged geometry for every tendril: thin tubes whose centre line is
// computed in the vertex shader, thick at the eye and tapering to a hair,
// with a little pen-pressure wobble.
export const buildTendrilMesh = (tendrils: Tendril[]) => {
    const SEG = 72;
    const RAD = 5;
    const count = tendrils.length * (SEG + 1) * RAD;
    const aT = new Float32Array(count);
    const aRing = new Float32Array(count * 2);
    const aDir = new Float32Array(count * 3);
    const aP1 = new Float32Array(count * 3);
    const aP2 = new Float32Array(count * 3);
    const aShape = new Float32Array(count * 4);
    const indices: number[] = [];
    let v = 0;
    tendrils.forEach((tendril) => {
        const base = v;
        for (let s = 0; s <= SEG; s++) {
            for (let k = 0; k < RAD; k++) {
                const a = (k / RAD) * Math.PI * 2;
                aT[v] = s / SEG;
                aRing[v * 2] = Math.cos(a);
                aRing[v * 2 + 1] = Math.sin(a);
                tendril.dir.toArray(aDir, v * 3);
                tendril.p1.toArray(aP1, v * 3);
                tendril.p2.toArray(aP2, v * 3);
                aShape.set([tendril.length, tendril.phase, tendril.freq, tendril.amp], v * 4);
                v++;
            }
        }
        for (let s = 0; s < SEG; s++) {
            for (let k = 0; k < RAD; k++) {
                const a = base + s * RAD + k;
                const b = base + s * RAD + ((k + 1) % RAD);
                const c = a + RAD;
                const d = b + RAD;
                indices.push(a, c, b, b, c, d);
            }
        }
    });
    const geometry = new THREE.BufferGeometry();
    // Placeholder positions (the shader computes the real ones).
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
    geometry.setAttribute("aRing", new THREE.BufferAttribute(aRing, 2));
    geometry.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3));
    geometry.setAttribute("aP1", new THREE.BufferAttribute(aP1, 3));
    geometry.setAttribute("aP2", new THREE.BufferAttribute(aP2, 3));
    geometry.setAttribute("aShape", new THREE.BufferAttribute(aShape, 4));
    geometry.setIndex(indices);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uEye: { value: EYE_CENTER.clone() },
            uEyeR: { value: EYE_RADIUS },
            uInk: { value: INK.clone() },
        },
        vertexShader: /* glsl */ `
            ${TENDRIL_GLSL}
            void main() {
                vec3 c = tendrilPoint(aT);
                float pressure = 1.0 + 0.3 * sin(aT * 37.0 + aShape.y * 5.0) + 0.15 * sin(aT * 91.0);
                float radius = mix(0.034, 0.005, pow(aT, 0.7)) * pressure;
                vec3 p = c + (aP1 * aRing.x + aP2 * aRing.y) * radius;
                gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uInk;
            void main() { gl_FragColor = vec4(uInk, 1.0); }
        `,
        fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.raycast = () => undefined;
    return mesh;
};

// ------------------------------------------------------------------ genie
// A drawing hangs at rest as a flat card. As uG goes 0 -> 1 its leading
// edge (the one nearest the eye) pinches in, then the whole card slides
// down a funnel that follows the tendril back into the eye, narrowing to a
// line and turning to ink on the way. Run it backwards to pour one out.

export const PATH_N = 24;

export const createGenieMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null as THREE.Texture | null },
            uMapTransform: { value: new THREE.Matrix3() },
            uG: { value: 1 },
            uTime: { value: 0 },
            uCenter: { value: new THREE.Vector3() },
            uRight: { value: new THREE.Vector3(1, 0, 0) },
            uUp: { value: new THREE.Vector3(0, 1, 0) },
            uNormal: { value: new THREE.Vector3(0, 0, 1) },
            uLead: { value: new THREE.Vector3(0, -1, 0) },
            uSide: { value: new THREE.Vector3(1, 0, 0) },
            uSize: { value: new THREE.Vector2(1, 1) },
            uPath: { value: Array.from({ length: PATH_N }, () => new THREE.Vector3()) },
            uPathS: { value: new Array(PATH_N).fill(0) },
            uPathLen: { value: 1 },
            uInk: { value: INK.clone() },
        },
        vertexShader: /* glsl */ `
            #define PATH_N ${PATH_N}
            uniform float uG;
            uniform float uTime;
            uniform vec3 uCenter, uRight, uUp, uNormal, uLead, uSide;
            uniform vec2 uSize;
            uniform vec3 uPath[PATH_N];
            uniform float uPathS[PATH_N];
            uniform float uPathLen;
            varying vec2 vUv;
            varying float vInk;
            varying float vFade;

            vec3 pathAt(float s) {
                for (int i = 0; i < PATH_N - 1; i++) {
                    if (s <= uPathS[i + 1]) {
                        float k = (s - uPathS[i]) / max(uPathS[i + 1] - uPathS[i], 1e-4);
                        return mix(uPath[i], uPath[i + 1], clamp(k, 0.0, 1.0));
                    }
                }
                return uPath[PATH_N - 1];
            }

            void main() {
                vUv = uv;
                vec3 rel = uRight * position.x * uSize.x + uUp * position.y * uSize.y;
                float E = abs(dot(uRight, uLead)) * uSize.x * 0.5 + abs(dot(uUp, uLead)) * uSize.y * 0.5;
                float along = dot(rel, uLead);   // + toward the eye
                float across = dot(rel, uSide);
                float q0 = along + E;            // 0 at the trailing edge

                float bend = smoothstep(0.0, 0.35, uG);
                float slide = pow(smoothstep(0.12, 1.0, uG), 1.5);
                float total = 2.0 * E + uPathLen;
                float q = q0 + slide * total;
                float s = q - 2.0 * E;           // < 0: still on the card, > 0: in the funnel

                float neck = 1.0 - 0.7 * bend;
                vec3 p;
                if (s <= 0.0) {
                    float taper = 1.0 - 0.7 * bend * smoothstep(-2.0 * E, 0.0, s);
                    p = uCenter + uLead * (q - E) + uSide * across * taper;
                } else {
                    float width = neck * mix(1.0, 0.03, smoothstep(0.0, uPathLen * 0.55, s));
                    p = pathAt(min(s, uPathLen)) + uSide * across * width;
                }
                // A ripple running down the funnel while it moves.
                float flowing = bend * (1.0 - smoothstep(uPathLen * 0.6, uPathLen, s));
                p += uNormal * sin(q * 4.5 - uTime * 9.0) * 0.07 * flowing;

                vInk = smoothstep(0.0, uPathLen * 0.5, s);
                vFade = 1.0 - smoothstep(uPathLen * 0.85, uPathLen, s);
                gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D map;
            uniform mat3 uMapTransform;
            uniform vec2 uSize;
            uniform vec3 uInk;
            varying vec2 vUv;
            varying float vInk;
            varying float vFade;
            void main() {
                vec4 tex = texture2D(map, (uMapTransform * vec3(vUv, 1.0)).xy);
                // A hand-inked border so white drawings still read on the
                // white void.
                vec2 m = min(vUv, 1.0 - vUv) * uSize;
                float wobble = 0.004 * sin(vUv.x * 40.0 + vUv.y * 31.0);
                float border = 1.0 - smoothstep(0.012, 0.02, min(m.x, m.y) + wobble);
                vec3 color = mix(tex.rgb, uInk, max(border, vInk));
                if (vFade < 0.02) discard;
                gl_FragColor = vec4(color, vFade);
                #include <colorspace_fragment>
            }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        fog: false,
    });

// -------------------------------------------------------------------- eye
// The circle at the centre of the sketch: a hole into black with a slow
// spiral in it and a hand-drawn, never-quite-round rim. uOpen brightens the
// spiral when you look at it; uDive swells it to fill the view.
export const createEyeMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpen: { value: 0 },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uOpen;
            varying vec2 vUv;
            void main() {
                vec2 p = vUv * 2.0 - 1.0;
                float r = length(p);
                float a = atan(p.y, p.x);
                float rim = 0.86 + 0.025 * sin(a * 7.0 + uTime * 1.3) + 0.018 * sin(a * 13.0 - uTime * 2.1);
                // Outline stroke just outside the rim, then nothing.
                float outline = smoothstep(rim + 0.06, rim + 0.035, r) * smoothstep(rim + 0.005, rim + 0.02, r);
                if (r > rim + 0.06) discard;
                float spiral = sin(a * 3.0 + log(r + 0.02) * 9.0 - uTime * (1.6 + uOpen * 2.0));
                float glow = smoothstep(0.55, 1.0, spiral) * smoothstep(0.04, 0.7, r) * (0.06 + 0.16 * uOpen);
                vec3 color = vec3(0.03) + vec3(glow);
                // White gap between the hole and its outline, like a pen
                // that lifted for a moment.
                float gap = smoothstep(rim, rim + 0.005, r) * (1.0 - outline);
                color = mix(color, vec3(1.0), gap);
                color = mix(color, vec3(0.04), outline);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        fog: false,
        toneMapped: false,
    });

// ----------------------------------------------------------------- tunnel
// Panels in the tunnel are placed entirely by the shader. uWall = 1 lays a
// panel along the tunnel wall (it streams past at a grazing angle);
// uWall = 0 floats it face-on in the middle, cupped like a fisheye. Both
// twist with depth, so the whole tunnel corkscrews.
export const createTunnelMaterial = () =>
    new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null as THREE.Texture | null },
            uMapTransform: { value: new THREE.Matrix3() },
            uTime: { value: 0 },
            uTheta: { value: 0 },
            uRadius: { value: 2 },
            uZ: { value: -40 },
            uSize: { value: new THREE.Vector2(1, 1) },
            uWall: { value: 1 },
            uTwist: { value: 0.05 },
            uStretch: { value: 1 },
            uInk: { value: INK.clone() },
        },
        vertexShader: /* glsl */ `
            uniform float uTime, uTheta, uRadius, uZ, uWall, uTwist, uStretch;
            uniform vec2 uSize;
            varying vec2 vUv;
            varying float vDepth;
            void main() {
                vUv = uv;
                float x = position.x * uSize.x;
                float y = position.y * uSize.y;
                // Wall: x wraps round the circumference, y runs down the tunnel.
                float wz = uZ + y * uStretch;
                float breathe = 1.0 + 0.12 * sin(wz * 0.25 + uTime * 2.0);
                float wa = uTheta + x / uRadius + uTwist * wz;
                vec3 wall = vec3(cos(wa) * uRadius * breathe, sin(wa) * uRadius * breathe, wz);
                // Floating: face-on, rolled so its bottom points at the axis,
                // cupped toward you.
                float fa = uTheta + uTwist * uZ;
                vec2 c = vec2(cos(fa), sin(fa)) * uRadius * 0.45;
                float roll = fa - 1.5707963;
                vec2 local = vec2(cos(roll) * x - sin(roll) * y, sin(roll) * x + cos(roll) * y);
                vec3 floating = vec3(c + local, uZ - dot(local, local) * 0.35);
                vec3 p = mix(floating, wall, uWall);
                vDepth = -p.z;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D map;
            uniform mat3 uMapTransform;
            uniform vec2 uSize;
            uniform vec3 uInk;
            varying vec2 vUv;
            varying float vDepth;
            void main() {
                vec4 tex = texture2D(map, (uMapTransform * vec3(vUv, 1.0)).xy);
                vec2 m = min(vUv, 1.0 - vUv) * uSize;
                float border = 1.0 - smoothstep(0.015, 0.025, min(m.x, m.y));
                vec3 color = mix(tex.rgb, uInk, border);
                // Far away everything dissolves into the white.
                color = mix(color, vec3(1.0), smoothstep(22.0, 44.0, vDepth));
                gl_FragColor = vec4(color, 1.0);
                #include <colorspace_fragment>
            }
        `,
        side: THREE.DoubleSide,
        fog: false,
    });

// Point a material at a texture from the art loader, honouring the UV
// transform it uses to flip ImageBitmaps.
export const setMap = (material: THREE.ShaderMaterial, texture: THREE.Texture) => {
    texture.updateMatrix();
    material.uniforms.map.value = texture;
    material.uniforms.uMapTransform.value.copy(texture.matrix);
};
