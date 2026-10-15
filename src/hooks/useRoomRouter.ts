import { useShallow } from "zustand/react/shallow";
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
import { WORLD_ONLY } from "../utils/site";

export const useRoomRouter = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentRoom, teleportToRoom } = useSceneStore(
        useShallow((s) => ({ currentRoom: s.currentRoom, teleportToRoom: s.teleportToRoom }))
    );
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
                document.title = WORLD_ONLY ? route.title : `${route.title} · Nicole Belovoskey`;
            }
        },
        [navigate, location.pathname, teleportToRoom]
    );

    // Track previous pathname so we only respond to actual URL changes,
    // not to currentRoom changes from door teleportation.
    const prevPathname = useRef(location.pathname);

    // Handle URL changes (browser navigation, direct links)
    useEffect(() => {
        // Prevent handling URL changes that we initiated ourselves
        if (isHandlingUrlChange.current) {
            console.log(
                `🔄 Router: Skipping URL change handling (self-initiated)`
            );
            prevPathname.current = location.pathname;
            return;
        }

        // Only act when the URL actually changed (browser back/forward, direct link).
        // Skip when this effect fires due to currentRoom changing from a door
        // teleport — RouterIntegration handles URL sync for that case.
        if (prevPathname.current === location.pathname) {
            return;
        }
        prevPathname.current = location.pathname;

        const roomId = getRoomIdFromPath(location.pathname);

        console.log(
            `🌐 Router: URL changed to ${location.pathname}, mapped to room: ${roomId}`
        );

        if (roomId) {
            const { currentRoom: storeRoom } = useSceneStore.getState();

            // Check if we need to change rooms
            if (!storeRoom || storeRoom.id !== roomId) {
                console.log(
                    `🏠 Router: Room change needed from ${
                        storeRoom?.id || "none"
                    } to ${roomId}`
                );

                isHandlingUrlChange.current = true;

                // Use the room's default entrance position and rotation for proper spawning
                const config = roomConfigs[roomId];
                if (config) {
                    const position = config.defaultEntrance.position;
                    const rotation = config.defaultEntrance.rotation;

                    console.log(
                        `📍 Router: Spawning at entrance position`,
                        position,
                        `rotation`,
                        rotation
                    );
                    teleportToRoom(roomId, position, rotation);
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
    }, [location.pathname, teleportToRoom, navigate]);

    // Initialize the scene on first load
    useEffect(() => {
        if (!currentRoom) {
            const roomId = getRoomIdFromPath(location.pathname) || "atrium";
            console.log(
                `🎬 Router: Initial load, loading room ${roomId} from path ${location.pathname}`
            );

            const config = roomConfigs[roomId];
            if (config) {
                const position = config.defaultEntrance.position;
                const rotation = config.defaultEntrance.rotation;

                console.log(
                    `📍 Router: Teleporting player to entrance`,
                    position
                );

                teleportToRoom(roomId, position, rotation);
            } else {
                console.error(
                    `❌ Router: Room config not found for initial load: ${roomId}`
                );
            }
        }
    }, [currentRoom, location.pathname, teleportToRoom]);

    return {
        navigateToRoom,
        currentPath: location.pathname,
        currentRoute: getRouteByPath(location.pathname),
    };
};
