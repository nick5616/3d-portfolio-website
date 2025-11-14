import React, { useRef, useMemo } from "react";
import { RoomConfig } from "../../types/scene.types";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { RupeeCylinder } from "../models/RupeeCylinder";

interface RelaxationRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const RelaxationRoom: React.FC<RelaxationRoomProps> = ({
    width,
    height,
    materials,
}) => {
    const radius = width / 2; // Use width as diameter for circular room
    const hemisphereRadius = radius;

    // Create cylindrical wall geometry
    const cylinderGeometry = useMemo(() => {
        return new THREE.CylinderGeometry(radius, radius, height, 32);
    }, [radius, height]);

    // Create hemisphere ceiling geometry
    const hemisphereGeometry = useMemo(() => {
        return new THREE.SphereGeometry(
            radius,
            32,
            16,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
        );
    }, [radius]);

    // Create floating particles for ambient effect
    const particles = useMemo(() => {
        const particleCount = 30;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Random position within the hemisphere
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.8;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const y = Math.random() * height * 0.6 + 0.5; // Keep particles in lower half

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Soft blue colors
            const color = new THREE.Color();
            color.setHSL(
                0.6 + Math.random() * 0.1,
                0.3 + Math.random() * 0.2,
                0.7 + Math.random() * 0.3
            );
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        return { positions, colors };
    }, [radius, height]);

    const particleRef = useRef<THREE.Points>(null);

    useFrame((state) => {
        if (particleRef.current) {
            particleRef.current.rotation.y += 0.001;
            particleRef.current.rotation.x += 0.0005;
        }
    });

    return (
        <>
            {/* Cylindrical walls with collision */}
            <RigidBody type="fixed" colliders="hull">
                <mesh position={[0, height / 2, 0]} geometry={cylinderGeometry}>
                    <primitive object={materials.walls} attach="material" />
                </mesh>
            </RigidBody>

            {/* Hemisphere ceiling */}
            <mesh position={[0, height, 0]} geometry={hemisphereGeometry}>
                <primitive object={materials.ceiling} attach="material" />
            </mesh>

            {/* Floor with collision - using a flat box for collision */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, -0.1, 0]}>
                    <boxGeometry args={[radius * 2.2, 0.2, radius * 2.2]} />
                    <primitive object={materials.floor} attach="material" />
                </mesh>
            </RigidBody>

            {/* Visual floor (separate from collision) */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[radius, 32]} />
                <primitive object={materials.floor} attach="material" />
            </mesh>

            {/* Ambient lighting for relaxation */}
            <group>
                {/* Central soft light */}
                <pointLight
                    position={[0, height * 0.7, 0]}
                    intensity={0.8}
                    distance={20}
                    color="#E6F3FF"
                    decay={1.5}
                />

                {/* Rim lighting around the walls */}
                {Array.from({ length: 8 }, (_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = Math.cos(angle) * radius * 0.9;
                    const z = Math.sin(angle) * radius * 0.9;
                    return (
                        <pointLight
                            key={i}
                            position={[x, height * 0.5, z]}
                            intensity={0.3}
                            distance={15}
                            color="#B3D9FF"
                            decay={2}
                        />
                    );
                })}

                {/* Hemisphere ceiling light */}
                <pointLight
                    position={[0, height * 0.9, 0]}
                    intensity={1.2}
                    distance={25}
                    color="#F0F8FF"
                    decay={1.2}
                />
            </group>

            {/* Floating particles for ambient effect */}
            <points ref={particleRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particles.positions.length / 3}
                        array={particles.positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={particles.colors.length / 3}
                        array={particles.colors}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.1}
                    transparent={true}
                    opacity={0.6}
                    vertexColors={true}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Central meditation area - soft circular platform with collision */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, 0.01, 0]}>
                    <cylinderGeometry
                        args={[radius * 0.6, radius * 0.6, 0.02, 32]}
                    />
                    <meshLambertMaterial
                        color="#F0F8FF"
                        transparent={true}
                        opacity={0.3}
                    />
                </mesh>
            </RigidBody>

            {/* Decorative elements - soft cushions around the perimeter with collision */}
            {Array.from({ length: 6 }, (_, i) => {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * radius * 0.7;
                const z = Math.sin(angle) * radius * 0.7;
                return (
                    <RigidBody key={i} type="fixed" colliders="cuboid">
                        <mesh position={[x, 0.1, z]}>
                            <cylinderGeometry args={[0.8, 0.8, 0.2, 16]} />
                            <meshLambertMaterial
                                color="#E6F3FF"
                                transparent={true}
                                opacity={0.8}
                            />
                        </mesh>
                    </RigidBody>
                );
            })}

            {/* Glass cylinder filled with rupees */}
            <RupeeCylinder
                height={height}
                radius={1.5}
                numRupees={50}
                rupeeScale={0.3}
                position={[0, height / 2, 0]}
                animationType="rotating" // Try: "floating", "rotating", "static"
            />
        </>
    );
};
