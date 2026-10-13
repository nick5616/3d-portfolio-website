import { useShallow } from "zustand/react/shallow";
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";

export const SceneDataBridge: React.FC = () => {
    const { camera, scene } = useThree();
    const { updateCameraData, updateSceneData } = useSceneStore(
        useShallow((s) => ({ updateCameraData: s.updateCameraData, updateSceneData: s.updateSceneData }))
    );

    // Throttling refs to reduce update frequency
    const lastCameraUpdate = useRef(0);
    const CAMERA_UPDATE_INTERVAL = 1000 / 30; // 30fps instead of 60fps
    const forwardVector = useRef(new THREE.Vector3());
    const lastPosition = useRef(new THREE.Vector3(NaN, NaN, NaN));
    const lastQuaternion = useRef(new THREE.Quaternion(NaN, NaN, NaN, NaN));

    // Use throttled camera updates instead of every frame
    useFrame(() => {
        const now = window.performance.now();

        // Only update camera data at 30fps instead of 60fps, and only when the
        // camera actually moved/turned - an idle player shouldn't wake up
        // every store subscriber 30 times a second.
        const moved =
            !lastPosition.current.equals(camera.position) ||
            !lastQuaternion.current.equals(camera.quaternion);
        if (moved && now - lastCameraUpdate.current >= CAMERA_UPDATE_INTERVAL) {
            lastPosition.current.copy(camera.position);
            lastQuaternion.current.copy(camera.quaternion);
            // Derive facing direction from the quaternion rather than camera.rotation:
            // CameraController composes rotation in YXZ order, but camera.rotation
            // decodes in XYZ order by default, so rotation.y alone is not a reliable yaw.
            forwardVector.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
            forwardVector.current.y = 0;
            if (forwardVector.current.lengthSq() > 0) {
                forwardVector.current.normalize();
            }

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
                facing: {
                    x: forwardVector.current.x,
                    z: forwardVector.current.z,
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
