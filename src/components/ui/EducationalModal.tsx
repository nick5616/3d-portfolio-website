import React, { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

interface EducationalModalProps {
    isOverride?: boolean;
}

// Browser-specific instruction components
const BrowserSpecificInstructions: React.FC = () => {
    const { isSafari, isDuckDuckGo } = useDeviceDetection();

    if (isDuckDuckGo) {
        return (
            <ul className="list-disc list-inside space-y-2">
                <li>
                    Your browser is in compatibility mode - click anywhere to start exploring
                </li>
                <li>
                    The mouse cursor will remain visible for easy navigation
                </li>
                <li>
                    Click and drag to look around while in first-person mode
                </li>
            </ul>
        );
    }

    if (isSafari) {
        return (
            <ul className="list-disc list-inside space-y-2">
                <li>
                    Safari compatibility mode is active for optimal performance
                </li>
                <li>
                    Click anywhere to start exploring with your cursor visible
                </li>
                <li>
                    Click and drag to look around in first-person mode
                </li>
            </ul>
        );
    }

    return (
        <ul className="list-disc list-inside space-y-2">
            <li>
                Click anywhere in the game window to focus the game controls
            </li>
            <li>
                Press ESC to release focus and return to normal cursor control
            </li>
            <li>
                You need to focus the game to interact with settings and controls
            </li>
        </ul>
    );
};

const BrowserSpecificMovementInstructions: React.FC = () => {
    const { isSafari, isDuckDuckGo } = useDeviceDetection();

    if (isDuckDuckGo || isSafari) {
        return (
            <li>
                Click and drag with your mouse to look around (cursor stays visible)
            </li>
        );
    }

    return (
        <li>
            Click and drag to look around
        </li>
    );
};

export const EducationalModal: React.FC<EducationalModalProps> = ({
    isOverride,
}) => {
    const { performance } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        // Close modal after 15 seconds on mobile, 10 seconds on desktop
        const timer = setTimeout(() => {
            setIsOpen(false);
        }, isMobile ? 15000 : 10000);

        return () => clearTimeout(timer);
    }, [isMobile]);

    // Close modal on user interaction
    useEffect(() => {
        const handleInteraction = () => {
            setIsOpen(false);
        };

        // Listen for any user interaction
        window.addEventListener("click", handleInteraction);
        window.addEventListener("keydown", handleInteraction);
        window.addEventListener("touchstart", handleInteraction);

        return () => {
            window.removeEventListener("click", handleInteraction);
            window.removeEventListener("keydown", handleInteraction);
            window.removeEventListener("touchstart", handleInteraction);
        };
    }, []);

    // Control modal visibility on mobile for FPS stats
    useEffect(() => {
        if (isMobile) {
            if (isOpen) {
                document.body.classList.remove("modal-hidden");
            } else {
                document.body.classList.add("modal-hidden");
            }
        }
    }, [isOpen, isMobile]);

    if (!isOpen && !isOverride) return null;

    // Use inline style for high z-index on mobile (above Tailwind's z-50 limit)
    const modalStyle = isMobile
        ? { pointerEvents: "auto" as const, zIndex: 10000 }
        : { pointerEvents: "auto" as const };

    const modalClass = isMobile
        ? "fixed inset-0 flex items-center justify-center"
        : "fixed inset-0 flex items-center justify-center z-50";

    return (
        <div className={modalClass} style={modalStyle}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <div
                className={`relative bg-gray-900 rounded-lg shadow-xl w-full p-4 ${
                    isMobile
                        ? "mx-4 my-8 max-w-sm max-h-[calc(100vh-4rem)] overflow-y-auto"
                        : "max-w-2xl mx-4 p-6"
                }`}
                style={{
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
                }}
            >
                {/* Close button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                    style={{ pointerEvents: "auto" }}
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

                {/* Content */}
                <div className="text-white">
                    <h2
                        className={`font-bold mb-4 ${
                            isMobile ? "text-xl" : "text-2xl"
                        }`}
                    >
                        Welcome to the 3D Portfolio
                    </h2>
                    <div className="space-y-4">
                        <p className={isMobile ? "text-sm" : ""}>
                            This is an interactive 3D environment showcasing my
                            work and skills. Here's how to navigate:
                        </p>
                        <div className="space-y-6">
                            {isMobile ? (
                                <>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">
                                            Touch Controls
                                        </h3>
                                        <ul className="list-disc list-inside space-y-2">
                                            <li>
                                                Use the virtual joystick on the
                                                right to look around
                                            </li>
                                            <li>
                                                Use the D-pad on the left to move
                                                around
                                            </li>
                                            <li>
                                                Tap the center button to jump
                                            </li>
                                            <li>
                                                Tap objects to interact with them
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">
                                            Performance
                                        </h3>
                                        <ul className="list-disc list-inside space-y-2">
                                            <li>
                                                Performance is automatically
                                                optimized for mobile
                                            </li>
                                            <li>
                                                Use the settings button in the
                                                bottom-left to adjust quality
                                            </li>
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">
                                            Getting Started
                                        </h3>
                                        <BrowserSpecificInstructions />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">
                                            Movement Controls
                                        </h3>
                                        <ul className="list-disc list-inside space-y-2">
                                            <li>
                                                Use WASD or arrow keys to move
                                                around
                                            </li>
                                            <BrowserSpecificMovementInstructions />
                                            <li>Press Space to jump</li>
                                            <li>
                                                Interact with objects by
                                                clicking on them
                                            </li>
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                        <p
                            className={`text-gray-400 mt-4 ${
                                isMobile ? "text-xs" : "text-sm"
                            }`}
                        >
                            Tip: You can adjust performance settings in the
                            {isMobile
                                ? " bottom-left corner"
                                : " top-right corner"}{" "}
                            if you experience any lag.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
