import React, { useRef, useState } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
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

            {/* Invisible collision walls - let HolodeckGrid handle visuals */}
            {[
                // North wall (back)
                {
                    pos: [0, height / 2, -depth / 2] as [
                        number,
                        number,
                        number
                    ],
                    size: [width, height, wallThickness] as [
                        number,
                        number,
                        number
                    ],
                },
                // South wall (front) - with archway gap
                {
                    pos: [width / 4, height / 2, depth / 2] as [
                        number,
                        number,
                        number
                    ],
                    size: [width / 2, height, wallThickness] as [
                        number,
                        number,
                        number
                    ],
                },
                // East wall (right)
                {
                    pos: [width / 2, height / 2, 0] as [number, number, number],
                    size: [wallThickness, height, depth] as [
                        number,
                        number,
                        number
                    ],
                },
                // West wall (left) - with archway gap
                {
                    pos: [-width / 2, height / 2, depth / 4] as [
                        number,
                        number,
                        number
                    ],
                    size: [wallThickness, height, depth / 2] as [
                        number,
                        number,
                        number
                    ],
                },
                {
                    pos: [-width / 2, height / 2, -depth / 4] as [
                        number,
                        number,
                        number
                    ],
                    size: [wallThickness, height, depth / 2] as [
                        number,
                        number,
                        number
                    ],
                },
            ].map((wall, i) => (
                <RigidBody key={`wall-${i}`} type="fixed" colliders="cuboid">
                    <mesh position={wall.pos} visible={false}>
                        <boxGeometry args={wall.size} />
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
