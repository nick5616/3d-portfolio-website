import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
    attribute,
    cos,
    positionLocal,
    sin,
    time,
    uv,
    vec3,
} from "three/tsl";

export const ArtLoadingEffect = () => {
    const canvasRef = useRef<THREE.Group>(null);
    const brushStrokesRef = useRef<THREE.Group>(null);
    const colorsRef = useRef<THREE.Points>(null);

    // Create flowing brush strokes
    const brushStrokes = useMemo(() => {
        const strokes = [];

        for (let i = 0; i < 12; i++) {
            const points: THREE.Vector3[] = [];
            const startAngle = (i / 12) * Math.PI * 2;
            const numPoints = 30 + Math.floor(Math.random() * 20);

            // Create organic brush stroke paths
            for (let j = 0; j < numPoints; j++) {
                const t = j / (numPoints - 1);
                const angle =
                    startAngle +
                    t * Math.PI * 3 +
                    Math.sin(t * Math.PI * 4) * 0.5;
                const radius = 2 + t * 2 + Math.sin(t * Math.PI * 6) * 0.8;
                const height =
                    Math.sin(t * Math.PI * 2) * 3 +
                    Math.cos(t * Math.PI * 3) * 1;

                points.push(
                    new THREE.Vector3(
                        Math.cos(angle) * radius,
                        height,
                        Math.sin(angle) * radius
                    )
                );
            }

            strokes.push({
                geometry: new THREE.BufferGeometry().setFromPoints(points),
                color: new THREE.Color().setHSL(
                    Math.random(), // Full spectrum
                    0.7 + Math.random() * 0.3, // High saturation
                    0.5 + Math.random() * 0.3 // Vibrant
                ),
                thickness: 0.02 + Math.random() * 0.03,
            });
        }

        return strokes;
    }, []);

    // Create color palette particles
    const colorPalette = useMemo(() => {
        const positions = new Float32Array(500 * 3);
        const colors = new Float32Array(500 * 3);
        const sizes = new Float32Array(500);

        for (let i = 0; i < 500; i++) {
            // Create artistic color distribution
            const angle = (i / 500) * Math.PI * 8; // Spiral distribution
            const radius = 2 + (i / 500) * 6;
            const height = Math.sin(angle) * 4 + Math.cos(angle * 0.7) * 2;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Rich, artistic color palette
            const hue = (i / 500 + Math.sin(i * 0.1) * 0.1) % 1;
            const saturation = 0.6 + Math.random() * 0.4;
            const lightness = 0.4 + Math.random() * 0.4;

            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.05 + Math.random() * 0.1;
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

    // Create paint canvas planes
    const paintCanvases = useMemo(() => {
        const canvases = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 4;

            canvases.push({
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(i * 0.5) * 2,
                    Math.sin(angle) * radius
                ),
                rotation: new THREE.Euler(
                    Math.random() * Math.PI * 0.3,
                    angle + Math.PI / 2,
                    Math.random() * Math.PI * 0.2
                ),
                color: new THREE.Color().setHSL(
                    i / 6 + Math.random() * 0.1,
                    0.8,
                    0.6
                ),
            });
        }
        return canvases;
    }, []);

    // TSL node material - the organic paint-flow displacement and swirling
    // color texture are driven by TSL's built-in `time` node, so no
    // per-frame uniform updates are needed here.
    const paintMaterial = useMemo(() => {
        const vColor = attribute("color", "vec3");
        const positionNode = vec3(
            positionLocal.x.add(
                sin(time.mul(2.0).add(positionLocal.y.mul(0.5))).mul(0.3)
            ),
            positionLocal.y.add(
                cos(time.mul(1.5).add(positionLocal.x.mul(0.3))).mul(0.2)
            ),
            positionLocal.z.add(
                sin(
                    time
                        .mul(3.0)
                        .add(positionLocal.x)
                        .add(positionLocal.y)
                ).mul(0.1)
            )
        );

        const uvNode = uv();
        const noise1 = sin(uvNode.x.mul(20.0).add(time.mul(2.0))).mul(
            sin(uvNode.y.mul(15.0).add(time.mul(1.5)))
        );
        const noise2 = sin(uvNode.x.mul(30.0).sub(time.mul(3.0))).mul(
            cos(uvNode.y.mul(25.0).add(time))
        );

        const colorNode = vColor
            .add(
                vec3(
                    noise1.mul(0.2),
                    noise2.mul(0.15),
                    noise1.add(noise2).mul(0.1)
                )
            )
            .clamp(0.0, 1.0);
        const opacityNode = noise1.abs().mul(0.3).add(0.7);

        const mat = new MeshBasicNodeMaterial({
            transparent: true,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
        });
        mat.positionNode = positionNode;
        mat.colorNode = colorNode;
        mat.opacityNode = opacityNode;
        return mat;
    }, []);

    useFrame((state, delta) => {
        if (canvasRef.current) {
            canvasRef.current.rotation.y += delta * 0.08;
        }

        if (brushStrokesRef.current) {
            brushStrokesRef.current.rotation.x += delta * 0.03;
            brushStrokesRef.current.rotation.z += delta * 0.05;
        }

        if (colorsRef.current) {
            colorsRef.current.rotation.y += delta * 0.15;

            // Animate color particles
            const positions = colorsRef.current.geometry.attributes.position;
            const array = positions.array as Float32Array;

            for (let i = 0; i < 500; i++) {
                const originalY = array[i * 3 + 1];
                array[i * 3 + 1] =
                    originalY +
                    Math.sin(state.clock.elapsedTime * 2 + i * 0.02) * 0.1;
            }

            positions.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Paint canvases */}
            <group ref={canvasRef}>
                {paintCanvases.map((canvas, i) => (
                    <mesh
                        key={i}
                        position={canvas.position}
                        rotation={canvas.rotation}
                    >
                        <planeGeometry args={[1.5, 2, 8, 8]} />
                        <primitive object={paintMaterial} attach="material" />
                    </mesh>
                ))}
            </group>

            {/* Flowing brush strokes */}
            <group ref={brushStrokesRef}>
                {brushStrokes.map((stroke, i) => (
                    <mesh key={i}>
                        <primitive object={stroke.geometry} attach="geometry" />
                        <lineBasicMaterial
                            color={stroke.color}
                            transparent
                            opacity={0.8}
                            linewidth={stroke.thickness}
                        />
                    </mesh>
                ))}
            </group>

            {/* Color palette particles */}
            <points ref={colorsRef} geometry={colorPalette}>
                <pointsMaterial
                    vertexColors
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    sizeAttenuation={true}
                />
            </points>

            {/* Artistic lighting */}
            <ambientLight intensity={0.4} color="#fff8e1" />
            <pointLight position={[3, 3, 3]} intensity={0.6} color="#ffb74d" />
            <pointLight
                position={[-3, -1, 2]}
                intensity={0.4}
                color="#e91e63"
            />
            <pointLight position={[0, 4, -3]} intensity={0.5} color="#9c27b0" />
        </group>
    );
};
