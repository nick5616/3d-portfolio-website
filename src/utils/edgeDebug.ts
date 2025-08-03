/**
 * Edge Hardware Acceleration Debug Utilities
 * 
 * This file contains utilities to help debug hardware acceleration issues
 * specifically in Microsoft Edge browser.
 */

export interface EdgeDebugInfo {
    userAgent: string;
    isEdge: boolean;
    edgeVersion?: number;
    webglAvailable: boolean;
    webglRenderer?: string;
    webglVendor?: string;
    maxTextureSize?: number;
    maxViewportDims?: [number, number];
    performanceTest?: {
        renderTime: number;
        threshold: number;
        passed: boolean;
    };
    hardwareAccelerationStatus: 'enabled' | 'disabled' | 'unknown';
}

export const getEdgeDebugInfo = (): EdgeDebugInfo => {
    const userAgent = navigator.userAgent;
    const isEdge = userAgent.toLowerCase().includes("edge");
    const edgeVersion = userAgent.match(/edge\/(\d+)/i)?.[1] ? parseInt(userAgent.match(/edge\/(\d+)/i)![1]) : undefined;
    
    // Test WebGL
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const webglAvailable = !!gl;
    
    let webglRenderer: string | undefined;
    let webglVendor: string | undefined;
    let maxTextureSize: number | undefined;
    let maxViewportDims: [number, number] | undefined;
    
    if (gl && 'getExtension' in gl) {
        const webglContext = gl as WebGLRenderingContext;
        const debugInfo = webglContext.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
            webglRenderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            webglVendor = webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        }
        maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE);
        maxViewportDims = webglContext.getParameter(webglContext.MAX_VIEWPORT_DIMS);
    }
    
    // Performance test
    const testCanvas = document.createElement("canvas");
    testCanvas.width = 100;
    testCanvas.height = 100;
    const testCtx = testCanvas.getContext("2d");
    
    let performanceTest: { renderTime: number; threshold: number; passed: boolean } | undefined;
    
    if (testCtx) {
        const startTime = performance.now();
        
        for (let i = 0; i < 1000; i++) {
            testCtx.fillStyle = `rgb(${i % 255}, ${i % 255}, ${i % 255})`;
            testCtx.fillRect(i % 100, i % 100, 10, 10);
        }
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        const threshold = isEdge ? 100 : 50;
        const passed = renderTime <= threshold;
        
        performanceTest = { renderTime, threshold, passed };
    }
    
    // Determine hardware acceleration status
    let hardwareAccelerationStatus: 'enabled' | 'disabled' | 'unknown' = 'unknown';
    
    if (!webglAvailable) {
        hardwareAccelerationStatus = 'disabled';
    } else if (isEdge && edgeVersion && edgeVersion >= 79) {
        // Modern Edge with WebGL - likely enabled
        hardwareAccelerationStatus = 'enabled';
    } else if (webglRenderer && webglRenderer.toLowerCase().includes('llvmpipe')) {
        hardwareAccelerationStatus = 'disabled';
    } else if (performanceTest && !performanceTest.passed) {
        hardwareAccelerationStatus = 'disabled';
    } else if (webglAvailable && maxTextureSize && maxTextureSize >= 2048) {
        hardwareAccelerationStatus = 'enabled';
    }
    
    return {
        userAgent,
        isEdge,
        edgeVersion,
        webglAvailable,
        webglRenderer,
        webglVendor,
        maxTextureSize,
        maxViewportDims,
        performanceTest,
        hardwareAccelerationStatus
    };
};

export const logEdgeDebugInfo = (): void => {
    const debugInfo = getEdgeDebugInfo();
    
    console.group("Edge Hardware Acceleration Debug Info");
    console.log("User Agent:", debugInfo.userAgent);
    console.log("Is Edge:", debugInfo.isEdge);
    console.log("Edge Version:", debugInfo.edgeVersion);
    console.log("WebGL Available:", debugInfo.webglAvailable);
    console.log("WebGL Renderer:", debugInfo.webglRenderer);
    console.log("WebGL Vendor:", debugInfo.webglVendor);
    console.log("Max Texture Size:", debugInfo.maxTextureSize);
    console.log("Max Viewport Dimensions:", debugInfo.maxViewportDims);
    
    if (debugInfo.performanceTest) {
        console.log("Performance Test:", {
            renderTime: `${debugInfo.performanceTest.renderTime.toFixed(2)}ms`,
            threshold: `${debugInfo.performanceTest.threshold}ms`,
            passed: debugInfo.performanceTest.passed
        });
    }
    
    console.log("Hardware Acceleration Status:", debugInfo.hardwareAccelerationStatus);
    console.groupEnd();
};

export const testEdgeWebGL = (): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl");
            
            if (!gl || !('createProgram' in gl)) {
                resolve(false);
                return;
            }
            
            const webglContext = gl as WebGLRenderingContext;
            
            // Test basic WebGL operations
            const program = webglContext.createProgram();
            if (program) {
                webglContext.deleteProgram(program);
            }
            
            // Test texture creation
            const texture = webglContext.createTexture();
            if (texture) {
                webglContext.deleteTexture(texture);
            }
            
            // Test buffer creation
            const buffer = webglContext.createBuffer();
            if (buffer) {
                webglContext.deleteBuffer(buffer);
            }
            
            resolve(true);
        } catch (error) {
            console.warn("Edge WebGL test failed:", error);
            resolve(false);
        }
    });
}; 