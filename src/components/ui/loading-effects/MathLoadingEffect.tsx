import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const MathLoadingEffect = () => {
    const groupRef = useRef<THREE.Group>(null);
    const formulaRef = useRef<THREE.Group>(null);
    const gridRef = useRef<THREE.Points>(null);

    // Create precise geometric shapes
    const geometricShapes = useMemo(() => {
        const shapes = [];

        // Golden ratio spiral
        const spiralPoints: THREE.Vector3[] = [];
        const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
        for (let i = 0; i < 100; i++) {
            const angle = i * 0.2;
            const radius = Math.pow(phi, angle / (Math.PI * 2)) * 0.1;
            spiralPoints.push(
                new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    Math.sin(i * 0.1) * 0.5
                )
            );
        }
        shapes.push({
            geometry: new THREE.BufferGeometry().setFromPoints(spiralPoints),
            color: "#ffdd00",
            position: new THREE.Vector3(-2, 0, 0),
        });

        // Fibonacci sequence visualization
        const fibPoints: THREE.Vector3[] = [];
        let a = 1,
            b = 1;
        for (let i = 0; i < 15; i++) {
            const height = Math.log(a) * 0.5;
            fibPoints.push(new THREE.Vector3(i * 0.3 - 2, height, 0));
            [a, b] = [b, a + b];
        }
        shapes.push({
            geometry: new THREE.BufferGeometry().setFromPoints(fibPoints),
            color: "#00ff88",
            position: new THREE.Vector3(2, 1, 0),
        });

        // Platonic solids
        shapes.push({
            geometry: new THREE.TetrahedronGeometry(0.3),
            color: "#ff4400",
            position: new THREE.Vector3(-1, 2, 0),
            type: "mesh",
        });

        shapes.push({
            geometry: new THREE.OctahedronGeometry(0.3),
            color: "#4400ff",
            position: new THREE.Vector3(0, 2, 0),
            type: "mesh",
        });

        shapes.push({
            geometry: new THREE.IcosahedronGeometry(0.3),
            color: "#ff0088",
            position: new THREE.Vector3(1, 2, 0),
            type: "mesh",
        });

        return shapes;
    }, []);

    // Create mathematical grid
    const mathGrid = useMemo(() => {
        const positions = new Float32Array(2000 * 3);
        const colors = new Float32Array(2000 * 3);

        let index = 0;
        for (let x = -10; x <= 10; x += 0.5) {
            for (let y = -10; y <= 10; y += 0.5) {
                if (index >= 2000) break;

                // Mathematical function: z = sin(sqrt(x² + y²))
                const distance = Math.sqrt(x * x + y * y);
                const z = Math.sin(distance) * 2;

                positions[index * 3] = x;
                positions[index * 3 + 1] = y;
                positions[index * 3 + 2] = z;

                // Color based on mathematical properties
                const intensity = (Math.sin(distance) + 1) / 2;
                colors[index * 3] = intensity;
                colors[index * 3 + 1] = intensity * 0.8;
                colors[index * 3 + 2] = 1;

                index++;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions.slice(0, index * 3), 3)
        );
        geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colors.slice(0, index * 3), 3)
        );
        return geometry;
    }, []);

    // Create floating mathematical symbols
    const mathSymbols = useMemo(() => {
        const symbols = [];
        const mathChars = [
            "π",
            "∑",
            "∫",
            "∞",
            "√",
            "±",
            "∆",
            "∇",
            "α",
            "β",
            "γ",
            "θ",
            "λ",
            "μ",
            "σ",
            "φ",
        ];

        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 3 + Math.random() * 2;
            symbols.push({
                char: mathChars[Math.floor(Math.random() * mathChars.length)],
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    (Math.random() - 0.5) * 6,
                    Math.sin(angle) * radius
                ),
                speed: 0.5 + Math.random() * 0.5,
            });
        }

        return symbols;
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.1;
        }

        if (formulaRef.current) {
            formulaRef.current.rotation.x += delta * 0.05;
            formulaRef.current.rotation.z += delta * 0.03;
        }

        if (gridRef.current) {
            const positions = gridRef.current.geometry.attributes.position;
            const array = positions.array as Float32Array;

            for (let i = 0; i < array.length; i += 3) {
                const x = array[i];
                const y = array[i + 1];
                const distance = Math.sqrt(x * x + y * y);
                array[i + 2] =
                    Math.sin(distance + state.clock.elapsedTime * 2) * 2;
            }

            positions.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Mathematical grid surface */}
            <points ref={gridRef} geometry={mathGrid}>
                <pointsMaterial
                    size={0.03}
                    vertexColors
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Geometric shapes */}
            <group ref={groupRef}>
                {geometricShapes.map((shape, i) =>
                    shape.type === "mesh" ? (
                        <mesh
                            key={i}
                            position={shape.position}
                            geometry={shape.geometry}
                        >
                            <meshStandardMaterial
                                color={shape.color}
                                transparent
                                opacity={0.8}
                                wireframe
                            />
                        </mesh>
                    ) : (
                        <mesh key={i} position={shape.position}>
                            <primitive
                                object={shape.geometry}
                                attach="geometry"
                            />
                            <lineBasicMaterial
                                color={shape.color}
                                transparent
                                opacity={0.9}
                            />
                        </mesh>
                    )
                )}
            </group>

            {/* Floating mathematical symbols */}
            <group ref={formulaRef}>
                {mathSymbols.map((symbol, i) => (
                    <mesh key={i} position={symbol.position}>
                        <planeGeometry args={[0.3, 0.3]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                ))}
            </group>

            <ambientLight intensity={0.3} />
            <directionalLight
                position={[5, 5, 5]}
                intensity={0.5}
                color="#ffdd00"
            />
        </group>
    );
};
