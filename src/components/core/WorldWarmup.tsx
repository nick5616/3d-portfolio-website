import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { useReadiness } from "../../stores/readinessStore";

// The assets, shaders and frames stages of a room load (see
// stores/readinessStore.ts). Mounted once inside the world's Canvas.
//
// Shaders are the big one. Left to the first frame, three.js compiles every
// material's program synchronously, which froze the page for 5-10 s on
// arrival in the atrium. Instead, while the room is loading the Canvas
// doesn't render at all (Scene.tsx), and once its parts are in place this
// compiles everything a few objects at a time and waits for the GPU to
// finish in the background (KHR_parallel_shader_compile), then uploads the
// textures a few per tick - so the loading screen keeps animating the
// whole time, and the first real frame has nothing left to do.

/** Quiet this long before "no textures loading" is believed. */
const ASSETS_SETTLE_MS = 300;
/** A texture that never arrives doesn't hold the room hostage. */
const ASSETS_TIMEOUT_MS = 25_000;
const SHADERS_TIMEOUT_MS = 30_000;
/** Consecutive frames under FRAME_OK_MS before the room counts as smooth. */
const SMOOTH_FRAMES = 8;
const FRAME_OK_MS = 45;
const FRAMES_TIMEOUT_MS = 5000;

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const texturesOf = (material: THREE.Material, out: Set<THREE.Texture>) => {
    for (const value of Object.values(material)) {
        if ((value as THREE.Texture)?.isTexture) out.add(value as THREE.Texture);
    }
    const uniforms = (material as THREE.ShaderMaterial).uniforms;
    if (uniforms) {
        for (const u of Object.values(uniforms)) {
            if ((u?.value as THREE.Texture)?.isTexture) out.add(u.value as THREE.Texture);
        }
    }
};

export const WorldWarmup: React.FC = () => {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const camera = useThree((s) => s.camera);
    const token = useReadiness((s) => s.token);
    const roomDone = useReadiness((s) => s.stages.room);
    const assetsDone = useReadiness((s) => s.stages.assets);
    const sharedDone = useReadiness((s) => s.stages.shared);
    const shadersDone = useReadiness((s) => s.stages.shaders);
    const framesDone = useReadiness((s) => s.stages.frames);

    // assets: the loading manager has gone quiet (after the room mounted,
    // since mounting is what starts most of its loads).
    useEffect(() => {
        if (!roomDone || assetsDone) return;
        const { done, setStageProgress } = useReadiness.getState();
        let settle: ReturnType<typeof setTimeout> | null = null;
        const check = () => {
            const { active, loaded, total } = useProgress.getState();
            setStageProgress(total ? loaded / total : 1, token);
            if (settle) clearTimeout(settle);
            settle = active ? null : setTimeout(() => done("assets", token), ASSETS_SETTLE_MS);
        };
        check();
        const unsubscribe = useProgress.subscribe(check);
        const timeout = setTimeout(() => done("assets", token), ASSETS_TIMEOUT_MS);
        return () => {
            unsubscribe();
            if (settle) clearTimeout(settle);
            clearTimeout(timeout);
        };
    }, [token, roomDone, assetsDone]);

    // shaders: compile in the background, then upload textures.
    useEffect(() => {
        if (!roomDone || !assetsDone || !sharedDone || shadersDone) return;
        let cancelled = false;
        const { done, setStageProgress } = useReadiness.getState();
        const timeout = setTimeout(() => done("shaders", token), SHADERS_TIMEOUT_MS);
        (async () => {
            // One pass over the whole scene: a program depends on every
            // light in view, so compiling part of the scene against the rest
            // would key some programs wrong and they'd compile again anyway.
            // This only queues the work; the GPU process compiles in parallel.
            await tick();
            if (cancelled) return;
            let materials = new Set<THREE.Material>();
            try {
                materials = gl.compile(scene, camera);
            } catch {
                // a material that can't compile shows up (and fails) on its
                // first frame anyway
            }
            const total = materials.size || 1;
            const pending = new Set(materials);
            while (pending.size && !cancelled) {
                pending.forEach((m) => {
                    const program = (gl.properties.get(m) as { currentProgram?: { isReady: () => boolean } })
                        .currentProgram;
                    if (!program || program.isReady()) pending.delete(m);
                });
                setStageProgress(0.8 * (1 - pending.size / total), token);
                if (pending.size) await new Promise((r) => setTimeout(r, 16));
            }
            // Textures: a handful per tick, so no single upload is a stall.
            const textures = new Set<THREE.Texture>();
            materials.forEach((m) => texturesOf(m, textures));
            const list = [...textures].filter((t) => t.image || (t as THREE.CubeTexture).images?.length);
            for (let i = 0; i < list.length && !cancelled; i++) {
                try {
                    gl.initTexture(list[i]);
                } catch {
                    // uploaded on first use instead
                }
                if (i % 3 === 2) {
                    setStageProgress(0.8 + (0.2 * i) / list.length, token);
                    await tick();
                }
            }
            if (!cancelled) done("shaders", token);
        })();
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [token, roomDone, assetsDone, sharedDone, shadersDone, gl, scene, camera]);

    // frames: rendering again; wait for it to run smoothly.
    const smooth = useRef(0);
    const framesSince = useRef(0);
    useEffect(() => {
        smooth.current = 0;
        framesSince.current = performance.now();
        if (!shadersDone || framesDone) return;
        const timeout = setTimeout(() => useReadiness.getState().done("frames", token), FRAMES_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, [token, shadersDone, framesDone]);
    useFrame((_, delta) => {
        if (!shadersDone || framesDone) return;
        smooth.current = delta * 1000 < FRAME_OK_MS ? smooth.current + 1 : 0;
        useReadiness.getState().setStageProgress(smooth.current / SMOOTH_FRAMES, token);
        if (smooth.current >= SMOOTH_FRAMES) useReadiness.getState().done("frames", token);
    });

    return null;
};
