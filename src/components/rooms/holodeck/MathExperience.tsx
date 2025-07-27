import React, { useState, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MathGameHUD } from "./MathGameHUD";

interface Meteor {
    id: number;
    x: number;
    y: number;
    z: number;
    problem: string;
    answer: number;
    choices: number[];
    color?: string;
}

// Remove the props interface since we're managing state internally now
interface MathExperienceProps {}

const METEOR_COLORS = [
    "#FF4500", // Red-Orange
    "#00FF00", // Green
    "#4169E1", // Royal Blue
    "#FFD700", // Gold
    "#FF1493", // Deep Pink
    "#00CED1", // Dark Turquoise
];

export const MathExperience: React.FC<MathExperienceProps> = () => {
    // Move math game state here from AboutRoom
    const [meteors, setMeteors] = useState<Meteor[]>([]);
    const [score, setScore] = useState(0);
    const meteorIdCounter = useRef(0);

    // Animation loop with meteor spawning logic moved from AboutRoom
    useFrame(() => {
        // Update meteors
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
    });

    // Assign colors to meteors consistently
    const coloredMeteors = meteors.map((meteor, index) => ({
        ...meteor,
        color: meteor.color || METEOR_COLORS[index % METEOR_COLORS.length],
    }));

    return (
        <group>
            {/* Space environment - center focus */}

            {/* Space floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshBasicMaterial color="#000011" />
            </mesh>

            {/* Stars scattered throughout */}
            {Array.from({ length: 80 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[
                        (Math.random() - 0.5) * 16,
                        Math.random() * 6 + 1,
                        (Math.random() - 0.5) * 16,
                    ]}
                >
                    <sphereGeometry args={[0.015]} />
                    <meshBasicMaterial color="#FFFFFF" />
                </mesh>
            ))}

            {/* Player's rocket ship - center position */}
            <group position={[0, 1, 2]}>
                {/* Rocket body */}
                <mesh>
                    <coneGeometry args={[0.25, 1.2, 8]} />
                    <meshStandardMaterial color="#C0C0C0" metalness={0.8} />
                </mesh>
                {/* Rocket fins */}
                {[0, 1, 2, 3].map((i) => (
                    <mesh
                        key={i}
                        position={[
                            Math.cos((i * Math.PI) / 2) * 0.35,
                            -0.4,
                            Math.sin((i * Math.PI) / 2) * 0.35,
                        ]}
                        rotation={[0, (i * Math.PI) / 2, 0]}
                    >
                        <boxGeometry args={[0.08, 0.4, 0.15]} />
                        <meshStandardMaterial color="#FF0000" />
                    </mesh>
                ))}
                {/* Rocket engine */}
                <mesh position={[0, -0.8, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.25]} />
                    <meshStandardMaterial
                        color="#FF6600"
                        emissive="#FF6600"
                        emissiveIntensity={0.5}
                    />
                </mesh>
            </group>

            {/* Color-coded meteors with math problems */}
            {coloredMeteors.map((meteor) => (
                <group
                    key={meteor.id}
                    position={[meteor.x, meteor.y, meteor.z]}
                >
                    {/* Meteor */}
                    <mesh>
                        <sphereGeometry args={[0.35]} />
                        <meshStandardMaterial
                            color={meteor.color}
                            roughness={0.9}
                            emissive={meteor.color}
                            emissiveIntensity={0.2}
                        />
                    </mesh>

                    {/* Fire trail - bigger, positioned at widest part, color-matched */}
                    <mesh position={[0, 0.35, 0]}>
                        <coneGeometry args={[0.3, 1.2]} />
                        <meshBasicMaterial
                            color={meteor.color}
                            transparent
                            opacity={0.8}
                        />
                    </mesh>

                    {/* Math problem display on meteor */}
                    <Html position={[0, 0.7, 0]} center>
                        <div
                            style={{
                                background: `rgba(0,0,0,0.9)`,
                                border: `2px solid ${meteor.color}`,
                                padding: "6px 8px",
                                borderRadius: "4px",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: meteor.color,
                                textAlign: "center",
                                minWidth: "60px",
                                boxShadow: `0 0 10px ${meteor.color}`,
                            }}
                        >
                            {meteor.problem}
                        </div>
                    </Html>
                </group>
            ))}

            {/* New HUD System */}
            <MathGameHUD
                meteors={coloredMeteors}
                score={score}
                setScore={setScore}
                setMeteors={setMeteors}
            />

            {/* Space lighting */}
            <ambientLight intensity={0.2} color="#4444ff" />
            <pointLight
                position={[0, 6, 0]}
                intensity={0.4}
                distance={15}
                color="#ffffff"
            />
        </group>
    );
};
