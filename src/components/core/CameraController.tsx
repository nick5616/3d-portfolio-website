import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseControls } from "../../hooks/useMouseControls";
import * as THREE from "three";

export const CameraController: React.FC = () => {
    const { controlMode, cameraTarget, virtualMovement, virtualRotation } =
        useSceneStore();
    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { rotation } = useMouseControls();

    const targetPosition = useRef(new THREE.Vector3());
    const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

    targetPosition.current.copy(cameraTarget);

    useFrame((_, delta) => {
        if (controlMode === "firstPerson") {
            // Combine keyboard/mouse and virtual controls
            // Update euler angles from both mouse and virtual joystick
            const combinedRotationX = rotation.x + virtualRotation.x;
            const combinedRotationY = rotation.y + virtualRotation.y;

            euler.current.y -= combinedRotationX;
            euler.current.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, euler.current.x - combinedRotationY)
            );

            // Apply rotation
            camera.quaternion.setFromEuler(euler.current);

            // Handle movement in camera's local space
            const speed = 5;
            const direction = new THREE.Vector3();

            // Combine keyboard and virtual controls
            const moveForward = movement.forward || virtualMovement.forward;
            const moveBackward = movement.backward || virtualMovement.backward;
            const moveLeft = movement.left || virtualMovement.left;
            const moveRight = movement.right || virtualMovement.right;

            if (moveForward) direction.z -= speed * delta;
            if (moveBackward) direction.z += speed * delta;
            if (moveLeft) direction.x -= speed * delta;
            if (moveRight) direction.x += speed * delta;

            direction.applyEuler(euler.current);
            camera.position.add(direction);
        } else {
            const lerpFactor = 0.05;
            camera.position.lerp(targetPosition.current, lerpFactor);
        }
    });

    return null;
};
