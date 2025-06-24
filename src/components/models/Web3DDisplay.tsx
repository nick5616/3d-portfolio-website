import React, { useRef, useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export interface Web3DDisplayProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    url: string;
    title?: string;
    width?: number;
    height?: number;
    fallbackImage?: string;
    description?: string;
}

export const Web3DDisplay: React.FC<Web3DDisplayProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    url,
    title = "Web Display",
    width = 900,
    height = 700,
    fallbackImage,
    description,
}) => {
    const displayRef = useRef<THREE.Group>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);

    const handleIframeLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setError("Failed to load website");
        setShowFallback(true);
    };

    // Check for iframe blocking after a timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                setError("Website may not allow embedding");
                setShowFallback(true);
                setIsLoading(false);
            }
        }, 10000); // 10 second timeout

        return () => clearTimeout(timer);
    }, [isLoading]);

    const openInNewTab = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <group
            ref={displayRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {/* Physical display frame */}
            <mesh>
                {/* Frame backing */}
                <boxGeometry args={[2.2, 1.7, 0.1]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.5}
                    roughness={0.2}
                />
            </mesh>

            {/* Screen bezel */}
            <mesh position={[0, 0, 0.05]}>
                <boxGeometry args={[2.1, 1.6, 0.02]} />
                <meshStandardMaterial
                    color="#000000"
                    metalness={0.8}
                    roughness={0.1}
                />
            </mesh>

            {/* Stand */}
            <mesh position={[0, -0.9, 0.2]} rotation={[-Math.PI / 6, 0, 0]}>
                <boxGeometry args={[0.4, 0.8, 0.05]} />
                <meshStandardMaterial color="#2c2c2c" metalness={0.6} />
            </mesh>

            {/* Base */}
            <mesh position={[0, -1.2, 0.4]}>
                <boxGeometry args={[0.6, 0.1, 0.4]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
            </mesh>

            {/* Web content using Html component */}
            <Html
                transform
                occlude
                position={[0, 0, 0.07]}
                distanceFactor={1}
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    border: "2px solid #333",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        backgroundColor: "#ffffff",
                    }}
                >
                    {/* Header bar */}
                    <div
                        style={{
                            height: "40px",
                            backgroundColor: "#f5f5f5",
                            borderBottom: "1px solid #ddd",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 12px",
                            fontSize: "14px",
                            fontFamily: "system-ui, sans-serif",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "6px",
                                marginRight: "12px",
                            }}
                        >
                            <div
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: "#ff5f57",
                                }}
                            />
                            <div
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: "#ffbd2e",
                                }}
                            />
                            <div
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: "#28ca42",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                flex: 1,
                                backgroundColor: "#ffffff",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                border: "1px solid #ddd",
                                fontSize: "12px",
                                color: "#666",
                            }}
                        >
                            {url}
                        </div>
                    </div>

                    {/* Loading overlay */}
                    {isLoading && !showFallback && (
                        <div
                            style={{
                                position: "absolute",
                                top: "40px",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "#f9f9f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                color: "#666",
                                fontFamily: "system-ui, sans-serif",
                            }}
                        >
                            Loading {title}...
                        </div>
                    )}

                    {/* Fallback content */}
                    {showFallback && (
                        <div
                            style={{
                                position: "absolute",
                                top: "40px",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                color: "#333",
                                fontFamily: "system-ui, sans-serif",
                                flexDirection: "column",
                                gap: "16px",
                                padding: "20px",
                                textAlign: "center",
                            }}
                        >
                            {fallbackImage && (
                                <img
                                    src={fallbackImage}
                                    alt={title}
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "60%",
                                        objectFit: "contain",
                                        borderRadius: "8px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    }}
                                />
                            )}
                            <div>
                                <h3
                                    style={{
                                        margin: "0 0 8px 0",
                                        fontSize: "18px",
                                        fontWeight: "600",
                                    }}
                                >
                                    {title}
                                </h3>
                                {description && (
                                    <p
                                        style={{
                                            margin: "0 0 16px 0",
                                            fontSize: "14px",
                                            color: "#666",
                                            lineHeight: "1.4",
                                        }}
                                    >
                                        {description}
                                    </p>
                                )}
                                <button
                                    onClick={openInNewTab}
                                    style={{
                                        backgroundColor: "#007bff",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 16px",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        fontWeight: "500",
                                    }}
                                >
                                    Visit {title} →
                                </button>
                            </div>
                            {error && (
                                <div
                                    style={{
                                        fontSize: "12px",
                                        color: "#666",
                                        marginTop: "8px",
                                    }}
                                >
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Iframe for web content */}
                    {!showFallback && (
                        <iframe
                            src={url}
                            style={{
                                width: "100%",
                                height: "calc(100% - 40px)",
                                border: "none",
                                backgroundColor: "#ffffff",
                                display:
                                    error && !showFallback ? "none" : "block",
                            }}
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            title={title}
                        />
                    )}
                </div>
            </Html>
        </group>
    );
};
