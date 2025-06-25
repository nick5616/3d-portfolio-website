import { Scene } from "./components/core/Scene";
import Interface from "./components/ui/Interface";
import { VirtualControls } from "./components/ui/VirtualControls";
import { useDeviceDetection } from "./hooks/useDeviceDetection";
import { useSceneStore } from "./stores/sceneStore";
import { useEffect, useState } from "react";

// Define the missing orientation type
interface OrientationLock {
    lock(orientation: "portrait" | "landscape"): Promise<void>;
}

export default function App() {
    const { isMobile } = useDeviceDetection();
    const { updateMobileDetection } = useSceneStore();
    const [isLandscape, setIsLandscape] = useState(false);

    // Handle orientation changes and set meta viewport
    useEffect(() => {
        // Add viewport meta tag for better mobile experience
        const updateViewportMeta = () => {
            let viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) {
                viewportMeta = document.createElement("meta");
                viewportMeta.setAttribute("name", "viewport");
                document.head.appendChild(viewportMeta);
            }

            viewportMeta.setAttribute(
                "content",
                "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
            );
        };

        updateViewportMeta();

        // Listen for orientation changes
        const handleOrientationChange = () => {
            const isLandscapeMode = window.innerWidth > window.innerHeight;
            setIsLandscape(isLandscapeMode);
            // Update mobile detection on resize/orientation change
            updateMobileDetection();
        };

        // Initial check
        handleOrientationChange();

        // Add listener
        window.addEventListener("resize", handleOrientationChange);

        // Automatically enter fullscreen and lock to landscape on mobile
        if (isMobile) {
            const enterFullscreenOnFirstInteraction = () => {
                const element = document.documentElement;
                if (element.requestFullscreen) {
                    element
                        .requestFullscreen()
                        .then(() => {
                            try {
                                // Try to lock to landscape if supported
                                const screenOrientation = window.screen
                                    .orientation as unknown as OrientationLock;
                                if (
                                    screenOrientation &&
                                    screenOrientation.lock
                                ) {
                                    screenOrientation
                                        .lock("landscape")
                                        .catch((error: Error) => {
                                            // Removed console.log for production
                                        });
                                }
                            } catch (err) {
                                // Removed console.error for production
                            }
                        })
                        .catch((err) => {
                            // Removed console.error for production
                        });
                }

                // Remove listener after first interaction
                document.removeEventListener(
                    "touchstart",
                    enterFullscreenOnFirstInteraction
                );
                document.removeEventListener(
                    "click",
                    enterFullscreenOnFirstInteraction
                );
            };

            // Add listeners to enter fullscreen on first interaction
            document.addEventListener(
                "touchstart",
                enterFullscreenOnFirstInteraction
            );
            document.addEventListener(
                "click",
                enterFullscreenOnFirstInteraction
            );

            return () => {
                window.removeEventListener("resize", handleOrientationChange);
                document.removeEventListener(
                    "touchstart",
                    enterFullscreenOnFirstInteraction
                );
                document.removeEventListener(
                    "click",
                    enterFullscreenOnFirstInteraction
                );
            };
        }

        return () => {
            window.removeEventListener("resize", handleOrientationChange);
        };
    }, [isMobile, updateMobileDetection]);

    return (
        <main
            className={`w-screen h-screen overflow-hidden ${
                isMobile ? "touch-none" : ""
            }`}
        >
            {/* Full viewport scene */}
            <Scene />

            {/* Interface overlaid on top */}
            <Interface />

            {/* Virtual controls for mobile devices */}
            <VirtualControls />
        </main>
    );
}
