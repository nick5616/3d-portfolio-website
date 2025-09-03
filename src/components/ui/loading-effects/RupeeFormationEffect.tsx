import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NUM_RUPEES = 30;

interface Rupee {
    position: THREE.Vector3;
    rotation: THREE.Vector3;
    scale: number;
    color: THREE.Color;
    value: number;
    speed: number;
    type: string;
}

// Rupee types with their colors, values, and spawn rates (lower = more common)
const RUPEE_TYPES = [
    { name: "Green", color: "#00FF00", value: 1, spawnWeight: 50 }, // Most common
    { name: "Blue", color: "#0080FF", value: 5, spawnWeight: 25 },
    { name: "Red", color: "#FF0000", value: 20, spawnWeight: 15 },
    { name: "Orange", color: "#FF8000", value: 100, spawnWeight: 8 },
    { name: "Silver", color: "#C0C0C0", value: 200, spawnWeight: 5 },
    { name: "Gold", color: "#FFD700", value: 300, spawnWeight: 3 },
    { name: "Purple", color: "#8000FF", value: 500, spawnWeight: 2 },
    { name: "Black", color: "#333333", value: -10, spawnWeight: 1 }, // Rare, negative value
];

export const RupeeFormationEffect = () => {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const rupeeShader = useMemo(
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
                // Subtle rupee-like shimmer
                float shimmer = sin(time * 2.0 + length(position) * 0.5) * 0.03;
                pos *= (1.0 + shimmer);
                
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
                float fresnel = pow(1.0 - max(0.0, dot(viewDirection, vNormal)), 2.0);
                
                // Rupee-like translucent appearance
                vec3 baseColor = vColor * 0.8;
                vec3 highlightColor = mix(baseColor, vec3(1.0), 0.3) * fresnel;
                vec3 finalColor = baseColor + highlightColor * 0.6;
                
                // Translucent with fresnel-based opacity
                float alpha = 0.7 + fresnel * 0.3;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
            uniforms: {
                time: { value: 0 },
            },
        }),
        []
    );

    const rupees = useMemo(() => {
        const rupeeData: Rupee[] = [];

        // Create weighted selection function
        const selectRupeeType = () => {
            const totalWeight = RUPEE_TYPES.reduce(
                (sum, type) => sum + type.spawnWeight,
                0
            );
            const random = Math.random() * totalWeight;
            let currentWeight = 0;

            for (const type of RUPEE_TYPES) {
                currentWeight += type.spawnWeight;
                if (random <= currentWeight) {
                    return type;
                }
            }
            return RUPEE_TYPES[0]; // Fallback to green
        };

        for (let i = 0; i < NUM_RUPEES; i++) {
            const rupeeType = selectRupeeType();
            const angle = (i / NUM_RUPEES) * Math.PI * 2 + Math.random() * 0.5;
            const radius = 2.5 + Math.random() * 4;
            const height = (Math.random() - 0.5) * 8;

            // Higher value rupees are slightly larger and rotate slower (more majestic)
            const valueScale = Math.min(1 + (rupeeType.value / 200) * 0.3, 1.5);
            const baseScale = 0.5 + Math.random() * 0.4;

            rupeeData.push({
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
                scale: baseScale * valueScale,
                color: new THREE.Color(rupeeType.color),
                value: rupeeType.value,
                speed: 0.5 + Math.random() * 0.5 - rupeeType.value / 1000, // Higher value = slower
                type: rupeeType.name,
            });
        }

        return rupeeData;
    }, []);

    // Create rupee geometry (bipyramidal shape - two hexagonal pyramids base-to-base)
    const rupeeGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();

        // Create a proper rupee shape: hexagonal bipyramid with extended middle
        const vertices: number[] = [];
        const faces: number[] = [];
        const normals: number[] = [];

        const hexRadiusX = 0.8; // Wider horizontally
        const hexRadiusZ = 0.4; // Narrower vertically
        const middleHeight = 1.2; // Height of the middle section - made longer
        const pyramidHeight = 0.6; // Height of each pyramid

        // Create hexagonal vertices for the middle section (stretched horizontally like <=>)
        const topHex = [];
        const bottomHex = [];

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * hexRadiusX;
            const z = Math.sin(angle) * hexRadiusZ;

            topHex.push([x, middleHeight / 2, z]);
            bottomHex.push([x, -middleHeight / 2, z]);
        }

        // Add all vertices
        const vertexIndex = { current: 0 };
        const addVertex = (x: number, y: number, z: number): number => {
            vertices.push(x, y, z);
            return vertexIndex.current++;
        };

        // Top pyramid tip
        const topTip = addVertex(0, middleHeight / 2 + pyramidHeight, 0);

        // Top hexagon
        const topHexIndices = topHex.map(([x, y, z]) => addVertex(x, y, z));

        // Bottom hexagon
        const bottomHexIndices = bottomHex.map(([x, y, z]) =>
            addVertex(x, y, z)
        );

        // Bottom pyramid tip
        const bottomTip = addVertex(0, -middleHeight / 2 - pyramidHeight, 0);

        // Create faces
        const indices = [];

        // Top pyramid faces
        for (let i = 0; i < 6; i++) {
            const next = (i + 1) % 6;
            indices.push(topTip, topHexIndices[i], topHexIndices[next]);
        }

        // Middle section faces (sides of hexagonal prism)
        for (let i = 0; i < 6; i++) {
            const next = (i + 1) % 6;
            // Two triangles per face
            indices.push(
                topHexIndices[i],
                bottomHexIndices[i],
                topHexIndices[next]
            );
            indices.push(
                bottomHexIndices[i],
                bottomHexIndices[next],
                topHexIndices[next]
            );
        }

        // Bottom pyramid faces
        for (let i = 0; i < 6; i++) {
            const next = (i + 1) % 6;
            indices.push(
                bottomTip,
                bottomHexIndices[next],
                bottomHexIndices[i]
            );
        }

        // Set geometry attributes
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Add color attributes for vertex coloring
        const colors = new Float32Array(vertices.length);
        for (let i = 0; i < colors.length; i += 3) {
            const hue = 0.3 + Math.random() * 0.1 - 0.05;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        return geometry;
    }, []);

    // Create edges geometry for pronounced wireframe
    const edgesGeometry = useMemo(() => {
        return new THREE.EdgesGeometry(rupeeGeometry);
    }, [rupeeGeometry]);

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...rupeeShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
            depthWrite: false,
        });
    }, [rupeeShader]);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value += delta;
        }

        if (groupRef.current) {
            // Animate individual rupees with free movement
            groupRef.current.children.forEach((rupeeGroup, i) => {
                if (rupeeGroup instanceof THREE.Group) {
                    const data = rupees[i];

                    // Rupee-like spinning motion
                    rupeeGroup.rotation.x += delta * data.speed * 0.3;
                    rupeeGroup.rotation.y += delta * data.speed;
                    rupeeGroup.rotation.z += delta * data.speed * 0.5;

                    // Free floating movement with orbiting
                    const time = state.clock.elapsedTime;
                    const orbitSpeed = data.speed * 0.2;
                    const orbitRadius =
                        2 + Math.sin(time * orbitSpeed + i) * 1.5;

                    rupeeGroup.position.x =
                        Math.cos(time * orbitSpeed + i * 0.5) * orbitRadius;
                    rupeeGroup.position.z =
                        Math.sin(time * orbitSpeed + i * 0.5) * orbitRadius;

                    // Gentle floating with slight bobbing
                    const bobSpeed = data.value > 100 ? 0.8 : 1.2; // Higher value rupees bob slower
                    rupeeGroup.position.y =
                        data.position.y +
                        Math.sin(time * bobSpeed + i * 0.5) * 0.6;

                    // Rare rupees have a subtle glow effect
                    if (data.value >= 200) {
                        const glowIntensity = 1 + Math.sin(time * 3 + i) * 0.1;
                        rupeeGroup.scale.setScalar(data.scale * glowIntensity);
                    }
                }
            });
        }
    });

    return (
        <group>
            <group ref={groupRef}>
                {rupees.map((rupee, i) => (
                    <group
                        key={i}
                        position={rupee.position}
                        scale={rupee.scale}
                    >
                        {/* Main rupee body */}
                        <mesh geometry={rupeeGeometry}>
                            <meshPhongMaterial
                                color={rupee.color}
                                transparent
                                opacity={0.85}
                                shininess={300}
                                specular={new THREE.Color(0xffffff)}
                                reflectivity={0.8}
                                flatShading={true}
                            />
                        </mesh>
                        {/* Subtle dark edge wireframe */}
                        <lineSegments geometry={edgesGeometry}>
                            <lineBasicMaterial
                                color={rupee.color.clone().multiplyScalar(0.4)}
                                transparent
                                opacity={0.15}
                                linewidth={1}
                            />
                        </lineSegments>
                    </group>
                ))}
            </group>

            {/* Subtle sparkle effect for magical atmosphere */}
            <points>
                <sphereGeometry args={[7, 32, 32]} />
                <pointsMaterial
                    size={0.02}
                    color="#FFFF88"
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Lighting to enhance the rupee appearance */}
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 5, 0]} intensity={0.5} color="#FFFFFF" />
            <pointLight position={[3, -3, 3]} intensity={0.3} color="#88FFFF" />
        </group>
    );
};
