import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
    attribute,
    cameraPosition,
    float,
    length,
    normalWorld,
    positionLocal,
    positionWorld,
    sin,
    time,
    vec3,
} from "three/tsl";

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

    // TSL node material - pulse displacement and fresnel rim-lighting are
    // driven entirely by nodes (using TSL's built-in `time`), so no
    // per-frame uniform updates are needed here.
    const material = useMemo(() => {
        const vColor = attribute("color", "vec3");
        const pulse = sin(
            time.mul(1.5).add(length(positionLocal).mul(0.3))
        ).mul(0.05);
        const positionNode = positionLocal.mul(float(1.0).add(pulse));

        const viewDirection = cameraPosition.sub(positionWorld).normalize();
        const fresnel = float(1.0)
            .sub(viewDirection.dot(normalWorld).max(0.0))
            .pow(1.5);
        const colorNode = vColor
            .mul(0.7)
            .add(vec3(0.3, 0.5, 0.8).mul(fresnel).mul(0.4));
        const opacityNode = float(0.6).add(fresnel.mul(0.2));

        const mat = new MeshBasicNodeMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending, // Changed from AdditiveBlending to reduce brightness
            depthWrite: false,
        });
        mat.positionNode = positionNode;
        mat.colorNode = colorNode;
        mat.opacityNode = opacityNode;
        return mat;
    }, []);

    useFrame((state, delta) => {
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
                        <primitive object={material} attach="material" />
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
