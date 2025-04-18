import { useState, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useSceneStore } from "../../stores/sceneStore";
import { Archway } from "../../types/scene.types";
import { RigidBody, CuboidCollider } from "@react-three/rapier";

interface RoomTransitionProps {
    archway: Archway;
}

export const RoomTransitionTrigger: React.FC<RoomTransitionProps> = ({
    archway,
}) => {
    const { camera } = useThree();
    const { teleportToRoom } = useSceneStore();
    const [isInTrigger, setIsInTrigger] = useState(false);
    const lastTransitionTime = useRef<number>(0);

    // Handle collision events
    const handleCollisionEnter = () => {
        setIsInTrigger(true);
    };

    const handleCollisionExit = () => {
        setIsInTrigger(false);
    };

    useEffect(() => {
        if (!isInTrigger) return;

        const now = Date.now();
        if (now - lastTransitionTime.current < 1000) return;

        lastTransitionTime.current = now;
        const newPosition: [number, number, number] = [
            camera.position.x,
            camera.position.y,
            camera.position.z,
        ];

        teleportToRoom(archway.targetRoomId, newPosition);
    }, [isInTrigger, archway.targetRoomId, camera.position, teleportToRoom]);

    return (
        <RigidBody
            type="fixed"
            position={archway.position}
            rotation={archway.rotation}
            sensor
            onCollisionEnter={handleCollisionEnter}
            onCollisionExit={handleCollisionExit}
        >
            <CuboidCollider
                args={[archway.width / 2, archway.height / 2, 0.5]}
                sensor
            />
        </RigidBody>
    );
};
