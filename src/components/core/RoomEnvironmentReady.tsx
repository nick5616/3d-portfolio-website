// src/components/core/RoomEnvironmentReady.tsx
import { useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";

/**
 * RoomEnvironmentReady component signals when the room's collision bodies
 * and physics environment are ready for player spawning.
 * This prevents players from falling through floors during initialization.
 */
export const RoomEnvironmentReady: React.FC = () => {
    const { setRoomEnvironmentReady } = useSceneStore();

    useEffect(() => {
        // Set environment ready after a short delay to ensure all physics bodies are created
        const timer = setTimeout(() => {
            console.log(
                "🏗️ Room environment ready - collision bodies initialized"
            );
            setRoomEnvironmentReady(true);
        }, 100); // Short delay to ensure all RigidBody components are mounted

        // Cleanup: mark environment as not ready when component unmounts
        return () => {
            clearTimeout(timer);
            setRoomEnvironmentReady(false);
        };
    }, [setRoomEnvironmentReady]);

    // This component doesn't render anything
    return null;
};
