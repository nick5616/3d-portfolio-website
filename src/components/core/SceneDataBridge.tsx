import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useSceneStore } from "../../stores/sceneStore";

export const SceneDataBridge: React.FC = () => {
    const { camera, scene } = useThree();
    const { updateCameraData, updateSceneData } = useSceneStore();

    // Throttling refs to reduce update frequency
    const lastCameraUpdate = useRef(0);
    const CAMERA_UPDATE_INTERVAL = 1000 / 30; // 30fps instead of 60fps

    // Use throttled camera updates instead of every frame
    useFrame(() => {
        const now = window.performance.now();

        // Only update camera data at 30fps instead of 60fps
        if (now - lastCameraUpdate.current >= CAMERA_UPDATE_INTERVAL) {
            updateCameraData({
                position: {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z,
                },
                rotation: {
                    x: camera.rotation.x,
                    y: camera.rotation.y,
                    z: camera.rotation.z,
                },
            });
            lastCameraUpdate.current = now;
        }
    });

    // Update scene data periodically (less frequently since it changes less often)
    useEffect(() => {
        const updateSceneStats = () => {
            const lightCount = scene.children.filter((child) =>
                child.type.includes("Light")
            ).length;

            updateSceneData({
                objectCount: scene.children.length,
                lightCount,
            });
        };

        // Update initially
        updateSceneStats();

        // Update every 2 seconds
        const interval = setInterval(updateSceneStats, 2000);

        return () => clearInterval(interval);
    }, [scene, updateSceneData]);

    // This component doesn't render anything
    return null;
};
