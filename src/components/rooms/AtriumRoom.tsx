import React, { useRef, useEffect } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomComments } from "./RoomComments";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

interface AtriumRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const AtriumRoom: React.FC<AtriumRoomProps> = ({
    config,
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    const { scene } = useThree();
    const mistParticlesRef = useRef<THREE.InstancedMesh | null>(null);
    const grassInstancesRef = useRef<THREE.Group | null>(null);

    // Initialize enhanced effects
    useEffect(() => {
        // Create concentrated floor-level mist (doubled)
        if (!mistParticlesRef.current && scene) {
            const particleCount = 150; // Doubled from 150
            const geometry = new THREE.SphereGeometry(0.25, 6, 6); // Slightly larger
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.08, // Much more transparent - ethereal mist
                fog: false,
                blending: THREE.AdditiveBlending, // Additive blending for ethereal effect
            });

            mistParticlesRef.current = new THREE.InstancedMesh(
                geometry,
                material,
                particleCount
            );

            const dummy = new THREE.Object3D();
            for (let i = 0; i < particleCount; i++) {
                // Create mist ring that concentrates away from pedestal
                const minRadius = 3.5; // Start mist 3.5 units away from pedestal
                const maxRadius = width * 0.8; // Maximum spread
                const radius =
                    minRadius + Math.random() * (maxRadius - minRadius);
                const angle = Math.random() * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;

                // Create gradient opacity - denser further from center
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                const fadeZone = 4.5; // Distance where mist starts to fade toward center
                let opacityMultiplier = 1.0;

                if (distanceFromCenter < fadeZone) {
                    // Fade mist as it approaches the pedestal
                    opacityMultiplier =
                        (distanceFromCenter - minRadius) /
                        (fadeZone - minRadius);
                    opacityMultiplier = Math.max(0.1, opacityMultiplier); // Minimum opacity
                }

                dummy.position.set(x, Math.random() * 0.1 - 0.1, z);

                // Scale particles based on distance and fade effect
                const baseScale = 0.2 + Math.random() * 10.5;
                dummy.scale.setScalar(baseScale * opacityMultiplier);
                dummy.updateMatrix();
                mistParticlesRef.current.setMatrixAt(i, dummy.matrix);
            }

            scene.add(mistParticlesRef.current);
        }

        // Create realistic moss-like ground cover
        if (!grassInstancesRef.current && scene) {
            const mossGeometry = new THREE.SphereGeometry(
                1,
                8,
                6,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2
            );

            // Create multiple colored moss groups for better coverage
            grassInstancesRef.current = new THREE.Group() as any;

            // Define varying dark green colors
            const mossColors = [
                0x1a4d0f, // Dark forest green
                0x0f3d0a, // Very dark green
                0x2a5d1f, // Medium dark green
                0x154010, // Darker forest
                0x225518, // Brighter dark green
                0x0d350c, // Deep green
                0x1f4a15, // Moss green
            ];

            // Create separate instanced meshes for each color for better coverage
            mossColors.forEach((color) => {
                const instancesPerColor = 800; // Denser coverage
                const mossMaterial = new THREE.MeshLambertMaterial({
                    color: color,
                });

                const colorGroup = new THREE.InstancedMesh(
                    mossGeometry,
                    mossMaterial,
                    instancesPerColor
                );

                // Position moss instances for this color
                const dummy = new THREE.Object3D();
                for (let i = 0; i < instancesPerColor; i++) {
                    // Ensure full coverage with overlapping areas, but avoid center pedestal
                    let x, z;
                    do {
                        x = (Math.random() - 0.5) * (width - 0.5);
                        z = (Math.random() - 0.5) * (depth - 0.5);
                    } while (Math.sqrt(x * x + z * z) < 2.5); // Avoid 2.5 unit radius around center

                    // Much wider rivets with more variation
                    const baseScale = 0.05 + Math.random() * 0.2;
                    const width_scale = 1.8 + Math.random() * 2.0; // Very wide (1.8-3.8x)
                    const height_scale = 0.15 + Math.random() * 0.35; // Short

                    dummy.position.set(x, 0.01, z);
                    dummy.rotation.y = Math.random() * Math.PI * 2;
                    dummy.scale.set(
                        baseScale * width_scale,
                        baseScale * height_scale,
                        baseScale * width_scale
                    );
                    dummy.updateMatrix();
                    colorGroup.setMatrixAt(i, dummy.matrix);
                }

                (grassInstancesRef.current as THREE.Group).add(colorGroup);
            });

            scene.add(grassInstancesRef.current as THREE.Group);
        }

        return () => {
            // Cleanup
            if (mistParticlesRef.current) {
                scene.remove(mistParticlesRef.current);
            }
            if (grassInstancesRef.current) {
                scene.remove(grassInstancesRef.current);
            }
        };
    }, [scene]);

    // Animation loop
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;

        // Animate mist particles
        if (mistParticlesRef.current) {
            const dummy = new THREE.Object3D();
            for (let i = 0; i < mistParticlesRef.current.count; i++) {
                mistParticlesRef.current.getMatrixAt(i, dummy.matrix);
                dummy.matrix.decompose(
                    dummy.position,
                    dummy.quaternion,
                    dummy.scale
                );

                // Very subtle floating motion
                dummy.position.y += Math.sin(elapsed * 0.3 + i * 0.1) * 0.001;
                dummy.rotation.y += 0.001;

                dummy.updateMatrix();
                mistParticlesRef.current.setMatrixAt(i, dummy.matrix);
            }
            mistParticlesRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />
            {/* Central Stone Pedestal */}
            {/* <RigidBody type="fixed">
                <mesh position={[0, 0.4, 0]}>
                    <cylinderGeometry args={[1.2, 2.2, 0.8, 8]} />
                    <meshStandardMaterial
                        color="#4a4a4a"
                        roughness={0.8}
                        metalness={0.1}
                    />
                </mesh>
            </RigidBody> */}
            {/* Simplified lighting */}
            <group>
                {/* Central ambient light */}
                <pointLight
                    position={[0, height * 0.8, 0]}
                    intensity={0.8}
                    distance={20}
                    color="#F0F8FF"
                    decay={2}
                />

                {/* Basic rim lighting */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = 10;
                    return (
                        <pointLight
                            key={i}
                            position={[
                                Math.cos(angle) * radius,
                                height * 0.7,
                                Math.sin(angle) * radius,
                            ]}
                            intensity={0.3}
                            distance={12}
                            color="#F0F8FF"
                            decay={2}
                        />
                    );
                })}
            </group>
            {/* Glass Display - Recessed */}
            <group position={[0, height * 0.5, depth / 2 - 1.2]}>
                {/* Glass pane with 3D depth */}
                <mesh>
                    <boxGeometry args={[width * 0.7, height * 0.5, 0.3]} />
                    <meshPhysicalMaterial
                        transparent
                        opacity={0.15}
                        transmission={0.85}
                        thickness={0.3}
                        roughness={0.02}
                        metalness={0.0}
                        clearcoat={1.0}
                        clearcoatRoughness={0.05}
                    />
                </mesh>
            </group>
        </>
    );
};
