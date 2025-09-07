// src/hooks/useRoomInitialization.ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSceneStore } from "../stores/sceneStore";
import { getRoomIdFromPath } from "../configs/routing";
import { roomConfigs } from "../configs/rooms";

export const useRoomInitialization = () => {
    const location = useLocation();
    const { loadRoom } = useSceneStore();

    useEffect(() => {
        // Get room ID from current path or default to atrium
        const roomId = getRoomIdFromPath(location.pathname) || "atrium";

        // Load the room
        console.log("🏠 Initializing room:", roomId);
        loadRoom(roomId);
    }, []); // Only run once on mount
};
