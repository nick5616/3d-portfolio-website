import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class WebGLErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Check if the error is related to WebGL
        const isWebGLError =
            error.message.includes("WebGL") ||
            error.message.includes("WebGL context") ||
            error.message.includes("Could not create a WebGL context") ||
            error.message.includes("Error creating WebGL context");

        if (isWebGLError) {
            return { hasError: true, error };
        }

        // Re-throw non-WebGL errors
        throw error;
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(
            "WebGL Error Boundary caught an error:",
            error,
            errorInfo
        );
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#1a1a1a",
                        color: "white",
                        textAlign: "center",
                        padding: "2rem",
                    }}
                >
                    <div>
                        <h2 style={{ marginBottom: "1rem", color: "#ef4444" }}>
                            WebGL Error Detected
                        </h2>
                        <p style={{ marginBottom: "1rem" }}>
                            There was an error initializing the 3D graphics.
                            This usually means hardware acceleration is disabled
                            or your browser doesn't support WebGL.
                        </p>
                        <div
                            style={{
                                marginBottom: "1rem",
                                fontSize: "0.875rem",
                                color: "#9ca3af",
                            }}
                        >
                            <p>
                                <strong>Error:</strong>{" "}
                                {this.state.error?.message}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "none",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "1rem",
                            }}
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
