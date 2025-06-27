import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Environment } from "@react-three/drei";
import { Room } from "./Room";
import { CameraController } from "./CameraController";
import { RoomTransitionTrigger } from "./RoomTransitionTrigger";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";

export const SceneManager: React.FC = () => {
    const { scene } = useThree();
    const { loadRoom, performance } = useSceneStore();
    const fpsGraph = useRef<number[]>([]);

    useEffect(() => {
        // Initialize scene
        scene.fog = new THREE.Fog("#000000", 10, 20);
        loadRoom("atrium");
    }, [scene, loadRoom]);

    useFrame(({ gl }) => {
        // Performance monitoring
        if (performance.monitoring) {
            fpsGraph.current.push(gl.info.render.frame);
            if (fpsGraph.current.length > 100) fpsGraph.current.shift();
        }
    });

    return (
        <>
            {/* Basic lighting to ensure scene is visible */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            {/* Environment */}
            <Environment preset="city" />

            <CameraController />
            {/* Render all rooms */}
            {Object.values(roomConfigs).map((roomConfig) => (
                <Room key={roomConfig.id} config={roomConfig} />
            ))}
            {/* Render transition triggers for all archways */}
            {Object.values(roomConfigs).map((roomConfig) =>
                roomConfig.archways.map((archway) => (
                    <RoomTransitionTrigger key={archway.id} archway={archway} />
                ))
            )}
        </>
    );
};
