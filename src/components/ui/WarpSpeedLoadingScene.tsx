import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Shader for the flowing lines
const lineVertexShader = `
  uniform float time;
  varying vec3 vColor;
  
  vec3 getColor(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t * vec3(1.0, 0.7, 0.4) + vec3(0.0, 0.15, 0.20)));
  }

  void main() {
    float t = position.y * 0.1 + time * 0.2;
    vColor = getColor(t);
    
    // Add some waviness to the position
    vec3 pos = position;
    float wave = sin(t * 2.0 + position.x) * 0.2;
    pos.x += wave;
    pos.z += cos(t * 3.0 + position.x) * 0.2;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const lineFragmentShader = `
  varying vec3 vColor;
  
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

const NUM_CURVES = 50;
const POINTS_PER_CURVE = 100;
const CURVE_RADIUS = 5;

export const WarpSpeedLoadingScene = () => {
    const linesRef = useRef<THREE.Group>(null);
    const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);

    // Create flowing curves
    const curves = useMemo(() => {
        const curves: THREE.CatmullRomCurve3[] = [];
        for (let i = 0; i < NUM_CURVES; i++) {
            const points: THREE.Vector3[] = [];
            const angle = (i / NUM_CURVES) * Math.PI * 2;
            const radius = CURVE_RADIUS;
            const height = 20;

            for (let j = 0; j < POINTS_PER_CURVE; j++) {
                const t = j / (POINTS_PER_CURVE - 1);
                const spiralRadius =
                    radius * (1 + Math.sin(t * Math.PI * 4) * 0.3);
                const x = Math.cos(angle + t * Math.PI * 4) * spiralRadius;
                const y = t * height - height / 2;
                const z = Math.sin(angle + t * Math.PI * 4) * spiralRadius;
                points.push(new THREE.Vector3(x, y, z));
            }

            const curve = new THREE.CatmullRomCurve3(points);
            curves.push(curve);
        }
        return curves;
    }, []);

    // Create line geometries from curves
    const lineGeometries = useMemo(() => {
        return curves.map((curve) => {
            const points = curve.getPoints(POINTS_PER_CURVE);
            return new THREE.BufferGeometry().setFromPoints(points);
        });
    }, [curves]);

    // Create shader material
    const shaderMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: lineVertexShader,
            fragmentShader: lineFragmentShader,
            uniforms: {
                time: { value: 0 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
    }, []);

    // Animate the lines
    useFrame((state, delta) => {
        if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.time.value += delta;
        }

        if (linesRef.current) {
            linesRef.current.rotation.y += delta * 0.1;
            linesRef.current.rotation.x =
                Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
        }
    });

    // Create fractal effect
    const createFractalPoints = useMemo(() => {
        const points: THREE.Vector3[] = [];
        const iterations = 5;
        const angleStep = (Math.PI * 2) / 5;

        const addPoint = (
            x: number,
            y: number,
            z: number,
            size: number,
            depth: number
        ) => {
            if (depth <= 0) {
                points.push(new THREE.Vector3(x, y, z));
                return;
            }

            for (let i = 0; i < 5; i++) {
                const angle = i * angleStep;
                const newSize = size * 0.4;
                const newX = x + Math.cos(angle) * size;
                const newY = y + size * 0.5;
                const newZ = z + Math.sin(angle) * size;
                addPoint(newX, newY, newZ, newSize, depth - 1);
            }
        };

        addPoint(0, -10, 0, 3, iterations);
        return points;
    }, []);

    const fractalGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(createFractalPoints);
    }, [createFractalPoints]);

    return (
        <group>
            {/* Flowing lines */}
            <group ref={linesRef}>
                {lineGeometries.map((geometry, i) => (
                    <mesh key={i}>
                        <primitive object={geometry} attach="geometry" />
                        <primitive
                            object={shaderMaterial}
                            attach="material"
                            ref={i === 0 ? shaderMaterialRef : undefined}
                        />
                    </mesh>
                ))}
            </group>

            {/* Fractal points */}
            <points geometry={fractalGeometry}>
                <pointsMaterial
                    size={0.05}
                    color="#ffffff"
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Ambient light for better visibility */}
            <ambientLight intensity={0.2} />
        </group>
    );
};
