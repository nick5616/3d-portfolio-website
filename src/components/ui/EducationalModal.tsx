import React, { useState, useEffect } from "react";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useSceneStore } from "../../stores/sceneStore";

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

const QuickAccess: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { teleportToRoom } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    if (isMobile) return null;
    return (
        <>
            <div className="flex flex-col mb-4 font-semibold text-lg">
                Quick Access
            </div>
            <div
                className={`grid grid-cols-3 ${
                    isMobile ? "gap-2" : "gap-4"
                } w-full`}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        teleportToRoom("gallery", [7, 1.5, 0], [0, 0, 0]);
                        onClose();
                    }}
                    className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                    <h3
                        className={`font-semibold ${
                            isMobile ? "text-sm mb-1" : "mb-2"
                        }`}
                    >
                        Art Gallery
                    </h3>
                    <p
                        className={`${
                            isMobile ? "text-xs" : "text-sm"
                        } text-gray-400`}
                    >
                        {isMobile
                            ? "View artwork"
                            : "View my artwork collection"}
                    </p>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        teleportToRoom("projects", [0, 1.5, 7], [0, 0, 0]);
                        onClose();
                    }}
                    className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                    <h3
                        className={`font-semibold ${
                            isMobile ? "text-sm mb-1" : "mb-2"
                        }`}
                    >
                        Software
                    </h3>
                    <p
                        className={`${
                            isMobile ? "text-xs" : "text-sm"
                        } text-gray-400`}
                    >
                        {isMobile ? "View projects" : "Check out my projects"}
                    </p>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        teleportToRoom(
                            "about",
                            [-2.5, 1.6, 0],
                            [0, -Math.PI / 2, 0]
                        );
                        onClose();
                    }}
                    className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                    <h3
                        className={`font-semibold ${
                            isMobile ? "text-sm mb-1" : "mb-2"
                        }`}
                    >
                        Activities
                    </h3>
                    <p
                        className={`${
                            isMobile ? "text-xs" : "text-sm"
                        } text-gray-400`}
                    >
                        {isMobile ? "Interactive" : "Interactive experiences"}
                    </p>
                </button>
            </div>
        </>
    );
};

const useDeviceOrientation = () => {
    const [isLandscape, setIsLandscape] = useState(
        window.innerWidth > window.innerHeight
    );

    useEffect(() => {
        const handleResize = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isLandscape;
};

const RotateDeviceAnimation: React.FC = () => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation((prev) => (prev + 90) % 360);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center gap-2 text-white/70 bg-white/5 rounded-lg p-3">
            <div className="relative w-12 h-8">
                <div
                    className="absolute inset-0 border-2 border-white/30 rounded transition-transform duration-500"
                    style={{ transform: `rotate(${rotation}deg)` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 bg-white/30 rounded-full" />
                </div>
            </div>
            <span className="text-sm">
                Rotate horizontally for best experience
            </span>
        </div>
    );
};

const DragAnimation: React.FC = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const time = Date.now() / 1000;
            setPosition({
                x: Math.sin(time) * 20,
                y: Math.cos(time * 0.5) * 10, // Slower vertical movement
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-32 h-20 border-2 border-white/20 rounded-lg flex items-center justify-center">
            <div
                className="absolute w-4 h-4 bg-white/50 rounded-full transition-all duration-200"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                Drag to look
            </div>
        </div>
    );
};

const JoystickAnimation: React.FC<{ type: "move" | "look" }> = ({ type }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            if (type === "look") {
                // Circular motion for look joystick
                setPosition({
                    x: Math.sin(Date.now() / 1000) * 20,
                    y: Math.cos(Date.now() / 1000) * 20,
                });
            } else {
                // Sequential WASD motion for move joystick
                const time = (Date.now() % 4000) / 1000; // 4 second cycle
                if (time < 1) setPosition({ x: 0, y: -20 }); // Up
                else if (time < 2) setPosition({ x: 20, y: 0 }); // Right
                else if (time < 3) setPosition({ x: 0, y: 20 }); // Down
                else setPosition({ x: -20, y: 0 }); // Left
            }
        }, 50);
        return () => clearInterval(interval);
    }, [type]);

    return (
        <div className="relative w-20 h-20 border-2 border-white/20 rounded-full flex items-center justify-center">
            <div className="absolute w-10 h-10 border border-white/20 rounded-full" />
            <div
                className="absolute w-4 h-4 bg-white/50 rounded-full transition-all duration-200"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                {type === "look" ? "Look" : "Move"}
            </div>
        </div>
    );
};

export const EducationalModal: React.FC<EducationalModalProps> = ({
    isVisible = true,
    onClose,
}) => {
    const { isMobile } = useDeviceDetection();
    const isLandscape = useDeviceOrientation();
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
        console.log("handleClose");
        if (dontShowAgain) {
            localStorage.setItem("dontShowWelcome", "true");
        }
        setIsOpen(false);
        onClose?.();

        // Request pointer lock if not on mobile
        if (!isMobile) {
            const canvas = document.querySelector("canvas");
            if (canvas) {
                canvas.requestPointerLock();
            }
        }
    };

    if (!isOpen) return null;

    const modalStyle = isMobile
        ? { pointerEvents: "auto" as const, zIndex: 60 }
        : { pointerEvents: "auto" as const };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 "
            style={modalStyle}
        >
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm "
                onClick={handleClose}
            />
            <div
                className={`relative bg-gray-900 rounded-xl shadow-2xl border border-white/10 overflow-y-auto h-[90%] ${
                    isMobile
                        ? "w-full h-full m-0 rounded-none flex flex-col justify-between"
                        : "w-full max-w-3xl p-4"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2"
                    style={{ touchAction: "auto" }}
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

                <div
                    className={`text-white ${
                        isMobile ? "p-2 flex flex-col h-full" : ""
                    }`}
                >
                    {/* Introduction */}
                    <div
                        className={`${isMobile ? "text-center mb-2" : "mb-8"}`}
                    >
                        <h2
                            className={`font-bold mb-3 ${
                                isMobile ? "text-2xl" : "text-3xl"
                            }`}
                        >
                            Welcome! I'm Nick
                        </h2>
                        <p
                            className={`${
                                isMobile ? "text-base" : "text-lg"
                            } text-gray-300`}
                        >
                            Explore my creative space in an interactive 3D
                            environment
                        </p>
                    </div>

                    {/* Basic Controls */}
                    <div className={isMobile ? "flex-grow" : "mb-8"}>
                        <h2
                            className={`font-bold ${
                                isMobile
                                    ? "text-lg text-center mb-4"
                                    : "text-2xl mb-6"
                            }`}
                        >
                            {isMobile ? "Touch Controls" : "Basic Controls"}
                        </h2>
                        <div
                            className={`grid ${
                                isMobile
                                    ? "grid-cols-1 gap-6"
                                    : "grid-cols-2 gap-8"
                            }`}
                        >
                            {isMobile ? (
                                <>
                                    <div className="flex flex-col items-center">
                                        <div className="flex justify-around w-full mb-6">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-sm font-semibold text-white/90 mb-1">
                                                    Left Joystick
                                                </span>
                                                <JoystickAnimation type="move" />
                                                <span className="text-sm text-white/70">
                                                    Movement
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-sm font-semibold text-white/90 mb-1">
                                                    Right Joystick
                                                </span>
                                                <JoystickAnimation type="look" />
                                                <span className="text-sm text-white/70">
                                                    Camera
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm text-white/50 text-center mb-4">
                                            Tap objects to interact with them
                                        </div>
                                        {!isLandscape && (
                                            <div className="mb-6">
                                                <RotateDeviceAnimation />
                                            </div>
                                        )}
                                        <QuickAccess onClose={handleClose} />
                                    </div>
                                </>
                            ) : (
                                <>
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
                                            <DragAnimation />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Advanced Controls */}
                    {!isMobile && (
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
                                        Free cursor{" "}
                                        <svg
                                            className="w-4 h-4 inline-block ml-2 -rotate-[0deg]"
                                            viewBox="0 0 24 24"
                                            fill="white"
                                            stroke="black"
                                            strokeWidth="1"
                                        >
                                            <path d="M6,3L12,20L14,13L21,11L6,3Z" />
                                        </svg>
                                    </p>
                                    <p>
                                        <span className="px-2 py-1 bg-white/10 rounded mr-2">
                                            CLICK
                                        </span>
                                        Lock cursor{" "}
                                        <svg
                                            className="w-4 h-4 inline-block ml-2 -rotate-[0deg]"
                                            viewBox="0 0 24 24"
                                            fill="white"
                                            stroke="black"
                                            strokeWidth="1"
                                        >
                                            <path d="M6,3L12,20L14,13L21,11L6,3Z" />
                                        </svg>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Access */}
                    {!isMobile && (
                        <div className="mb-8">
                            <QuickAccess onClose={handleClose} />
                        </div>
                    )}

                    {/* Footer */}
                    <div
                        className={`flex justify-between items-center mt-auto`}
                    >
                        <label className="flex items-center space-x-2 text-sm text-gray-400">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) =>
                                    setDontShowAgain(e.target.checked)
                                }
                                className="form-checkbox rounded bg-white/10 border-white/20"
                                style={{ touchAction: "auto" }}
                            />
                            <span>Don't show this again</span>
                        </label>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClose();
                            }}
                            className={`px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all`}
                            style={{ touchAction: "auto" }}
                        >
                            Let's Begin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
