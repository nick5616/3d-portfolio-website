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

    return (
        <>
            <group>
                {/* Central ambient light - reduced intensity */}
                <pointLight
                    position={[0, height * 0.9, 0]}
                    intensity={0.4}
                    distance={25}
                    color="#FFFF99"
                    decay={1.5}
                />

                {/* Subtle ceiling spotlight for wood coffers */}
                <spotLight
                    position={[0, height * 0.6, 0]}
                    target-position={[0, height, 0]}
                    intensity={0.6}
                    distance={15}
                    angle={Math.PI / 3}
                    penumbra={0.3}
                    color="#FFF8DC" // Warm white to enhance wood tones
                />

                {/* Reduced rim lighting */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = 10;
                    return (
                        <pointLight
                            key={i}
                            position={[
                                Math.cos(angle) * radius,
                                height * 0.8,
                                Math.sin(angle) * radius,
                            ]}
                            intensity={0.2}
                            distance={15}
                            color="#FFF8DC"
                            decay={1.8}
                        />
                    );
                })}

                {/* Central ceiling lighting - reduced intensity */}
                <pointLight
                    position={[0, height * 0.85, 0]}
                    intensity={8}
                    distance={0}
                    color="#FFFFaa"
                    decay={0.4}
                />

                {/* Wall washing lights to make walls shine */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = width * 0.4;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    return (
                        <spotLight
                            key={`wall-wash-${i}`}
                            position={[x * 0.7, height * 0.8, z * 0.7]}
                            target-position={[x, height * 0.5, z]}
                            intensity={1.2}
                            distance={20}
                            angle={Math.PI / 4}
                            penumbra={0.4}
                            color="#FFFFFF"
                        />
                    );
                })}
            </group>
        </>
    );
};
