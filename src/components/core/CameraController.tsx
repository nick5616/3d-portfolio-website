import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseControls } from "../../hooks/useMouseControls";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import * as THREE from "three";

export const CameraController: React.FC = () => {
    const {
        cameraTarget,
        cameraRotation,
        virtualMovement,
        virtualRotation,
        movementJoystickIntensity,
        performance,
        flyMode,
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

    // Store camera's current position when mounted and handle teleportation rotation
    useEffect(() => {
        targetPosition.current.copy(camera.position);
        lastCameraTarget.current.copy(cameraTarget);

        // Apply camera rotation from teleportation
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
    }, [camera, cameraTarget, cameraRotation]);

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
        const up = new THREE.Vector3(0, 1, 0);

        // Apply camera rotation to get proper directions
        forward.current.applyQuaternion(camera.quaternion);
        right.current.applyQuaternion(camera.quaternion);
        up.applyQuaternion(camera.quaternion);

        if (!flyMode) {
            // Keep movement on horizontal plane for normal mode
            forward.current.y = 0;
            right.current.y = 0;

            // Normalize after removing y component
            forward.current.normalize();
            right.current.normalize();
        } else {
            // In flight mode, allow full 3D movement
            forward.current.normalize();
            right.current.normalize();
            up.normalize();
        }

        // Reset direction vector
        direction.current.set(0, 0, 0);

        // Movement speed - adjusted for mobile
        // Scale speed based on joystick intensity (0 to 1) when using virtual controls
        const baseMoveSpeed = isMobile ? 0.12 : 0.15;
        const intensityMultiplier = isMobile && movementJoystickIntensity > 0
            ? 0.75 + movementJoystickIntensity * 0.75 // 0.75x to 1.5x speed (half the scaling range)
            : 1.0;
        const moveSpeed = baseMoveSpeed * intensityMultiplier;

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

        // Add vertical movement for flight mode
        if (flyMode) {
            if (activeMovement.jumping) {
                direction.current.add(up);
                hasMovement = true;
            }
            // Use backward for downward movement in flight mode
            if (activeMovement.backward && !activeMovement.forward) {
                // Remove the backward movement we added above and add downward movement
                direction.current.add(forward.current); // Cancel out the backward
                direction.current.sub(up);
                hasMovement = true;
            }
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
    });

    return null;
};
