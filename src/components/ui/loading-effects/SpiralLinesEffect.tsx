import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { cos, positionLocal, sin, time, vec3 } from "three/tsl";

const NUM_CURVES = 50;
const POINTS_PER_CURVE = 100;
const CURVE_RADIUS = 5;

export const SpiralLinesEffect = () => {
    const linesRef = useRef<THREE.Group>(null);

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

    // TSL node material - the flowing-line color/wave animation is driven
    // entirely by TSL's built-in `time` node, so there's no per-frame
    // uniform to update here.
    const shaderMaterial = useMemo(() => {
        const t = positionLocal.y.mul(0.1).add(time.mul(0.2));
        const colorNode = vec3(0.5, 0.5, 0.5).add(
            cos(
                t
                    .mul(vec3(1.0, 0.7, 0.4))
                    .add(vec3(0.0, 0.15, 0.2))
                    .mul(6.28318)
            ).mul(0.5)
        );
        const wave = sin(t.mul(2.0).add(positionLocal.x)).mul(0.2);
        const zOffset = cos(t.mul(3.0).add(positionLocal.x)).mul(0.2);

        const material = new MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
        material.colorNode = colorNode;
        material.positionNode = positionLocal.add(vec3(wave, 0.0, zOffset));
        return material;
    }, []);

    // Animate the lines
    useFrame((state, delta) => {
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
