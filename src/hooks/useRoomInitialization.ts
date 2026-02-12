// src/hooks/useRoomInitialization.ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSceneStore } from "../stores/sceneStore";
import { getRoomIdFromPath, getExperienceFromPath } from "../configs/routing";
import { EXPERIENCE_SPAWN_POSITIONS } from "../components/rooms/AboutRoom";

export const useRoomInitialization = () => {
    const location = useLocation();
    const {
        loadRoom,
        teleportToRoom,
        setPendingHolodeckExperience,
        getExperienceRotationAngle,
    } = useSceneStore();

    useEffect(() => {
        // Get room ID from current path or default to atrium
        const roomId = getRoomIdFromPath(location.pathname) || "atrium";

        // Check for holodeck experience deep-link
        const experienceId = getExperienceFromPath(location.pathname);
        if (experienceId) {
            console.log(
                `🎮 Initializing holodeck with experience: ${experienceId}`
            );
            setPendingHolodeckExperience(experienceId);

            // Teleport to the about room at the experience's spawn position/rotation
            const position =
                EXPERIENCE_SPAWN_POSITIONS[experienceId] || [0, 0.9, 0];
            const rotation: [number, number, number] = [
                0,
                getExperienceRotationAngle(experienceId),
                0,
            ];
            teleportToRoom(roomId, position, rotation);
            return;
        }

        // Load the room normally
        console.log("🏠 Initializing room:", roomId);
        loadRoom(roomId);
    }, []); // Only run once on mount
};
