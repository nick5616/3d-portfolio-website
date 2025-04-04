import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Stats, AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { SceneManager } from "./SceneManager";
import { useSceneStore } from "../../stores/sceneStore";
import { PlayerBody } from "./PlayerBody";

export const Scene: React.FC = () => {
    const { performance } = useSceneStore();

    // Configure rendering parameters based on quality setting
    const glParams = useMemo(() => {
        const baseConfig = {
            antialias: performance.quality !== "low",
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: "high-performance",
        };

        return baseConfig;
    }, [performance.quality]);

    // Configure dynamic DPR based on quality
    const dpr = useMemo(() => {
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
    }, [performance.quality]);

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <Canvas
                gl={glParams}
                camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 5] }}
                shadows={performance.quality !== "low"}
                dpr={dpr}
                linear={true}
                flat={performance.quality === "low"}
                performance={{ min: 0.5 }}
            >
                {/* Stats panel in top-right corner */}
                <Stats
                    className="fps-stats"
                    showPanel={0} /* 0: FPS, 1: MS, 2: MB */
                    data-testid="stats-panel" /* For CSS targeting */
                />

                <Suspense fallback={null}>
                    <Physics interpolate={performance.quality !== "low"}>
                        <PlayerBody />
                        <SceneManager />
                        <AdaptiveDpr pixelated />
                        <AdaptiveEvents />
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
