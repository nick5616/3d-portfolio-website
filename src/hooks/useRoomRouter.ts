// src/hooks/useRoomRouter.ts
import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSceneStore } from "../stores/sceneStore";
import {
    getRoomIdFromPath,
    getPathFromRoomId,
    getRouteByPath,
} from "../configs/routing";
import { roomConfigs } from "../configs/rooms";

export const useRoomRouter = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentRoom, teleportToRoom, loadRoom } = useSceneStore();
    const isHandlingUrlChange = useRef(false);

    // Navigate to a room by updating both URL and scene
    const navigateToRoom = useCallback(
        (roomId: string, updateUrl: boolean = true) => {
            console.log(
                `🧭 Router: Navigating to room ${roomId}, updateUrl: ${updateUrl}`
            );

            const config = roomConfigs[roomId];
            if (!config) {
                console.error(
                    `❌ Router: Room configuration not found for ${roomId}`
                );
                return;
            }

            // Use the room's default entrance position and rotation
            const position = config.defaultEntrance.position;
            const rotation = config.defaultEntrance.rotation;

            // Use exact position from room config
            const safePosition: [number, number, number] = position;

            console.log(
                `📍 Router: Using spawn position`,
                safePosition,
                `rotation`,
                rotation
            );

            // Update the scene
            teleportToRoom(roomId, safePosition, rotation);

            // Update URL if requested
            if (updateUrl) {
                const path = getPathFromRoomId(roomId);
                if (path && location.pathname !== path) {
                    console.log(`🔗 Router: Updating URL to ${path}`);
                    isHandlingUrlChange.current = true;
                    navigate(path, { replace: true });

                    // Reset flag after URL update
                    setTimeout(() => {
                        isHandlingUrlChange.current = false;
                    }, 100);
                }
            }

            // Update document title
            const route = getRouteByPath(getPathFromRoomId(roomId) || "/");
            if (route) {
                document.title = `${route.title} - Nicolas Belovoskey Portfolio`;
            }
        },
        [navigate, location.pathname, teleportToRoom]
    );

    // Handle URL changes (browser navigation, direct links)
    useEffect(() => {
        // Prevent handling URL changes that we initiated ourselves
        if (isHandlingUrlChange.current) {
            console.log(
                `🔄 Router: Skipping URL change handling (self-initiated)`
            );
            return;
        }

        const roomId = getRoomIdFromPath(location.pathname);

        console.log(
            `🌐 Router: URL changed to ${location.pathname}, mapped to room: ${roomId}`
        );

        if (roomId) {
            // Check if we need to change rooms
            if (!currentRoom || currentRoom.id !== roomId) {
                console.log(
                    `🏠 Router: Room change needed from ${
                        currentRoom?.id || "none"
                    } to ${roomId}`
                );

                isHandlingUrlChange.current = true;

                // Use the room's default entrance position and rotation for proper spawning
                const config = roomConfigs[roomId];
                if (config) {
                    const position = config.defaultEntrance.position;
                    const rotation = config.defaultEntrance.rotation;

                    // Ensure spawn position is safely above the floor
                    const safePosition: [number, number, number] = [
                        position[0],
                        Math.max(position[1], 1.5), // Ensure at least 1.5 units above ground
                        position[2],
                    ];

                    console.log(
                        `📍 Router: Spawning at entrance position`,
                        safePosition,
                        `rotation`,
                        rotation
                    );
                    teleportToRoom(roomId, safePosition, rotation);
                } else {
                    console.error(
                        `❌ Router: Room config not found for ${roomId}`
                    );
                }

                // Reset flag after a short delay
                setTimeout(() => {
                    isHandlingUrlChange.current = false;
                }, 200);
            }
        } else {
            // Unknown path, redirect to atrium
            console.log(
                `❓ Router: Unknown path ${location.pathname}, redirecting to atrium`
            );
            navigate("/atrium", { replace: true });
        }
    }, [location.pathname, currentRoom, teleportToRoom, navigate]);

    // Initialize the scene on first load
    useEffect(() => {
        if (!currentRoom) {
            const roomId = getRoomIdFromPath(location.pathname) || "atrium";
            console.log(
                `🎬 Router: Initial load, loading room ${roomId} FIRST from path ${location.pathname}`
            );

            // CRITICAL: Load the room FIRST, then teleport player
            // This ensures collision bodies exist before player spawns
            const config = roomConfigs[roomId];
            if (config) {
                console.log(
                    `📋 Router: Setting currentRoom to load collision bodies`
                );
                // Load room immediately (this renders the floor)
                loadRoom(roomId);

                // Wait for room to render, then teleport player
                setTimeout(() => {
                    const position = config.defaultEntrance.position;
                    const rotation = config.defaultEntrance.rotation;

                    // Use exact position from room config
                    const safePosition: [number, number, number] = position;

                    console.log(
                        `📍 Router: Room loaded, now spawning player at`,
                        safePosition
                    );

                    // Set player position and teleport flag
                    teleportToRoom(roomId, safePosition, rotation);
                }, 100); // Short delay for room to render
            } else {
                console.error(
                    `❌ Router: Room config not found for initial load: ${roomId}`
                );
            }
        }
    }, [currentRoom, location.pathname, loadRoom, teleportToRoom]);

    return {
        navigateToRoom,
        currentPath: location.pathname,
        currentRoute: getRouteByPath(location.pathname),
    };
};
