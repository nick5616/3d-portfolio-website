import React from "react";
import { useRupeeStore } from "../../stores/rupeeStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const RupeeCounter: React.FC = () => {
    const { totalValue } = useRupeeStore();
    const { isMobile } = useDeviceDetection();

    return (
        <div
            className={`fixed ${
                isMobile ? "right-16" : "right-24"
            } top-2 z-30 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-700`}
        >
            {/* Rupee Icon */}
            <div className="w-6 h-6 flex items-center justify-center">
                <img
                    src="/favicon-32x32.png"
                    alt="Rupee"
                    className="w-5 h-5 object-contain"
                />
            </div>

            {/* Rupee Count */}
            <span className="text-white font-semibold text-lg">
                {totalValue.toLocaleString()}
            </span>
        </div>
    );
};
