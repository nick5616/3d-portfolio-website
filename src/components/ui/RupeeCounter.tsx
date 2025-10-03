import React, { useEffect } from "react";
import { useRupeeStore } from "../../stores/rupeeStore";

export const RupeeCounter: React.FC = () => {
    const { totalValue, rupees } = useRupeeStore();

    // Log when totalValue changes
    useEffect(() => {
        console.log(`💰 UI: RupeeCounter totalValue updated to: ${totalValue}`);
        console.log(`💰 UI: Current rupees state:`, rupees);
    }, [totalValue, rupees]);

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-700">
            {/* Rupee Icon */}
            <div className="w-6 h-6 flex items-center justify-center">
                <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-green-400"
                    fill="currentColor"
                >
                    {/* Rupee shape - simplified hexagon */}
                    <path d="M12 2L18 8L12 14L6 8L12 2Z" />
                    <path
                        d="M12 8L18 14L12 20L6 14L12 8Z"
                        fill="#00FF00"
                        opacity="0.7"
                    />
                </svg>
            </div>

            {/* Rupee Count */}
            <span className="text-white font-semibold text-lg">
                {totalValue.toLocaleString()}
            </span>
        </div>
    );
};
