// src/components/ui/PerformanceOverlay.tsx
import React, { useRef, useEffect } from "react";

export const PerformanceOverlay: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fpsHistory = useRef<number[]>([]);
    const lastTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const rafRef = useRef<number>();

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                canvasRef.current.width = 200;
                canvasRef.current.height = 100;
            }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Animation frame loop
        const animate = () => {
            frameCountRef.current++;
            const currentTime = performance.now();
            const elapsed = currentTime - lastTimeRef.current;

            if (elapsed >= 1000) {
                const fps = (frameCountRef.current * 1000) / elapsed;
                fpsHistory.current.push(fps);
                if (fpsHistory.current.length > 100) {
                    fpsHistory.current.shift();
                }

                frameCountRef.current = 0;
                lastTimeRef.current = currentTime;

                // Draw the graph
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        ctx.strokeStyle = "#00ff00";
                        ctx.lineWidth = 1;
                        ctx.beginPath();

                        const maxFPS = 120;
                        fpsHistory.current.forEach((fps, i) => {
                            const x = (i / 100) * canvas.width;
                            const y =
                                canvas.height - (fps / maxFPS) * canvas.height;
                            if (i === 0) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                        });

                        ctx.stroke();

                        // Draw current FPS
                        const currentFPS =
                            fpsHistory.current[fpsHistory.current.length - 1];
                        ctx.fillStyle = "#00ff00";
                        ctx.font = "12px monospace";
                        ctx.fillText(
                            `FPS: ${Math.round(currentFPS || 0)}`,
                            10,
                            20
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

    return (
        <div className="absolute top-4 right-4 pointer-events-auto">
            <canvas
                ref={canvasRef}
                className="bg-black bg-opacity-80 rounded-lg"
                style={{ width: "200px", height: "100px" }}
            />
        </div>
    );
};
