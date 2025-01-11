import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import { Vector3 } from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseControls } from "../../hooks/useMouseControls";

export const CameraController: React.FC = () => {
    const { controlMode, cameraTarget } = useSceneStore();
    const cameraRef = useRef<THREE.Camera>();
    const { movement } = useKeyboardControls();
    const { rotation } = useMouseControls();

    useFrame((_, delta) => {
        if (!cameraRef.current) return;

        if (controlMode === "firstPerson") {
            // WASD + Mouse controls
            const speed = 5;
            const direction = new Vector3();

            if (movement.forward) direction.z -= speed * delta;
            if (movement.backward) direction.z += speed * delta;
            if (movement.left) direction.x -= speed * delta;
            if (movement.right) direction.x += speed * delta;

            direction.applyEuler(cameraRef.current.rotation);
            cameraRef.current.position.add(direction);

            cameraRef.current.rotation.y += rotation.x * delta;
            cameraRef.current.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(
                    Math.PI / 2,
                    cameraRef.current.rotation.x + rotation.y * delta
                )
            );
        } else {
            // Point-and-click smooth transitions
            const currentPos = cameraRef.current.position;
            const targetPos = cameraTarget;

            currentPos.lerp(targetPos, 0.1);
        }
    });

    return null;
};
