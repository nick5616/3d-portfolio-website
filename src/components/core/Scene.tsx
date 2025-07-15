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
    const { isMobile } = useDeviceDetection();

    // Configure rendering parameters based on quality setting and device
    const glParams = useMemo(() => {
        const baseConfig = {
            antialias: performance.quality !== "low" && !isMobile,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: isMobile ? "default" : "high-performance",
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

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <Canvas
                gl={glParams}
                camera={{
                    fov: isMobile ? 80 : 75,
                    near: 0.1,
                    far: isMobile ? 500 : 1000,
                    position: [0, 2, 5],
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
                <Stats
                    className="fps-stats"
                    showPanel={0}
                    data-testid="stats-panel"
                />

                <Suspense fallback={null}>
                    <Physics
                        interpolate={performance.quality !== "low" && !isMobile}
                        gravity={[0, -9.81, 0]}
                        timeStep={
                            isMobile
                                ? 1 / 30
                                : performance.quality === "low"
                                ? 1 / 20 // Reduce physics steps when quality is low
                                : 1 / 60
                        }
                        maxCcdSubsteps={performance.quality === "low" ? 1 : 3} // Reduce physics substeps on low quality
                    >
                        <PlayerBody />
                        <SceneManager />
                        {!isMobile && <AdaptiveDpr pixelated />}
                        {!isMobile && <AdaptiveEvents />}
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
