import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { cos, mix, positionLocal, sin, time, uv, vec3 } from "three/tsl";

export const CourageLoadingEffect = () => {
    const fogRef = useRef<THREE.Group>(null);
    const shadowsRef = useRef<THREE.Group>(null);
    const eyesRef = useRef<THREE.Points>(null);

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

    // TSL node material - the undulating motion and swirling fog pattern
    // are driven by TSL's built-in `time` node, so no per-frame uniform
    // updates are needed here.
    const fogMaterial = useMemo(() => {
        const positionNode = vec3(
            positionLocal.x.add(
                cos(time.mul(0.3).add(positionLocal.z.mul(0.1))).mul(0.2)
            ),
            positionLocal.y.add(
                sin(time.mul(0.5).add(positionLocal.x.mul(0.1))).mul(0.3)
            ),
            positionLocal.z
        );

        const uvNode = uv();
        const fog = sin(uvNode.x.mul(10.0).add(time))
            .mul(sin(uvNode.y.mul(10.0).add(time.mul(0.7))))
            .add(sin(uvNode.x.mul(20.0).sub(time.mul(2.0))).mul(0.5))
            .add(sin(uvNode.y.mul(15.0).add(time.mul(1.5))).mul(0.3));

        const color1 = vec3(0.2, 0.05, 0.3); // Dark purple
        const color2 = vec3(0.05, 0.3, 0.1); // Dark green
        const colorNode = mix(color1, color2, fog.mul(0.5).add(0.5));
        const opacityNode = fog.abs().mul(0.4).add(0.3);

        const mat = new MeshBasicNodeMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
        });
        mat.positionNode = positionNode;
        mat.colorNode = colorNode;
        mat.opacityNode = opacityNode;
        return mat;
    }, []);

    useFrame((state, delta) => {
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
                        <primitive object={fogMaterial} attach="material" />
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
