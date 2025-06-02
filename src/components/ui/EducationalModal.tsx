import React, { useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";

interface EducationalModalProps {
    isVisible?: boolean;
    onClose?: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({
    isVisible = true,
    onClose,
}) => {
    const { performance } = useSceneStore();
    const [isOpen, setIsOpen] = useState(isVisible);

    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ pointerEvents: "auto" }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div
                className="relative bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
                style={{
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
                }}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
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
                    <h2 className="text-2xl font-bold mb-4">
                        Welcome to the 3D Portfolio
                    </h2>
                    <div className="space-y-4">
                        <p>
                            This is an interactive 3D environment showcasing my
                            work and skills. Here's how to navigate:
                        </p>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">
                                    Getting Started
                                </h3>
                                <ul className="list-disc list-inside space-y-2">
                                    <li>
                                        Click anywhere in the game window to
                                        focus the game controls
                                    </li>
                                    <li>
                                        Press ESC to release focus and return to
                                        normal cursor control
                                    </li>
                                    <li>
                                        You need to focus the game to interact
                                        with settings and controls
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">
                                    Movement Controls
                                </h3>
                                <ul className="list-disc list-inside space-y-2">
                                    <li>
                                        Use WASD or arrow keys to move around
                                    </li>
                                    <li>Click and drag to look around</li>
                                    <li>Press Space to jump</li>
                                    <li>
                                        Interact with objects by clicking on
                                        them
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">
                            Tip: You can adjust performance settings in the
                            top-right corner if you experience any lag.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
