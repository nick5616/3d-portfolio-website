import { Scene } from "./components/core/Scene";
import Interface from "./components/ui/Interface";
import { VirtualControls } from "./components/ui/VirtualControls";
import { SceneErrorBoundary } from "./components/core/ErrorBoundary";
import { useDeviceDetection } from "./hooks/useDeviceDetection";
import { useEffect, useState } from "react";

// Removed unsafe OrientationLock interface - using proper type checking instead

export default function App() {
    const { isMobile } = useDeviceDetection();
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
                                const screen = window.screen as any;
                                if (
                                    screen &&
                                    screen.orientation &&
                                    typeof screen.orientation.lock === 'function'
                                ) {
                                    screen.orientation
                                        .lock("landscape")
                                        .catch((error: Error) => {
                                            // Orientation lock failed - this is expected on some devices
                                        });
                                }
                            } catch (err) {
                                // Orientation API not supported on this device
                            }
                        })
                        .catch((err) => {
                            // Fullscreen request failed - this is expected in some browsers
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
    }, [isMobile]);

    return (
        <main
            className={`w-screen h-screen overflow-hidden ${
                isMobile ? "touch-none" : ""
            }`}
        >
            {/* Full viewport scene with error boundary */}
            <SceneErrorBoundary>
                <Scene />
            </SceneErrorBoundary>

            {/* Interface overlaid on top */}
            <Interface />

            {/* Virtual controls for mobile devices */}
            <VirtualControls />
        </main>
    );
}
