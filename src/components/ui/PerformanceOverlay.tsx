// src/components/ui/PerformanceOverlay.tsx
import React, { useRef, useEffect, useState } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const PerformanceOverlay: React.FC = () => {
    const { performance: performanceSettings, setPerformanceQuality } =
        useSceneStore();
    const { isMobile } = useDeviceDetection();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastTimeRef = useRef<number>(window.performance.now());
    const frameCountRef = useRef<number>(0);
    const rafRef = useRef<number>();
    const [currentFps, setCurrentFps] = useState(0);

    // Auto-quality adjustment refs
    const fpsHistoryRef = useRef<number[]>([]);
    const lastQualityAdjustmentRef = useRef<number>(0);
    const QUALITY_ADJUSTMENT_COOLDOWN = 5000; // 5 seconds between adjustments
    const LOW_FPS_THRESHOLD = 20; // Below this, reduce quality
    const HIGH_FPS_THRESHOLD = 45; // Above this, can try increasing quality

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
                const roundedFps = Math.round(fps);
                setCurrentFps(roundedFps);

                // Track FPS history for auto-quality adjustment
                fpsHistoryRef.current.push(roundedFps);
                if (fpsHistoryRef.current.length > 10) {
                    fpsHistoryRef.current.shift(); // Keep last 10 seconds
                }

                // Auto-adjust quality based on performance
                const now = currentTime;
                if (
                    now - lastQualityAdjustmentRef.current >=
                    QUALITY_ADJUSTMENT_COOLDOWN
                ) {
                    adjustQualityBasedOnFPS();
                    lastQualityAdjustmentRef.current = now;
                }

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
                        ctx.fillStyle = getFpsColor(roundedFps);
                        ctx.font = "10px monospace";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(
                            `${roundedFps} FPS`,
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

    // Auto-adjust quality based on FPS performance
    const adjustQualityBasedOnFPS = () => {
        if (fpsHistoryRef.current.length < 3) return; // Need some history

        const avgFps =
            fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
            fpsHistoryRef.current.length;
        const currentQuality = performanceSettings.quality;

        // Check if we need to reduce quality due to low FPS
        if (avgFps < LOW_FPS_THRESHOLD && currentQuality !== "low") {
            const newQuality = currentQuality === "high" ? "medium" : "low";
            console.warn(
                `🔥 Performance degraded (${avgFps.toFixed(
                    1
                )} FPS). Reducing quality from ${currentQuality} to ${newQuality}`
            );
            setPerformanceQuality(newQuality);
        }
        // Check if we can increase quality due to good FPS
        else if (avgFps > HIGH_FPS_THRESHOLD && currentQuality !== "high") {
            const newQuality = currentQuality === "low" ? "medium" : "high";
            console.log(
                `✨ Performance improved (${avgFps.toFixed(
                    1
                )} FPS). Increasing quality from ${currentQuality} to ${newQuality}`
            );
            setPerformanceQuality(newQuality);
        }
    };

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
            {/* Quality indicator */}
            <div className="text-xs text-white mt-1 text-center opacity-60">
                {performanceSettings.quality.toUpperCase()}
            </div>
        </div>
    );
};
