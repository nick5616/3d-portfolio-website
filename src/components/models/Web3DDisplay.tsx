import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
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
    crtStyle?: boolean;
    lightColor?: string; // Hex color code for the omnidirectional point light
    responsive?: {
        desktop: { width: number; height: number };
        mobile: { width: number; height: number };
    };
}

interface CRTGlassPanelProps {
    displayWidth: number;
    displayHeight: number;
    isMobileDisplay: boolean;
    position: [number, number, number];
}

// Custom hook for proximity detection and timer
const useProximityDetection = (
    displayRef: React.RefObject<THREE.Group>,
    onProximityComplete: () => void
) => {
    const { camera } = useThree();
    const [isInProximity, setIsInProximity] = useState(false);
    const [proximityStartTime, setProximityStartTime] = useState<number | null>(
        null
    );
    const [isProximityLoading, setIsProximityLoading] = useState(false);
    const [showProximityOverlay, setShowProximityOverlay] = useState(false);
    const [timerProgress, setTimerProgress] = useState(0);

    const PROXIMITY_THRESHOLD = 3.0;
    const PROXIMITY_TIMER_DURATION = 4.0;

    useFrame((state) => {
        if (!displayRef.current || !camera) return;

        const displayPosition = new THREE.Vector3();
        displayRef.current.getWorldPosition(displayPosition);

        const cameraPosition = camera.position;
        const distance = displayPosition.distanceTo(cameraPosition);

        const wasInProximity = isInProximity;
        const nowInProximity = distance <= PROXIMITY_THRESHOLD;

        setIsInProximity(nowInProximity);

        // Start timer when entering proximity
        if (!wasInProximity && nowInProximity) {
            setProximityStartTime(state.clock.elapsedTime);
            setShowProximityOverlay(true);
            setIsProximityLoading(true);
        }

        // Reset when leaving proximity
        if (wasInProximity && !nowInProximity) {
            setProximityStartTime(null);
            setShowProximityOverlay(false);
            setIsProximityLoading(false);
        }

        // Timer logic
        if (
            isInProximity &&
            isProximityLoading &&
            proximityStartTime !== null
        ) {
            const elapsed = state.clock.elapsedTime - proximityStartTime;
            const progress = Math.min(elapsed / PROXIMITY_TIMER_DURATION, 1.0);
            setTimerProgress(progress);

            if (elapsed >= PROXIMITY_TIMER_DURATION) {
                onProximityComplete();
            }
        } else {
            setTimerProgress(0);
        }
    });

    const cancelProximity = useCallback(() => {
        setProximityStartTime(null);
        setShowProximityOverlay(false);
        setIsProximityLoading(false);
    }, []);

    const resetProximity = useCallback(() => {
        setProximityStartTime(null);
        setShowProximityOverlay(false);
        setIsProximityLoading(false);
        setTimerProgress(0);
    }, []);

    return {
        isInProximity,
        showProximityOverlay,
        timerProgress,
        cancelProximity,
        resetProximity,
    };
};

// Custom hook for iframe management
const useIframeManager = (url: string, title: string) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const handleIframeLoad = useCallback(() => {
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsLoading(false);
        setError(null);
        setShowFallback(false);
    }, [timeoutId]);

    const handleIframeError = useCallback(() => {
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsLoading(false);
        setError("Failed to load website");
        setShowFallback(true);
    }, [timeoutId]);

    const startLoading = useCallback(() => {
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        setIframeUrl(url);
        setIsLoading(true);
        setError(null);
        setShowFallback(false);

        // Set new timeout
        const newTimeoutId = setTimeout(() => {
            console.log(`⏰ Timeout reached for ${title}`);
            setError("Website may not allow embedding");
            setShowFallback(true);
            setIsLoading(false);
            setTimeoutId(null);
        }, 15000); // Increased to 15 seconds for better reliability

        setTimeoutId(newTimeoutId);
    }, [url, timeoutId, title]);

    const unloadIframe = useCallback(() => {
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIframeUrl(null);
        setIsLoading(false);
        setError(null);
        setShowFallback(false);
    }, [timeoutId]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    const retryLoading = useCallback(() => {
        console.log(`🔄 Retrying load for ${title}`);
        startLoading();
    }, [startLoading, title]);

    return {
        isLoading,
        error,
        showFallback,
        iframeUrl,
        handleIframeLoad,
        handleIframeError,
        startLoading,
        unloadIframe,
        retryLoading,
    };
};

// Component for display header
const DisplayHeader: React.FC<{
    isMobileDisplay: boolean;
    displayWidth: number;
    url: string;
    currentTime: string;
    showScreenshotOverlay: boolean;
    showProximityOverlay: boolean;
    onReturnToScreenshot: () => void;
}> = ({
    isMobileDisplay,
    displayWidth,
    url,
    currentTime,
    showScreenshotOverlay,
    showProximityOverlay,
    onReturnToScreenshot,
}) => (
    <div
        style={{
            height: isMobileDisplay ? "44px" : "40px",
            backgroundColor: isMobileDisplay ? "#000000" : "#f5f5f5",
            borderBottom: isMobileDisplay ? "none" : "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            padding: isMobileDisplay ? "0 16px" : "0 12px",
            fontSize: isMobileDisplay
                ? "13px"
                : displayWidth > 400
                ? "14px"
                : "12px",
            fontFamily: "system-ui, sans-serif",
            borderTopLeftRadius: isMobileDisplay ? "12px" : "4px",
            borderTopRightRadius: isMobileDisplay ? "12px" : "4px",
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
                    fontSize: displayWidth > 400 ? "12px" : "10px",
                    color: "#666",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                }}
                title={url}
            >
                {url}
            </div>
        )}

        {/* Back to screenshot button when live display is active */}
        {!showScreenshotOverlay && !showProximityOverlay && (
            <button
                onClick={onReturnToScreenshot}
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
);

// Component for proximity loading overlay
const ProximityLoadingOverlay: React.FC<{
    isMobileDisplay: boolean;
    displayWidth: number;
    title: string;
    timerProgress: number;
    onCancel: () => void;
}> = ({ isMobileDisplay, displayWidth, title, timerProgress, onCancel }) => (
    <div
        style={{
            position: "absolute",
            top: isMobileDisplay ? "44px" : "40px",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            backdropFilter: "blur(10px)",
        }}
    >
        <div
            style={{
                textAlign: "center",
                color: "white",
                fontFamily: "system-ui, sans-serif",
                padding: "20px",
                maxWidth: "80%",
            }}
        >
            {/* Progress bar */}
            <div
                style={{
                    width: "100%",
                    height: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderRadius: "2px",
                    marginBottom: "20px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${timerProgress * 100}%`,
                        height: "100%",
                        backgroundColor: "#007bff",
                        transition: "width 0.1s ease",
                    }}
                />
            </div>

            {/* Loading message */}
            <div
                style={{
                    fontSize: displayWidth > 400 ? "18px" : "16px",
                    fontWeight: "600",
                    marginBottom: "12px",
                }}
            >
                Loading {title}...
            </div>

            <div
                style={{
                    fontSize: displayWidth > 400 ? "14px" : "12px",
                    opacity: 0.8,
                    marginBottom: "20px",
                    lineHeight: "1.4",
                }}
            >
                Walk away if you don't want this
            </div>

            {/* Cancel button */}
            <button
                onClick={onCancel}
                style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: displayWidth > 400 ? "14px" : "12px",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.2)";
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.1)";
                }}
            >
                Cancel
            </button>
        </div>
    </div>
);

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
    crtStyle = false,
    lightColor = "#ffffff",
    responsive,
}) => {
    const displayRef = useRef<THREE.Group>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const hologramFrameRef = useRef<THREE.Group>(null);
    const scanLineRef = useRef<THREE.Mesh>(null);
    const { isMobile } = useDeviceDetection();

    // Generate unique ID for this display based on position and title
    const displayId = `display-${position.join("-")}-${title
        ?.replace(/\s+/g, "-")
        .toLowerCase()}`;

    // Calculate responsive dimensions
    const dimensions = responsive ? responsive.desktop : { width, height };
    const displayWidth = dimensions.width;
    const displayHeight = dimensions.height;
    const isMobileDisplay =
        title?.toLowerCase().includes("mobile") || displayWidth <= 400;

    // Real-time clock for mobile displays
    const [currentTime, setCurrentTime] = useState(
        new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
        })
    );

    // Screenshot overlay state
    const [showScreenshotOverlay, setShowScreenshotOverlay] = useState(
        !!screenshotUrl
    );
    const [screenshotLoaded, setScreenshotLoaded] = useState(false);
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

        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [isMobileDisplay]);

    // Custom hooks
    const iframeManager = useIframeManager(url, title);

    // Create a ref to store the proximity detection reset function
    const proximityResetRef = useRef<(() => void) | null>(null);

    const handleProximityComplete = useCallback(() => {
        const { registerDisplay } = useDisplayManager.getState();
        registerDisplay(displayId, title, handleEviction);
        iframeManager.startLoading();
        setShowScreenshotOverlay(false);
        // Call the reset function if it exists
        if (proximityResetRef.current) {
            proximityResetRef.current();
        }
        console.log(`📺 Proximity loading ${title} in display`);
    }, [displayId, title, iframeManager]);

    const proximityDetection = useProximityDetection(
        displayRef,
        handleProximityComplete
    );

    // Store the reset function in the ref
    useEffect(() => {
        proximityResetRef.current = proximityDetection.resetProximity;
    }, [proximityDetection.resetProximity]);

    // Eviction callback
    const handleEviction = useCallback(() => {
        setShowScreenshotOverlay(true);
        iframeManager.unloadIframe();
        proximityDetection.resetProximity();
        console.log(`🔄 Display evicted and iframe unloaded: ${title}`);
    }, [title, iframeManager, proximityDetection]);

    // Manual view in display handler
    const handleViewInDisplay = useCallback(() => {
        const { registerDisplay } = useDisplayManager.getState();
        registerDisplay(displayId, title, handleEviction);

        if (!iframeManager.iframeUrl) {
            iframeManager.startLoading();
        }
        setShowScreenshotOverlay(false);
        console.log(`📺 Viewing ${title} in display`);
    }, [displayId, title, handleEviction, iframeManager]);

    const handleOpenInNewTab = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleReturnToScreenshot = useCallback(() => {
        setShowScreenshotOverlay(true);
        iframeManager.unloadIframe();
    }, [iframeManager]);

    // Holographic animation loop for Nicolas display
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;

        if (scanLineRef.current) {
            scanLineRef.current.position.y =
                Math.sin(elapsed * 3) * (displayHeight / 400) * 0.3;
            (
                scanLineRef.current.material as THREE.MeshStandardMaterial
            ).emissiveIntensity = 0.3 + Math.sin(elapsed * 5) * 0.2;
        }

        if (hologramFrameRef.current) {
            hologramFrameRef.current.children.forEach((child, i) => {
                if (child instanceof THREE.Mesh) {
                    (
                        child.material as THREE.MeshStandardMaterial
                    ).emissiveIntensity = 0.8 + Math.sin(elapsed * 2 + i) * 0.3;
                }
            });
        }
    });

    return (
        <group
            ref={displayRef}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {/* Physical display frame - only for non-CRT displays */}
            {!crtStyle && (
                <mesh>
                    <boxGeometry
                        args={[
                            displayWidth / 400 + (isMobileDisplay ? 0.05 : 0.1),
                            displayHeight / 400 +
                                (isMobileDisplay ? 0.05 : 0.1),
                            0.02,
                        ]}
                    />
                    <meshStandardMaterial
                        color={isMobileDisplay ? "#2c2c2c" : "#1a1a1a"}
                        metalness={isMobileDisplay ? 0.8 : 0.5}
                        roughness={isMobileDisplay ? 0.1 : 0.2}
                    />
                </mesh>
            )}

            {/* Web content using Html component */}
            <Html
                transform
                position={[0, 0, 0.015]}
                distanceFactor={1}
                style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    borderRadius: isMobileDisplay ? "12px" : "4px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    border: "none",
                    boxShadow: isMobileDisplay
                        ? "0 8px 24px rgba(0,0,0,0.4)"
                        : "0 4px 12px rgba(0,0,0,0.2)",
                    ...(crtStyle && {
                        filter: "brightness(0.95) contrast(1.1) blur(0.3px)",
                        transform: "perspective(1000px) rotateX(0.5deg)",
                        background: `
                            radial-gradient(ellipse at center, 
                                transparent 0%, 
                                transparent 85%, 
                                rgba(0,0,0,0.1) 100%
                            )
                        `,
                        backgroundBlendMode: "multiply",
                    }),
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
                    <DisplayHeader
                        isMobileDisplay={isMobileDisplay}
                        displayWidth={displayWidth}
                        url={url}
                        currentTime={currentTime}
                        showScreenshotOverlay={showScreenshotOverlay}
                        showProximityOverlay={
                            proximityDetection.showProximityOverlay
                        }
                        onReturnToScreenshot={handleReturnToScreenshot}
                    />

                    {/* Loading overlay */}
                    {iframeManager.isLoading && !iframeManager.showFallback && (
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

                    {/* Fallback content */}
                    {iframeManager.showFallback && (
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
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        flexWrap: "wrap",
                                        justifyContent: "center",
                                    }}
                                >
                                    <button
                                        onClick={iframeManager.retryLoading}
                                        style={{
                                            backgroundColor: "#28a745",
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
                                                "#218838";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "#28a745";
                                        }}
                                    >
                                        🔄 Retry
                                    </button>
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
                            </div>
                            {iframeManager.error && (
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
                                    {iframeManager.error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Screenshot overlay */}
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
                                zIndex: 10,
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
                                    const img = e.target as HTMLImageElement;
                                    const canvas =
                                        document.createElement("canvas");
                                    const ctx = canvas.getContext("2d");
                                    if (ctx) {
                                        canvas.width = img.naturalWidth;
                                        canvas.height = img.naturalHeight;
                                        ctx.drawImage(img, 0, 0);

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
                                        );
                                    }
                                }}
                                onError={() => setScreenshotLoaded(true)}
                            />

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
                                        ? "rgba(0, 0, 0, 0.4)"
                                        : "rgba(255, 255, 255, 0.15)",
                                    color: "white",
                                    padding:
                                        displayWidth > 400 ? "16px" : "12px",
                                    borderRadius: "12px",
                                    textAlign: "center",
                                    fontFamily: "system-ui, sans-serif",
                                    backdropFilter: "blur(20px)",
                                    border: isLightScreenshot
                                        ? "1px solid rgba(0, 0, 0, 0.3)"
                                        : "1px solid rgba(255, 255, 255, 0.2)",
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

                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        justifyContent: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <button
                                        onClick={handleViewInDisplay}
                                        style={{
                                            backgroundColor:
                                                "rgba(40, 167, 69, 0.15)",
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
                                        {iframeManager.iframeUrl
                                            ? "Reload Display"
                                            : "View in Display"}
                                    </button>

                                    {iframeManager.iframeUrl &&
                                        showScreenshotOverlay && (
                                            <button
                                                onClick={
                                                    handleReturnToScreenshot
                                                }
                                                style={{
                                                    backgroundColor:
                                                        "rgba(255, 193, 7, 0.15)",
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
                                                    backdropFilter:
                                                        "blur(10px)",
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

                                    <button
                                        onClick={handleOpenInNewTab}
                                        style={{
                                            backgroundColor:
                                                "rgba(0, 123, 255, 0.15)",
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

                    {/* Proximity loading overlay */}
                    {proximityDetection.showProximityOverlay && (
                        <ProximityLoadingOverlay
                            isMobileDisplay={isMobileDisplay}
                            displayWidth={displayWidth}
                            title={title}
                            timerProgress={proximityDetection.timerProgress}
                            onCancel={proximityDetection.cancelProximity}
                        />
                    )}

                    {/* Placeholder when no iframe content has been loaded */}
                    {!iframeManager.showFallback &&
                        !iframeManager.iframeUrl &&
                        !showScreenshotOverlay &&
                        !proximityDetection.showProximityOverlay && (
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
                                    fontSize:
                                        displayWidth > 400 ? "16px" : "14px",
                                    color: "#666",
                                    fontFamily: "system-ui, sans-serif",
                                    flexDirection: "column",
                                    gap: "12px",
                                }}
                            >
                                <div style={{ fontSize: "32px", opacity: 0.6 }}>
                                    📺
                                </div>
                                <div>
                                    Click "View in Display" to load content
                                </div>
                            </div>
                        )}

                    {/* CRT Barrel Distortion Overlay */}
                    {crtStyle && (
                        <div
                            style={{
                                position: "absolute",
                                top: isMobileDisplay ? "44px" : "40px",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                pointerEvents: "none",
                                background: `
                                    radial-gradient(ellipse 100% 100% at center,
                                        transparent 0%,
                                        transparent 70%,
                                        rgba(0,0,0,0.02) 75%,
                                        rgba(0,0,0,0.05) 80%,
                                        rgba(0,0,0,0.08) 85%,
                                        rgba(0,0,0,0.12) 90%,
                                        rgba(0,0,0,0.2) 100%
                                    )
                                `,
                                mixBlendMode: "multiply",
                                borderRadius: isMobileDisplay
                                    ? "0 0 12px 12px"
                                    : "0 0 4px 4px",
                                zIndex: 1000,
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: `
                                        repeating-linear-gradient(
                                            0deg,
                                            transparent,
                                            transparent 1px,
                                            rgba(0,0,0,0.03) 1px,
                                            rgba(0,0,0,0.03) 2px
                                        )
                                    `,
                                    mixBlendMode: "multiply",
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    top: "10%",
                                    left: "10%",
                                    width: "15%",
                                    height: "15%",
                                    background:
                                        "radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 70%)",
                                    borderRadius: "50%",
                                    transform: "rotate(-30deg)",
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    top: "20%",
                                    right: "15%",
                                    width: "8%",
                                    height: "12%",
                                    background:
                                        "radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)",
                                    borderRadius: "50%",
                                    transform: "rotate(45deg)",
                                }}
                            />
                        </div>
                    )}

                    {/* Iframe for web content */}
                    {!iframeManager.showFallback && iframeManager.iframeUrl && (
                        <iframe
                            ref={iframeRef}
                            src={iframeManager.iframeUrl}
                            style={{
                                width: "100%",
                                height: isMobileDisplay
                                    ? "calc(100% - 44px)"
                                    : "calc(100% - 40px)",
                                border: "none",
                                backgroundColor: "#ffffff",
                                display:
                                    iframeManager.error &&
                                    !iframeManager.showFallback
                                        ? "none"
                                        : "block",
                            }}
                            onLoad={iframeManager.handleIframeLoad}
                            onError={iframeManager.handleIframeError}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            title={title}
                        />
                    )}
                </div>
            </Html>

            {/* Display point light */}
            <pointLight
                position={[0, 2, 2]}
                intensity={1}
                distance={7}
                color={lightColor}
                decay={0.2}
            />
            <pointLight
                position={[0, -1, 1]}
                intensity={2}
                distance={7}
                color={lightColor}
                decay={0.2}
            />
        </group>
    );
};
