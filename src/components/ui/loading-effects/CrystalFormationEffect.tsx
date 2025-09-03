import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NUM_CRYSTALS = 25; // Reduced slightly for better performance

interface Crystal {
    position: THREE.Vector3;
    rotation: THREE.Vector3;
    scale: number;
    color: THREE.Color;
    speed: number;
}

export const CrystalFormationEffect = () => {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const crystalShader = useMemo(
        () => ({
            vertexShader: `
            uniform float time;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vColor;
            varying vec3 vWorldPosition;
            
            attribute vec3 color;
            
            void main() {
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                vColor = color;
                
                vec3 pos = position;
                float pulse = sin(time * 1.5 + length(position) * 0.3) * 0.05; // Reduced pulse
                pos *= (1.0 + pulse);
                
                vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
            fragmentShader: `
            uniform float time;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vColor;
            varying vec3 vWorldPosition;
            
            void main() {
                vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
                float fresnel = pow(1.0 - max(0.0, dot(viewDirection, vNormal)), 1.5); // Reduced fresnel power
                
                // More balanced color mixing
                vec3 baseColor = vColor * 0.7; // Reduced base intensity
                vec3 fresnelColor = vec3(0.3, 0.5, 0.8) * fresnel * 0.4; // Reduced fresnel contribution
                vec3 finalColor = baseColor + fresnelColor;
                
                // More controlled alpha
                float alpha = 0.6 + fresnel * 0.2; // Reduced overall opacity
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
            uniforms: {
                time: { value: 0 },
            },
        }),
        []
    );

    const crystals = useMemo(() => {
        const crystalData: Crystal[] = [];

        for (let i = 0; i < NUM_CRYSTALS; i++) {
            const angle = (i / NUM_CRYSTALS) * Math.PI * 2;
            const radius = 3 + Math.random() * 3; // Slightly closer
            const height = (Math.random() - 0.5) * 8; // Reduced height spread

            crystalData.push({
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                ),
                rotation: new THREE.Vector3(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                ),
                scale: 0.4 + Math.random() * 0.6, // Slightly larger but more consistent
                color: new THREE.Color().setHSL(
                    0.55 + Math.random() * 0.25, // Tighter color range (cyan to blue)
                    0.7, // Reduced saturation
                    0.5 // Reduced lightness
                ),
                speed: 0.3 + Math.random() * 0.7, // Slower rotation
            });
        }

        return crystalData;
    }, []);

    // Create crystal geometry (octahedron with more detail)
    const crystalGeometry = useMemo(() => {
        const geometry = new THREE.OctahedronGeometry(1, 1); // Reduced subdivision

        // Add more subtle color attributes
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) {
            const hue = 0.55 + Math.random() * 0.25; // Consistent with crystal colors
            const color = new THREE.Color().setHSL(hue, 0.6, 0.4); // More muted colors
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return geometry;
    }, []);

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...crystalShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending, // Changed from AdditiveBlending to reduce brightness
            depthWrite: false,
        });
    }, [crystalShader]);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value += delta;
        }

        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.05; // Slower group rotation

            // Animate individual crystals
            groupRef.current.children.forEach((crystal, i) => {
                if (crystal instanceof THREE.Mesh) {
                    const data = crystals[i];
                    crystal.rotation.x += delta * data.speed;
                    crystal.rotation.y += delta * data.speed * 0.7;
                    crystal.rotation.z += delta * data.speed * 0.5;

                    // Gentle floating motion
                    crystal.position.y =
                        data.position.y +
                        Math.sin(state.clock.elapsedTime * data.speed + i) *
                            0.3;
                }
            });
        }
    });

    return (
        <group>
            <group ref={groupRef}>
                {crystals.map((crystal, i) => (
                    <mesh
                        key={i}
                        position={crystal.position}
                        scale={crystal.scale}
                        geometry={crystalGeometry}
                    >
                        <primitive
                            object={material}
                            attach="material"
                            ref={i === 0 ? materialRef : undefined}
                        />
                    </mesh>
                ))}
            </group>
            {/* More subtle energy field effect */}
            <points>
                <sphereGeometry args={[6, 24, 24]} />
                <pointsMaterial
                    size={0.015}
                    color="#004488"
                    transparent
                    opacity={0.2}
                    blending={THREE.AdditiveBlending}
                />
            </points>
            <ambientLight intensity={0.15} /> {/* Reduced ambient light */}
        </group>
    );
};
