import React, { useRef, useEffect } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomComments } from "./RoomComments";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";

// Procedural grass texture shader
const createGrassFloorShader = () => {
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            
            // Improved noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                
                return mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;
            }
            
            void main() {
                vec2 worldXZ = vWorldPosition.xz;
                
                // Create grass blade patterns with multiple scales
                vec2 grassCoord1 = worldXZ * 8.0;
                vec2 grassCoord2 = worldXZ * 16.0;
                vec2 grassCoord3 = worldXZ * 32.0;
                
                float grassNoise1 = noise(grassCoord1);
                float grassNoise2 = noise(grassCoord2);
                float grassNoise3 = noise(grassCoord3);
                
                // Combine noise for grass texture
                float grassPattern = grassNoise1 * 0.5 + grassNoise2 * 0.3 + grassNoise3 * 0.2;
                
                // Create grass blade directionality
                float stripePattern = sin(grassCoord2.x * 2.0) * sin(grassCoord2.y * 2.0);
                grassPattern = mix(grassPattern, stripePattern, 0.3);
                
                // Define grass color variations
                vec3 darkGrass = vec3(0.1, 0.3, 0.1);   // Dark green
                vec3 mediumGrass = vec3(0.15, 0.4, 0.15); // Medium green
                vec3 lightGrass = vec3(0.2, 0.5, 0.2);   // Light green
                vec3 yellowGrass = vec3(0.3, 0.4, 0.1);  // Yellowish green
                
                // Mix colors based on noise patterns for natural grass variation
                vec3 grassColor = mix(darkGrass, mediumGrass, grassPattern);
                grassColor = mix(grassColor, lightGrass, grassNoise2);
                grassColor = mix(grassColor, yellowGrass, grassNoise3 * 0.2);
                
                // Add subtle brightness variation for more realistic grass
                float brightnessVariation = noise(worldXZ * 12.0) * 0.1;
                grassColor += vec3(brightnessVariation);
                
                gl_FragColor = vec4(grassColor, 1.0);
            }
        `,
    });
};

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
    const { performance } = useSceneStore();
    const grassFloorRef = useRef<THREE.Mesh | null>(null);
    const grassMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

    // Initialize enhanced effects
    useEffect(() => {
        // Create grassy textured floor
        if (!grassFloorRef.current && scene) {
            grassMaterialRef.current = createGrassFloorShader();

            // Create a large floor plane that covers the room more completely
            const floorGeometry = new THREE.PlaneGeometry(
                width * 0.98,
                depth * 0.98,
                128,
                128
            );
            grassFloorRef.current = new THREE.Mesh(
                floorGeometry,
                grassMaterialRef.current
            );

            // Position the floor horizontally at ground level
            grassFloorRef.current.rotation.x = -Math.PI / 2;
            grassFloorRef.current.position.y = 0.01; // Slightly above ground to avoid z-fighting

            scene.add(grassFloorRef.current);
        }

        return () => {
            // Cleanup
            if (grassFloorRef.current) {
                scene.remove(grassFloorRef.current);
            }
        };
    }, [scene, width, depth]);

    // Animation loop for shader uniforms - throttled for performance
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;

        // Only update grass shader on high quality settings, and throttle updates
        if (grassMaterialRef.current && performance.quality === "high") {
            // Update less frequently to reduce GPU load
            if (Math.floor(elapsed * 30) % 2 === 0) {
                // Update every other frame at 30fps
                grassMaterialRef.current.uniforms.time.value = elapsed;
            }
        }
    });

    return (
        <>
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
            <group position={[0, height * 0.5, depth / 2 - 0.5]}>
                {/* Glass pane with 3D depth */}
                <mesh>
                    <boxGeometry args={[width * 0.85, height * 0.5, 0.3]} />
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
