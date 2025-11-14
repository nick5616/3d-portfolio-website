import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDisplayManager } from "../../stores/displayManager";

export type DisplayType = "web" | "youtube" | "gif" | "auto";

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
    displayType?: DisplayType; // Type of display: "web", "youtube", "gif", or "auto" (auto-detect)
    textSizeFactor?: number; // Factor to scale the text size (0.01 = 1%, 1 = 100%)
}

// Utility functions for URL detection
const isYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/;
    return youtubeRegex.test(url);
};

const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

const isGifUrl = (url: string): boolean => {
    return /\.gif(\?|$)/i.test(url) || url.toLowerCase().endsWith(".gif");
};

const detectDisplayType = (
    url: string,
    displayType?: DisplayType
): DisplayType => {
    if (displayType && displayType !== "auto") {
        return displayType;
    }
    if (isYouTubeUrl(url)) {
        return "youtube";
    }
    if (isGifUrl(url)) {
        return "gif";
    }
    return "web";
};

// Custom hook for proximity detection and timer
const useProximityDetection = (
    displayRef: React.RefObject<THREE.Group>,
    onProximityComplete: () => void,
    skipTimer: boolean = false,
    isLoaded: boolean = false
) => {
    const { camera } = useThree();
    const [isInProximity, setIsInProximity] = useState(false);
    const [proximityStartTime, setProximityStartTime] = useState<number | null>(
        null
    );
    const [isProximityLoading, setIsProximityLoading] = useState(false);
    const [showProximityOverlay, setShowProximityOverlay] = useState(false);
    const [timerProgress, setTimerProgress] = useState(0);
    const wasInInitialProximityRef = useRef(false);

    const PROXIMITY_THRESHOLD = 3.0; // Initial threshold to trigger loading
    const LOADED_WALK_AWAY_THRESHOLD = 12.0; // Much larger threshold after loading
    const PROXIMITY_TIMER_DURATION = 4.0;

    useFrame((state) => {
        if (!displayRef.current || !camera) return;

        const displayPosition = new THREE.Vector3();
        displayRef.current.getWorldPosition(displayPosition);

        const cameraPosition = camera.position;
        const distance = displayPosition.distanceTo(cameraPosition);

        // Use larger threshold if display is already loaded
        const currentThreshold = isLoaded
            ? LOADED_WALK_AWAY_THRESHOLD
            : PROXIMITY_THRESHOLD;

        const wasInProximity = isInProximity;
        const nowInProximity = distance <= currentThreshold;

        // Track whether we're in the initial proximity zone (for triggering loading)
        const nowInInitialProximity = distance <= PROXIMITY_THRESHOLD;
        const wasInInitialProximity = wasInInitialProximityRef.current;

        setIsInProximity(nowInProximity);
        wasInInitialProximityRef.current = nowInInitialProximity;

        // Start timer when entering initial proximity (or immediately if skipTimer is true)
        // Only trigger if not already loaded (to avoid re-triggering after threshold expands)
        if (!wasInInitialProximity && nowInInitialProximity && !isLoaded) {
            if (skipTimer) {
                // Immediately trigger for YouTube/GIF displays
                onProximityComplete();
            } else {
                setProximityStartTime(state.clock.elapsedTime);
                setShowProximityOverlay(true);
                setIsProximityLoading(true);
            }
        }

        // Reset when leaving proximity (using current threshold)
        if (wasInProximity && !nowInProximity) {
            setProximityStartTime(null);
            setShowProximityOverlay(false);
            setIsProximityLoading(false);
        }

        // Timer logic (only for non-skipTimer displays)
        if (
            !skipTimer &&
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

        {/* Back to title button when live display is active */}
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
                title="Return to title view"
            >
                📝
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
    description,
    crtStyle = false,
    lightColor = "#ffffff",
    responsive,
    displayType = "auto",
    textSizeFactor = 1,
}) => {
    // Detect display type
    const detectedType = useMemo(
        () => detectDisplayType(url, displayType),
        [url, displayType]
    );
    const isYouTube = detectedType === "youtube";
    const isGif = detectedType === "gif";
    const isAutoPlayDisplay = isYouTube || isGif;
    const displayRef = useRef<THREE.Group>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const hologramFrameRef = useRef<THREE.Group>(null);
    const scanLineRef = useRef<THREE.Mesh>(null);

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

    // Extract YouTube video ID if needed
    const youtubeVideoId = useMemo(() => {
        if (isYouTube) {
            return extractYouTubeVideoId(url);
        }
        return null;
    }, [url, isYouTube]);

    // State for YouTube/GIF autoplay
    const [shouldShowMedia, setShouldShowMedia] = useState(false);

    // Track if display has loaded (iframe loaded for web, media shown for YouTube/GIF)
    // This needs to be computed before proximityDetection hook
    const isDisplayLoaded = useMemo(() => {
        if (isAutoPlayDisplay) {
            return shouldShowMedia;
        } else {
            return !!(
                iframeManager.iframeUrl &&
                !iframeManager.isLoading &&
                !iframeManager.showFallback
            );
        }
    }, [
        isAutoPlayDisplay,
        shouldShowMedia,
        iframeManager.iframeUrl,
        iframeManager.isLoading,
        iframeManager.showFallback,
    ]);

    // Create a ref to store the proximity detection reset function
    const proximityResetRef = useRef<(() => void) | null>(null);
    // Create a ref to store the eviction callback
    const evictionCallbackRef = useRef<(() => void) | null>(null);

    const handleProximityComplete = useCallback(() => {
        if (isAutoPlayDisplay) {
            // For YouTube/GIF, just show the media immediately
            setShouldShowMedia(true);
            console.log(`🎬 Autoplaying ${detectedType} for ${title}`);
        } else {
            // For web displays, use the existing iframe loading logic
            const { registerDisplay } = useDisplayManager.getState();
            registerDisplay(displayId, title, () => {
                // Use the ref to call the eviction callback
                if (evictionCallbackRef.current) {
                    evictionCallbackRef.current();
                }
            });
            iframeManager.startLoading();
            // Call the reset function if it exists
            if (proximityResetRef.current) {
                proximityResetRef.current();
            }
            console.log(`📺 Proximity loading ${title} in display`);
        }
    }, [displayId, title, iframeManager, isAutoPlayDisplay, detectedType]);

    const proximityDetection = useProximityDetection(
        displayRef,
        handleProximityComplete,
        isAutoPlayDisplay, // Skip timer for YouTube/GIF
        isDisplayLoaded // Pass loaded state to use larger threshold
    );

    // Track if we should show the HTML/iframe/media (only when close)
    const shouldShowHtml =
        proximityDetection.isInProximity &&
        (!isAutoPlayDisplay || shouldShowMedia);

    // Store the reset function in the ref
    useEffect(() => {
        proximityResetRef.current = proximityDetection.resetProximity;
    }, [proximityDetection.resetProximity]);

    // Eviction callback
    const handleEviction = useCallback(() => {
        if (isAutoPlayDisplay) {
            setShouldShowMedia(false);
        } else {
            iframeManager.unloadIframe();
        }
        proximityDetection.resetProximity();
        console.log(`🔄 Display evicted: ${title}`);
    }, [title, iframeManager, proximityDetection, isAutoPlayDisplay]);

    // Store eviction callback in ref
    useEffect(() => {
        evictionCallbackRef.current = handleEviction;
    }, [handleEviction]);

    const handleOpenInNewTab = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleReturnToTitle = useCallback(() => {
        if (isAutoPlayDisplay) {
            setShouldShowMedia(false);
        } else {
            iframeManager.unloadIframe();
        }
    }, [iframeManager, isAutoPlayDisplay]);

    // Reset media when leaving proximity
    useEffect(() => {
        if (!proximityDetection.isInProximity && isAutoPlayDisplay) {
            setShouldShowMedia(false);
        }
    }, [proximityDetection.isInProximity, isAutoPlayDisplay]);

    // Calculate text size based on display dimensions
    const textSize = useMemo(() => {
        // Convert pixel dimensions to 3D space (divide by 400)
        const displayWidth3D = displayWidth / 400;
        const displayHeight3D = displayHeight / 400;
        // Use smaller dimension to ensure text fits
        const minDimension = Math.min(displayWidth3D, displayHeight3D);
        return minDimension * 0.15 * textSizeFactor;
    }, [displayWidth, displayHeight, textSizeFactor]);

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

            {/* Display screen surface */}
            <mesh position={[0, 0, 0.02]}>
                <planeGeometry
                    args={[displayWidth / 400, displayHeight / 400]}
                />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={0.1}
                />
            </mesh>

            {/* 3D Title Text - only show when HTML is not visible */}
            {!shouldShowHtml && (
                <Text
                    position={[0, 0, 0.021]}
                    fontSize={textSize}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={(displayWidth / 400) * 0.9}
                    textAlign="center"
                    fontWeight="bold"
                >
                    {title}
                </Text>
            )}

            {/* Web content using Html component - only show when close or loaded */}
            {shouldShowHtml && (
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
                            showScreenshotOverlay={false}
                            showProximityOverlay={
                                proximityDetection.showProximityOverlay
                            }
                            onReturnToScreenshot={handleReturnToTitle}
                        />

                        {/* Loading overlay */}
                        {iframeManager.isLoading &&
                            !iframeManager.showFallback && (
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
                                        fontSize:
                                            displayWidth > 400
                                                ? "16px"
                                                : "14px",
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
                                    fontSize:
                                        displayWidth > 400 ? "16px" : "14px",
                                    color: "#333",
                                    fontFamily: "system-ui, sans-serif",
                                    flexDirection: "column",
                                    gap: "16px",
                                    padding: "20px",
                                    textAlign: "center",
                                }}
                            >
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
                                                transition:
                                                    "background-color 0.2s",
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
                                                transition:
                                                    "background-color 0.2s",
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

                        {/* YouTube video embed */}
                        {isYouTube && shouldShowMedia && youtubeVideoId && (
                            <iframe
                                style={{
                                    position: "absolute",
                                    top: isMobileDisplay ? "44px" : "40px",
                                    left: 0,
                                    width: "100%",
                                    height: isMobileDisplay
                                        ? "calc(100% - 44px)"
                                        : "calc(100% - 40px)",
                                    border: "none",
                                }}
                                src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=0&controls=1&rel=0`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={title}
                            />
                        )}

                        {/* GIF image */}
                        {isGif && shouldShowMedia && (
                            <img
                                src={url}
                                alt={title}
                                style={{
                                    position: "absolute",
                                    top: isMobileDisplay ? "44px" : "40px",
                                    left: 0,
                                    width: "100%",
                                    height: isMobileDisplay
                                        ? "calc(100% - 44px)"
                                        : "calc(100% - 40px)",
                                    objectFit: "contain",
                                    backgroundColor: "#000000",
                                }}
                            />
                        )}

                        {/* Placeholder when no iframe content has been loaded */}
                        {!isAutoPlayDisplay &&
                            !iframeManager.showFallback &&
                            !iframeManager.iframeUrl &&
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
                                            displayWidth > 400
                                                ? "16px"
                                                : "14px",
                                        color: "#666",
                                        fontFamily: "system-ui, sans-serif",
                                        flexDirection: "column",
                                        gap: "12px",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "32px",
                                            opacity: 0.6,
                                        }}
                                    >
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
                        {!isAutoPlayDisplay &&
                            !iframeManager.showFallback &&
                            iframeManager.iframeUrl && (
                                <iframe
                                    ref={iframeRef}
                                    src={iframeManager.iframeUrl}
                                    style={{
                                        position: "absolute",
                                        top: isMobileDisplay ? "44px" : "40px",
                                        left: 0,
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
            )}

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
