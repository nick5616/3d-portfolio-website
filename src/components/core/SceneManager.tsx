import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Environment } from "@react-three/drei";
import { Room } from "./Room";
import { CameraController } from "./CameraController";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";

export const SceneManager: React.FC = () => {
    const { scene } = useThree();
    const { currentRoom, loadRoom, performance } = useSceneStore();
    const fpsGraph = useRef<number[]>([]);

    useEffect(() => {
        // Initialize scene
        scene.fog = new THREE.Fog("#000000", 10, 20);
        loadRoom("atrium"); // Changed from "initial" to "atrium"
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
            {currentRoom && <Room config={currentRoom} />}
        </>
    );
};
