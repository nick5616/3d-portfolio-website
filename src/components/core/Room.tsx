// src/components/core/Room.tsx
import { useCallback, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
    useGLTF,
    Preload,
    SpotLight,
    useHelper,
    Text,
} from "@react-three/drei";
import * as THREE from "three";
import {
    RoomConfig,
    InteractiveElement,
    Portal,
} from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { roomConfigs } from "../../configs/rooms";
import { useSceneStore } from "../../stores/sceneStore";

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

export const Room: React.FC<RoomProps> = ({ config }) => {
    const { scene } = useThree();
    const { teleportToRoom } = useSceneStore();
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const spotLightRefs = useRef<(THREE.SpotLight | null)[]>([]);

    const handlePortalClick = useCallback(
        (portal: Portal) => {
            const targetRoom = roomConfigs[portal.targetRoomId];
            const entryPortal = targetRoom.portals.find(
                (p) => p.targetRoomId === config.id
            );
            if (entryPortal) {
                const dir = new THREE.Vector3(0, 0, 2).applyEuler(
                    new THREE.Euler(...entryPortal.rotation)
                );
                const pos: [number, number, number] = [
                    entryPortal.position[0] + dir.x,
                    entryPortal.position[1] + dir.y,
                    entryPortal.position[2] + dir.z,
                ];
                teleportToRoom(portal.targetRoomId, pos);
            }
        },
        [config.id, teleportToRoom]
    );

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
                    <planeGeometry args={[50, 50]} /> // Increased from 20, 20
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
                    onClick={() => handlePortalClick(portal)}
                >
                    <planeGeometry args={[2, 3]} />
                    <meshStandardMaterial
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
