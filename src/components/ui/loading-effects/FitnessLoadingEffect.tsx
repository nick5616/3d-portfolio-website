import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const FitnessLoadingEffect = () => {
    const heartbeatRef = useRef<THREE.Group>(null);
    const energyRingsRef = useRef<THREE.Group>(null);
    const muscleWavesRef = useRef<THREE.Points>(null);
    const pulseRef = useRef<THREE.Mesh>(null);

    // Create heartbeat visualization
    const heartbeatPattern = useMemo(() => {
        const points: THREE.Vector3[] = [];
        const heartbeatData = [
            0, 0, 0.1, 0.2, 0.8, 1.0, 0.9, 0.3, 0.1, 0, 0, 0, 0, 0, 0.2, 0.6,
            0.4, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ];

        for (let i = 0; i < heartbeatData.length; i++) {
            const x = (i / heartbeatData.length - 0.5) * 8;
            const y = heartbeatData[i] * 3;
            points.push(new THREE.Vector3(x, y, 0));
        }

        return new THREE.BufferGeometry().setFromPoints(points);
    }, []);

    // Create energy rings
    const energyRings = useMemo(() => {
        const rings = [];

        for (let i = 0; i < 6; i++) {
            const radius = 1 + i * 0.8;
            const geometry = new THREE.RingGeometry(radius, radius + 0.1, 32);

            rings.push({
                geometry,
                position: new THREE.Vector3(0, 0, 0),
                speed: 1 + i * 0.3,
                color: new THREE.Color().setHSL(
                    0.05 + i * 0.03, // Red to orange spectrum
                    1.0,
                    0.5 + (i % 2) * 0.3
                ),
            });
        }

        return rings;
    }, []);

    // Create muscle/energy wave particles
    const muscleWaves = useMemo(() => {
        const positions = new Float32Array(1000 * 3);
        const colors = new Float32Array(1000 * 3);
        const velocities = new Float32Array(1000 * 3);

        for (let i = 0; i < 1000; i++) {
            // Create wave-like distribution
            const angle = (i / 1000) * Math.PI * 20;
            const wave = Math.sin(angle) * 2 + Math.cos(angle * 0.3) * 1;
            const radius = 3 + wave;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.sin(angle * 0.5) * 2 + wave;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Initial velocities for dynamic movement
            velocities[i * 3] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

            // Energy colors - red, orange, yellow
            const energy = Math.random();
            if (energy < 0.4) {
                colors[i * 3] = 1; // Red
                colors[i * 3 + 1] = 0.2;
                colors[i * 3 + 2] = 0;
            } else if (energy < 0.7) {
                colors[i * 3] = 1; // Orange
                colors[i * 3 + 1] = 0.5;
                colors[i * 3 + 2] = 0;
            } else {
                colors[i * 3] = 1; // Yellow
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 0.2;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.userData = { velocities };

        return geometry;
    }, []);

    // Create power bars
    const powerBars = useMemo(() => {
        const bars = [];

        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const radius = 5;

            bars.push({
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                ),
                height: 1 + Math.random() * 3,
                frequency: 1 + Math.random() * 3,
                phase: Math.random() * Math.PI * 2,
            });
        }

        return bars;
    }, []);

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;
        const heartbeatFreq = 1.2; // BPM style frequency
        const beat = Math.sin(time * heartbeatFreq * Math.PI * 2);
        const strongBeat = beat > 0.8 ? 1 : 0;

        // Heartbeat pulse animation
        if (heartbeatRef.current) {
            const scale = 1 + strongBeat * 0.3 + Math.abs(beat) * 0.1;
            heartbeatRef.current.scale.setScalar(scale);
            heartbeatRef.current.rotation.z += delta * 0.1;
        }

        // Energy rings pulsing
        if (energyRingsRef.current) {
            energyRingsRef.current.children.forEach((ring, i) => {
                const data = energyRings[i];
                const ringBeat =
                    Math.sin(time * data.speed * Math.PI) * 0.5 + 0.5;
                ring.scale.setScalar(1 + ringBeat * 0.3);
                ring.rotation.z += delta * data.speed * 0.5;
            });
        }

        // Central power pulse
        if (pulseRef.current) {
            const pulseScale = 1 + Math.abs(beat) * 0.5 + strongBeat * 0.3;
            pulseRef.current.scale.setScalar(pulseScale);
        }

        // Dynamic muscle wave particles
        if (muscleWavesRef.current) {
            const positions =
                muscleWavesRef.current.geometry.attributes.position;
            const velocities =
                muscleWavesRef.current.geometry.userData.velocities;
            const array = positions.array as Float32Array;

            for (let i = 0; i < 1000; i++) {
                // Add energy-based motion
                const energyBoost = strongBeat * 0.1;
                array[i * 3] += velocities[i * 3] + energyBoost;
                array[i * 3 + 1] +=
                    velocities[i * 3 + 1] +
                    Math.sin(time * 3 + i * 0.01) * 0.02;
                array[i * 3 + 2] += velocities[i * 3 + 2] + energyBoost;

                // Reset if too far
                const distance = Math.sqrt(
                    array[i * 3] * array[i * 3] +
                        array[i * 3 + 2] * array[i * 3 + 2]
                );
                if (distance > 8) {
                    array[i * 3] *= 0.3;
                    array[i * 3 + 2] *= 0.3;
                }
            }

            positions.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Central heartbeat pattern */}
            <group ref={heartbeatRef} position={[0, 2, 0]}>
                <mesh>
                    <primitive object={heartbeatPattern} attach="geometry" />
                    <lineBasicMaterial
                        color="#ff0040"
                        transparent
                        opacity={0.9}
                        linewidth={4}
                    />
                </mesh>
            </group>

            {/* Energy rings */}
            <group ref={energyRingsRef}>
                {energyRings.map((ring, i) => (
                    <mesh
                        key={i}
                        position={ring.position}
                        geometry={ring.geometry}
                    >
                        <meshBasicMaterial
                            color={ring.color}
                            transparent
                            opacity={0.7}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                ))}
            </group>

            {/* Central power pulse */}
            <mesh ref={pulseRef}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#ff4000" transparent opacity={0.8} />
            </mesh>

            {/* Power bars around the edge */}
            {powerBars.map((bar, i) => (
                <mesh key={i} position={bar.position}>
                    <boxGeometry args={[0.2, bar.height, 0.2]} />
                    <meshBasicMaterial
                        color="#ff8000"
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}

            {/* Dynamic muscle wave particles */}
            <points ref={muscleWavesRef} geometry={muscleWaves}>
                <pointsMaterial
                    size={0.04}
                    vertexColors
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    sizeAttenuation={true}
                />
            </points>

            {/* High-energy lighting */}
            <ambientLight intensity={0.3} color="#ff4000" />
            <pointLight
                position={[0, 0, 0]}
                intensity={1.5}
                color="#ff0000"
                distance={8}
            />
            <pointLight
                position={[3, 3, 0]}
                intensity={0.8}
                color="#ff8000"
                distance={6}
            />
            <pointLight
                position={[-3, -3, 0]}
                intensity={0.8}
                color="#ffff00"
                distance={6}
            />
        </group>
    );
};
