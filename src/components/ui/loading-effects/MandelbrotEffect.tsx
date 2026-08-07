import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PointsNodeMaterial } from "three/webgpu";
import {
    Break,
    Fn,
    If,
    Loop,
    cos,
    dot,
    float,
    length,
    pointUV,
    positionLocal,
    sin,
    smoothstep,
    time,
    vec2,
    vec3,
} from "three/tsl";

const GRID_SIZE = 100;

export const MandelbrotEffect = () => {
    const meshRef = useRef<THREE.Points>(null);

    const geometry = useMemo(() => {
        const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3);
        let index = 0;

        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                positions[index++] = (x - GRID_SIZE / 2) * 0.2;
                positions[index++] = (y - GRID_SIZE / 2) * 0.2;
                positions[index++] = 0;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        return geometry;
    }, []);

    // TSL node material - the escape-time iteration, wave motion and point
    // falloff all live on the GPU via nodes, driven by TSL's built-in
    // `time` node (no per-frame uniform updates needed).
    //
    // Note: the WebGPU spec only supports 1px point primitives, so
    // `sizeNode` (and this dot field's intended point size) only has
    // effect when the WebGL2 fallback backend is in use.
    const material = useMemo(() => {
        const mandelbrot = Fn(([c]: [ReturnType<typeof vec2>]) => {
            const z = vec2(0.0, 0.0).toVar();
            const iter = float(20.0).toVar();

            Loop(20, ({ i }) => {
                If(dot(z, z).greaterThan(4.0), () => {
                    iter.assign(float(i));
                    Break();
                });
                z.assign(
                    vec2(
                        z.x.mul(z.x).sub(z.y.mul(z.y)),
                        z.x.mul(z.y).mul(2.0)
                    ).add(c)
                );
            });

            return iter;
        });

        const c = positionLocal.xy
            .mul(0.02)
            .add(
                vec2(
                    sin(time.mul(0.1)).mul(0.5),
                    cos(time.mul(0.15)).mul(0.3)
                )
            );
        const iter = mandelbrot(c);
        const t = iter.div(20.0);
        const colorNode = vec3(0.5, 0.5, 0.5).add(
            cos(
                t
                    .mul(vec3(1.0, 0.5, 0.8))
                    .add(vec3(0.0, 0.33, 0.67))
                    .mul(6.28318)
            ).mul(0.5)
        );

        const positionNode = vec3(
            positionLocal.x,
            positionLocal.y.add(
                sin(time.add(positionLocal.x.mul(0.1))).mul(0.5)
            ),
            t.mul(5.0).sub(2.5)
        );

        const opacityNode = Fn(() => {
            const dist = length(pointUV.sub(vec2(0.5, 0.5)));
            dist.greaterThan(0.5).discard();
            return float(1.0).sub(smoothstep(0.3, 0.5, dist));
        })();

        const mat = new PointsNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
        mat.colorNode = colorNode;
        mat.positionNode = positionNode;
        mat.opacityNode = opacityNode;
        mat.sizeNode = float(3.0);
        return mat;
    }, []);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.z += delta * 0.05;
            meshRef.current.rotation.x =
                Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
        }
    });

    return (
        <group>
            <points ref={meshRef} geometry={geometry}>
                <primitive object={material} attach="material" />
            </points>
            <ambientLight intensity={0.1} />
        </group>
    );
};
