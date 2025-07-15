import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseControls } from "../../hooks/useMouseControls";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import * as THREE from "three";

export const CameraController: React.FC = () => {
    const {
        controlMode,
        cameraTarget,
        cameraRotation,
        virtualMovement,
        virtualRotation,
        performance,
    } = useSceneStore();

    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { rotation } = useMouseControls();
    const { isMobile } = useDeviceDetection();

    const targetPosition = useRef(new THREE.Vector3());
    const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
    const lastCameraRotation = useRef<[number, number, number] | undefined>();
    const lastCameraTarget = useRef(new THREE.Vector3());

    // Reuse vectors to avoid allocations in hot path
    const forward = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());

    // Throttling for performance
    const lastUpdate = useRef(0);
    const updateInterval =
        performance.quality === "low"
            ? 1000 / 20 // 20fps
            : performance.quality === "medium"
            ? 1000 / 30 // 30fps
            : 1000 / 60; // 60fps for high quality

    // Store camera's current position when mounted
    useEffect(() => {
        targetPosition.current.copy(camera.position);
        lastCameraTarget.current.copy(cameraTarget);
    }, [camera, cameraTarget]);

    // Handle teleportation rotation
    useEffect(() => {
        if (cameraRotation && cameraRotation !== lastCameraRotation.current) {
            euler.current.set(
                cameraRotation[0],
                cameraRotation[1],
                cameraRotation[2],
                "YXZ"
            );
            camera.quaternion.setFromEuler(euler.current);
            lastCameraRotation.current = cameraRotation;
        }
    }, [cameraRotation, camera]);

    // Handle teleportation position
    useEffect(() => {
        if (!lastCameraTarget.current.equals(cameraTarget)) {
            camera.position.copy(cameraTarget);
            targetPosition.current.copy(cameraTarget);
            lastCameraTarget.current.copy(cameraTarget);
        }
    }, [cameraTarget, camera]);

    useFrame((_, delta) => {
        const now = window.performance.now();

        // Throttle updates on low quality or when system is stressed
        if (
            performance.quality === "low" &&
            now - lastUpdate.current < updateInterval
        ) {
            return;
        }
        lastUpdate.current = now;

        // Limit delta time to avoid large jumps
        const clampedDelta = Math.min(delta, 0.1);

        if (controlMode === "firstPerson") {
            // Handle rotation - on mobile, only use virtual rotation
            const combinedRotationX = isMobile
                ? virtualRotation.x
                : rotation.x + virtualRotation.x;
            const combinedRotationY = isMobile
                ? virtualRotation.y
                : rotation.y + virtualRotation.y;

            // Skip rotation if very small changes to reduce computation
            if (
                Math.abs(combinedRotationX) > 0.001 ||
                Math.abs(combinedRotationY) > 0.001
            ) {
                euler.current.y -= combinedRotationX;
                euler.current.x = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, euler.current.x - combinedRotationY)
                );
                camera.quaternion.setFromEuler(euler.current);
            }

            // Reuse vectors to reduce allocations
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

            // On mobile, only use virtual controls. On desktop, prefer virtual if active, otherwise keyboard
            const useVirtual =
                isMobile ||
                virtualMovement.forward ||
                virtualMovement.backward ||
                virtualMovement.left ||
                virtualMovement.right;

            // Choose which control source to use
            const activeMovement = useVirtual ? virtualMovement : movement;

            // Build direction vector only if there's input
            let hasMovement = false;
            if (activeMovement.forward) {
                direction.current.add(forward.current);
                hasMovement = true;
            }
            if (activeMovement.backward) {
                direction.current.sub(forward.current);
                hasMovement = true;
            }
            if (activeMovement.left) {
                direction.current.sub(right.current);
                hasMovement = true;
            }
            if (activeMovement.right) {
                direction.current.add(right.current);
                hasMovement = true;
            }

            // Apply movement if we have any direction
            if (hasMovement) {
                // Normalize for consistent speed in diagonals
                direction.current.normalize();

                // Apply speed and delta for frame-rate independence
                direction.current.multiplyScalar(moveSpeed * clampedDelta * 60);

                // Apply to camera position
                camera.position.add(direction.current);
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
