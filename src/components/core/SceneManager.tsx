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
    const { loadRoom, performance, currentRoom } = useSceneStore();
    const fpsGraph = useRef<number[]>([]);

    useEffect(() => {
        // Initialize scene
        scene.fog = new THREE.Fog("#000000", 10, 20);
        loadRoom("atrium");
    }, []);

    useFrame(({ gl }) => {
        // Performance monitoring
        if (performance.monitoring) {
            fpsGraph.current.push(gl.info.render.frame);
            if (fpsGraph.current.length > 100) fpsGraph.current.shift();
        }
    });

    return (
        <>
            <Environment preset="city" />
            <CameraController />
            {/* Render only current room for performance */}
            {currentRoom && <Room key={currentRoom.id} config={currentRoom} />}
            {/* Render transition triggers only for current room */}
            {currentRoom?.archways.map((archway) => (
                <RoomTransitionTrigger key={archway.id} archway={archway} />
            ))}
        </>
    );
};
