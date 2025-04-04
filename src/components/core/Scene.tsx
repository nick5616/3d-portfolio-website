import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import { AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
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

    // Add the classic Stats panel using vanilla JS
    useEffect(() => {
        // Check if Stats script already exists
        if (document.getElementById("stats-script")) return;

        // Create script element for stats.js
        const script = document.createElement("script");
        script.id = "stats-script";
        script.src = "https://mrdoob.github.io/stats.js/build/stats.min.js";
        script.async = true;

        // When the script loads, initialize Stats
        script.onload = () => {
            // @ts-ignore - Stats is loaded from the script
            const stats = new window.Stats();
            stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

            // Style the stats container
            stats.dom.style.cssText =
                "position:fixed;top:0;right:0;cursor:pointer;opacity:0.9;z-index:10000;transform:scale(0.8);transform-origin:top right;";
            document.body.appendChild(stats.dom);

            // Create animation loop
            function animate() {
                stats.update();
                requestAnimationFrame(animate);
            }

            requestAnimationFrame(animate);
        };

        // Add script to document
        document.body.appendChild(script);

        // Cleanup
        return () => {
            // Remove stats panel if it exists
            const statsPanel = document.querySelector(".stats-js-dom");
            if (statsPanel) document.body.removeChild(statsPanel);

            // Remove script
            const scriptEl = document.getElementById("stats-script");
            if (scriptEl) document.body.removeChild(scriptEl);
        };
    }, []);

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
