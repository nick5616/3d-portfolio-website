import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 5000;
const PARTICLE_SPEED = 2;
const LINE_LENGTH = 4;

export const WarpSpeedLoadingScene = () => {
    const particlesRef = useRef<THREE.Points>(null);

    // Create particles in a cylindrical formation
    const { positions, colors } = useMemo(() => {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Distribute particles in a cylindrical pattern
            const radius = Math.random() * 10;
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 20;

            // Convert to Cartesian coordinates
            positions[i * 3] = Math.cos(theta) * radius; // x
            positions[i * 3 + 1] = y; // y
            positions[i * 3 + 2] = Math.sin(theta) * radius; // z

            // Create a blue-white color gradient
            const intensity = Math.random() * 0.5 + 0.5;
            colors[i * 3] = intensity * 0.5; // r
            colors[i * 3 + 1] = intensity * 0.8; // g
            colors[i * 3 + 2] = intensity; // b
        }

        return { positions, colors };
    }, []);

    // Create geometry with stretched particles
    const geometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return geometry;
    }, [positions, colors]);

    // Create material for particles
    const material = useMemo(() => {
        return new THREE.PointsMaterial({
            size: LINE_LENGTH,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
    }, []);

    // Animate particles
    useFrame((state, delta) => {
        if (!particlesRef.current) return;

        const positions = particlesRef.current.geometry.attributes.position;
        const array = positions.array as Float32Array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Move particles along z-axis
            array[i * 3 + 2] +=
                delta * PARTICLE_SPEED * (array[i * 3 + 2] / 10);

            // Reset particles that go too far
            if (array[i * 3 + 2] > 20) {
                array[i * 3 + 2] = -20;
            }
        }

        positions.needsUpdate = true;
    });

    return (
        <points ref={particlesRef} geometry={geometry} material={material} />
    );
};
