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

    // Throttling for performance - less aggressive on mobile for smoother movement
    const lastUpdate = useRef(0);
    const updateInterval = isMobile
        ? 1000 / 60 // Full 60fps on mobile for smooth movement
        : performance.quality === "low"
        ? 1000 / 20 // 20fps only for low quality desktop
        : performance.quality === "medium"
        ? 1000 / 30 // 30fps for medium quality desktop
        : 1000 / 60; // 60fps for high quality desktop

    // Store camera's current position when mounted
    useEffect(() => {
        targetPosition.current.copy(camera.position);
        lastCameraTarget.current.copy(cameraTarget);
    }, [camera, cameraTarget]);

    useFrame((_, delta) => {
        const now = window.performance.now();

        // Only throttle updates on desktop low quality - mobile needs smooth updates
        if (
            !isMobile &&
            performance.quality === "low" &&
            now - lastUpdate.current < updateInterval
        ) {
            return;
        }
        lastUpdate.current = now;

        // More conservative delta clamping for mobile to prevent large jumps
        const clampedDelta = isMobile
            ? Math.min(delta, 0.033)
            : Math.min(delta, 0.1);

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

            // Movement speed - adjusted for mobile
            const moveSpeed = isMobile ? 0.12 : 0.15; // Slightly slower on mobile for better control

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

                // Proper frame-rate independent movement calculation
                // Use delta time for smooth movement regardless of framerate
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
