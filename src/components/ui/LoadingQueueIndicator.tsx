import React, { useState, useEffect } from "react";
import { loadingManager, LoadingState } from "../../utils/loadingManager";

interface LoadingQueueIndicatorProps {
    className?: string;
    showDetails?: boolean;
}

/**
 * Component that displays the current loading queue status
 * Useful for debugging and showing users that art pieces are loading
 */
export const LoadingQueueIndicator: React.FC<LoadingQueueIndicatorProps> = ({
    className = "",
    showDetails = false,
}) => {
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: false,
        queueLength: 0,
        currentRequest: null,
    });

    useEffect(() => {
        const unsubscribe = loadingManager.subscribe(setLoadingState);
        return unsubscribe;
    }, []);

    // Don't render if nothing is loading and queue is empty
    if (!loadingState.isLoading && loadingState.queueLength === 0) {
        return null;
    }

    return (
        <div
            className={`fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm z-50 ${className}`}
        >
            <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading art pieces...</span>
            </div>

            {showDetails && (
                <div className="mt-2 text-xs text-gray-300">
                    <div>Queue: {loadingState.queueLength}</div>
                    {loadingState.currentRequest && (
                        <div>Current: {loadingState.currentRequest}</div>
                    )}
                </div>
            )}
        </div>
    );
};
