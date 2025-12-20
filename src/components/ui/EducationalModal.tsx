import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
    const { setEducationalModalOpen, showStartPrompt, setShowStartPrompt } =
        useSceneStore();
    const isLandscape = useDeviceOrientation();
    const [isOpen, setIsOpen] = useState(() => {
        // If localStorage says don't show, start closed
        const shouldShow = localStorage.getItem("dontShowWelcome");
        return shouldShow !== "true" && isVisible;
    });
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [showScrollPrompt, setShowScrollPrompt] = useState(false);
    const hasScrolledDownRef = useRef(false);
    const modalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const shouldShow = localStorage.getItem("dontShowWelcome");
        if (shouldShow === "true" && !isMobile) {
            setShowStartPrompt(true);
        }
    }, [setShowStartPrompt]);

    useEffect(() => {
        if (isMobile) {
            document.body.classList.toggle("modal-hidden", !isOpen);
        }
        // Update global state
        setEducationalModalOpen(isOpen);

        // Reset scroll prompt when modal closes
        if (!isOpen) {
            setShowScrollPrompt(false);
            hasScrolledDownRef.current = false;
        }

        // Note: Pointer lock will be requested on next user click via mouse controls

        return () => {
            if (isMobile) {
                document.body.classList.add("modal-hidden");
            }
        };
    }, [isOpen, isMobile, setEducationalModalOpen]);

    const handleClose = () => {
        console.log("handleClose");
        if (dontShowAgain) {
            localStorage.setItem("dontShowWelcome", "true");
        }
        setIsOpen(false);
        onClose?.();
        // Hide start prompt when modal is closed
        setShowStartPrompt(false);
    };

    // Hide start prompt when user clicks
    useEffect(() => {
        if (!showStartPrompt) return;

        const handleClick = () => {
            setShowStartPrompt(false);
        };

        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [showStartPrompt, setShowStartPrompt]);

    // Handle scroll detection for scroll prompt
    useEffect(() => {
        if (!isOpen || !modalContentRef.current) return;

        const modalElement = modalContentRef.current;
        let initialScrollTop = modalElement.scrollTop;
        let showPromptTimeout: NodeJS.Timeout | null = null;

        // Check if content is scrollable and show prompt after 2 seconds
        const checkIfScrollable = () => {
            const isScrollable =
                modalElement.scrollHeight > modalElement.clientHeight;
            // Only show prompt if content is scrollable and user hasn't scrolled down
            if (isScrollable && !hasScrolledDownRef.current) {
                // Wait 2 seconds before showing
                showPromptTimeout = setTimeout(() => {
                    // Double-check conditions before showing
                    if (
                        !hasScrolledDownRef.current &&
                        modalElement.scrollTop === 0
                    ) {
                        setShowScrollPrompt(true);
                    }
                }, 2000);
            }
        };

        // Handle scroll events - detect if scrolling down
        const handleScroll = () => {
            const currentScrollTop = modalElement.scrollTop;
            // If scrolled down from initial position, mark as scrolled and hide prompt
            if (currentScrollTop > initialScrollTop) {
                hasScrolledDownRef.current = true;
                setShowScrollPrompt(false);
            }
            initialScrollTop = currentScrollTop;
        };

        const handleWheel = (e: WheelEvent) => {
            // If scrolling down, mark as scrolled and hide prompt
            if (e.deltaY > 0) {
                hasScrolledDownRef.current = true;
                setShowScrollPrompt(false);
            }
        };

        // Also detect mouse movement down (for touch devices)
        let lastMouseY = 0;
        const handleMouseMove = (e: MouseEvent) => {
            if (lastMouseY > 0 && e.clientY > lastMouseY + 10) {
                // Mouse moved down significantly
                hasScrolledDownRef.current = true;
                setShowScrollPrompt(false);
            }
            lastMouseY = e.clientY;
        };

        modalElement.addEventListener("scroll", handleScroll);
        modalElement.addEventListener("wheel", handleWheel);
        modalElement.addEventListener("mousemove", handleMouseMove);

        // Initial check after content renders
        requestAnimationFrame(() => {
            checkIfScrollable();
        });

        return () => {
            if (showPromptTimeout) {
                clearTimeout(showPromptTimeout);
            }
            modalElement.removeEventListener("scroll", handleScroll);
            modalElement.removeEventListener("wheel", handleWheel);
            modalElement.removeEventListener("mousemove", handleMouseMove);
        };
    }, [isOpen]);

    const modalStyle = isMobile
        ? { pointerEvents: "auto" as const, zIndex: 50 }
        : { pointerEvents: "auto" as const, zIndex: 50 };

    const modalContent = !isOpen ? (
        // Show start prompt for returning users
        showStartPrompt ? (
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                <div className="bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm border border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">
                            Click anywhere to look around
                        </span>
                    </div>
                </div>
            </div>
        ) : null
    ) : (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={modalStyle}
        >
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm "
                onClick={handleClose}
            />
            <div
                ref={modalContentRef}
                className={`relative bg-gray-900 rounded-xl shadow-2xl border border-white/10 overflow-y-auto h-[90%] ${
                    isMobile
                        ? "w-full h-full m-0 rounded-none flex flex-col justify-between"
                        : "w-full max-w-3xl p-4"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Request pointer lock before closing modal
                        if (!isMobile) {
                            const canvas = document.querySelector("canvas");
                            if (canvas) {
                                canvas.requestPointerLock();
                            }
                        }
                        handleClose();
                    }}
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
                                // Request pointer lock before closing modal
                                if (!isMobile) {
                                    const canvas =
                                        document.querySelector("canvas");
                                    if (canvas) {
                                        canvas.requestPointerLock();
                                    }
                                }
                                handleClose();
                            }}
                            className={`px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all`}
                            style={{ touchAction: "auto" }}
                        >
                            Let's Begin
                        </button>
                    </div>
                </div>

                {/* Scroll Prompt */}
                {showScrollPrompt && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
                        <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/20 flex items-center gap-2 animate-bounce">
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                />
                            </svg>
                            <span className="text-sm font-medium">
                                Scroll for more
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return modalContent ? createPortal(modalContent, document.body) : null;
};
