// src/components/core/Room.tsx
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
    useGLTF,
    Preload,
    SpotLight,
    useHelper,
    Text,
} from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig, InteractiveElement } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";

interface RoomProps {
    config: RoomConfig;
}

interface RoomGeometry {
    nodes: {
        [key: string]: THREE.Mesh;
    };
    materials: {
        [key: string]: THREE.Material;
    };
}

const InteractiveObject: React.FC<{ element: InteractiveElement }> = ({
    element,
}) => {
    const {
        type,
        position,
        rotation = [0, 0, 0],
        scale = [1, 1, 1],
        content,
    } = element;

    switch (type) {
        case "model":
            const { nodes, materials } = useGLTF(
                content
            ) as unknown as RoomGeometry;
            return (
                <group
                    position={position}
                    rotation={rotation as [number, number, number]}
                    scale={scale}
                >
                    {Object.entries(nodes).map(([key, mesh]) => {
                        // Safely handle material name
                        const materialName =
                            mesh.material instanceof THREE.Material
                                ? mesh.material.name
                                : "";
                        return (
                            <mesh
                                key={key}
                                geometry={mesh.geometry}
                                material={materials[materialName]}
                            />
                        );
                    })}
                </group>
            );

        case "image":
            return (
                <mesh
                    position={position}
                    rotation={rotation as [number, number, number]}
                    scale={scale}
                >
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial
                        map={new THREE.TextureLoader().load(content)}
                    />
                </mesh>
            );

        case "text":
            return (
                <group
                    position={position}
                    rotation={rotation as [number, number, number]}
                    scale={scale}
                >
                    <Text
                        fontSize={1}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                        characters="abcdefghijklmnopqrstuvwxyz0123456789!"
                    >
                        {content}
                    </Text>
                </group>
            );

        default:
            return null;
    }
};

export const Room: React.FC<RoomProps> = ({ config }) => {
    const { scene } = useThree();
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const spotLightRefs = useRef<(THREE.SpotLight | null)[]>([]);

    // Debug helpers in development
    if (process.env.NODE_ENV === "development") {
        useHelper(
            directionalLightRef as React.MutableRefObject<THREE.DirectionalLight>,
            THREE.DirectionalLightHelper,
            1,
            "red"
        );
        spotLightRefs.current.forEach((ref) => {
            if (ref) {
                useHelper(
                    ref as unknown as React.MutableRefObject<THREE.Object3D>,
                    THREE.SpotLightHelper,
                    "blue"
                );
            }
        });
    }

    useEffect(() => {
        // Update scene position based on room config
        scene.position.set(...config.position);
        scene.updateMatrixWorld();
    }, [config.position, scene]);

    return (
        <group>
            {/* Room lighting setup */}
            <ambientLight
                intensity={config.lightPreset.ambient.intensity}
                color={config.lightPreset.ambient.color}
            />
            <directionalLight
                ref={directionalLightRef}
                position={config.lightPreset.directional.position}
                intensity={config.lightPreset.directional.intensity}
                color={config.lightPreset.directional.color}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            {config.lightPreset.spots?.map((spot, index) => (
                <SpotLight
                    key={index}
                    ref={(el) => {
                        if (spotLightRefs.current) {
                            spotLightRefs.current[index] = el;
                        }
                    }}
                    position={spot.position}
                    angle={0.5}
                    penumbra={0.5}
                    intensity={spot.intensity}
                    color={spot.color}
                    castShadow
                    target-position={spot.target}
                />
            ))}

            {/* Room boundaries/collision */}
            <RigidBody type="fixed" colliders="cuboid">
                {/* Floor */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[20, 20]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
            </RigidBody>

            {/* Walls - using RigidBody for collision */}
            <RigidBody type="fixed" colliders="cuboid">
                <group>
                    {/* Back wall */}
                    <mesh position={[0, 5, -10]} receiveShadow>
                        <boxGeometry args={[20, 10, 0.5]} />
                        <meshStandardMaterial color="#666666" />
                    </mesh>
                    {/* Left wall */}
                    <mesh
                        position={[-10, 5, 0]}
                        rotation={[0, Math.PI / 2, 0]}
                        receiveShadow
                    >
                        <boxGeometry args={[20, 10, 0.5]} />
                        <meshStandardMaterial color="#666666" />
                    </mesh>
                    {/* Right wall */}
                    <mesh
                        position={[10, 5, 0]}
                        rotation={[0, -Math.PI / 2, 0]}
                        receiveShadow
                    >
                        <boxGeometry args={[20, 10, 0.5]} />
                        <meshStandardMaterial color="#666666" />
                    </mesh>
                </group>
            </RigidBody>

            {/* Interactive elements */}
            {config.interactiveElements.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}

            {/* Portals to other rooms */}
            {config.portals.map((portal) => (
                <mesh
                    key={portal.id}
                    position={portal.position}
                    rotation={portal.rotation}
                    onClick={() => {
                        // Handle portal navigation
                    }}
                >
                    <planeGeometry args={[2, 3]} />
                    <meshBasicMaterial
                        color="#00ff00"
                        transparent
                        opacity={0.5}
                    />
                </mesh>
            ))}

            {/* Preload assets */}
            <Preload all />
        </group>
    );
};
