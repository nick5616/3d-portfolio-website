import React, { useRef, useState } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";
import { useFrame } from "@react-three/fiber";
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

    // Meteor game state
    const [meteors, setMeteors] = useState<
        Array<{
            id: number;
            x: number;
            y: number;
            z: number;
            problem: string;
            answer: number;
            choices: number[];
        }>
    >([]);
    const [score, setScore] = useState(0);
    const meteorIdCounter = useRef(0);

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

        // Update meteors for math game
        if (currentExperience === "math") {
            setMeteors((prev) =>
                prev
                    .map((meteor) => ({
                        ...meteor,
                        y: meteor.y - 0.02,
                    }))
                    .filter((meteor) => meteor.y > -5)
            );

            // Spawn new meteor occasionally - support multiple meteors
            if (Math.random() < 0.015 && meteors.length < 6) {
                const num1 = Math.floor(Math.random() * 9) + 1;
                const num2 = Math.floor(Math.random() * 9) + 1;
                const answer = num1 * num2;
                const choices = [answer];
                while (choices.length < 4) {
                    const wrong = Math.floor(Math.random() * 81) + 1;
                    if (!choices.includes(wrong)) choices.push(wrong);
                }
                choices.sort(() => Math.random() - 0.5);

                setMeteors((prev) => [
                    ...prev,
                    {
                        id: meteorIdCounter.current++,
                        x: (Math.random() - 0.5) * 8,
                        y: 8,
                        z: (Math.random() - 0.5) * 8,
                        problem: `${num1} × ${num2}`,
                        answer,
                        choices,
                    },
                ]);
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
                return (
                    <MathExperience
                        meteors={meteors}
                        score={score}
                        setScore={setScore}
                        setMeteors={setMeteors}
                    />
                );
            case "forest":
                return <ForestExperience />;
            default:
                return <HolodeckGrid gridWallsRef={gridWallsRef} />;
        }
    };

    return (
        <>
            <RoomComments roomId={config.id} />

            {/* Main exit door - aligned with archway */}
            <mesh position={[-4.4, 2, 0]}>
                <boxGeometry args={[0.2, 4, 2]} />
                <meshStandardMaterial color="#8B5C2A" />
            </mesh>

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
