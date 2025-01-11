import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Stats, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { SceneManager } from "./SceneManager";
import { LoadingScreen } from "../ui/LoadingScreen";
import { useSceneStore } from "../../stores/sceneStore";

export const Scene: React.FC = () => {
    const { performance } = useSceneStore();

    return (
        <Canvas
            camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 5] }}
            shadows
            dpr={[1, 2]}
        >
            <Suspense fallback={<LoadingScreen />}>
                <Physics>
                    <SceneManager />
                    {performance.showStats && <Stats />}
                    <AdaptiveDpr pixelated />
                    <AdaptiveEvents />
                </Physics>
            </Suspense>
        </Canvas>
    );
};
