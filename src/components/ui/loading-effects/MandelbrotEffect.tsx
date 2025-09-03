import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GRID_SIZE = 100;
const SCALE = 0.02;
const MAX_ITERATIONS = 20;

export const MandelbrotEffect = () => {
    const meshRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const mandelbrotShader = useMemo(
        () => ({
            vertexShader: `
            uniform float time;
            varying vec3 vColor;
            varying vec3 vPosition;
            
            vec3 getColor(float iterations) {
                float t = iterations / 20.0;
                return 0.5 + 0.5 * cos(6.28318 * (t * vec3(1.0, 0.5, 0.8) + vec3(0.0, 0.33, 0.67)));
            }
            
            float mandelbrot(vec2 c) {
                vec2 z = vec2(0.0);
                for(int i = 0; i < 20; i++) {
                    if(dot(z, z) > 4.0) return float(i);
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
                }
                return 20.0;
            }
            
            void main() {
                vec2 c = position.xy * 0.02 + vec2(sin(time * 0.1) * 0.5, cos(time * 0.15) * 0.3);
                float iter = mandelbrot(c);
                
                vColor = getColor(iter);
                vPosition = position;
                
                vec3 pos = position;
                pos.z = (iter / 20.0) * 5.0 - 2.5;
                pos.y += sin(time + position.x * 0.1) * 0.5;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 3.0;
            }
        `,
            fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if(dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
            uniforms: {
                time: { value: 0 },
            },
        }),
        []
    );

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

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...mandelbrotShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
    }, [mandelbrotShader]);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value += delta;
        }

        if (meshRef.current) {
            meshRef.current.rotation.z += delta * 0.05;
            meshRef.current.rotation.x =
                Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
        }
    });

    return (
        <group>
            <points ref={meshRef} geometry={geometry}>
                <primitive
                    object={material}
                    attach="material"
                    ref={materialRef}
                />
            </points>
            <ambientLight intensity={0.1} />
        </group>
    );
};
