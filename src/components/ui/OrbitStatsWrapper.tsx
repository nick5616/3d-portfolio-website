import { useEffect, useRef } from "react";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";

export const OrbitStatsWrapper: React.FC = () => {
    const statsRef = useRef<Stats>();
    const containerRef = useRef<HTMLDivElement>(null);
    const { isMobile } = useDeviceDetection();
    console.log("isMobile!!!", isMobile);

    useEffect(() => {
        // Don't show on mobile
        if (isMobile) return;

        // Create stats object
        const stats = new Stats();
        statsRef.current = stats;

        // Add stats panel to the container
        if (containerRef.current) {
            containerRef.current.appendChild(stats.dom);

            // Style the stats DOM element - keep it normal size and in the top right
            stats.dom.style.position = "absolute";
            stats.dom.style.top = "0px";
            stats.dom.style.right = "0px";
            stats.dom.style.left = "auto";
            stats.dom.style.zIndex = "9999";

            // Remove all scaling and size manipulation to keep it natural
            stats.dom.style.transform = "none";

            // Make sure there are no explicit width/height constraints
            if (stats.dom.style.width) stats.dom.style.width = "auto";
            if (stats.dom.style.height) stats.dom.style.height = "auto";
        }

        // Start animation loop
        const animate = () => {
            stats.update();
            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationId);
            if (
                containerRef.current &&
                stats.dom &&
                containerRef.current.contains(stats.dom)
            ) {
                containerRef.current.removeChild(stats.dom);
            }
        };
    }, [isMobile]);

    console.log("isMobile", isMobile);
    // On mobile, return null to not render anything
    if (isMobile) return null;

    // On desktop, render just the container - no toggle button
    return (
        <div
            ref={containerRef}
            style={{
                position: "fixed",
                top: 0,
                right: 0,
                pointerEvents: "none",
                zIndex: 9999,
            }}
        />
    );
};
