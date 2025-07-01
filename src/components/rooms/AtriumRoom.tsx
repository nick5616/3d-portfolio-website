import React, { useRef, useEffect } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomComments } from "./RoomComments";
import { useFrame, useThree } from "@react-three/fiber";

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
    const mistParticlesRef = useRef<THREE.Points | null>(null);
    const grassInstancesRef = useRef<THREE.InstancedMesh | null>(null);
    const waterRef = useRef<THREE.Mesh>(null);

    // Initialize enhanced effects
    useEffect(() => {
        // Create animated mist particles
        if (!mistParticlesRef.current && scene) {
            const particleCount = 100;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 30;
                positions[i * 3 + 1] = Math.random() * 8;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
                sizes[i] = Math.random() * 2 + 1;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 2,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true
            });
            
            mistParticlesRef.current = new THREE.Points(geometry, material);
            scene.add(mistParticlesRef.current);
        }

        // Create instanced grass
        if (!grassInstancesRef.current && scene) {
            const grassGeometry = new THREE.PlaneGeometry(0.2, 1.0);
            const grassMaterial = new THREE.MeshLambertMaterial({
                color: 0x2d5016,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });

            const grassCount = 400;
            grassInstancesRef.current = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
            
            // Position grass instances around the room
            const dummy = new THREE.Object3D();
            for (let i = 0; i < grassCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 4 + Math.random() * 10; // Between center and walls
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                dummy.position.set(x, 0.1, z);
                dummy.rotation.y = Math.random() * Math.PI;
                dummy.scale.setScalar(0.8 + Math.random() * 0.4);
                dummy.updateMatrix();
                grassInstancesRef.current.setMatrixAt(i, dummy.matrix);
            }
            
            scene.add(grassInstancesRef.current);
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
            const positions = mistParticlesRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += Math.sin(elapsed * 0.5 + i) * 0.01;
                if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] = 0;
            }
            mistParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Animate water surface
        if (waterRef.current) {
            waterRef.current.material.opacity = 0.6 + Math.sin(elapsed * 2) * 0.1;
        }
    });

    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />

            {/* Enhanced water feature */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    position={[0, height / 2, depth / 2 - 0.5]}
                    rotation={[0, 0, 0]}
                >
                    <boxGeometry args={[width * 0.8, height * 0.6, wallThickness]} />
                    <meshStandardMaterial
                        color="#87CEEB"
                        transparent={true}
                        opacity={0.7}
                        roughness={0.1}
                        metalness={0.3}
                    />
                </mesh>
            </RigidBody>

            {/* Animated water surface */}
            <mesh 
                ref={waterRef}
                position={[0, 0.15, depth / 2 - 0.48]} 
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[width * 0.7, 6]} />
                <meshStandardMaterial
                    color="#0077ff"
                    transparent={true}
                    opacity={0.8}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Ethereal lighting */}
            <group>
                {/* Central mystical light */}
                <pointLight
                    position={[0, height * 0.8, 0]}
                    intensity={1.2}
                    distance={25}
                    color="#E6F3FF"
                    decay={2}
                />

                {/* Water feature backlighting */}
                <spotLight
                    position={[0, height * 0.6, depth / 2 - 4]}
                    target-position={[0, 0.2, depth / 2 - 1]}
                    angle={1.0}
                    penumbra={0.8}
                    intensity={1.5}
                    color="#B0E0E6"
                    castShadow
                />

                {/* Ambient rim lighting */}
                {Array.from({ length: 6 }, (_, i) => {
                    const angle = (i / 6) * Math.PI * 2;
                    const radius = 12;
                    return (
                        <pointLight
                            key={i}
                            position={[
                                Math.cos(angle) * radius,
                                height * 0.9,
                                Math.sin(angle) * radius
                            ]}
                            intensity={0.4}
                            distance={15}
                            color="#F0F8FF"
                            decay={2}
                        />
                    );
                })}
            </group>

            {/* Floating meditation stones */}
            <group>
                {Array.from({ length: 5 }, (_, i) => {
                    const angle = (i / 5) * Math.PI * 2;
                    const radius = 2.5;
                    return (
                        <RigidBody key={i} type="fixed" colliders="hull">
                            <mesh 
                                position={[
                                    Math.cos(angle) * radius,
                                    0.3,
                                    Math.sin(angle) * radius + depth / 2 - 3
                                ]}
                                rotation={[
                                    Math.random() * 0.3,
                                    Math.random() * Math.PI,
                                    Math.random() * 0.3
                                ]}
                            >
                                <sphereGeometry args={[0.4, 12, 8]} />
                                <meshStandardMaterial
                                    color="#8FBC8F"
                                    roughness={0.8}
                                    metalness={0.1}
                                />
                            </mesh>
                        </RigidBody>
                    );
                })}
            </group>

            {/* Glowing energy orbs */}
            <group>
                {Array.from({ length: 8 }, (_, i) => {
                    const angle = (i / 8) * Math.PI * 2 + Math.PI / 16;
                    const radius = 6 + Math.sin(i) * 2;
                    return (
                        <mesh key={i} position={[
                            Math.cos(angle) * radius,
                            2 + Math.sin(i * 1.3) * 0.5,
                            Math.sin(angle) * radius
                        ]}>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshStandardMaterial
                                color="#FFD700"
                                emissive="#FFD700"
                                emissiveIntensity={0.6}
                                transparent={true}
                                opacity={0.9}
                            />
                        </mesh>
                    );
                })}
            </group>

            {/* Zen garden elements */}
            <group>
                {/* Raked sand patterns */}
                <mesh position={[8, 0.05, 8]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[4, 4]} />
                    <meshStandardMaterial
                        color="#F5DEB3"
                        roughness={0.9}
                        metalness={0.0}
                    />
                </mesh>
                
                {/* Small rock garden */}
                <mesh position={[-8, 0.05, -8]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[3, 3]} />
                    <meshStandardMaterial
                        color="#D2B48C"
                        roughness={0.8}
                        metalness={0.0}
                    />
                </mesh>
            </group>
        </>
    );
};
