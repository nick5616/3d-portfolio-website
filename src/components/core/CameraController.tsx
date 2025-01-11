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

    const targetPosition = useRef(new THREE.Vector3());
    const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

    targetPosition.current.copy(cameraTarget);

    useFrame((_, delta) => {
        if (controlMode === "firstPerson") {
            // Update euler angles
            euler.current.y -= rotation.x;
            euler.current.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, euler.current.x - rotation.y)
            );

            // Apply rotation
            camera.quaternion.setFromEuler(euler.current);

            // Handle movement in camera's local space
            const speed = 5;
            const direction = new THREE.Vector3();

            if (movement.forward) direction.z -= speed * delta;
            if (movement.backward) direction.z += speed * delta;
            if (movement.left) direction.x -= speed * delta;
            if (movement.right) direction.x += speed * delta;

            direction.applyEuler(euler.current);
            camera.position.add(direction);
        } else {
            const lerpFactor = 0.05;
            camera.position.lerp(targetPosition.current, lerpFactor);
        }
    });

    return null;
};
