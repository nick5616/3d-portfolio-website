import React, { useState, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

interface EducationalModalProps {
    isVisible?: boolean;
    onClose?: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({
    isVisible = true,
    onClose,
}) => {
    const { performance } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    const [isOpen, setIsOpen] = useState(isVisible);

    // Toggle body class to control FPS indicator visibility on mobile
    useEffect(() => {
        if (isMobile) {
            if (isOpen) {
                document.body.classList.remove("modal-hidden");
            } else {
                document.body.classList.add("modal-hidden");
            }
        }

        // Cleanup on unmount
        return () => {
            if (isMobile) {
                document.body.classList.add("modal-hidden");
            }
        };
    }, [isOpen, isMobile]);

    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    if (!isOpen) return null;

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
                onClick={handleClose}
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
                    onClick={handleClose}
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
                        <div className="space-y-4">
                            {isMobile ? (
                                <>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">
                                            Mobile Controls
                                        </h3>
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            <li>
                                                Use the D-pad on the left to
                                                move around
                                            </li>
                                            <li>
                                                Use the joystick on the right to
                                                look around
                                            </li>
                                            <li>
                                                Tap on objects to interact with
                                                them
                                            </li>
                                            <li>
                                                The controls will automatically
                                                adjust based on your device's
                                                performance
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">
                                            Mobile Tips
                                        </h3>
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            <li>
                                                For the best experience, use
                                                your device in landscape mode
                                            </li>
                                            <li>
                                                If you experience lag, try
                                                reducing the quality in the
                                                performance settings
                                            </li>
                                            <li>
                                                Make sure your device is in
                                                fullscreen mode for optimal
                                                controls
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
                                        <ul className="list-disc list-inside space-y-2">
                                            <li>
                                                Click anywhere in the game
                                                window to focus the game
                                                controls
                                            </li>
                                            <li>
                                                Press ESC to release focus and
                                                return to normal cursor control
                                            </li>
                                            <li>
                                                You need to focus the game to
                                                interact with settings and
                                                controls
                                            </li>
                                        </ul>
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
                                            <li>
                                                Click and drag to look around
                                            </li>
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
