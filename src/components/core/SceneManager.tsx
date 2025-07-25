import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Environment } from "@react-three/drei";
import { Room } from "./Room";
import { CameraController } from "./CameraController";
import { Door } from "./Door";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";
import { updateAllShaders } from "../../configs/enhancedMaterials";

export const SceneManager: React.FC = () => {
    const { scene, gl } = useThree();
    const { currentRoom, loadRoom, performance } = useSceneStore();
    const fpsGraph = useRef<number[]>([]);

    // Throttling refs to reduce update frequency
    const lastShaderUpdate = useRef(0);
    const lastPerformanceUpdate = useRef(0);

    // Adaptive update intervals based on performance quality
    const shaderUpdateInterval =
        performance.quality === "low"
            ? 1000 / 20 // 20fps
            : performance.quality === "medium"
            ? 1000 / 30 // 30fps
            : 1000 / 60; // 60fps for high quality

    const performanceUpdateInterval = 1000; // Only update performance stats once per second

    useEffect(() => {
        // Initialize scene with enhanced settings
        scene.fog = new THREE.Fog("#000000", 10, 20);

        // Enable shadows for enhanced lighting
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;

        if (!currentRoom) {
            loadRoom("atrium");
        }
    }, [scene, loadRoom, currentRoom, gl]);

    useFrame(({ gl, clock }) => {
        const now = window.performance.now();

        // Throttled performance monitoring
        if (
            performance.monitoring &&
            now - lastPerformanceUpdate.current >= performanceUpdateInterval
        ) {
            fpsGraph.current.push(gl.info.render.frame);
            if (fpsGraph.current.length > 100) fpsGraph.current.shift();
            lastPerformanceUpdate.current = now;
        }

        // Throttled shader updates - skip on low quality or when overheating
        if (
            performance.quality !== "low" &&
            now - lastShaderUpdate.current >= shaderUpdateInterval
        ) {
            try {
                updateAllShaders(clock.elapsedTime);
                lastShaderUpdate.current = now;
            } catch (error) {
                // Enhanced shaders not available, skip
                console.warn("Shader update failed, skipping:", error);
            }
        }
    });

    return (
        <>
            {/* Enhanced lighting setup */}
            <ambientLight intensity={0.3} color="#f0f8ff" />
            <directionalLight
                position={[10, 10, 5]}
                intensity={0.8}
                castShadow={performance.quality !== "low"}
                shadow-mapSize={
                    performance.quality === "high" ? [2048, 2048] : [1024, 1024]
                }
                shadow-camera-far={50}
                shadow-camera-left={-50}
                shadow-camera-right={50}
                shadow-camera-top={50}
                shadow-camera-bottom={-50}
            />

            {/* Environment with enhanced settings */}
            <Environment
                preset="city"
                background={false}
                environmentIntensity={performance.quality === "low" ? 0.3 : 0.6}
            />

            <CameraController />

            {/* Render only the current room */}
            {currentRoom && (
                <>
                    <Room key={currentRoom.id} config={currentRoom} />
                    {/* Render doors for the current room's archways */}
                    {currentRoom.archways.map((archway) => (
                        <Door key={archway.id} archway={archway} />
                    ))}
                </>
            )}
        </>
    );
};
