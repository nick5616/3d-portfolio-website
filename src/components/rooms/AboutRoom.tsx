import { useShallow } from "zustand/react/shallow";
import React, { Suspense, lazy } from "react";
import { useState, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { RigidBody, interactionGroups } from "@react-three/rapier";
import { HolodeckControlPanel } from "./holodeck/HolodeckControlPanel";
import { HolodeckGrid } from "./holodeck/HolodeckGrid";
import { RoomConfig } from "../../types/scene.types";
import { useSceneStore } from "../../stores/sceneStore";
import { getPathFromExperience } from "../../configs/routing";
import * as THREE from "three";

interface AboutRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

// Each holodeck experience is its own chunk, downloaded the first time
// someone starts it rather than with the rest of the world.
const CourageExperience = lazy(() =>
    import("./holodeck/CourageExperience").then((m) => ({ default: m.CourageExperience }))
);
const FitnessExperience = lazy(() =>
    import("./holodeck/FitnessExperience").then((m) => ({ default: m.FitnessExperience }))
);
const ArtExperience = lazy(() =>
    import("./holodeck/ArtExperience").then((m) => ({ default: m.ArtExperience }))
);
const MathExperience = lazy(() =>
    import("./holodeck/MathExperience").then((m) => ({ default: m.MathExperience }))
);
const ForestExperience = lazy(() =>
    import("./holodeck/ForestExperience").then((m) => ({ default: m.ForestExperience }))
);

// Holodeck Experience Types
type HolodeckExperience =
    | "computer"
    | "fitness"
    | "art"
    | "math"
    | "forest"
    | "off";

// Configuration for experience-specific spawn positions
export const EXPERIENCE_SPAWN_POSITIONS: Record<string, [number, number, number]> = {
    // Current experiences
    computer: [0, 0.9, 0],
    fitness: [0, 0.9, 0],
    art: [0, 0.9, 0],
    math: [0, 0.9, 3.5], // Math experience spawns further back
    forest: [0, 0.9, 0],
    off: [0, 0.9, 0],
};

export const AboutRoom: React.FC<AboutRoomProps> = ({}) => {
    // Holodeck state management
    const [currentExperience, setCurrentExperience] =
        useState<HolodeckExperience>("off");
    const [isTransitioning, setIsTransitioning] = useState(false);
    const scanLineRef = useRef<THREE.Mesh>(null);
    const controlPanelRef = useRef<THREE.Group>(null);
    const gridWallsRef = useRef<THREE.Group>(null);
    const {
        rotateUser,
        getExperienceRotationAngle,
        teleportToRoom,
        setHolodeckLoading,
        pendingHolodeckExperience,
        setPendingHolodeckExperience,
    } = useSceneStore(
        useShallow((s) => ({ rotateUser: s.rotateUser, getExperienceRotationAngle: s.getExperienceRotationAngle, teleportToRoom: s.teleportToRoom, setHolodeckLoading: s.setHolodeckLoading, pendingHolodeckExperience: s.pendingHolodeckExperience, setPendingHolodeckExperience: s.setPendingHolodeckExperience }))
    );

    // Leaving the holodeck ends whatever program was running.
    useEffect(
        () => () => useSceneStore.getState().setHolodeckExperience("off"),
        []
    );

    // Auto-launch experience from deep-link URL.
    // This is reactive (not mount-only) because the router's effect that sets
    // pendingHolodeckExperience fires AFTER this component's mount effects.
    useEffect(() => {
        if (pendingHolodeckExperience) {
            console.log(
                `🎮 AboutRoom: Launching pending experience: ${pendingHolodeckExperience}`
            );
            const exp = pendingHolodeckExperience as HolodeckExperience;
            setPendingHolodeckExperience(null);
            switchExperience(exp);
        }
    }, [pendingHolodeckExperience]);

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

        console.log(`🎮 Switching to ${experience} experience`);

        // Start loading screen
        setHolodeckLoading(true, experience);
        setIsTransitioning(true);

        // Simulate loading time (you can adjust this based on actual asset loading)
        const loadingDuration = experience === "off" ? 800 : 1500; // Longer for complex experiences

        console.log(`⏳ Loading ${experience} for ${loadingDuration}ms`);

        setTimeout(() => {
            console.log(`✅ ${experience} experience loaded, updating scene`);
            setCurrentExperience(experience);
            useSceneStore.getState().setHolodeckExperience(experience);

            // Handle rotation and position for experiences (but not for "off")
            if (experience !== "off") {
                setTimeout(() => {
                    const rotationAngle =
                        getExperienceRotationAngle(experience);
                    const spawnPosition = EXPERIENCE_SPAWN_POSITIONS[
                        experience
                    ] || [0, 0.9, 5];

                    console.log(
                        `📍 Teleporting to ${experience} at`,
                        spawnPosition,
                        `with rotation`,
                        rotationAngle
                    );
                    // Update both rotation and position
                    teleportToRoom("about", spawnPosition, [
                        0,
                        rotationAngle,
                        0,
                    ]);
                }, 100); // Small delay to ensure environment is loaded
            }

            // Update URL to match the experience
            const experiencePath =
                experience === "off"
                    ? "/holodeck"
                    : getPathFromExperience(experience) || "/holodeck";
            if (window.location.pathname !== experiencePath) {
                window.history.replaceState(null, "", experiencePath);
            }

            // End loading screen after a short delay to ensure everything is rendered
            setTimeout(() => {
                console.log(`🏁 ${experience} experience fully ready`);
                setHolodeckLoading(false);
                setIsTransitioning(false);
            }, 300);
        }, loadingDuration);
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
            {/* Collision walls - every experience except the forest, which
                opens the holodeck up into a whole world with its own bounds */}
            {currentExperience !== "forest" && (
                <>
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

                </>
            )}

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
            {!isTransitioning && (
                <Suspense fallback={null}>{renderCurrentExperience()}</Suspense>
            )}

            {/* Ambient holodeck lighting */}
            {currentExperience !== "forest" && (
                <ambientLight intensity={0.4} color="#f0f0f0" />
            )}
        </>
    );
};
