import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Stats, AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { SceneManager } from "./SceneManager";
import { PlayerBody } from "./PlayerBody";
import { SceneDataBridge } from "./SceneDataBridge";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const Scene: React.FC = () => {
    const { performance } = useSceneStore();
    const { isMobile, isSafari, isWebKitBased } = useDeviceDetection();

    // Configure rendering parameters based on quality setting and device
    const glParams = useMemo(() => {
        const baseConfig = {
            antialias: performance.quality !== "low" && !isMobile && !isSafari,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: (isMobile || isSafari ? "default" : "high-performance") as WebGLPowerPreference,
            // Safari-specific WebGL compatibility settings
            preserveDrawingBuffer: isSafari,
            premultipliedAlpha: !isSafari, // Disable for Safari
            logarithmicDepthBuffer: false, // Disable for Safari compatibility
        };

        // Additional Safari-specific settings
        if (isSafari) {
            console.log("Applying Safari-specific WebGL settings for compatibility");
        }

        return baseConfig;
    }, [performance.quality, isMobile, isSafari]);

    // Configure dynamic DPR based on quality and device
    const dpr = useMemo(() => {
        if (isMobile) {
            // Balanced DPR for mobile - not too blurry, still performant
            return [0.6, 1.0] as [number, number];
        }

        // Lower DPR for Safari to prevent rendering issues
        if (isSafari) {
            return [0.5, 1.0] as [number, number];
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
    }, [performance.quality, isMobile, isSafari]);

    // Mobile-specific performance settings
    const performanceConfig = useMemo(() => {
        if (isMobile || isSafari) {
            return { min: 0.2, max: 0.6, debounce: 200 };
        }
        return { min: 0.5 };
    }, [isMobile, isSafari]);

    // Safari-specific camera settings
    const cameraConfig = useMemo(() => {
        const baseConfig = {
            fov: isMobile ? 80 : 75,
            near: 0.1,
            far: isMobile ? 500 : 1000,
            position: [0, 2, 5] as [number, number, number],
        };

        // More conservative settings for Safari
        if (isSafari) {
            baseConfig.far = 100; // Much closer far plane for Safari
            baseConfig.fov = 60; // Narrower FOV for Safari
        }

        return baseConfig;
    }, [isMobile, isSafari]);

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <Canvas
                gl={glParams}
                camera={cameraConfig}
                shadows={performance.quality !== "low" && !isMobile && !isSafari}
                dpr={dpr}
                linear={true}
                flat={performance.quality === "low" || isMobile || isSafari}
                performance={performanceConfig}
            >
                {/* Data bridge to update store with Three.js data */}
                <SceneDataBridge />

                {/* Stats panel in top-right corner - disabled for Safari due to performance */}
                {!isSafari && (
                    <Stats
                        className="fps-stats"
                        showPanel={0}
                        data-testid="stats-panel"
                    />
                )}

                <Suspense fallback={null}>
                    <Physics
                        interpolate={performance.quality !== "low" && !isMobile && !isSafari}
                        gravity={[0, -9.81, 0]}
                        timeStep={isMobile || isSafari ? 1 / 30 : 1 / 60}
                    >
                        <PlayerBody />
                        <SceneManager />
                        {!isMobile && !isSafari && <AdaptiveDpr pixelated />}
                        {!isMobile && !isSafari && <AdaptiveEvents />}
                        <Preload all />
                        <mesh
                            position={[0, 0, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            visible={false}
                            onClick={(e) => {
                                if (
                                    useSceneStore.getState().controlMode ===
                                    "pointAndClick"
                                ) {
                                    e.stopPropagation();
                                    useSceneStore
                                        .getState()
                                        .setCameraTarget(e.point);
                                }
                            }}
                        >
                            <planeGeometry args={[100, 100]} />
                            <meshBasicMaterial />
                        </mesh>
                    </Physics>
                </Suspense>
            </Canvas>
        </div>
    );
};
