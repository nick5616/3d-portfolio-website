import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NUM_STRANDS = 2;
const POINTS_PER_STRAND = 300;
const RADIUS = 2.5;
const HEIGHT = 20;
const CROSS_LINKS = 60;

export const DNAHelixEffect = () => {
    const helixRef = useRef<THREE.Group>(null);
    const crossLinksRef = useRef<THREE.Group>(null);

    // Create helix strands with better definition
    const helixGeometries = useMemo(() => {
        const geometries = [];

        for (let strand = 0; strand < NUM_STRANDS; strand++) {
            const points: THREE.Vector3[] = [];
            const offset = (strand / NUM_STRANDS) * Math.PI;

            for (let i = 0; i < POINTS_PER_STRAND; i++) {
                const t = i / (POINTS_PER_STRAND - 1);
                const angle = t * Math.PI * 8 + offset; // More turns for better definition
                const x = Math.cos(angle) * RADIUS;
                const z = Math.sin(angle) * RADIUS;
                const y = t * HEIGHT - HEIGHT / 2;

                points.push(new THREE.Vector3(x, y, z));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            geometries.push(geometry);
        }

        return geometries;
    }, []);

    // Create cross-links between strands with better spacing
    const crossLinkGeometries = useMemo(() => {
        const geometries = [];

        for (let i = 0; i < CROSS_LINKS; i++) {
            const t = i / (CROSS_LINKS - 1);
            const angle1 = t * Math.PI * 8;
            const angle2 = t * Math.PI * 8 + Math.PI;

            const x1 = Math.cos(angle1) * RADIUS;
            const z1 = Math.sin(angle1) * RADIUS;
            const x2 = Math.cos(angle2) * RADIUS;
            const z2 = Math.sin(angle2) * RADIUS;
            const y = t * HEIGHT - HEIGHT / 2;

            const points = [
                new THREE.Vector3(x1, y, z1),
                new THREE.Vector3(x2, y, z2),
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            geometries.push(geometry);
        }

        return geometries;
    }, []);

    // Create subtle background particles (much fewer and more organized)
    const backgroundParticles = useMemo(() => {
        const positions = new Float32Array(200 * 3); // Reduced from 1000
        const colors = new Float32Array(200 * 3);

        for (let i = 0; i < 200; i++) {
            // More organized particle placement around the helix
            const angle = (i / 200) * Math.PI * 16;
            const radius = RADIUS + 1 + Math.random() * 2;
            const height =
                (i / 200) * HEIGHT - HEIGHT / 2 + (Math.random() - 0.5) * 2;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Subtle blue/white colors
            const intensity = 0.3 + Math.random() * 0.4;
            colors[i * 3] = intensity * 0.5; // r
            colors[i * 3 + 1] = intensity * 0.8; // g
            colors[i * 3 + 2] = intensity; // b
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return geometry;
    }, []);

    useFrame((state, delta) => {
        if (helixRef.current) {
            helixRef.current.rotation.y += delta * 0.2;
        }

        if (crossLinksRef.current) {
            crossLinksRef.current.rotation.y += delta * 0.2;
        }
    });

    return (
        <group>
            {/* DNA Strands - thicker and more vibrant */}
            <group ref={helixRef}>
                {helixGeometries.map((geometry, i) => (
                    <mesh key={`strand-${i}`}>
                        <primitive object={geometry} attach="geometry" />
                        <lineBasicMaterial
                            color={i === 0 ? "#00ddff" : "#ff0088"}
                            transparent
                            opacity={0.9}
                            linewidth={3}
                        />
                    </mesh>
                ))}
            </group>

            {/* Cross Links - more subtle */}
            <group ref={crossLinksRef}>
                {crossLinkGeometries.map((geometry, i) => (
                    <mesh key={`cross-${i}`}>
                        <primitive object={geometry} attach="geometry" />
                        <lineBasicMaterial
                            color="#cccccc"
                            transparent
                            opacity={0.4}
                            linewidth={1}
                        />
                    </mesh>
                ))}
            </group>

            {/* Subtle Background Particles */}
            <points geometry={backgroundParticles}>
                <pointsMaterial
                    size={0.02}
                    vertexColors
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            <ambientLight intensity={0.2} />
        </group>
    );
};
