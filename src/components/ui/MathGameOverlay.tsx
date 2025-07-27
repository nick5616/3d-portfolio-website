import React, { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";

const METEOR_COLORS = [
    "#FF4500", // Red-Orange
    "#00FF00", // Green
    "#4169E1", // Royal Blue
    "#FFD700", // Gold
    "#FF1493", // Deep Pink
    "#00CED1", // Dark Turquoise
];

export const MathGameOverlay: React.FC = () => {
    const {
        mathGame,
        setMathGameScore,
        updateMathGameMeteors,
        setIsInteracting,
    } = useSceneStore();
    const [showInstructions, setShowInstructions] = useState(true);
    const [gameStarted, setGameStarted] = useState(false);

    // Handle instructions fade out and game start
    useEffect(() => {
        if (mathGame.isActive && !gameStarted) {
            const timer = setTimeout(() => {
                setShowInstructions(false);
                setGameStarted(true);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [mathGame.isActive, gameStarted]);

    // Manage interaction state to keep cursor mode active during math game
    useEffect(() => {
        if (mathGame.isActive && gameStarted) {
            setIsInteracting(true);

            // Exit pointer lock to enable cursor mode
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

            return () => {
                setIsInteracting(false);
            };
        }
    }, [mathGame.isActive, gameStarted, setIsInteracting]);

    // Prevent pointer lock during math game
    useEffect(() => {
        if (!mathGame.isActive || !gameStarted) return;

        const originalRequestPointerLock =
            HTMLElement.prototype.requestPointerLock;

        HTMLElement.prototype.requestPointerLock = function () {
            // Only prevent if we're still in interaction mode
            const currentInteractionState =
                useSceneStore.getState().isInteracting;
            if (currentInteractionState && mathGame.isActive && gameStarted) {
                console.log("Prevented pointer lock request during math game");
                return Promise.resolve();
            } else {
                console.log("Allowing pointer lock request");
                return originalRequestPointerLock.call(this);
            }
        };

        // Force exit pointer lock periodically during game, but only if still interacting
        const intervalId = setInterval(() => {
            const currentInteractionState =
                useSceneStore.getState().isInteracting;
            if (
                document.pointerLockElement &&
                currentInteractionState &&
                mathGame.isActive &&
                gameStarted
            ) {
                console.log("Force exiting pointer lock during math game");
                document.exitPointerLock();
            }
        }, 100);

        return () => {
            HTMLElement.prototype.requestPointerLock =
                originalRequestPointerLock;
            clearInterval(intervalId);
        };
    }, [mathGame.isActive, gameStarted]);

    // Handle exit from math game when ESC is pressed or game becomes inactive
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && mathGame.isActive && gameStarted) {
                setIsInteracting(false);
                // Re-enable pointer lock
                const canvas = document.querySelector("canvas");
                if (canvas) {
                    canvas.requestPointerLock();
                }
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (!mathGame.isActive || !gameStarted) return;

            const target = event.target as HTMLElement;
            console.log("Click detected, target:", target);

            // Check if click is outside math UI elements
            const mathUIElement = target.closest("[data-math-ui]");
            console.log("Math UI element found:", mathUIElement);

            if (!mathUIElement) {
                console.log("Clicked outside math UI, exiting to look mode");
                setIsInteracting(false);

                // Need to allow some time for the interaction state to update
                // and for the pointer lock prevention to be removed
                setTimeout(() => {
                    const canvas = document.querySelector("canvas");
                    if (canvas) {
                        console.log("Attempting to re-enable pointer lock");
                        canvas.requestPointerLock();
                    }
                }, 100);
            } else {
                console.log("Clicked inside math UI, staying in cursor mode");
            }
        };

        if (mathGame.isActive && gameStarted) {
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("click", handleClickOutside, true); // Use capture phase
            return () => {
                document.removeEventListener("keydown", handleKeyDown);
                document.removeEventListener("click", handleClickOutside, true);
            };
        }
    }, [mathGame.isActive, gameStarted, setIsInteracting]);

    // Don't render if math game is not active
    if (!mathGame.isActive) {
        return null;
    }

    // Assign colors to meteors consistently and limit to max 2 for stability
    const coloredMeteors = mathGame.meteors
        .slice(0, 2) // Limit to 2 concurrent problems for stability
        .map((meteor, index) => ({
            ...meteor,
            color: meteor.color || METEOR_COLORS[index % METEOR_COLORS.length],
        }));

    const handleAnswer = (
        meteorId: number,
        selectedAnswer: number,
        event: React.MouseEvent
    ) => {
        event.preventDefault();
        event.stopPropagation();

        console.log("Answer clicked:", { meteorId, selectedAnswer });

        const meteor = mathGame.meteors.find((m) => m.id === meteorId);
        if (!meteor) {
            console.log("Meteor not found for ID:", meteorId);
            return;
        }

        console.log("Meteor found:", meteor);
        console.log("Correct answer:", meteor.answer);
        console.log("Selected answer:", selectedAnswer);
        console.log("Is correct:", selectedAnswer === meteor.answer);
        console.log("Current score:", mathGame.score);

        if (selectedAnswer === meteor.answer) {
            console.log(
                "Correct! Updating score from",
                mathGame.score,
                "to",
                mathGame.score + 1
            );
            setMathGameScore(mathGame.score + 1);
        } else {
            console.log("Incorrect answer");
        }

        // Remove the answered meteor
        console.log("Removing meteor with ID:", meteorId);
        updateMathGameMeteors(
            mathGame.meteors.filter((m) => m.id !== meteorId)
        );
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 1000,
                fontFamily: "monospace",
            }}
        >
            {/* Instructions - Front and Center (fades out after 4 seconds) */}
            {showInstructions && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "rgba(0,0,0,0.9)",
                        color: "#00ff00",
                        padding: "30px 40px",
                        borderRadius: "12px",
                        fontSize: "24px",
                        fontWeight: "bold",
                        textAlign: "center",
                        border: "3px solid #00ff00",
                        boxShadow: "0 0 30px rgba(0,255,0,0.8)",
                        animation: "fadeOut 4s ease-in-out forwards",
                    }}
                >
                    <div style={{ fontSize: "28px", marginBottom: "15px" }}>
                        METEOR DEFENSE SYSTEM
                    </div>
                    <div style={{ fontSize: "18px", opacity: 0.9 }}>
                        Destroy incoming meteors by solving their math problems!
                    </div>
                    <div
                        style={{
                            fontSize: "14px",
                            marginTop: "10px",
                            opacity: 0.7,
                        }}
                    >
                        Game starts in a few seconds...
                    </div>
                </div>
            )}

            {/* Score Display - Top Right */}
            {gameStarted && (
                <div
                    data-math-ui
                    style={{
                        position: "absolute",
                        top: "90px",
                        left: "15px",
                        background: "rgba(0,0,0,0.8)",
                        color: "#00ff00",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        border: "2px solid #00ff00",
                        boxShadow: "0 0 10px rgba(0,255,0,0.5)",
                        textAlign: "center",
                    }}
                >
                    SCORE: {mathGame.score}
                </div>
            )}

            {/* Math Problems - Stable Bottom Layout */}
            {gameStarted && coloredMeteors.length > 0 && (
                <div
                    data-math-ui
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        justifyContent: "flex-start",
                        width: "100%",
                        paddingLeft: "20px",
                        gap: "20px",
                        pointerEvents: "auto",
                    }}
                >
                    {coloredMeteors.map((meteor, index) => (
                        <div
                            key={meteor.id}
                            style={{
                                background: "rgba(0,0,0,0.9)",
                                border: `3px solid ${meteor.color}`,
                                borderRadius: "12px",
                                padding: "16px",
                                minWidth: "180px",
                                boxShadow: `0 0 15px ${meteor.color}`,
                            }}
                        >
                            {/* Problem Display */}
                            <div
                                style={{
                                    color: meteor.color,
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    marginBottom: "12px",
                                    textShadow: `0 0 5px ${meteor.color}`,
                                }}
                            >
                                {meteor.problem} = ?
                            </div>

                            {/* 2x2 Answer Grid */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gridTemplateRows: "1fr 1fr",
                                    gap: "8px",
                                }}
                            >
                                {meteor.choices.map((choice, i) => (
                                    <button
                                        key={i}
                                        onClick={(e) =>
                                            handleAnswer(meteor.id, choice, e)
                                        }
                                        style={{
                                            background: meteor.color,
                                            border: "2px solid #000",
                                            padding: "12px 8px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "16px",
                                            fontWeight: "bold",
                                            color: "#000",
                                            minHeight: "50px",
                                            transition: "all 0.15s",
                                            boxShadow: `0 0 5px ${meteor.color}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform =
                                                "scale(1.05)";
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
            )}

            {/* CSS Animation for fade out */}
            <style>
                {`
                    @keyframes fadeOut {
                        0% { opacity: 1; }
                        70% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                `}
            </style>
        </div>
    );
};
