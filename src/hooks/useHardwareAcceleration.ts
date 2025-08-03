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

                    console.log("WebGL Renderer:", renderer);
                    console.log("WebGL Vendor:", vendor);

                    // Updated software renderer list - more specific to avoid false positives
                    const softwareRenderers = [
                        "llvmpipe",
                        "swiftshader",
                        "virgl",
                        "softpipe",
                        "swr",
                        "mesa llvmpipe",
                        "mesa softpipe",
                        "software rasterizer",
                        "software renderer",
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

                // Method 3: Check for specific browser flags (improved for Edge)
                const userAgent = navigator.userAgent.toLowerCase();
                const isChrome = userAgent.includes("chrome") && !userAgent.includes("edge");
                const isFirefox = userAgent.includes("firefox");
                const isSafari =
                    userAgent.includes("safari") &&
                    !userAgent.includes("chrome");
                const isEdge = userAgent.includes("edge");

                // More specific flag detection to avoid false positives
                const hasDisableFlag =
                    (isChrome &&
                        (userAgent.includes("--disable-gpu") ||
                            userAgent.includes(
                                "--disable-software-rasterizer"
                            ))) ||
                    (isFirefox &&
                        userAgent.includes("layers.acceleration.disabled")) ||
                    (isSafari && userAgent.includes("webgl")) ||
                    // Edge-specific: only check for explicit disable flags
                    (isEdge && 
                        (userAgent.includes("--disable-gpu") ||
                         userAgent.includes("--disable-software-rasterizer")));

                if (hasDisableFlag) {
                    console.log("Hardware acceleration detection: DISABLED (browser flag detected)");
                    setIsHardwareAccelerationDisabled(true);
                    setIsDetecting(false);
                    return;
                }

                // Method 4: Performance-based detection (adjusted for Edge)
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

                    // Increased threshold for Edge to reduce false positives
                    const threshold = isEdge ? 100 : 50; // 100ms for Edge, 50ms for others
                    
                    if (renderTime > threshold) {
                        console.log(`Hardware acceleration detection: DISABLED (performance threshold exceeded: ${renderTime.toFixed(2)}ms)`);
                        setIsHardwareAccelerationDisabled(true);
                        setIsDetecting(false);
                        return;
                    }
                }

                // Method 5: Additional Edge-specific checks
                if (isEdge) {
                    // Check if WebGL is working properly in Edge
                    try {
                        const testCanvas = document.createElement("canvas");
                        const testGl = testCanvas.getContext("webgl");
                        if (testGl) {
                            // Test basic WebGL operations
                            const program = testGl.createProgram();
                            if (program) {
                                testGl.deleteProgram(program);
                            }
                            
                            // Additional Edge-specific WebGL tests
                            const maxTextureSize = testGl.getParameter(testGl.MAX_TEXTURE_SIZE);
                            const maxViewportDims = testGl.getParameter(testGl.MAX_VIEWPORT_DIMS);
                            
                            console.log("Edge WebGL capabilities:", {
                                maxTextureSize,
                                maxViewportDims,
                                hasWebGL: true
                            });
                            
                            // If Edge has reasonable WebGL capabilities, assume hardware acceleration is working
                            if (maxTextureSize >= 2048 && maxViewportDims[0] >= 2048) {
                                console.log("Edge WebGL capabilities look good - hardware acceleration likely enabled");
                            }
                        }
                    } catch (error) {
                        console.log("Hardware acceleration detection: DISABLED (Edge WebGL test failed)");
                        setIsHardwareAccelerationDisabled(true);
                        setIsDetecting(false);
                        return;
                    }
                }

                // Method 6: Check for specific Edge hardware acceleration issues
                if (isEdge) {
                    // Edge sometimes reports hardware acceleration as disabled even when it's enabled
                    // This is a known issue with certain Edge versions
                    const edgeVersion = userAgent.match(/edge\/(\d+)/i);
                    if (edgeVersion) {
                        const version = parseInt(edgeVersion[1]);
                        console.log(`Edge version detected: ${version}`);
                        
                        // For newer Edge versions, be more lenient with detection
                        if (version >= 79) {
                            console.log("Modern Edge detected - using more lenient hardware acceleration detection");
                            // If we've made it this far in a modern Edge, assume hardware acceleration is working
                            console.log("Hardware acceleration detection: ENABLED (modern Edge)");
                            setIsHardwareAccelerationDisabled(false);
                            setIsDetecting(false);
                            return;
                        }
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
