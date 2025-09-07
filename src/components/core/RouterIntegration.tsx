// src/components/core/RouterIntegration.tsx
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSceneStore } from "../../stores/sceneStore";
import { getPathFromRoomId } from "../../configs/routing";

/**
 * RouterIntegration component handles the integration between URL routing and the 3D scene.
 * It monitors room changes from door teleportation and updates the URL accordingly.
 * It uses a flag to prevent infinite loops between URL changes and room changes.
 */
export const RouterIntegration: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentRoom } = useSceneStore();
    const isNavigatingFromDoor = useRef(false);
    const lastRoomId = useRef<string | null>(null);

    // Monitor room changes from teleportation (doors, etc.) and update URL
    useEffect(() => {
        if (currentRoom && currentRoom.id !== lastRoomId.current) {
            console.log(
                `🚪 RouterIntegration: Room changed from ${lastRoomId.current} to ${currentRoom.id}`
            );

            // Only update URL if this room change came from a door (not from URL navigation)
            const expectedPath = getPathFromRoomId(currentRoom.id);
            if (expectedPath && location.pathname !== expectedPath) {
                console.log(
                    `🔗 RouterIntegration: Updating URL from ${location.pathname} to ${expectedPath}`
                );
                isNavigatingFromDoor.current = true;
                navigate(expectedPath, { replace: false });

                // Reset the flag after navigation
                setTimeout(() => {
                    isNavigatingFromDoor.current = false;
                }, 100);
            }

            lastRoomId.current = currentRoom.id;
        }
    }, [currentRoom, navigate, location.pathname]);

    // This component doesn't render anything, it just handles URL synchronization
    return null;
};
