import React, { useState, useEffect } from "react";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useNavigate } from "react-router-dom";

interface EducationalModalProps {
    isVisible?: boolean;
    onClose?: () => void;
}

interface KeyProps {
    letter: string;
    direction: "up" | "down" | "left" | "right";
    delay?: number;
    className?: string;
}

const Arrow: React.FC<{ direction: KeyProps["direction"] }> = ({
    direction,
}) => {
    const arrowMap = {
        up: "↑",
        down: "↓",
        left: "←",
        right: "→",
    };

    return (
        <span className="text-white/50 text-lg ml-2">
            {arrowMap[direction]}
        </span>
    );
};

const KeyboardKey: React.FC<KeyProps> = ({
    letter,
    direction,
    delay = 0,
    className = "",
}) => {
    const [isPressed, setIsPressed] = useState(false);
    const cycleDuration = 4000; // Total time for all keys to complete one cycle
    const pulseDuration = 600; // How long each key stays highlighted

    useEffect(() => {
        const animate = () => {
            const currentTime = Date.now();
            const cyclePosition = currentTime % cycleDuration;
            const keyPosition = (cyclePosition + delay) % cycleDuration;

            // Each key is active for pulseDuration ms within its time slot
            setIsPressed(keyPosition < pulseDuration);
        };

        const animationFrame = setInterval(animate, 16); // ~60fps

        return () => {
            clearInterval(animationFrame);
        };
    }, [delay]);

    return (
        <div className="flex items-center">
            <div
                className={`w-12 h-12 border-2 border-white/20 rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-200 ${
                    isPressed ? "bg-white/20" : "bg-transparent"
                } ${className}`}
            >
                {letter}
            </div>
            <Arrow direction={direction} />
        </div>
    );
};

const MouseAnimation: React.FC = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            setPosition({
                x: Math.sin(Date.now() / 1000) * 20,
                y: Math.cos(Date.now() / 1000) * 20,
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-32 h-32 border-2 border-white/20 rounded-lg">
            <div
                className="absolute w-4 h-4 bg-white/50 rounded-full transition-all duration-200"
                style={{
                    transform: `translate(${position.x + 56}px, ${
                        position.y + 56
                    }px)`,
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                Drag
            </div>
        </div>
    );
};

export const EducationalModal: React.FC<EducationalModalProps> = ({
    isVisible = true,
    onClose,
}) => {
    const navigate = useNavigate();
    const { isMobile } = useDeviceDetection();
    const [isOpen, setIsOpen] = useState(isVisible);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const shouldShow = localStorage.getItem("dontShowWelcome");
        if (shouldShow === "true") {
            handleClose();
        }
    }, []);

    useEffect(() => {
        if (isMobile) {
            document.body.classList.toggle("modal-hidden", !isOpen);
        }
        return () => {
            if (isMobile) {
                document.body.classList.add("modal-hidden");
            }
        };
    }, [isOpen, isMobile]);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem("dontShowWelcome", "true");
        }
        setIsOpen(false);
        onClose?.();
    };

    if (!isOpen) return null;

    const modalStyle = isMobile
        ? { pointerEvents: "auto" as const, zIndex: 10000 }
        : { pointerEvents: "auto" as const };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={modalStyle}
        >
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div
                className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 p-6 border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>

                <div className="text-white">
                    {/* Introduction */}
                    <div className=" mb-8">
                        <h2 className="text-3xl font-bold mb-3">
                            Welcome! I'm Nick.
                        </h2>
                        <p className="text-lg text-gray-300">
                            Explore my creative space in an interactive 3D
                            environment
                        </p>
                    </div>

                    {/* Quick Access */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate("/art-gallery");
                            }}
                            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                        >
                            <h3 className="font-semibold mb-2">Art Gallery</h3>
                            <p className="text-sm text-gray-400">
                                View my artwork collection
                            </p>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate("/software");
                            }}
                            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                        >
                            <h3 className="font-semibold mb-2">Software</h3>
                            <p className="text-sm text-gray-400">
                                Check out my projects
                            </p>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate("/holodeck");
                            }}
                            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                        >
                            <h3 className="font-semibold mb-2">Activities</h3>
                            <p className="text-sm text-gray-400">
                                Interactive experiences
                            </p>
                        </button>
                    </div>

                    {/* Basic Controls */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-6">
                            Basic Controls
                        </h2>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="flex flex-col items-center">
                                <h3 className="font-semibold text-xl mb-4">
                                    Movement
                                </h3>
                                <div className="flex flex-col items-center gap-2">
                                    <KeyboardKey
                                        letter="W"
                                        direction="up"
                                        delay={0}
                                    />
                                    <div className="flex gap-2">
                                        <KeyboardKey
                                            letter="A"
                                            direction="left"
                                            delay={1000}
                                        />
                                        <KeyboardKey
                                            letter="S"
                                            direction="down"
                                            delay={2000}
                                        />
                                        <KeyboardKey
                                            letter="D"
                                            direction="right"
                                            delay={3000}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <h3 className="font-semibold text-xl mb-4">
                                    Look Around
                                </h3>
                                <div className="flex justify-center">
                                    <MouseAnimation />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Controls */}
                    <div className="bg-white/5 rounded-lg p-4 mb-8">
                        <h3 className="font-semibold text-xl mb-3">
                            Advanced Controls
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="mb-2">
                                    <span className="px-2 py-1 bg-white/10 rounded mr-2">
                                        SPACE
                                    </span>
                                    Jump
                                </p>
                                <p>
                                    <span className="px-2 py-1 bg-white/10 rounded mr-2">
                                        SHIFT
                                    </span>
                                    Run
                                </p>
                            </div>
                            <div>
                                <p className="mb-2">
                                    <span className="px-2 py-1 bg-white/10 rounded mr-2">
                                        ESC
                                    </span>
                                    Free cursor
                                </p>
                                <p>
                                    <span className="px-2 py-1 bg-white/10 rounded mr-2">
                                        CLICK
                                    </span>
                                    Lock cursor
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center">
                        <label className="flex items-center space-x-2 text-sm text-gray-400">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) =>
                                    setDontShowAgain(e.target.checked)
                                }
                                className="form-checkbox rounded bg-white/10 border-white/20"
                            />
                            <span>Don't show this again</span>
                        </label>
                        <button
                            onClick={handleClose}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                        >
                            Let's Begin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
