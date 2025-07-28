import React, { useRef, useState } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";
import { useFrame } from "@react-three/fiber";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";
import {
    HolodeckControlPanel,
    HolodeckGrid,
    CourageExperience,
    FitnessExperience,
    ArtExperience,
    MathExperience,
    ForestExperience,
} from "./holodeck";

interface AboutRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

// Holodeck Experience Types
type HolodeckExperience =
    | "computer"
    | "fitness"
    | "art"
    | "math"
    | "forest"
    | "off";

export const AboutRoom: React.FC<AboutRoomProps> = ({
    config,
    materials,
    wallThickness,
    width,
    height,
    depth,
}) => {
    // Holodeck state management
    const [currentExperience, setCurrentExperience] =
        useState<HolodeckExperience>("off");
    const [isTransitioning, setIsTransitioning] = useState(false);

    // References for animations
    const controlPanelRef = useRef<THREE.Group>(null);
    const gridWallsRef = useRef<THREE.Group>(null);
    const scanLineRef = useRef<THREE.Mesh>(null);

    // Animation loop
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;

        // Control panel animations
        if (controlPanelRef.current) {
            controlPanelRef.current.children.forEach((child, i) => {
                if (
                    child instanceof THREE.Mesh &&
                    child.material instanceof THREE.MeshStandardMaterial
                ) {
                    child.material.emissiveIntensity =
                        0.3 + Math.sin(elapsed * 2 + i) * 0.2;
                }
            });
        }

        // Grid wall animations
        if (gridWallsRef.current && currentExperience === "off") {
            gridWallsRef.current.children.forEach((child, i) => {
                if (
                    child instanceof THREE.Mesh &&
                    child.material instanceof THREE.MeshStandardMaterial
                ) {
                    child.material.emissiveIntensity =
                        0.1 + Math.sin(elapsed * 0.5 + i * 0.2) * 0.05;
                }
            });
        }

        // Scanning line animation
        if (scanLineRef.current) {
            scanLineRef.current.position.y = Math.sin(elapsed * 4) * 0.5;
            if (
                scanLineRef.current.material instanceof
                THREE.MeshStandardMaterial
            ) {
                scanLineRef.current.material.emissiveIntensity =
                    0.5 + Math.sin(elapsed * 6) * 0.3;
            }
        }
    });

    const switchExperience = (experience: HolodeckExperience) => {
        if (isTransitioning) return;

        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentExperience(experience);
            setIsTransitioning(false);
        }, 500);
    };

    const renderCurrentExperience = () => {
        switch (currentExperience) {
            case "computer":
                return <CourageExperience />;
            case "fitness":
                return <FitnessExperience />;
            case "art":
                return <ArtExperience />;
            case "math":
                return <MathExperience />;
            case "forest":
                return <ForestExperience />;
            default:
                return <HolodeckGrid gridWallsRef={gridWallsRef} />;
        }
    };

    return (
        <>
            <RoomComments roomId={config.id} />

            {/* Centralized collision walls - work for all experiences */}
            {[
                // Back wall (north) - full width
                {
                    pos: [0, 2.5, -4] as [number, number, number],
                    size: [8, 5, 0.1] as [number, number, number],
                },
                // Front wall (south) - full width
                {
                    pos: [0, 2.5, 4] as [number, number, number],
                    size: [8, 5, 0.1] as [number, number, number],
                },
                // Left wall (west) top section - wider door gap from z=-1.5 to z=1.5
                {
                    pos: [-4, 2.5, -2.75] as [number, number, number],
                    size: [0.1, 5, 2.5] as [number, number, number],
                },
                // Left wall (west) bottom section
                {
                    pos: [-4, 2.5, 2.75] as [number, number, number],
                    size: [0.1, 5, 2.5] as [number, number, number],
                },
                // Right wall (east) - full depth
                {
                    pos: [4, 2.5, 0] as [number, number, number],
                    size: [0.1, 5, 8] as [number, number, number],
                },
            ].map((wall, i) => (
                <RigidBody
                    key={`about-wall-${i}`}
                    type="fixed"
                    colliders="cuboid"
                    collisionGroups={interactionGroups(0, [0])}
                >
                    <mesh position={wall.pos} visible={true}>
                        <boxGeometry args={wall.size} />
                        <meshBasicMaterial
                            color="#ffff00"
                            transparent
                            opacity={0}
                        />
                    </mesh>
                </RigidBody>
            ))}

            {/* Control panel (always visible) */}
            <HolodeckControlPanel
                currentExperience={currentExperience}
                switchExperience={switchExperience}
                scanLineRef={scanLineRef}
                controlPanelRef={controlPanelRef}
            />

            {/* Transition effect */}
            {isTransitioning && (
                <mesh position={[0, 2.5, 0]}>
                    <sphereGeometry args={[8]} />
                    <meshBasicMaterial
                        color="#00ffff"
                        transparent
                        opacity={0.8}
                        side={THREE.BackSide}
                    />
                </mesh>
            )}

            {/* Current experience */}
            {!isTransitioning && renderCurrentExperience()}

            {/* Ambient holodeck lighting */}
            <ambientLight intensity={0.4} color="#f0f0f0" />
        </>
    );
};
