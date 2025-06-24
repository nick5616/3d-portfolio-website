import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseControls } from "../../hooks/useMouseControls";
import * as THREE from "three";

export const CameraController: React.FC = () => {
    const {
        controlMode,
        cameraTarget,
        virtualMovement,
        virtualRotation,
        isMobile,
    } = useSceneStore();

    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { rotation } = useMouseControls();

    const targetPosition = useRef(new THREE.Vector3());
    const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
    
    // Reusable vectors to avoid allocations in render loop
    const forward = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());

    // Store camera's current position when mounted
    useEffect(() => {
        targetPosition.current.copy(camera.position);
    }, [camera]);

    useFrame((_, delta) => {
        // Limit delta time to avoid large jumps
        const clampedDelta = Math.min(delta, 0.1);

        if (controlMode === "firstPerson") {
            // Handle rotation
            const combinedRotationX = rotation.x + virtualRotation.x;
            const combinedRotationY = rotation.y + virtualRotation.y;

            euler.current.y -= combinedRotationX;
            euler.current.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, euler.current.x - combinedRotationY)
            );
            camera.quaternion.setFromEuler(euler.current);

            // Reset and setup base vectors for movement
            forward.current.set(0, 0, -1);
            right.current.set(1, 0, 0);

            // Apply camera rotation to get proper directions
            forward.current.applyQuaternion(camera.quaternion);
            right.current.applyQuaternion(camera.quaternion);

            // Keep movement on horizontal plane
            forward.current.y = 0;
            right.current.y = 0;

            // Normalize after removing y component
            forward.current.normalize();
            right.current.normalize();

            // Reset direction vector
            direction.current.set(0, 0, 0);

            // Movement speed - use the same speed for keyboard and virtual
            const moveSpeed = 0.15;

            // Combine keyboard and virtual inputs (virtual takes precedence on mobile)
            const useVirtual =
                isMobile &&
                (virtualMovement.forward ||
                    virtualMovement.backward ||
                    virtualMovement.left ||
                    virtualMovement.right);

            // Choose which control source to use
            const activeMovement = useVirtual ? virtualMovement : movement;

            if (activeMovement.forward) direction.current.add(forward.current.clone());
            if (activeMovement.backward)
                direction.current.add(forward.current.clone().negate());
            if (activeMovement.left) direction.current.add(right.current.clone().negate());
            if (activeMovement.right) direction.current.add(right.current.clone());

            // Apply movement if we have any direction
            if (direction.current.length() > 0) {
                // Normalize for consistent speed in diagonals
                direction.current.normalize();

                // Apply speed and delta for frame-rate independence
                direction.current.multiplyScalar(moveSpeed * clampedDelta * 60);

                // Apply to camera position
                camera.position.add(direction.current);

                // Camera movement applied
            }
        } else {
            // Point and click mode
            targetPosition.current.copy(cameraTarget);
            const lerpFactor = 0.05;
            camera.position.lerp(targetPosition.current, lerpFactor);
        }
    });

    return null;
};
