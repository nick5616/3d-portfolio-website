import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useCallback } from "react";
import { Stats, AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { SceneManager } from "./SceneManager";
import { PlayerBody } from "./PlayerBody";
import { RupeeCounter } from "../ui/RupeeCounter";
import { SceneDataBridge } from "./SceneDataBridge";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useHardwareAcceleration } from "../../hooks/useHardwareAcceleration";
import { logEdgeDebugInfo } from "../../utils/edgeDebug";
import { EnhancedLoadingScreen } from "../ui/EnhancedLoadingScreen";
import { RoomTransitionLoadingScreen } from "../ui/RoomTransitionLoadingScreen";

export const Scene: React.FC = () => {
    const {
        performance,
        currentRoom,
        roomTransitionLoading,
        roomTransitionFrom,
        roomTransitionTo,
        setRoomTransitionLoading,
    } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    const { isHardwareAccelerationDisabled, isDetecting } =
        useHardwareAcceleration();

    // Stable callback for room transition completion
    const handleRoomTransitionComplete = useCallback(() => {
        console.log(
            `🏠 Scene: Room transition complete, hiding loading screen`
        );
        setRoomTransitionLoading(false);
    }, [setRoomTransitionLoading]);

    // Configure rendering parameters based on quality setting and device
    const glParams = useMemo(() => {
        const baseConfig = {
            antialias: performance.quality !== "low" && !isMobile,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: (isMobile
                ? "default"
                : "high-performance") as WebGLPowerPreference,
        };

        return baseConfig;
    }, [performance.quality, isMobile]);

    // Configure dynamic DPR based on quality and device
    const dpr = useMemo(() => {
        if (isMobile) {
            // Balanced DPR for mobile - not too blurry, still performant
            return [0.6, 1.0] as [number, number];
        }

        switch (performance.quality) {
            case "low":
                return [0.5, 1] as [number, number];
            case "medium":
                return [0.75, 1.5] as [number, number];
            case "high":
                return [1, 2] as [number, number];
            default:
                return [1, 2] as [number, number];
        }
    }, [performance.quality, isMobile]);

    // Mobile-specific performance settings
    const performanceConfig = useMemo(() => {
        if (isMobile) {
            return { min: 0.2, max: 0.6, debounce: 200 };
        }
        return { min: 0.5 };
    }, [isMobile]);

    // Show fallback when hardware acceleration is disabled or still detecting
    if (isDetecting || isHardwareAccelerationDisabled) {
        const isEdge = navigator.userAgent.toLowerCase().includes("edge");

        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#1a1a1a",
                }}
            >
                <div
                    style={{
                        textAlign: "center",
                        color: "white",
                        padding: "2rem",
                        maxWidth: "600px",
                    }}
                >
                    {isDetecting ? (
                        <div>
                            <h2 style={{ marginBottom: "1rem" }}>
                                Checking System Requirements...
                            </h2>
                            <p>
                                Please wait while we verify your system can run
                                this 3D experience.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h2
                                style={{
                                    marginBottom: "1rem",
                                    color: "#ef4444",
                                }}
                            >
                                Hardware Acceleration Required
                            </h2>
                            <p style={{ marginBottom: "1rem" }}>
                                This 3D portfolio requires hardware acceleration
                                to run properly. Please enable hardware
                                acceleration in your browser settings and
                                refresh the page.
                            </p>

                            {isEdge && (
                                <div
                                    style={{
                                        marginBottom: "1rem",
                                        padding: "1rem",
                                        backgroundColor: "#374151",
                                        borderRadius: "0.375rem",
                                        textAlign: "left",
                                    }}
                                >
                                    <h3
                                        style={{
                                            marginBottom: "0.5rem",
                                            color: "#60a5fa",
                                        }}
                                    >
                                        Microsoft Edge Instructions:
                                    </h3>
                                    <ol
                                        style={{
                                            margin: 0,
                                            paddingLeft: "1.5rem",
                                        }}
                                    >
                                        <li>Open Edge Settings (Ctrl+,)</li>
                                        <li>Go to System and performance</li>
                                        <li>
                                            Enable "Use hardware acceleration
                                            when available"
                                        </li>
                                        <li>Restart Edge completely</li>
                                        <li>Refresh this page</li>
                                    </ol>
                                </div>
                            )}

                            <div style={{ marginBottom: "1rem" }}>
                                <button
                                    onClick={() => {
                                        console.log(
                                            "User clicked refresh - checking hardware acceleration again"
                                        );
                                        window.location.reload();
                                    }}
                                    style={{
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        border: "none",
                                        padding: "0.75rem 1.5rem",
                                        borderRadius: "0.375rem",
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                        marginRight: "0.5rem",
                                    }}
                                >
                                    Refresh Page
                                </button>
                                <button
                                    onClick={() => {
                                        console.log(
                                            "Hardware acceleration detection debug info:"
                                        );
                                        console.log(
                                            "User Agent:",
                                            navigator.userAgent
                                        );
                                        console.log(
                                            "WebGL Available:",
                                            !!document
                                                .createElement("canvas")
                                                .getContext("webgl")
                                        );
                                        const canvas =
                                            document.createElement("canvas");
                                        const gl = canvas.getContext("webgl");
                                        if (gl) {
                                            const debugInfo = gl.getExtension(
                                                "WEBGL_debug_renderer_info"
                                            );
                                            if (debugInfo) {
                                                console.log(
                                                    "WebGL Renderer:",
                                                    gl.getParameter(
                                                        debugInfo.UNMASKED_RENDERER_WEBGL
                                                    )
                                                );
                                                console.log(
                                                    "WebGL Vendor:",
                                                    gl.getParameter(
                                                        debugInfo.UNMASKED_VENDOR_WEBGL
                                                    )
                                                );
                                            }
                                        }

                                        // Use the new Edge debug utility
                                        logEdgeDebugInfo();
                                    }}
                                    style={{
                                        backgroundColor: "#6b7280",
                                        color: "white",
                                        border: "none",
                                        padding: "0.75rem 1.5rem",
                                        borderRadius: "0.375rem",
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                    }}
                                >
                                    Debug Info
                                </button>
                            </div>

                            <p
                                style={{
                                    fontSize: "0.875rem",
                                    color: "#9ca3af",
                                }}
                            >
                                If you're still having issues, try opening this
                                page in Chrome or Firefox.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            <EnhancedLoadingScreen />
            <RoomTransitionLoadingScreen
                isVisible={roomTransitionLoading}
                fromRoom={roomTransitionFrom || undefined}
                toRoom={roomTransitionTo || undefined}
                onComplete={handleRoomTransitionComplete}
            />
            <Canvas
                className="main-canvas"
                gl={glParams}
                camera={{
                    fov: isMobile ? 80 : 75,
                    near: 0.1,
                    far: isMobile ? 500 : 1000,
                    position: [0, 1.8, 12], // Spawn further back to avoid cylinder
                }}
                shadows={performance.quality !== "low" && !isMobile}
                dpr={dpr}
                linear={true}
                flat={performance.quality === "low" || isMobile}
                performance={performanceConfig}
            >
                {/* Data bridge to update store with Three.js data */}
                <SceneDataBridge />

                {/* Stats panel in top-right corner */}
                {performance.monitoring && (
                    <Stats
                        className="fps-stats"
                        showPanel={0}
                        data-testid="stats-panel"
                    />
                )}

                <Suspense fallback={null}>
                    <Physics
                        interpolate={performance.quality !== "low"} // Enable interpolation on mobile for smoother movement
                        gravity={[0, -9.81, 0]}
                        timeStep={
                            isMobile
                                ? 1 / 60 // Increase to 60fps for smoother mobile movement
                                : performance.quality === "low"
                                ? 1 / 20 // Reduce physics steps when quality is low
                                : 1 / 60
                        }
                        maxCcdSubsteps={performance.quality === "low" ? 1 : 3} // Reduce physics substeps on low quality
                    >
                        <SceneManager />
                        {currentRoom && <PlayerBody key={currentRoom.id} />}
                        {!isMobile && <AdaptiveDpr pixelated />}
                        {!isMobile && <AdaptiveEvents />}
                        <Preload all />
                    </Physics>
                </Suspense>
            </Canvas>

            {/* Rupee Counter - positioned above stats */}
            <RupeeCounter />
        </div>
    );
};
