import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
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

    // Previous position for smoothing
    const prevPosition = useRef(new THREE.Vector3());

    // Initialize previous position on first render
    useEffect(() => {
        prevPosition.current.copy(camera.position);
    }, [camera]);

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

            // Prioritize virtual movement on mobile, otherwise use keyboard
            // This prevents conflicting inputs
            let moveForward = false;
            let moveBackward = false;
            let moveLeft = false;
            let moveRight = false;

            // Check if any virtual movement is active
            const hasVirtualInput =
                virtualMovement.forward ||
                virtualMovement.backward ||
                virtualMovement.left ||
                virtualMovement.right;

            // If we have virtual input, use only that to prevent conflicts
            if (hasVirtualInput) {
                moveForward = virtualMovement.forward;
                moveBackward = virtualMovement.backward;
                moveLeft = virtualMovement.left;
                moveRight = virtualMovement.right;
            } else {
                // Otherwise use keyboard
                moveForward = movement.forward;
                moveBackward = movement.backward;
                moveLeft = movement.left;
                moveRight = movement.right;
            }

            if (moveForward) direction.z -= speed * delta;
            if (moveBackward) direction.z += speed * delta;
            if (moveLeft) direction.x -= speed * delta;
            if (moveRight) direction.x += speed * delta;

            // Apply movement in world space
            direction.applyEuler(euler.current);

            // Calculate new position
            const newPosition = camera.position.clone().add(direction);

            // Set the camera position
            camera.position.copy(newPosition);

            // Update previous position
            prevPosition.current.copy(camera.position);
        } else {
            const lerpFactor = 0.05;
            camera.position.lerp(targetPosition.current, lerpFactor);
        }
    });

    return null;
};
