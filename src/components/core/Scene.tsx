import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Stats, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { SceneManager } from "./SceneManager";
import { useSceneStore } from "../../stores/sceneStore";
import { PlayerBody } from "./PlayerBody";

export const Scene: React.FC = () => {
    const { performance } = useSceneStore();

    return (
        <div style={{ width: "100%", height: "95%" }}>
            <Canvas
                gl={{
                    antialias: true,
                    alpha: false,
                    stencil: false,
                    depth: true,
                    powerPreference: "high-performance",
                }}
                camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 5] }}
                shadows
                dpr={[1, 2]}
            >
                <Suspense fallback={null}>
                    <Physics>
                        <PlayerBody />
                        <SceneManager />
                        {performance.showStats && <Stats />}
                        <AdaptiveDpr pixelated />
                        <AdaptiveEvents />
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
