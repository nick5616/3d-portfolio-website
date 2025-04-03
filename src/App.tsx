import { Scene } from "./components/core/Scene";
import Interface from "./components/ui/Interface";
import { useDeviceDetection } from "./hooks/useDeviceDetection";
import { useEffect } from "react";

// Define the missing orientation type
interface OrientationLock {
    lock(orientation: "portrait" | "landscape"): Promise<void>;
}

export default function App() {
    const { isMobile } = useDeviceDetection();

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

        // Lock to landscape on mobile when in fullscreen
        const handleFullscreenChange = () => {
            if (document.fullscreenElement && isMobile) {
                try {
                    // Try to lock to landscape if supported
                    const screenOrientation = window.screen
                        .orientation as unknown as OrientationLock;
                    if (screenOrientation && screenOrientation.lock) {
                        screenOrientation
                            .lock("landscape")
                            .catch((error: Error) => {
                                console.log(
                                    "Could not lock orientation",
                                    error
                                );
                            });
                    }
                } catch (err) {
                    console.error("Orientation API not supported", err);
                }
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
        };
    }, [isMobile]);

    // Function to request fullscreen
    const requestFullscreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().catch((err) => {
                console.error("Error attempting to enable fullscreen:", err);
            });
        }
    };

    return (
        <main
            className={`h-screen w-screen relative ${
                isMobile ? "touch-none" : ""
            }`}
        >
            {/* Scene container maintains its original size */}
            <div className="h-[95vh] w-full">
                <Scene />
            </div>

            {/* Interface is absolutely positioned over everything */}
            <div className="absolute inset-x-0 bottom-0">
                <Interface />
            </div>

            {/* Fullscreen button for mobile */}
            {isMobile && (
                <button
                    onClick={requestFullscreen}
                    className="absolute top-16 right-4 z-50 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full pointer-events-auto"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                        <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
                    </svg>
                </button>
            )}
        </main>
    );
}
