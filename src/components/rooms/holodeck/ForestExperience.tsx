import React, { useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface FairyLight {
    position: [number, number, number];
    opacity: number;
    fadeInSpeed: number;
    fadeOutSpeed: number;
    maxLife: number;
    currentLife: number;
    color: string;
}

interface FloatingParticle {
    position: [number, number, number];
    opacity: number;
    driftSpeed: number;
    fadeInSpeed: number;
    fadeOutSpeed: number;
    maxLife: number;
    currentLife: number;
    size: number;
}

interface Tree {
    position: [number, number, number];
    height: number;
    trunkRadius: number;
    foliageSize: number;
}

interface Mountain {
    position: [number, number, number];
    scale: [number, number, number];
}

interface Cloud {
    position: [number, number, number];
    scale: [number, number, number];
    opacity: number;
}

interface LightRay {
    position: [number, number, number];
    rotation: [number, number, number];
}

export const ForestExperience: React.FC = () => {
    const { scene } = useThree();
    const [fairyLights, setFairyLights] = useState<FairyLight[]>([]);
    const [floatingParticles, setFloatingParticles] = useState<
        FloatingParticle[]
    >([]);
    const [trees, setTrees] = useState<Tree[]>([]);
    const [mountains, setMountains] = useState<Mountain[]>([]);
    const [clouds, setClouds] = useState<Cloud[]>([]);
    const [lightRays, setLightRays] = useState<LightRay[]>([]);

    // Store original scene settings to restore later
    const [originalBackground, setOriginalBackground] =
        useState<THREE.Color | null>(null);
    const [originalFog, setOriginalFog] = useState<THREE.Fog | null>(null);

    // Initialize fairy lights, particles, and trees (static positions)
    useEffect(() => {
        // Generate tree positions once and store them
        // Control panel is at [3.45, 2, 0] - avoid placing trees in front of it
        const initialTrees: Tree[] = [];
        let attempts = 0;
        const maxAttempts = 100;

        while (initialTrees.length < 6 && attempts < maxAttempts) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 2.5 + Math.random() * 1.2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Check if this position would block the control panel
            // Control panel is at [3.45, 2, 0], so avoid area around x > 2.5 and z between -1.5 and 1.5
            const blocksControlPanel = x > 2.5 && Math.abs(z) < 1.5;

            if (!blocksControlPanel) {
                initialTrees.push({
                    position: [x, 0, z] as [number, number, number],
                    height: 2.5 + Math.random() * 1,
                    trunkRadius: 0.15 + Math.random() * 0.1,
                    foliageSize: 1 + Math.random() * 0.5,
                });
            }
            attempts++;
        }
        setTrees(initialTrees);

        const initialFairyLights: FairyLight[] = Array.from({ length: 12 }).map(
            () => ({
                position: [
                    (Math.random() - 0.5) * 6,
                    0.5 + Math.random() * 2,
                    (Math.random() - 0.5) * 6,
                ],
                opacity: 0,
                fadeInSpeed: 0.001 + Math.random() * 0.002,
                fadeOutSpeed: 0.0005 + Math.random() * 0.001,
                maxLife: 400 + Math.random() * 600,
                currentLife: Math.random() * 200,
                color: Math.random() > 0.5 ? "#FFE4B5" : "#E6E6FA", // Soft golden and lavender
            })
        );
        setFairyLights(initialFairyLights);

        const initialParticles: FloatingParticle[] = Array.from({
            length: 20,
        }).map(() => ({
            position: [
                (Math.random() - 0.5) * 7,
                Math.random() * 2.5,
                (Math.random() - 0.5) * 7,
            ],
            opacity: 0,
            driftSpeed: 0.002 + Math.random() * 0.003,
            fadeInSpeed: 0.0008 + Math.random() * 0.0015,
            fadeOutSpeed: 0.0005 + Math.random() * 0.001,
            maxLife: 300 + Math.random() * 500,
            currentLife: Math.random() * 150,
            size: 0.02 + Math.random() * 0.03,
        }));
        setFloatingParticles(initialParticles);

        // Generate static mountain positions
        const initialMountains: Mountain[] = Array.from({ length: 12 }).map(
            (_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const distance = 25 + Math.random() * 10;
                return {
                    position: [
                        Math.cos(angle) * distance,
                        -2 + Math.random() * 4,
                        Math.sin(angle) * distance,
                    ] as [number, number, number],
                    scale: [
                        2 + Math.random() * 3,
                        3 + Math.random() * 5,
                        2 + Math.random() * 3,
                    ] as [number, number, number],
                };
            }
        );
        setMountains(initialMountains);

        // Generate static cloud positions
        const initialClouds: Cloud[] = Array.from({ length: 8 }).map(() => ({
            position: [
                (Math.random() - 0.5) * 40,
                8 + Math.random() * 6,
                (Math.random() - 0.5) * 40,
            ] as [number, number, number],
            scale: [
                2 + Math.random() * 3,
                1 + Math.random(),
                2 + Math.random() * 3,
            ] as [number, number, number],
            opacity: 0.7 + Math.random() * 0.3,
        }));
        setClouds(initialClouds);

        // Generate static light ray positions
        const initialLightRays: LightRay[] = Array.from({ length: 5 }).map(
            () => ({
                position: [
                    (Math.random() - 0.5) * 6,
                    4,
                    (Math.random() - 0.5) * 6,
                ] as [number, number, number],
                rotation: [
                    Math.PI / 2 + (Math.random() - 0.5) * 0.3,
                    Math.random() * Math.PI * 2,
                    0,
                ] as [number, number, number],
            })
        );
        setLightRays(initialLightRays);
    }, []);

    // Effect to change global scene environment when forest experience is active
    useEffect(() => {
        // Store original settings
        setOriginalBackground(scene.background as THREE.Color | null);
        setOriginalFog(scene.fog as THREE.Fog | null);

        // Set forest environment for the entire scene
        scene.background = new THREE.Color("#87CEEB"); // Sky blue
        scene.fog = new THREE.Fog("#B0E0E6", 15, 40); // Light blue atmospheric fog

        console.log(
            "🌲 Forest environment activated - changed global scene background"
        );

        // Cleanup function to restore original settings when component unmounts
        return () => {
            if (originalBackground) {
                scene.background = originalBackground;
            } else {
                scene.background = null; // Reset to no background if there wasn't one
            }

            if (originalFog) {
                scene.fog = originalFog;
            } else {
                scene.fog = new THREE.Fog("#000000", 10, 20); // Default fog
            }

            console.log(
                "🌲 Forest environment deactivated - restored original scene background"
            );
        };
    }, [scene, originalBackground, originalFog]);

    // Animation loop for gentle movements and fading
    useFrame(() => {
        // Update fairy lights
        setFairyLights((prevLights) =>
            prevLights.map((light) => {
                let newOpacity = light.opacity;
                let newLife = light.currentLife + 1;

                // Slow fade in phase
                if (newLife < 150) {
                    newOpacity = Math.min(
                        0.8,
                        light.opacity + light.fadeInSpeed
                    );
                }
                // Slow fade out phase
                else if (newLife > light.maxLife - 150) {
                    newOpacity = Math.max(
                        0,
                        light.opacity - light.fadeOutSpeed
                    );
                }

                // Reset light if it completes its lifecycle
                if (newLife >= light.maxLife) {
                    return {
                        position: [
                            (Math.random() - 0.5) * 7,
                            0.5 + Math.random() * 2.5,
                            (Math.random() - 0.5) * 7,
                        ],
                        opacity: 0,
                        fadeInSpeed: 0.001 + Math.random() * 0.002,
                        fadeOutSpeed: 0.0005 + Math.random() * 0.001,
                        maxLife: 400 + Math.random() * 600,
                        currentLife: 0,
                        color: Math.random() > 0.5 ? "#FFE4B5" : "#E6E6FA",
                    };
                }

                return {
                    ...light,
                    opacity: newOpacity,
                    currentLife: newLife,
                };
            })
        );

        // Update floating particles
        setFloatingParticles((prevParticles) =>
            prevParticles.map((particle) => {
                let newOpacity = particle.opacity;
                let newLife = particle.currentLife + 1;
                let newY = particle.position[1] + particle.driftSpeed;

                // Slow fade in phase
                if (newLife < 100) {
                    newOpacity = Math.min(
                        0.6,
                        particle.opacity + particle.fadeInSpeed
                    );
                }
                // Slow fade out phase
                else if (newLife > particle.maxLife - 100) {
                    newOpacity = Math.max(
                        0,
                        particle.opacity - particle.fadeOutSpeed
                    );
                }

                // Reset particle if it completes its lifecycle or drifts too high
                if (newLife >= particle.maxLife || newY > 4) {
                    return {
                        position: [
                            (Math.random() - 0.5) * 8,
                            0.2 + Math.random() * 0.5,
                            (Math.random() - 0.5) * 8,
                        ],
                        opacity: 0,
                        driftSpeed: 0.002 + Math.random() * 0.003,
                        fadeInSpeed: 0.0008 + Math.random() * 0.0015,
                        fadeOutSpeed: 0.0005 + Math.random() * 0.001,
                        maxLife: 300 + Math.random() * 500,
                        currentLife: 0,
                        size: 0.02 + Math.random() * 0.03,
                    };
                }

                return {
                    ...particle,
                    position: [
                        particle.position[0],
                        newY,
                        particle.position[2],
                    ],
                    opacity: newOpacity,
                    currentLife: newLife,
                };
            })
        );
    });

    return (
        <group>
            {/* Global scene now handles the sky background - simplified local effects */}

            {/* Distant mountains/hills on the horizon - positioned closer to walls */}
            {mountains.map((mountain, i) => (
                <mesh
                    key={`mountain-${i}`}
                    position={[
                        mountain.position[0] * 0.15, // Bring much closer to be visible within room
                        mountain.position[1] * 0.3,
                        mountain.position[2] * 0.15,
                    ]}
                    scale={[
                        mountain.scale[0] * 0.3,
                        mountain.scale[1] * 0.4,
                        mountain.scale[2] * 0.3,
                    ]}
                >
                    <sphereGeometry args={[1, 8, 6]} />
                    <meshBasicMaterial color="#4F7942" />
                </mesh>
            ))}

            {/* Soft white clouds positioned in the sky area */}
            {clouds.map((cloud, i) => (
                <mesh
                    key={`cloud-${i}`}
                    position={[
                        cloud.position[0] * 0.08, // Scale down to fit in room
                        3 + Math.abs(cloud.position[1] * 0.15), // Keep in upper area
                        cloud.position[2] * 0.08,
                    ]}
                    scale={[
                        cloud.scale[0] * 0.3,
                        cloud.scale[1] * 0.3,
                        cloud.scale[2] * 0.3,
                    ]}
                >
                    <sphereGeometry args={[1, 8, 6]} />
                    <meshBasicMaterial
                        color="#FFFFFF"
                        transparent
                        opacity={cloud.opacity}
                    />
                </mesh>
            ))}

            {/* Bright moss-like forest floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#90EE90" roughness={0.7} />
            </mesh>

            {/* Beautiful lush trees with static positions */}
            {trees.map((tree, i) => (
                <group key={i} position={tree.position}>
                    {/* Tree trunk - warmer brown */}
                    <mesh position={[0, tree.height / 2, 0]}>
                        <cylinderGeometry
                            args={[
                                tree.trunkRadius * 0.7,
                                tree.trunkRadius,
                                tree.height,
                            ]}
                        />
                        <meshStandardMaterial color="#8B4513" roughness={0.8} />
                    </mesh>

                    {/* Lush green foliage - multiple layers for fullness */}
                    <mesh
                        position={[0, tree.height + tree.foliageSize * 0.3, 0]}
                    >
                        <sphereGeometry args={[tree.foliageSize]} />
                        <meshStandardMaterial color="#228B22" roughness={0.6} />
                    </mesh>
                    <mesh
                        position={[
                            tree.foliageSize * 0.3,
                            tree.height + tree.foliageSize * 0.2,
                            tree.foliageSize * 0.2,
                        ]}
                    >
                        <sphereGeometry args={[tree.foliageSize * 0.7]} />
                        <meshStandardMaterial color="#32CD32" roughness={0.6} />
                    </mesh>
                    <mesh
                        position={[
                            -tree.foliageSize * 0.2,
                            tree.height + tree.foliageSize * 0.4,
                            -tree.foliageSize * 0.3,
                        ]}
                    >
                        <sphereGeometry args={[tree.foliageSize * 0.8]} />
                        <meshStandardMaterial color="#00FF32" roughness={0.6} />
                    </mesh>
                </group>
            ))}

            {/* Gentle fairy lights */}
            {fairyLights.map((light, i) => (
                <mesh key={i} position={light.position}>
                    <sphereGeometry args={[0.08]} />
                    <meshBasicMaterial
                        color={light.color}
                        transparent
                        opacity={light.opacity}
                    />
                </mesh>
            ))}

            {/* Floating sparkle particles */}
            {floatingParticles.map((particle, i) => (
                <mesh key={i} position={particle.position}>
                    <sphereGeometry args={[particle.size]} />
                    <meshBasicMaterial
                        color="#FFFACD"
                        transparent
                        opacity={particle.opacity}
                    />
                </mesh>
            ))}

            {/* Soft ambient shimmer effect */}
            <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 12]} />
                <meshBasicMaterial color="#F0F8FF" transparent opacity={0.12} />
            </mesh>

            {/* Light rays filtering through canopy */}
            {lightRays.map((ray, i) => (
                <mesh
                    key={`light-ray-${i}`}
                    position={ray.position}
                    rotation={ray.rotation}
                >
                    <planeGeometry args={[0.3, 4]} />
                    <meshBasicMaterial
                        color="#FFFACD"
                        transparent
                        opacity={0.15}
                    />
                </mesh>
            ))}

            {/* Additional atmospheric depth around room edges */}
            <mesh position={[0, 2, 0]} rotation={[0, 0, 0]}>
                <sphereGeometry args={[12, 16, 8]} />
                <meshBasicMaterial
                    color="#E6F3FF"
                    transparent
                    opacity={0.08}
                    side={1} // Inside only
                />
            </mesh>
            {/* Atmospheric forest lighting that transforms the entire environment */}
            <ambientLight intensity={0.8} color="#E6F3FF" />

            {/* Main sunlight filtering through canopy */}
            <directionalLight
                position={[5, 12, 3]}
                intensity={1.2}
                color="#FFFACD"
                castShadow
            />

            {/* Atmospheric light rays from different angles */}
            <pointLight
                position={[3, 8, 2]}
                intensity={0.6}
                distance={25}
                color="#FFE4B5"
            />
            <pointLight
                position={[-2, 6, -3]}
                intensity={0.5}
                distance={20}
                color="#E6E6FA"
            />
            <pointLight
                position={[0, 10, 0]}
                intensity={0.7}
                distance={30}
                color="#F0F8FF"
            />

            {/* Soft rim lighting around the edges */}
            <spotLight
                position={[6, 4, 6]}
                intensity={0.4}
                distance={15}
                angle={Math.PI / 3}
                penumbra={0.8}
                color="#98FB98"
                target-position={[0, 0, 0]}
            />
            <spotLight
                position={[-6, 4, -6]}
                intensity={0.4}
                distance={15}
                angle={Math.PI / 3}
                penumbra={0.8}
                color="#E0FFE0"
                target-position={[0, 0, 0]}
            />
        </group>
    );
};
