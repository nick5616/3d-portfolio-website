import { useShallow } from "zustand/react/shallow";
// src/components/core/RoomEnvironmentReady.tsx
import { useEffect } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useReadiness } from "../../stores/readinessStore";

/**
 * RoomEnvironmentReady component signals when the room's collision bodies
 * and physics environment are ready for player spawning.
 * This prevents players from falling through floors during initialization.
 * It's also the "room" stage of the room's readiness (stores/readinessStore).
 */
export const RoomEnvironmentReady: React.FC = () => {
    const { setRoomEnvironmentReady } = useSceneStore(
        useShallow((s) => ({ setRoomEnvironmentReady: s.setRoomEnvironmentReady }))
    );

    useEffect(() => {
        // The load this room belongs to; a later room change makes it stale.
        const token = useReadiness.getState().token;
        // Set environment ready after a short delay to ensure all physics bodies are created
        const timer = setTimeout(() => {
            setRoomEnvironmentReady(true);
            useReadiness.getState().done("room", token);
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
