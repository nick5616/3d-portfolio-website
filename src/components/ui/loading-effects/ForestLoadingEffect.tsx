import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const ForestLoadingEffect = () => {
    const treesRef = useRef<THREE.Group>(null);
    const leavesRef = useRef<THREE.Points>(null);
    const rootsRef = useRef<THREE.Group>(null);
    const windRef = useRef<THREE.Points>(null);

    // Create organic tree structures
    const treeStructures = useMemo(() => {
        const trees = [];

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 3 + Math.random() * 2;
            const height = 2 + Math.random() * 3;

            // Create tree trunk
            const trunkPoints: THREE.Vector3[] = [];
            const branches: THREE.Vector3[][] = [];

            // Main trunk - organic curve
            for (let j = 0; j <= 20; j++) {
                const t = j / 20;
                const x =
                    Math.cos(angle) * radius + Math.sin(t * Math.PI * 3) * 0.1;
                const y = t * height;
                const z =
                    Math.sin(angle) * radius + Math.cos(t * Math.PI * 2) * 0.1;
                trunkPoints.push(new THREE.Vector3(x, y, z));

                // Add branches at certain heights
                if (j > 10 && Math.random() > 0.7) {
                    const branchPoints: THREE.Vector3[] = [];
                    const branchDir = new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        Math.random() * 0.5 + 0.5,
                        (Math.random() - 0.5) * 2
                    ).normalize();

                    for (let k = 0; k < 10; k++) {
                        const branchT = k / 10;
                        const branchPos = new THREE.Vector3(x, y, z).add(
                            branchDir.clone().multiplyScalar(branchT * 1.5)
                        );
                        branchPoints.push(branchPos);
                    }
                    branches.push(branchPoints);
                }
            }

            trees.push({
                trunk: new THREE.BufferGeometry().setFromPoints(trunkPoints),
                branches: branches.map((b) =>
                    new THREE.BufferGeometry().setFromPoints(b)
                ),
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                ),
                sway: Math.random() * 0.5 + 0.3,
            });
        }

        return trees;
    }, []);

    // Create floating leaves
    const floatingLeaves = useMemo(() => {
        const positions = new Float32Array(800 * 3);
        const colors = new Float32Array(800 * 3);
        const sizes = new Float32Array(800);
        const velocities = new Float32Array(800 * 3);

        for (let i = 0; i < 800; i++) {
            // Distribute around the forest
            const angle = Math.random() * Math.PI * 2;
            const radius = 2 + Math.random() * 6;
            const height = Math.random() * 8;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Gentle falling motion
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = -Math.random() * 0.01 - 0.005;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

            // Natural leaf colors
            const leafType = Math.random();
            if (leafType < 0.3) {
                colors[i * 3] = 0.2 + Math.random() * 0.3; // Dark green
                colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.1;
            } else if (leafType < 0.6) {
                colors[i * 3] = 0.8 + Math.random() * 0.2; // Yellow/gold
                colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.1;
            } else {
                colors[i * 3] = 0.6 + Math.random() * 0.3; // Brown/orange
                colors[i * 3 + 1] = 0.3 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.1;
            }

            sizes[i] = 0.02 + Math.random() * 0.04;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
        geometry.userData = { velocities };

        return geometry;
    }, []);

    // Create root systems
    const rootSystems = useMemo(() => {
        const roots = [];

        for (let i = 0; i < 6; i++) {
            const points: THREE.Vector3[] = [];
            const centerAngle = (i / 6) * Math.PI * 2;
            const centerRadius = 2 + Math.random() * 3;
            const centerX = Math.cos(centerAngle) * centerRadius;
            const centerZ = Math.sin(centerAngle) * centerRadius;

            // Create spreading root network
            for (let j = 0; j < 5; j++) {
                const rootAngle = centerAngle + (j - 2) * 0.5;
                const rootLength = 2 + Math.random() * 2;

                for (let k = 0; k <= 15; k++) {
                    const t = k / 15;
                    const x = centerX + Math.cos(rootAngle) * t * rootLength;
                    const y = -t * 1.5 + Math.sin(t * Math.PI * 4) * 0.2;
                    const z = centerZ + Math.sin(rootAngle) * t * rootLength;
                    points.push(new THREE.Vector3(x, y, z));
                }
            }

            roots.push(new THREE.BufferGeometry().setFromPoints(points));
        }

        return roots;
    }, []);

    // Create wind particles
    const windParticles = useMemo(() => {
        const positions = new Float32Array(300 * 3);
        const colors = new Float32Array(300 * 3);

        for (let i = 0; i < 300; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 16;
            positions[i * 3 + 1] = Math.random() * 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 16;

            // Subtle blue-white wind colors
            const intensity = 0.3 + Math.random() * 0.4;
            colors[i * 3] = intensity * 0.8;
            colors[i * 3 + 1] = intensity * 0.9;
            colors[i * 3 + 2] = intensity;
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
        const time = state.clock.elapsedTime;

        // Gentle tree swaying
        if (treesRef.current) {
            treesRef.current.children.forEach((tree, i) => {
                const data = treeStructures[i];
                tree.rotation.z = Math.sin(time * data.sway) * 0.05;
                tree.rotation.x = Math.cos(time * data.sway * 0.7) * 0.03;
            });
        }

        // Falling leaves animation
        if (leavesRef.current) {
            const positions = leavesRef.current.geometry.attributes.position;
            const velocities = leavesRef.current.geometry.userData.velocities;
            const array = positions.array as Float32Array;

            for (let i = 0; i < 800; i++) {
                // Wind effect
                const windEffect = Math.sin(time + i * 0.01) * 0.001;
                array[i * 3] += velocities[i * 3] + windEffect;
                array[i * 3 + 1] += velocities[i * 3 + 1];
                array[i * 3 + 2] += velocities[i * 3 + 2] + windEffect * 0.5;

                // Reset leaves that fall too low
                if (array[i * 3 + 1] < -2) {
                    array[i * 3 + 1] = 8 + Math.random() * 2;
                    array[i * 3] = (Math.random() - 0.5) * 12;
                    array[i * 3 + 2] = (Math.random() - 0.5) * 12;
                }
            }

            positions.needsUpdate = true;
        }

        // Wind particle flow
        if (windRef.current) {
            const positions = windRef.current.geometry.attributes.position;
            const array = positions.array as Float32Array;

            for (let i = 0; i < 300; i++) {
                array[i * 3] += Math.sin(time + i * 0.1) * 0.02;
                array[i * 3 + 2] += Math.cos(time * 0.7 + i * 0.05) * 0.015;

                // Wrap around
                if (array[i * 3] > 8) array[i * 3] = -8;
                if (array[i * 3] < -8) array[i * 3] = 8;
                if (array[i * 3 + 2] > 8) array[i * 3 + 2] = -8;
                if (array[i * 3 + 2] < -8) array[i * 3 + 2] = 8;
            }

            positions.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Tree structures */}
            <group ref={treesRef}>
                {treeStructures.map((tree, i) => (
                    <group key={i} position={tree.position}>
                        {/* Trunk */}
                        <mesh>
                            <primitive object={tree.trunk} attach="geometry" />
                            <lineBasicMaterial
                                color="#4a4a3a"
                                transparent
                                opacity={0.8}
                                linewidth={3}
                            />
                        </mesh>
                        {/* Branches */}
                        {tree.branches.map((branch, j) => (
                            <mesh key={j}>
                                <primitive object={branch} attach="geometry" />
                                <lineBasicMaterial
                                    color="#5a5a4a"
                                    transparent
                                    opacity={0.7}
                                    linewidth={2}
                                />
                            </mesh>
                        ))}
                    </group>
                ))}
            </group>

            {/* Root systems */}
            <group ref={rootsRef}>
                {rootSystems.map((root, i) => (
                    <mesh key={i}>
                        <primitive object={root} attach="geometry" />
                        <lineBasicMaterial
                            color="#3a2a1a"
                            transparent
                            opacity={0.6}
                            linewidth={1}
                        />
                    </mesh>
                ))}
            </group>

            {/* Floating leaves */}
            <points ref={leavesRef} geometry={floatingLeaves}>
                <pointsMaterial
                    vertexColors
                    transparent
                    opacity={0.8}
                    sizeAttenuation={true}
                    blending={THREE.NormalBlending}
                />
            </points>

            {/* Wind particles */}
            <points ref={windRef} geometry={windParticles}>
                <pointsMaterial
                    size={0.01}
                    vertexColors
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Natural forest lighting */}
            <ambientLight intensity={0.4} color="#e8f5e8" />
            <directionalLight
                position={[5, 10, 5]}
                intensity={0.6}
                color="#f0f8e8"
                castShadow
            />
            <pointLight
                position={[0, 5, 0]}
                intensity={0.3}
                color="#a8d8a8"
                distance={12}
            />
        </group>
    );
};
