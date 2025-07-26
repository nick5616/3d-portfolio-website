import React from "react";
import { Html } from "@react-three/drei";

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

interface MathGameHUDProps {
    meteors: Meteor[];
    score: number;
    setScore: React.Dispatch<React.SetStateAction<number>>;
    setMeteors: React.Dispatch<React.SetStateAction<Meteor[]>>;
}

const METEOR_COLORS = [
    "#FF4500", // Red-Orange
    "#00FF00", // Green
    "#4169E1", // Royal Blue
    "#FFD700", // Gold
    "#FF1493", // Deep Pink
    "#00CED1", // Dark Turquoise
];

export const MathGameHUD: React.FC<MathGameHUDProps> = ({
    meteors,
    score,
    setScore,
    setMeteors,
}) => {
    // Assign colors to meteors if they don't have them
    const coloredMeteors = meteors.map((meteor, index) => ({
        ...meteor,
        color: meteor.color || METEOR_COLORS[index % METEOR_COLORS.length],
    }));

    const handleAnswer = (meteorId: number, selectedAnswer: number) => {
        const meteor = meteors.find((m) => m.id === meteorId);
        if (!meteor) return;

        if (selectedAnswer === meteor.answer) {
            setScore((prev) => prev + 1);
        }

        // Remove the answered meteor
        setMeteors((prev) => prev.filter((m) => m.id !== meteorId));
    };

    return (
        <>
            {/* Score Display - Top Left */}
            <Html position={[-3, 3.5, 2]} center>
                <div
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        color: "#00ff00",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        fontFamily: "monospace",
                        fontSize: "18px",
                        fontWeight: "bold",
                        border: "2px solid #00ff00",
                        boxShadow: "0 0 10px rgba(0,255,0,0.5)",
                    }}
                >
                    SCORE: {score}
                </div>
            </Html>

            {/* Active Meteors Display - Top Center */}
            {coloredMeteors.length > 0 && (
                <Html position={[0, 3.5, 2]} center>
                    <div
                        style={{
                            background: "rgba(0,0,0,0.8)",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "2px solid #ffffff",
                            boxShadow: "0 0 10px rgba(255,255,255,0.3)",
                        }}
                    >
                        <div
                            style={{
                                color: "#ffffff",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                marginBottom: "8px",
                                textAlign: "center",
                            }}
                        >
                            ACTIVE TARGETS: {coloredMeteors.length}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {coloredMeteors.map((meteor) => (
                                <div
                                    key={meteor.id}
                                    style={{
                                        background: meteor.color,
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        color: "#000",
                                        fontWeight: "bold",
                                        fontSize: "10px",
                                        minWidth: "60px",
                                        textAlign: "center",
                                    }}
                                >
                                    {meteor.problem}
                                </div>
                            ))}
                        </div>
                    </div>
                </Html>
            )}

            {/* Answer Choices - Center HUD */}
            {coloredMeteors.length > 0 && (
                <Html position={[0, 1, 2]} center>
                    <div
                        style={{
                            background: "rgba(0,0,0,0.9)",
                            padding: "20px",
                            borderRadius: "12px",
                            border: "3px solid #00ff00",
                            boxShadow: "0 0 20px rgba(0,255,0,0.5)",
                            maxWidth: "600px",
                        }}
                    >
                        {coloredMeteors.map((meteor) => (
                            <div
                                key={meteor.id}
                                style={{ marginBottom: "16px" }}
                            >
                                <div
                                    style={{
                                        color: meteor.color,
                                        fontFamily: "monospace",
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        marginBottom: "8px",
                                        textAlign: "center",
                                        textShadow: `0 0 5px ${meteor.color}`,
                                    }}
                                >
                                    {meteor.problem} = ?
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        justifyContent: "center",
                                    }}
                                >
                                    {meteor.choices.map((choice, i) => (
                                        <button
                                            key={i}
                                            onClick={() =>
                                                handleAnswer(meteor.id, choice)
                                            }
                                            style={{
                                                background: meteor.color,
                                                border: "2px solid #000",
                                                padding: "8px 16px",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: "bold",
                                                color: "#000",
                                                minWidth: "50px",
                                                transition: "all 0.2s",
                                                boxShadow: `0 0 5px ${meteor.color}`,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform =
                                                    "scale(1.1)";
                                                e.currentTarget.style.boxShadow = `0 0 15px ${meteor.color}`;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform =
                                                    "scale(1)";
                                                e.currentTarget.style.boxShadow = `0 0 5px ${meteor.color}`;
                                            }}
                                        >
                                            {choice}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Html>
            )}

            {/* Instructions - Bottom */}
            <Html position={[0, -1, 2]} center>
                <div
                    style={{
                        background: "rgba(0,0,0,0.7)",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        textAlign: "center",
                        border: "1px solid #ffffff",
                        opacity: coloredMeteors.length > 0 ? 1 : 0.5,
                    }}
                >
                    Destroy meteors by solving their math problems! Multiple
                    targets incoming!
                </div>
            </Html>
        </>
    );
};
