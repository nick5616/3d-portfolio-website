import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const CourageLoadingEffect = () => {
    const fogRef = useRef<THREE.Group>(null);
    const shadowsRef = useRef<THREE.Group>(null);
    const eyesRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Eerie fog shader
    const fogShader = useMemo(
        () => ({
            vertexShader: `
            uniform float time;
            varying vec3 vPosition;
            varying vec2 vUv;
            
            void main() {
                vPosition = position;
                vUv = uv;
                
                vec3 pos = position;
                // Undulating fog motion
                pos.y += sin(time * 0.5 + position.x * 0.1) * 0.3;
                pos.x += cos(time * 0.3 + position.z * 0.1) * 0.2;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
            fragmentShader: `
            uniform float time;
            varying vec3 vPosition;
            varying vec2 vUv;
            
            void main() {
                // Create swirling fog pattern
                vec2 uv = vUv;
                float fog = sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time * 0.7);
                fog += sin(uv.x * 20.0 - time * 2.0) * 0.5;
                fog += sin(uv.y * 15.0 + time * 1.5) * 0.3;
                
                // Dark purple/green color scheme
                vec3 color1 = vec3(0.2, 0.05, 0.3); // Dark purple
                vec3 color2 = vec3(0.05, 0.3, 0.1); // Dark green
                vec3 finalColor = mix(color1, color2, fog * 0.5 + 0.5);
                
                float alpha = 0.3 + abs(fog) * 0.4;
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
            uniforms: {
                time: { value: 0 },
            },
        }),
        []
    );

    // Create mysterious shadows/silhouettes
    const shadowShapes = useMemo(() => {
        const shapes = [];

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 4 + Math.random() * 3;
            const height = (Math.random() - 0.5) * 6;

            // Create distorted, unsettling shapes
            const geometry = new THREE.SphereGeometry(
                0.3 + Math.random() * 0.5,
                8 + Math.floor(Math.random() * 8),
                6 + Math.floor(Math.random() * 6)
            );

            // Distort vertices for unnatural look
            const positions = geometry.attributes.position;
            for (let j = 0; j < positions.count; j++) {
                const x = positions.getX(j);
                const y = positions.getY(j);
                const z = positions.getZ(j);

                // Add noise to create disturbing shapes
                positions.setX(j, x + (Math.random() - 0.5) * 0.2);
                positions.setY(j, y + (Math.random() - 0.5) * 0.2);
                positions.setZ(j, z + (Math.random() - 0.5) * 0.2);
            }

            shapes.push({
                geometry,
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                ),
                speed: 0.2 + Math.random() * 0.3,
            });
        }

        return shapes;
    }, []);

    // Create watching eyes effect
    const watchingEyes = useMemo(() => {
        const positions = new Float32Array(100 * 3);
        const colors = new Float32Array(100 * 3);
        const sizes = new Float32Array(100);

        for (let i = 0; i < 100; i++) {
            // Place eyes in the darkness
            const angle = Math.random() * Math.PI * 2;
            const radius = 6 + Math.random() * 4;
            const height = (Math.random() - 0.5) * 8;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Glowing eyes - red/yellow
            const intensity = 0.8 + Math.random() * 0.2;
            colors[i * 3] = intensity; // red
            colors[i * 3 + 1] = intensity * 0.3; // green
            colors[i * 3 + 2] = 0; // blue

            sizes[i] = 0.1 + Math.random() * 0.05;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

        return geometry;
    }, []);

    // Create fog planes
    const fogPlanes = useMemo(() => {
        const planes = [];
        for (let i = 0; i < 5; i++) {
            planes.push({
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 10
                ),
                rotation: new THREE.Euler(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                ),
                scale: 2 + Math.random() * 3,
            });
        }
        return planes;
    }, []);

    const fogMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...fogShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
        });
    }, [fogShader]);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value += delta;
        }

        if (fogRef.current) {
            fogRef.current.rotation.y += delta * 0.05;
        }

        if (shadowsRef.current) {
            shadowsRef.current.children.forEach((shadow, i) => {
                const data = shadowShapes[i];
                shadow.rotation.x += delta * data.speed;
                shadow.rotation.y += delta * data.speed * 0.7;

                // Subtle floating motion
                shadow.position.y =
                    data.position.y +
                    Math.sin(state.clock.elapsedTime * data.speed + i) * 0.3;
            });
        }

        if (eyesRef.current) {
            // Make eyes blink/flicker
            const colors = eyesRef.current.geometry.attributes.color;
            const array = colors.array as Float32Array;

            for (let i = 0; i < 100; i++) {
                const flicker =
                    Math.sin(state.clock.elapsedTime * 5 + i * 0.5) > 0.8
                        ? 0.1
                        : 1.0;
                array[i * 3] *= flicker; // red
                array[i * 3 + 1] *= flicker; // green
            }

            colors.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Eerie fog */}
            <group ref={fogRef}>
                {fogPlanes.map((plane, i) => (
                    <mesh
                        key={i}
                        position={plane.position}
                        rotation={plane.rotation}
                        scale={plane.scale}
                    >
                        <planeGeometry args={[2, 2, 10, 10]} />
                        <primitive
                            object={fogMaterial}
                            attach="material"
                            ref={i === 0 ? materialRef : undefined}
                        />
                    </mesh>
                ))}
            </group>

            {/* Mysterious shadows */}
            <group ref={shadowsRef}>
                {shadowShapes.map((shape, i) => (
                    <mesh
                        key={i}
                        position={shape.position}
                        geometry={shape.geometry}
                    >
                        <meshStandardMaterial
                            color="#1a0d1a"
                            transparent
                            opacity={0.7}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>
                ))}
            </group>

            {/* Watching eyes */}
            <points ref={eyesRef} geometry={watchingEyes}>
                <pointsMaterial
                    vertexColors
                    transparent
                    opacity={0.9}
                    blending={THREE.AdditiveBlending}
                    sizeAttenuation={false}
                />
            </points>

            {/* Dark atmospheric lighting */}
            <ambientLight intensity={0.1} color="#2d1b3d" />
            <pointLight
                position={[0, 5, 0]}
                intensity={0.3}
                color="#4a2c5a"
                distance={10}
            />
            <pointLight
                position={[-5, -2, 3]}
                intensity={0.2}
                color="#1f4d1f"
                distance={8}
            />
        </group>
    );
};
