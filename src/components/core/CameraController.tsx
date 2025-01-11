// src/components/core/CameraController.tsx
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseControls } from "../../hooks/useMouseControls";
import * as THREE from "three";

export const CameraController: React.FC = () => {
    const { controlMode, cameraTarget } = useSceneStore();
    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { rotation } = useMouseControls();

    // Store the target position for smooth interpolation
    const targetPosition = useRef(new THREE.Vector3());
    targetPosition.current.copy(cameraTarget);

    useFrame((_, delta) => {
        if (controlMode === "firstPerson") {
            // WASD + Mouse controls
            const speed = 5;
            const direction = new THREE.Vector3();

            if (movement.forward) direction.z -= speed * delta;
            if (movement.backward) direction.z += speed * delta;
            if (movement.left) direction.x -= speed * delta;
            if (movement.right) direction.x += speed * delta;

            direction.applyEuler(camera.rotation);
            camera.position.add(direction);

            camera.rotation.y += rotation.x * delta;
            camera.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, camera.rotation.x + rotation.y * delta)
            );
        } else {
            // Point-and-click smooth transitions
            const lerpFactor = 0.05; // Adjust this value to change movement speed
            camera.position.lerp(targetPosition.current, lerpFactor);
        }
    });

    return null;
};
