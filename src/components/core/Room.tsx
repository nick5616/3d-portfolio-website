// src/components/core/Room.tsx
import { useRef } from "react";
import { Preload, SpotLight } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { RoomTransitionTrigger } from "./RoomTransitionTrigger";
import { useSceneStore } from "../../stores/sceneStore";

interface RoomProps {
    config: RoomConfig;
}

interface WallSection {
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number, number];
}

export const Room: React.FC<RoomProps> = ({ config }) => {
    const spotlightsEnabled = useSceneStore((state) => state.spotlightsEnabled);
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const spotLightRefs = useRef<(THREE.SpotLight | null)[]>([]);

    const [width, height, depth] = config.dimensions;
    const wallThickness = 0.5;

    // Process each wall to create sections accounting for archways
    const processWallColliders = () => {
        const colliders: WallSection[] = [];

        // Helper to find archway in a wall
        const findArchwayForWall = (wallPos: [number, number, number]) => {
            return config.archways.find((arch) => {
                const distance = new THREE.Vector3(...arch.position).distanceTo(
                    new THREE.Vector3(...wallPos)
                );
                return distance < 1;
            });
        };

        // North Wall (-z)
        const northPos: [number, number, number] = [0, height / 2, -depth / 2];
        const northArchway = findArchwayForWall(northPos);
        if (northArchway) {
            // Left section
            colliders.push({
                position: [
                    -width / 4 - northArchway.width / 2,
                    height / 2,
                    -depth / 2,
                ],
                rotation: [0, 0, 0],
                size: [width / 2 - northArchway.width, height, wallThickness],
            });
            // Right section
            colliders.push({
                position: [
                    width / 4 + northArchway.width / 2,
                    height / 2,
                    -depth / 2,
                ],
                rotation: [0, 0, 0],
                size: [width / 2 - northArchway.width, height, wallThickness],
            });
            // Top section
            colliders.push({
                position: [
                    0,
                    height - (height - northArchway.height) / 2,
                    -depth / 2,
                ],
                rotation: [0, 0, 0],
                size: [
                    northArchway.width,
                    height - northArchway.height,
                    wallThickness,
                ],
            });
        } else {
            colliders.push({
                position: northPos,
                rotation: [0, 0, 0],
                size: [width, height, wallThickness],
            });
        }

        // South Wall (+z)
        const southPos: [number, number, number] = [0, height / 2, depth / 2];
        const southArchway = findArchwayForWall(southPos);
        if (southArchway) {
            // Left section
            colliders.push({
                position: [
                    -width / 4 - southArchway.width / 2,
                    height / 2,
                    depth / 2,
                ],
                rotation: [0, 0, 0],
                size: [width / 2 - southArchway.width, height, wallThickness],
            });
            // Right section
            colliders.push({
                position: [
                    width / 4 + southArchway.width / 2,
                    height / 2,
                    depth / 2,
                ],
                rotation: [0, 0, 0],
                size: [width / 2 - southArchway.width, height, wallThickness],
            });
            // Top section
            colliders.push({
                position: [
                    0,
                    height - (height - southArchway.height) / 2,
                    depth / 2,
                ],
                rotation: [0, 0, 0],
                size: [
                    southArchway.width,
                    height - southArchway.height,
                    wallThickness,
                ],
            });
        } else {
            colliders.push({
                position: southPos,
                rotation: [0, 0, 0],
                size: [width, height, wallThickness],
            });
        }

        // East Wall (+x)
        const eastPos: [number, number, number] = [width / 2, height / 2, 0];
        const eastArchway = findArchwayForWall(eastPos);
        if (eastArchway) {
            // Front section
            colliders.push({
                position: [
                    width / 2,
                    height / 2,
                    -depth / 4 - eastArchway.width / 2,
                ],
                rotation: [0, Math.PI / 2, 0],
                size: [depth / 2 - eastArchway.width, height, wallThickness],
            });
            // Back section
            colliders.push({
                position: [
                    width / 2,
                    height / 2,
                    depth / 4 + eastArchway.width / 2,
                ],
                rotation: [0, Math.PI / 2, 0],
                size: [depth / 2 - eastArchway.width, height, wallThickness],
            });
            // Top section
            colliders.push({
                position: [
                    width / 2,
                    height - (height - eastArchway.height) / 2,
                    0,
                ],
                rotation: [0, Math.PI / 2, 0],
                size: [
                    eastArchway.width,
                    height - eastArchway.height,
                    wallThickness,
                ],
            });
        } else {
            colliders.push({
                position: eastPos,
                rotation: [0, Math.PI / 2, 0],
                size: [depth, height, wallThickness],
            });
        }

        // West Wall (-x)
        const westPos: [number, number, number] = [-width / 2, height / 2, 0];
        const westArchway = findArchwayForWall(westPos);
        if (westArchway) {
            // Front section
            colliders.push({
                position: [
                    -width / 2,
                    height / 2,
                    -depth / 4 - westArchway.width / 2,
                ],
                rotation: [0, Math.PI / 2, 0],
                size: [depth / 2 - westArchway.width, height, wallThickness],
            });
            // Back section
            colliders.push({
                position: [
                    -width / 2,
                    height / 2,
                    depth / 4 + westArchway.width / 2,
                ],
                rotation: [0, Math.PI / 2, 0],
                size: [depth / 2 - westArchway.width, height, wallThickness],
            });
            // Top section
            colliders.push({
                position: [
                    -width / 2,
                    height - (height - westArchway.height) / 2,
                    0,
                ],
                rotation: [0, Math.PI / 2, 0],
                size: [
                    westArchway.width,
                    height - westArchway.height,
                    wallThickness,
                ],
            });
        } else {
            colliders.push({
                position: westPos,
                rotation: [0, Math.PI / 2, 0],
                size: [depth, height, wallThickness],
            });
        }

        return colliders;
    };

    const wallColliders = processWallColliders();

    return (
        <group position={config.position}>
            {/* Lighting */}
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
            />

            {/* Spotlights */}
            {spotlightsEnabled &&
                config.lightPreset.spots?.map((spot, index) => (
                    <SpotLight
                        key={index}
                        ref={(el) => (spotLightRefs.current[index] = el)}
                        position={spot.position}
                        angle={0.5}
                        penumbra={0.5}
                        intensity={spot.intensity * 0.75}
                        color={spot.color}
                        castShadow
                        target-position={spot.target}
                        distance={15}
                        decay={2}
                    />
                ))}

            {/* Floor */}
            <RigidBody type="fixed" colliders={false}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
                <CuboidCollider
                    args={[width / 2, 0.1, depth / 2]}
                    position={[0, -0.1, 0]}
                />
            </RigidBody>

            {/* Walls with colliders */}
            {wallColliders.map((section, index) => (
                <RigidBody
                    key={index}
                    type="fixed"
                    position={section.position}
                    rotation={section.rotation}
                >
                    <mesh>
                        <boxGeometry args={section.size} />
                        <meshStandardMaterial
                            color="#666666"
                            transparent
                            opacity={0.8}
                        />
                    </mesh>
                    <CuboidCollider
                        args={[
                            section.size[0] / 2,
                            section.size[1] / 2,
                            section.size[2] / 2,
                        ]}
                    />
                </RigidBody>
            ))}

            {/* Interactive elements */}
            {config.interactiveElements.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}

            {/* Archways */}
            {config.archways.map((archway) => (
                <group key={archway.id}>
                    <group
                        position={archway.position}
                        rotation={archway.rotation}
                    >
                        {/* Left pillar */}
                        <mesh
                            position={[
                                -archway.width / 2,
                                archway.height / 2,
                                0,
                            ]}
                        >
                            <boxGeometry args={[0.3, archway.height, 1]} />
                            <meshStandardMaterial color="#4a4a4a" />
                        </mesh>

                        {/* Right pillar */}
                        <mesh
                            position={[
                                archway.width / 2,
                                archway.height / 2,
                                0,
                            ]}
                        >
                            <boxGeometry args={[0.3, archway.height, 1]} />
                            <meshStandardMaterial color="#4a4a4a" />
                        </mesh>

                        {/* Top */}
                        <mesh position={[0, archway.height, 0]}>
                            <boxGeometry args={[archway.width + 0.3, 0.3, 1]} />
                            <meshStandardMaterial color="#4a4a4a" />
                        </mesh>
                    </group>

                    <RoomTransitionTrigger archway={archway} />
                </group>
            ))}

            <Preload all />
        </group>
    );
};
