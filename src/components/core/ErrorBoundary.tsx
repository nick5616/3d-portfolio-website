import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class SceneErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('3D Scene Error:', error, errorInfo);
        
        // In a real app, you might want to log this to an error reporting service
        // logErrorToService(error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white">
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold mb-4">
                            3D Scene Error
                        </h2>
                        <p className="text-gray-300 mb-4">
                            Something went wrong with the 3D scene. This might be due to:
                        </p>
                        <ul className="text-left text-gray-400 mb-6 space-y-2">
                            <li>• Graphics driver compatibility issues</li>
                            <li>• WebGL not supported on this device</li>
                            <li>• Insufficient graphics memory</li>
                        </ul>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}