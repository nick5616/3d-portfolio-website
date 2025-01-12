// src/components/core/RoomTransitionTrigger.tsx
import { useEffect, useRef } from "react";
import { Vector3, Euler } from "three";
import { useThree } from "@react-three/fiber";
import { useSceneStore } from "../../stores/sceneStore";
import { Archway } from "../../types/scene.types";

interface RoomTransitionProps {
    archway: Archway;
}

export const RoomTransitionTrigger: React.FC<RoomTransitionProps> = ({
    archway,
}) => {
    const { camera } = useThree();
    const { teleportToRoom } = useSceneStore();
    const lastTransitionTime = useRef(0);
    const archBounds = useRef({
        min: new Vector3(),
        max: new Vector3(),
    });

    useEffect(() => {
        // Calculate archway bounds based on position and dimensions
        const halfWidth = archway.width / 2;
        const halfHeight = archway.height / 2;
        const position = new Vector3(...archway.position);

        // Adjust bounds based on archway rotation
        const rotation = new Euler(...archway.rotation);
        const right = new Vector3(1, 0, 0).applyEuler(rotation);

        archBounds.current.min
            .copy(position)
            .sub(right.multiplyScalar(halfWidth))
            .sub(new Vector3(0, halfHeight, 0));
        archBounds.current.max
            .copy(position)
            .add(right.multiplyScalar(halfWidth))
            .add(new Vector3(0, halfHeight, 0));
    }, [archway]);

    useEffect(() => {
        const checkCollision = () => {
            const cameraPos = camera.position;
            const now = Date.now();

            // Prevent rapid transitions
            if (now - lastTransitionTime.current < 1000) return;

            // Check if camera is within archway bounds
            if (
                cameraPos.x >= archBounds.current.min.x &&
                cameraPos.x <= archBounds.current.max.x &&
                cameraPos.y >= archBounds.current.min.y &&
                cameraPos.y <= archBounds.current.max.y &&
                cameraPos.z >= archBounds.current.min.z &&
                cameraPos.z <= archBounds.current.max.z
            ) {
                lastTransitionTime.current = now;
                const newPosition: [number, number, number] = [
                    cameraPos.x,
                    cameraPos.y,
                    cameraPos.z,
                ];

                // Teleport to the new room while maintaining current position
                teleportToRoom(archway.targetRoomId, newPosition);
            }
        };

        // Check for collision every frame
        const intervalId = setInterval(checkCollision, 100);
        return () => clearInterval(intervalId);
    }, [camera, archway, teleportToRoom]);

    return null;
};
