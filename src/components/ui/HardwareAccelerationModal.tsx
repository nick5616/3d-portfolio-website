import React from "react";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

interface HardwareAccelerationModalProps {
    isVisible: boolean;
}

export const HardwareAccelerationModal: React.FC<
    HardwareAccelerationModalProps
> = ({ isVisible }) => {
    const { isMobile } = useDeviceDetection();

    if (!isVisible) return null;

    // Use inline style for high z-index on mobile (above Tailwind's z-50 limit)
    const modalStyle = isMobile
        ? { pointerEvents: "auto" as const, zIndex: 10001 }
        : { pointerEvents: "auto" as const };

    const modalClass = isMobile
        ? "fixed inset-0 flex items-center justify-center"
        : "fixed inset-0 flex items-center justify-center z-50";

    return (
        <div className={modalClass} style={modalStyle}>
            {/* Backdrop - no click handler since this is uncloseable */}
            <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                className={`relative bg-red-900 rounded-lg shadow-xl w-full p-4 ${
                    isMobile
                        ? "mx-4 my-8 max-w-sm max-h-[calc(100vh-4rem)] overflow-y-auto"
                        : "max-w-2xl mx-4 p-6"
                }`}
                style={{
                    border: "2px solid rgba(239, 68, 68, 0.5)",
                    boxShadow: "0 0 30px rgba(239, 68, 68, 0.3)",
                }}
            >
                {/* Warning Icon */}
                <div className="flex justify-center mb-4">
                    <svg
                        className="w-16 h-16 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>

                {/* Content */}
                <div className="text-white text-center">
                    <h2
                        className={`font-bold mb-4 text-red-100 ${
                            isMobile ? "text-xl" : "text-2xl"
                        }`}
                    >
                        Hardware Acceleration Required
                    </h2>

                    <div className="space-y-4 text-sm">
                        <p className="text-red-200">
                            This 3D portfolio requires hardware acceleration to
                            run properly. Your browser appears to have hardware
                            acceleration disabled.
                        </p>

                        <div className="bg-red-800 rounded-lg p-4 text-left">
                            <h3 className="font-semibold mb-2 text-red-100">
                                To enable hardware acceleration:
                            </h3>
                            <ul className="space-y-2 text-red-200 text-xs">
                                <li>
                                    <strong>Chrome:</strong> Go to Settings →
                                    Advanced → System → Enable "Use hardware
                                    acceleration when available"
                                </li>
                                <li>
                                    <strong>Firefox:</strong> Go to about:config
                                    → Set layers.acceleration.force-enabled to
                                    true
                                </li>
                                <li>
                                    <strong>Safari:</strong> Go to Safari →
                                    Preferences → Advanced → Enable "Show
                                    Develop menu" → Develop → Enable WebGL
                                </li>
                                <li>
                                    <strong>Edge:</strong> Go to Settings →
                                    System → Enable "Use hardware acceleration
                                    when available"
                                </li>
                            </ul>
                        </div>

                        <div className="bg-yellow-900 rounded-lg p-4">
                            <p className="text-yellow-200 text-xs">
                                <strong>Note:</strong> After enabling hardware
                                acceleration, please refresh this page for the
                                changes to take effect.
                            </p>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
