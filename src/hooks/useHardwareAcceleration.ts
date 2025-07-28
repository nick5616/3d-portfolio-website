import { useState, useEffect } from "react";

interface HardwareAccelerationInfo {
    isHardwareAccelerationDisabled: boolean;
    isDetecting: boolean;
}

export const useHardwareAcceleration = (): HardwareAccelerationInfo => {
    const [isHardwareAccelerationDisabled, setIsHardwareAccelerationDisabled] =
        useState(false);
    const [isDetecting, setIsDetecting] = useState(true);

    useEffect(() => {
        const detectHardwareAcceleration = () => {
            try {
                // Method 1: Check WebGL context
                const canvas = document.createElement("canvas");
                const gl =
                    canvas.getContext("webgl") ||
                    canvas.getContext("experimental-webgl");

                if (!gl) {
                    console.log(
                        "Hardware acceleration detection: DISABLED (WebGL not available)"
                    );
                    setIsHardwareAccelerationDisabled(true);
                    setIsDetecting(false);
                    return;
                }

                // Method 2: Check for software rendering indicators
                const debugInfo = (gl as WebGLRenderingContext).getExtension(
                    "WEBGL_debug_renderer_info"
                );
                if (debugInfo) {
                    const renderer = (gl as WebGLRenderingContext).getParameter(
                        debugInfo.UNMASKED_RENDERER_WEBGL
                    );
                    const vendor = (gl as WebGLRenderingContext).getParameter(
                        debugInfo.UNMASKED_VENDOR_WEBGL
                    );

                    // Check for software renderer indicators
                    const softwareRenderers = [
                        "llvmpipe",
                        "swiftshader",
                        "software",
                        "mesa",
                        "virgl",
                        "llvmpipe",
                        "softpipe",
                        "swr",
                        "d3d11",
                        "d3d12",
                        "opengl",
                        "vulkan",
                    ];

                    const isSoftwareRenderer = softwareRenderers.some(
                        (rendererName) =>
                            renderer
                                .toLowerCase()
                                .includes(rendererName.toLowerCase()) ||
                            vendor
                                .toLowerCase()
                                .includes(rendererName.toLowerCase())
                    );

                    if (isSoftwareRenderer) {
                        console.log(
                            "Hardware acceleration detection: DISABLED (software renderer detected)",
                            { renderer, vendor }
                        );
                        setIsHardwareAccelerationDisabled(true);
                        setIsDetecting(false);
                        return;
                    }
                }

                // Method 3: Check for specific browser flags
                const userAgent = navigator.userAgent.toLowerCase();
                const isChrome = userAgent.includes("chrome");
                const isFirefox = userAgent.includes("firefox");
                const isSafari =
                    userAgent.includes("safari") &&
                    !userAgent.includes("chrome");
                const isEdge = userAgent.includes("edge");

                // Check for common hardware acceleration disable flags
                const hasDisableFlag =
                    (isChrome &&
                        (userAgent.includes("--disable-gpu") ||
                            userAgent.includes(
                                "--disable-software-rasterizer"
                            ))) ||
                    (isFirefox &&
                        userAgent.includes("layers.acceleration.disabled")) ||
                    (isSafari && userAgent.includes("webgl")) ||
                    (isEdge && userAgent.includes("disable-gpu"));

                if (hasDisableFlag) {
                    setIsHardwareAccelerationDisabled(true);
                    setIsDetecting(false);
                    return;
                }

                // Method 4: Performance-based detection
                const testCanvas = document.createElement("canvas");
                testCanvas.width = 100;
                testCanvas.height = 100;
                const testCtx = testCanvas.getContext("2d");

                if (testCtx) {
                    const startTime = performance.now();

                    // Perform some rendering operations
                    for (let i = 0; i < 1000; i++) {
                        testCtx.fillStyle = `rgb(${i % 255}, ${i % 255}, ${
                            i % 255
                        })`;
                        testCtx.fillRect(i % 100, i % 100, 10, 10);
                    }

                    const endTime = performance.now();
                    const renderTime = endTime - startTime;

                    // If rendering takes too long, it might indicate software rendering
                    if (renderTime > 50) {
                        // 50ms threshold
                        setIsHardwareAccelerationDisabled(true);
                        setIsDetecting(false);
                        return;
                    }
                }

                // If we get here, hardware acceleration appears to be enabled
                console.log("Hardware acceleration detection: ENABLED");
                setIsHardwareAccelerationDisabled(false);
                setIsDetecting(false);
            } catch (error) {
                console.warn("Hardware acceleration detection failed:", error);
                // Default to assuming hardware acceleration is disabled if detection fails
                setIsHardwareAccelerationDisabled(true);
                setIsDetecting(false);
            }
        };

        // Run detection after a short delay to ensure DOM is ready
        const timeoutId = setTimeout(detectHardwareAcceleration, 100);

        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    return {
        isHardwareAccelerationDisabled,
        isDetecting,
    };
};
