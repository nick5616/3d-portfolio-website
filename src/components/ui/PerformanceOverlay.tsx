// src/components/ui/PerformanceOverlay.tsx
import React, { useRef, useEffect, useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const PerformanceOverlay: React.FC = () => {
    const { performance: performanceSettings } = useSceneStore();
    const { isMobile } = useDeviceDetection();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastTimeRef = useRef<number>(window.performance.now());
    const frameCountRef = useRef<number>(0);
    const rafRef = useRef<number>();
    const [currentFps, setCurrentFps] = useState(0);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                // Keep the canvas small and consistent
                canvasRef.current.width = 50;
                canvasRef.current.height = 25;
            }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Animation frame loop
        const animate = () => {
            frameCountRef.current++;
            const currentTime = window.performance.now();
            const elapsed = currentTime - lastTimeRef.current;

            if (elapsed >= 1000) {
                const fps = (frameCountRef.current * 1000) / elapsed;
                setCurrentFps(Math.round(fps));

                frameCountRef.current = 0;
                lastTimeRef.current = currentTime;

                // Draw simple FPS counter
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Use the appropriate color based on FPS
                        ctx.fillStyle = getFpsColor(Math.round(fps));
                        ctx.font = "10px monospace";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(
                            `${Math.round(fps)} FPS`,
                            canvas.width / 2,
                            canvas.height / 2
                        );
                    }
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // Determine FPS color based on performance
    const getFpsColor = (fps: number) => {
        if (fps >= 50) return "#00ff00"; // Green for good FPS
        if (fps >= 30) return "#ffff00"; // Yellow for ok FPS
        return "#ff0000"; // Red for poor FPS
    };

    return (
        <div className="fixed top-2 right-2 z-40">
            <canvas
                ref={canvasRef}
                className="rounded-sm shadow-sm"
                style={{
                    width: "50px",
                    height: "25px",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    border: `1px solid ${getFpsColor(currentFps)}`,
                }}
            />
        </div>
    );
};
