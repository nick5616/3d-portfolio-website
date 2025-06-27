import React, { Suspense, useEffect, useState } from "react";
import { Scene } from "./components/core/Scene";
import Interface from "./components/ui/Interface";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { useDeviceDetection } from "./hooks/useDeviceDetection";
import { useSceneStore } from "./stores/sceneStore";

export default function App() {
    const { isMobile } = useDeviceDetection();
    const { setPerformanceQuality } = useSceneStore();
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        // Optimize performance for real mobile devices
        if (isMobile) {
            console.log(
                "Mobile device detected - setting low performance quality"
            );
            setPerformanceQuality("low");
        }
    }, [isMobile, setPerformanceQuality]);

    useEffect(() => {
        if (isMobile) {
            // Handle orientation changes
            const handleOrientationChange = () => {
                // Force reflow after orientation change
                setTimeout(() => {
                    window.dispatchEvent(new Event("resize"));
                }, 100);
            };

            // Enhanced fullscreen functionality for mobile
            const requestFullscreen = async () => {
                try {
                    const element = document.documentElement;

                    // Try different fullscreen methods
                    if (element.requestFullscreen) {
                        await element.requestFullscreen();
                    } else if ((element as any).webkitRequestFullscreen) {
                        await (element as any).webkitRequestFullscreen();
                    } else if ((element as any).mozRequestFullScreen) {
                        await (element as any).mozRequestFullScreen();
                    } else if ((element as any).msRequestFullscreen) {
                        await (element as any).msRequestFullscreen();
                    }

                    console.log("Fullscreen activated successfully");
                } catch (error) {
                    console.log("Fullscreen failed:", error);

                    // Fallback: Try to hide address bar on iOS Safari
                    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                        // Scroll slightly to hide the address bar
                        window.scrollTo(0, 1);
                        setTimeout(() => window.scrollTo(0, 0), 100);
                    }
                }
            };

            const enterFullscreenOnFirstInteraction = async (event: Event) => {
                if (hasInteracted) return;

                setHasInteracted(true);
                console.log(
                    "First interaction detected, attempting fullscreen"
                );

                // Small delay to ensure event is processed
                setTimeout(async () => {
                    await requestFullscreen();
                }, 50);

                // Remove listener after first interaction
                document.removeEventListener(
                    "touchstart",
                    enterFullscreenOnFirstInteraction
                );
                document.removeEventListener(
                    "click",
                    enterFullscreenOnFirstInteraction
                );
                document.removeEventListener(
                    "keydown",
                    enterFullscreenOnFirstInteraction
                );
            };

            // Add listeners to enter fullscreen on first interaction
            document.addEventListener(
                "touchstart",
                enterFullscreenOnFirstInteraction,
                { passive: true }
            );
            document.addEventListener(
                "click",
                enterFullscreenOnFirstInteraction
            );
            document.addEventListener(
                "keydown",
                enterFullscreenOnFirstInteraction
            );

            // Handle fullscreen exit
            const handleFullscreenChange = () => {
                const isFullscreen = !!(
                    document.fullscreenElement ||
                    (document as any).webkitFullscreenElement ||
                    (document as any).mozFullScreenElement ||
                    (document as any).msFullscreenElement
                );

                if (!isFullscreen && hasInteracted) {
                    console.log("Fullscreen exited");
                    // Optionally try to re-enter fullscreen after a delay
                    setTimeout(() => {
                        if (!document.fullscreenElement) {
                            requestFullscreen();
                        }
                    }, 2000);
                }
            };

            document.addEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
            document.addEventListener(
                "webkitfullscreenchange",
                handleFullscreenChange
            );
            document.addEventListener(
                "mozfullscreenchange",
                handleFullscreenChange
            );
            document.addEventListener(
                "MSFullscreenChange",
                handleFullscreenChange
            );

            window.addEventListener("resize", handleOrientationChange);

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
                document.removeEventListener(
                    "keydown",
                    enterFullscreenOnFirstInteraction
                );
                document.removeEventListener(
                    "fullscreenchange",
                    handleFullscreenChange
                );
                document.removeEventListener(
                    "webkitfullscreenchange",
                    handleFullscreenChange
                );
                document.removeEventListener(
                    "mozfullscreenchange",
                    handleFullscreenChange
                );
                document.removeEventListener(
                    "MSFullscreenChange",
                    handleFullscreenChange
                );
            };
        }
    }, [isMobile, hasInteracted]);

    // Initialize modal state for FPS indicator visibility on mobile
    useEffect(() => {
        if (isMobile) {
            // Start with modal-hidden class removed since modal opens by default
            document.body.classList.remove("modal-hidden");
        }
    }, [isMobile]);

    return (
        <Suspense fallback={<LoadingScreen />}>
            <Scene />
            <Interface />
        </Suspense>
    );
}
