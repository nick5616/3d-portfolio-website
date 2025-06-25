import React, { useRef, useState, useEffect, useCallback } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useDisplayManager } from "../../stores/displayManager";

export interface Web3DDisplayProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    url: string;
    title?: string;
    width?: number;
    height?: number;
    screenshotUrl?: string;
    description?: string;
    responsive?: {
        desktop: { width: number; height: number };
        mobile: { width: number; height: number };
    };
}

export const Web3DDisplay: React.FC<Web3DDisplayProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    url,
    title = "Web Display",
    width = 900,
    height = 700,
    screenshotUrl,
    description,
    responsive,
}) => {
    const displayRef = useRef<THREE.Group>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { isMobile } = useDeviceDetection();
    const { registerDisplay, unregisterDisplay, updateDisplayActivity, isDisplayActive } = useDisplayManager();
    
    // Generate unique ID for this display based on position and title
    const displayId = `display-${position.join('-')}-${title?.replace(/\s+/g, '-').toLowerCase()}`;
    
    // Original working states - iframe loads immediately like before
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);
    
    // New screenshot overlay state (doesn't interfere with iframe)
    const [showScreenshotOverlay, setShowScreenshotOverlay] = useState(!!screenshotUrl); // Show overlay if screenshot exists
    const [screenshotLoaded, setScreenshotLoaded] = useState(false);

    // Calculate responsive dimensions
    const dimensions = responsive 
        ? (isMobile ? responsive.mobile : responsive.desktop)
        : { width, height };

    const displayWidth = dimensions.width;
    const displayHeight = dimensions.height;

    // Eviction callback that forces display back to screenshot mode
    const handleEviction = useCallback(() => {
        setShowScreenshotOverlay(true);
    }, [title]);

    // Original working iframe handlers
    const handleIframeLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setError("Failed to load website");
        setShowFallback(true);
    };

    // Updated handler for viewing in display with display manager integration
    const handleViewInDisplay = useCallback(() => {
        // Register with display manager (this may evict another display)
        registerDisplay(displayId, title, handleEviction);
        
        // Hide screenshot overlay to reveal iframe
        setShowScreenshotOverlay(false);
    }, [displayId, title, registerDisplay, handleEviction]);

    const handleOpenInNewTab = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    // Handle iframe interaction to update activity
    const handleIframeInteraction = useCallback(() => {
        if (!showScreenshotOverlay && isDisplayActive(displayId)) {
            updateDisplayActivity(displayId);
        }
    }, [showScreenshotOverlay, displayId, isDisplayActive, updateDisplayActivity]);

    // Handle returning to screenshot mode
    const handleReturnToScreenshot = useCallback(() => {
        setShowScreenshotOverlay(true);
        unregisterDisplay(displayId);
    }, [displayId, title, unregisterDisplay]);

    // Original working timeout logic
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

    // Cleanup: unregister display when component unmounts
    useEffect(() => {
        return () => {
            unregisterDisplay(displayId);
        };
    }, [displayId, unregisterDisplay]);

    return (
        <group
            ref={displayRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {/* Physical display frame - responsive sizing */}
            <mesh>
                <boxGeometry args={[
                    (displayWidth / 400) + 0.4,
                    (displayHeight / 400) + 0.3,
                    0.1
                ]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.5}
                    roughness={0.2}
                />
            </mesh>

            {/* Screen bezel - responsive sizing */}
            <mesh position={[0, 0, 0.05]}>
                <boxGeometry args={[
                    (displayWidth / 400) + 0.3,
                    (displayHeight / 400) + 0.2,
                    0.02
                ]} />
                <meshStandardMaterial
                    color="#000000"
                    metalness={0.8}
                    roughness={0.1}
                />
            </mesh>

            {/* Stand - responsive sizing */}
            <mesh position={[0, -((displayHeight / 400) + 0.3) / 2 - 0.4, 0.2]} rotation={[-Math.PI / 6, 0, 0]}>
                <boxGeometry args={[0.4, 0.8, 0.05]} />
                <meshStandardMaterial color="#2c2c2c" metalness={0.6} />
            </mesh>

            {/* Base - responsive sizing */}
            <mesh position={[0, -((displayHeight / 400) + 0.3) / 2 - 0.7, 0.4]}>
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
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
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
                            fontSize: displayWidth > 400 ? "14px" : "12px",
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
                                fontSize: displayWidth > 400 ? "12px" : "10px",
                                color: "#666",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {url}
                        </div>
                        
                        {/* Back to screenshot button when live display is active */}
                        {!showScreenshotOverlay && (
                            <button
                                onClick={handleReturnToScreenshot}
                                style={{
                                    marginLeft: "8px",
                                    backgroundColor: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    cursor: "pointer",
                                    fontWeight: "500",
                                }}
                                title="Return to screenshot mode"
                            >
                                📷
                            </button>
                        )}
                    </div>

                    {/* Loading overlay (original working version) */}
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
                                fontSize: displayWidth > 400 ? "16px" : "14px",
                                color: "#666",
                                fontFamily: "system-ui, sans-serif",
                            }}
                        >
                            Loading {title}...
                        </div>
                    )}

                    {/* Fallback content (original working version) */}
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
                                fontSize: displayWidth > 400 ? "16px" : "14px",
                                color: "#333",
                                fontFamily: "system-ui, sans-serif",
                                flexDirection: "column",
                                gap: "16px",
                                padding: "20px",
                                textAlign: "center",
                            }}
                        >
                            {screenshotUrl && (
                                <img
                                    src={screenshotUrl}
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
                                        fontSize: displayWidth > 400 ? "18px" : "16px",
                                        fontWeight: "600",
                                    }}
                                >
                                    {title}
                                </h3>
                                {description && (
                                    <p
                                        style={{
                                            margin: "0 0 16px 0",
                                            fontSize: displayWidth > 400 ? "14px" : "12px",
                                            color: "#666",
                                            lineHeight: "1.4",
                                        }}
                                    >
                                        {description}
                                    </p>
                                )}
                                <button
                                    onClick={handleOpenInNewTab}
                                    style={{
                                        backgroundColor: "#007bff",
                                        color: "white",
                                        border: "none",
                                        padding: displayWidth > 400 ? "10px 18px" : "8px 14px",
                                        borderRadius: "6px",
                                        fontSize: displayWidth > 400 ? "14px" : "12px",
                                        cursor: "pointer",
                                        fontWeight: "500",
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = "#0056b3";
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = "#007bff";
                                    }}
                                >
                                    Visit {title} →
                                </button>
                            </div>
                            {error && (
                                <div
                                    style={{
                                        fontSize: displayWidth > 400 ? "12px" : "10px",
                                        color: "#666",
                                        marginTop: "8px",
                                    }}
                                >
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Screenshot overlay (shows on top when available) */}
                    {showScreenshotOverlay && screenshotUrl && (
                        <div
                            style={{
                                position: "absolute",
                                top: "40px",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "#ffffff",
                                display: "flex",
                                flexDirection: "column",
                                zIndex: 10, // Above iframe
                            }}
                        >
                            <img
                                src={screenshotUrl}
                                alt={title}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: screenshotLoaded ? "block" : "none",
                                }}
                                onLoad={() => setScreenshotLoaded(true)}
                                onError={() => setScreenshotLoaded(true)}
                            />
                            
                            {/* Loading placeholder for screenshot */}
                            {!screenshotLoaded && (
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        backgroundColor: "#f0f0f0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: displayWidth > 400 ? "16px" : "14px",
                                        color: "#666",
                                        fontFamily: "system-ui, sans-serif",
                                    }}
                                >
                                    Loading preview...
                                </div>
                            )}

                            {/* Control overlay with buttons */}
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "10px",
                                    left: "10px",
                                    right: "10px",
                                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                                    color: "white",
                                    padding: displayWidth > 400 ? "16px" : "12px",
                                    borderRadius: "12px",
                                    textAlign: "center",
                                    fontFamily: "system-ui, sans-serif",
                                }}
                            >
                                <div 
                                    style={{ 
                                        fontWeight: "600", 
                                        marginBottom: "8px",
                                        fontSize: displayWidth > 400 ? "16px" : "14px",
                                    }}
                                >
                                    {title}
                                </div>
                                {description && (
                                    <div 
                                        style={{ 
                                            fontSize: displayWidth > 400 ? "13px" : "11px", 
                                            opacity: 0.8,
                                            marginBottom: "12px",
                                            lineHeight: "1.3"
                                        }}
                                    >
                                        {description}
                                    </div>
                                )}
                                
                                {/* Button container */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        justifyContent: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {/* View in Display button */}
                                    <button
                                        onClick={handleViewInDisplay}
                                        style={{
                                            backgroundColor: "#28a745",
                                            color: "white",
                                            border: "none",
                                            padding: displayWidth > 400 ? "10px 16px" : "8px 12px",
                                            borderRadius: "6px",
                                            fontSize: displayWidth > 400 ? "13px" : "11px",
                                            cursor: "pointer",
                                            fontWeight: "500",
                                            transition: "background-color 0.2s",
                                            minWidth: displayWidth > 400 ? "120px" : "100px",
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = "#218838";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = "#28a745";
                                        }}
                                    >
                                        📺 View in Display
                                    </button>
                                    
                                    {/* Open in New Tab button */}
                                    <button
                                        onClick={handleOpenInNewTab}
                                        style={{
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            border: "none",
                                            padding: displayWidth > 400 ? "10px 16px" : "8px 12px",
                                            borderRadius: "6px",
                                            fontSize: displayWidth > 400 ? "13px" : "11px",
                                            cursor: "pointer",
                                            fontWeight: "500",
                                            transition: "background-color 0.2s",
                                            minWidth: displayWidth > 400 ? "120px" : "100px",
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = "#0056b3";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = "#007bff";
                                        }}
                                    >
                                        🔗 Open in Tab
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Iframe for web content (original working version - loads immediately) */}
                    {!showFallback && (
                        <iframe
                            ref={iframeRef}
                            src={url}
                            style={{
                                width: "100%",
                                height: "calc(100% - 40px)",
                                border: "none",
                                backgroundColor: "#ffffff",
                                display: error && !showFallback ? "none" : "block",
                            }}
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            onMouseEnter={handleIframeInteraction}
                            onFocus={handleIframeInteraction}
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
