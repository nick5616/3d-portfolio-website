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
    const {
        registerDisplay,
        unregisterDisplay,
        updateDisplayActivity,
        isDisplayActive,
    } = useDisplayManager();

    // Generate unique ID for this display based on position and title
    const displayId = `display-${position.join("-")}-${title
        ?.replace(/\s+/g, "-")
        .toLowerCase()}`;

    // Iframe loading states
    const [isLoading, setIsLoading] = useState(false); // Start as false since iframe doesn't load until clicked
    const [error, setError] = useState<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null); // Only set when user clicks "View in Display"

    // Screenshot overlay state
    const [showScreenshotOverlay, setShowScreenshotOverlay] = useState(
        !!screenshotUrl
    ); // Show overlay if screenshot exists
    const [screenshotLoaded, setScreenshotLoaded] = useState(false);

    // Calculate responsive dimensions - ALWAYS use desktop dimensions
    const dimensions = responsive
        ? responsive.desktop // Always use desktop dimensions for consistent display sizes
        : { width, height };

    const displayWidth = dimensions.width;
    const displayHeight = dimensions.height;

    // Determine if this display should look like a mobile device
    const isMobileDisplay =
        title?.toLowerCase().includes("mobile") || displayWidth <= 400; // Consider narrow displays as mobile

    // Real-time clock for mobile displays
    const [currentTime, setCurrentTime] = useState(
        new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
        })
    );

    // State to track if screenshot appears light (for dynamic contrast)
    const [isLightScreenshot, setIsLightScreenshot] = useState(false);

    // Update time every minute for mobile displays
    useEffect(() => {
        if (!isMobileDisplay) return;

        const updateTime = () => {
            setCurrentTime(
                new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: false,
                })
            );
        };

        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [isMobileDisplay]);

    // Eviction callback that forces display back to screenshot mode
    const handleEviction = useCallback(() => {
        setShowScreenshotOverlay(true);
        // CRITICAL FIX: Actually unload the iframe to prevent performance issues
        setIframeUrl(null);
        setIsLoading(false);
        setError(null);
        setShowFallback(false);
        console.log(`🔄 Display evicted and iframe unloaded: ${title}`);
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

        // Start loading iframe content for the first time
        if (!iframeUrl) {
            setIframeUrl(url);
            setIsLoading(true);
            setError(null);
            setShowFallback(false);
        }

        // Hide screenshot overlay to reveal iframe
        setShowScreenshotOverlay(false);

        console.log(`📺 Viewing ${title} in display`);
    }, [displayId, title, registerDisplay, handleEviction, iframeUrl, url]);

    const handleOpenInNewTab = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    // Handle iframe interaction to update activity
    const handleIframeInteraction = useCallback(() => {
        if (!showScreenshotOverlay && isDisplayActive(displayId)) {
            updateDisplayActivity(displayId);
        }
    }, [
        showScreenshotOverlay,
        displayId,
        isDisplayActive,
        updateDisplayActivity,
    ]);

    // Handle returning to screenshot mode
    const handleReturnToScreenshot = useCallback(() => {
        setShowScreenshotOverlay(true);
        // CRITICAL FIX: Actually unload the iframe to prevent performance issues
        setIframeUrl(null);
        setIsLoading(false);
        setError(null);
        setShowFallback(false);
        unregisterDisplay(displayId);
        console.log(
            `📷 Returned to screenshot mode and iframe unloaded: ${title}`
        );
    }, [displayId, title, unregisterDisplay]);

    // Timeout logic - only runs when iframe is actually loading
    useEffect(() => {
        if (!isLoading || !iframeUrl) return;

        const timer = setTimeout(() => {
            if (isLoading) {
                setError("Website may not allow embedding");
                setShowFallback(true);
                setIsLoading(false);
            }
        }, 10000); // 10 second timeout

        return () => clearTimeout(timer);
    }, [isLoading, iframeUrl]);

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
            {/* Physical display frame - minimal bezel for flush look */}
            <mesh>
                <boxGeometry
                    args={[
                        displayWidth / 400 + (isMobileDisplay ? 0.05 : 0.1), // Ultra-thin frame for mobile
                        displayHeight / 400 + (isMobileDisplay ? 0.05 : 0.1),
                        0.02, // Much thinner depth
                    ]}
                />
                <meshStandardMaterial
                    color={isMobileDisplay ? "#2c2c2c" : "#1a1a1a"}
                    metalness={isMobileDisplay ? 0.8 : 0.5}
                    roughness={isMobileDisplay ? 0.1 : 0.2}
                />
            </mesh>

            {/* Stand - adjusted for thinner display frame */}
            <mesh
                position={[
                    0,
                    -(displayHeight / 400 + (isMobileDisplay ? 0.05 : 0.1)) /
                        2 -
                        0.15,
                    0.15,
                ]}
                rotation={[-Math.PI / 6, 0, 0]}
            >
                <boxGeometry args={[0.4, 1.2, 0.05]} />{" "}
                {/* Made taller to reach thinner frame */}
                <meshStandardMaterial color="#2c2c2c" metalness={0.6} />
            </mesh>

            {/* Base - adjusted positioning */}
            <mesh
                position={[
                    0,
                    -(displayHeight / 400 + (isMobileDisplay ? 0.05 : 0.1)) /
                        2 -
                        0.8,
                    0.4,
                ]}
            >
                <boxGeometry args={[0.6, 0.1, 0.4]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
            </mesh>

            {/* Web content using Html component */}
            <Html
                transform
                occlude
                position={[0, 0, 0.015]} // Much closer to frame for flush look
                distanceFactor={1}
                style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    borderRadius: isMobileDisplay ? "12px" : "4px", // More rounded corners for mobile
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    border: "none", // Remove border for flush display
                    boxShadow: isMobileDisplay
                        ? "0 8px 24px rgba(0,0,0,0.4)" // Deeper shadow for mobile
                        : "0 4px 12px rgba(0,0,0,0.2)", // Subtle shadow for desktop
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
                            height: isMobileDisplay ? "44px" : "40px", // Taller for mobile
                            backgroundColor: isMobileDisplay
                                ? "#000000"
                                : "#f5f5f5",
                            borderBottom: isMobileDisplay
                                ? "none"
                                : "1px solid #ddd",
                            display: "flex",
                            alignItems: "center",
                            padding: isMobileDisplay ? "0 16px" : "0 12px",
                            fontSize: isMobileDisplay
                                ? "13px"
                                : displayWidth > 400
                                ? "14px"
                                : "12px",
                            fontFamily: "system-ui, sans-serif",
                            borderTopLeftRadius: isMobileDisplay
                                ? "12px"
                                : "4px",
                            borderTopRightRadius: isMobileDisplay
                                ? "12px"
                                : "4px",
                        }}
                    >
                        {/* Desktop browser controls */}
                        {!isMobileDisplay && (
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
                        )}

                        {/* Mobile status bar */}
                        {isMobileDisplay && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}
                            >
                                <div>{currentTime}</div>
                                <div
                                    style={{
                                        fontSize: "12px",
                                        opacity: 0.8,
                                        textAlign: "center",
                                        flex: 1,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        margin: "0 12px",
                                    }}
                                >
                                    {new URL(url).hostname}
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "2px",
                                        alignItems: "center",
                                    }}
                                >
                                    <div style={{ fontSize: "12px" }}>●●●</div>
                                    <div style={{ fontSize: "12px" }}>📶</div>
                                    <div style={{ fontSize: "12px" }}>🔋</div>
                                </div>
                            </div>
                        )}

                        {/* Desktop URL bar */}
                        {!isMobileDisplay && (
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: "#ffffff",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    border: "1px solid #ddd",
                                    fontSize:
                                        displayWidth > 400 ? "12px" : "10px",
                                    color: "#666",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    minWidth: 0, // Allow shrinking
                                }}
                                title={url} // Show full URL on hover
                            >
                                {url}
                            </div>
                        )}

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
                                top: isMobileDisplay ? "44px" : "40px",
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
                                top: isMobileDisplay ? "44px" : "40px",
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
                                        fontSize:
                                            displayWidth > 400
                                                ? "18px"
                                                : "16px",
                                        fontWeight: "600",
                                    }}
                                >
                                    {title}
                                </h3>
                                {description && (
                                    <p
                                        style={{
                                            margin: "0 0 16px 0",
                                            fontSize:
                                                displayWidth > 400
                                                    ? "14px"
                                                    : "12px",
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
                                        padding:
                                            displayWidth > 400
                                                ? "10px 18px"
                                                : "8px 14px",
                                        borderRadius: "6px",
                                        fontSize:
                                            displayWidth > 400
                                                ? "14px"
                                                : "12px",
                                        cursor: "pointer",
                                        fontWeight: "500",
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "#0056b3";
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "#007bff";
                                    }}
                                >
                                    Visit {title} →
                                </button>
                            </div>
                            {error && (
                                <div
                                    style={{
                                        fontSize:
                                            displayWidth > 400
                                                ? "12px"
                                                : "10px",
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
                                top: isMobileDisplay ? "44px" : "40px",
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
                                    display: screenshotLoaded
                                        ? "block"
                                        : "none",
                                }}
                                onLoad={(e) => {
                                    setScreenshotLoaded(true);
                                    // Analyze image brightness for dynamic contrast
                                    const img = e.target as HTMLImageElement;
                                    const canvas =
                                        document.createElement("canvas");
                                    const ctx = canvas.getContext("2d");
                                    if (ctx) {
                                        canvas.width = img.naturalWidth;
                                        canvas.height = img.naturalHeight;
                                        ctx.drawImage(img, 0, 0);

                                        // Sample pixels to determine brightness
                                        const imageData = ctx.getImageData(
                                            0,
                                            0,
                                            canvas.width,
                                            canvas.height
                                        );
                                        const data = imageData.data;
                                        let brightness = 0;

                                        for (
                                            let i = 0;
                                            i < data.length;
                                            i += 4
                                        ) {
                                            const r = data[i];
                                            const g = data[i + 1];
                                            const b = data[i + 2];
                                            brightness += (r + g + b) / 3;
                                        }

                                        const avgBrightness =
                                            brightness / (data.length / 4);
                                        setIsLightScreenshot(
                                            avgBrightness > 180
                                        ); // Threshold for "light" images
                                    }
                                }}
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
                                        fontSize:
                                            displayWidth > 400
                                                ? "16px"
                                                : "14px",
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
                                    backgroundColor: isLightScreenshot
                                        ? "rgba(0, 0, 0, 0.4)" // Dark background for light screenshots
                                        : "rgba(255, 255, 255, 0.15)", // Light background for dark screenshots
                                    color: "white",
                                    padding:
                                        displayWidth > 400 ? "16px" : "12px",
                                    borderRadius: "12px",
                                    textAlign: "center",
                                    fontFamily: "system-ui, sans-serif",
                                    backdropFilter: "blur(20px)", // Strong blur for glass effect
                                    border: isLightScreenshot
                                        ? "1px solid rgba(0, 0, 0, 0.3)" // Dark border for light screenshots
                                        : "1px solid rgba(255, 255, 255, 0.2)", // Light border for dark screenshots
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: "600",
                                        marginBottom: "8px",
                                        fontSize:
                                            displayWidth > 400
                                                ? "16px"
                                                : "14px",
                                    }}
                                >
                                    {title}
                                </div>
                                {description && (
                                    <div
                                        style={{
                                            fontSize:
                                                displayWidth > 400
                                                    ? "13px"
                                                    : "11px",
                                            opacity: 0.8,
                                            marginBottom: "12px",
                                            lineHeight: "1.3",
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
                                            backgroundColor:
                                                "rgba(40, 167, 69, 0.15)", // Even more transparent green
                                            color: "white",
                                            border: "2px solid rgba(40, 167, 69, 0.6)",
                                            padding:
                                                displayWidth > 400
                                                    ? "10px 16px"
                                                    : "8px 12px",
                                            borderRadius: "8px",
                                            fontSize:
                                                displayWidth > 400
                                                    ? "13px"
                                                    : "11px",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                            transition: "all 0.3s ease",
                                            minWidth:
                                                displayWidth > 400
                                                    ? "120px"
                                                    : "100px",
                                            backdropFilter: "blur(10px)",
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "rgba(40, 167, 69, 0.3)";
                                            e.currentTarget.style.borderColor =
                                                "rgba(40, 167, 69, 0.9)";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "rgba(40, 167, 69, 0.15)";
                                            e.currentTarget.style.borderColor =
                                                "rgba(40, 167, 69, 0.6)";
                                        }}
                                    >
                                        📺{" "}
                                        {iframeUrl
                                            ? "Reload Display"
                                            : "View in Display"}
                                    </button>

                                    {/* Unload iframe button - only show if iframe is loaded but hidden */}
                                    {iframeUrl && showScreenshotOverlay && (
                                        <button
                                            onClick={handleReturnToScreenshot}
                                            style={{
                                                backgroundColor:
                                                    "rgba(255, 193, 7, 0.15)", // Yellow for unload action
                                                color: "white",
                                                border: "2px solid rgba(255, 193, 7, 0.6)",
                                                padding:
                                                    displayWidth > 400
                                                        ? "10px 16px"
                                                        : "8px 12px",
                                                borderRadius: "8px",
                                                fontSize:
                                                    displayWidth > 400
                                                        ? "13px"
                                                        : "11px",
                                                cursor: "pointer",
                                                fontWeight: "600",
                                                transition: "all 0.3s ease",
                                                minWidth:
                                                    displayWidth > 400
                                                        ? "120px"
                                                        : "100px",
                                                backdropFilter: "blur(10px)",
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    "rgba(255, 193, 7, 0.3)";
                                                e.currentTarget.style.borderColor =
                                                    "rgba(255, 193, 7, 0.9)";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    "rgba(255, 193, 7, 0.15)";
                                                e.currentTarget.style.borderColor =
                                                    "rgba(255, 193, 7, 0.6)";
                                            }}
                                        >
                                            🗑️ Unload Content
                                        </button>
                                    )}

                                    {/* Open in New Tab button */}
                                    <button
                                        onClick={handleOpenInNewTab}
                                        style={{
                                            backgroundColor:
                                                "rgba(0, 123, 255, 0.15)", // Even more transparent blue
                                            color: "white",
                                            border: "2px solid rgba(0, 123, 255, 0.6)",
                                            padding:
                                                displayWidth > 400
                                                    ? "10px 16px"
                                                    : "8px 12px",
                                            borderRadius: "8px",
                                            fontSize:
                                                displayWidth > 400
                                                    ? "13px"
                                                    : "11px",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                            transition: "all 0.3s ease",
                                            minWidth:
                                                displayWidth > 400
                                                    ? "120px"
                                                    : "100px",
                                            backdropFilter: "blur(10px)",
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "rgba(0, 123, 255, 0.3)";
                                            e.currentTarget.style.borderColor =
                                                "rgba(0, 123, 255, 0.9)";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "rgba(0, 123, 255, 0.15)";
                                            e.currentTarget.style.borderColor =
                                                "rgba(0, 123, 255, 0.6)";
                                        }}
                                    >
                                        🔗 Open in Tab
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placeholder when no iframe content has been loaded */}
                    {!showFallback && !iframeUrl && !showScreenshotOverlay && (
                        <div
                            style={{
                                position: "absolute",
                                top: isMobileDisplay ? "44px" : "40px",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "#f8f9fa",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: displayWidth > 400 ? "16px" : "14px",
                                color: "#666",
                                fontFamily: "system-ui, sans-serif",
                                flexDirection: "column",
                                gap: "12px",
                            }}
                        >
                            <div style={{ fontSize: "32px", opacity: 0.6 }}>
                                📺
                            </div>
                            <div>Click "View in Display" to load content</div>
                        </div>
                    )}

                    {/* Iframe for web content - only loads after "View in Display" is clicked */}
                    {!showFallback && iframeUrl && (
                        <iframe
                            ref={iframeRef}
                            src={iframeUrl}
                            style={{
                                width: "100%",
                                height: isMobileDisplay
                                    ? "calc(100% - 44px)"
                                    : "calc(100% - 40px)",
                                border: "none",
                                backgroundColor: "#ffffff",
                                display:
                                    error && !showFallback ? "none" : "block",
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
