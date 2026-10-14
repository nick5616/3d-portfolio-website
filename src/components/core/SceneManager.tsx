import { useShallow } from "zustand/react/shallow";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { Room } from "./Room";
import { CameraController } from "./CameraController";
import { Door } from "./Door";
import { RouterIntegration } from "./RouterIntegration";
import { ArtAimController } from "./ArtAimController";
import { FairyCompanion } from "../models/FairyCompanion";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { updateAllShaders } from "../../configs/enhancedMaterials";
import { roomConfigs } from "../../configs/rooms";

// Reflections come from a tiny procedural environment built out of a few
// glowing panels (Lightformers) instead of drei's HDR presets. The presets
// downloaded a 1-2 MB HDR from a third-party CDN and re-ran PMREM every
// time the room changed - even for rooms that then set its intensity to 0.
interface EnvLook {
    intensity: number;
    sky: string; // big overhead panel
    key: string; // warm/cool side panel
    fill: string; // opposite side panel
}

const getEnvLook = (roomId: string | undefined, quality: string): EnvLook | null => {
    const base = quality === "low" ? 0.3 : 0.6;
    if (roomId && roomConfigs[roomId]?.galleryRoomKind) {
        // The gallery wing's marble picks up soft, warm reflections.
        return { intensity: base * 0.6, sky: "#fff4e0", key: "#ffe2b8", fill: "#cfe0ff" };
    }
    switch (roomId) {
        case "projects":
            return { intensity: base * 0.8, sky: "#9fd8ff", key: "#00e5ff", fill: "#b04dff" };
        case "atrium":
            return { intensity: base * 1.2, sky: "#fff7d6", key: "#ffe08a", fill: "#8fd3c7" };
        case "jam-room":
            return { intensity: base * 1.1, sky: "#ffe6fb", key: "#ff8ad8", fill: "#8ff0ff" };
        case "bird-dog-studio":
            return { intensity: base * 0.9, sky: "#2a2240", key: "#b48cff", fill: "#ff9a5a" };
        case "rupee-shop":
            return { intensity: base * 1.1, sky: "#fff1d6", key: "#ffc56b", fill: "#3ee58f" };
        case "relaxation":
            return { intensity: base * 1.5, sky: "#e6f3ff", key: "#b3d9ff", fill: "#d6ffe6" };
        case "achievements":
            return { intensity: base * 1.2, sky: "#fff1d6", key: "#ffc56b", fill: "#ffe9c7" };
        case "cosmic-connect-four":
            // Violet space, gold from Nothing: what the gems reflect.
            return { intensity: base * 1.4, sky: "#3a2c78", key: "#ffcf7a", fill: "#7a4dff" };
        default:
            return { intensity: base, sky: "#ffffff", key: "#fff0dd", fill: "#dde8ff" };
    }
};

export const SceneManager: React.FC = () => {
    const { scene, gl } = useThree();
    const { currentRoom, performance, customEnvironment } = useSceneStore(
        useShallow((s) => ({
            currentRoom: s.currentRoom,
            performance: s.performance,
            customEnvironment: s.customEnvironment,
        }))
    );
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
        scene.fog = new THREE.Fog("#000000", 20, 30);
        // Tone mapping itself is owned by <Canvas> (ACES normally, none in
        // `flat` low-quality mode); this only sets how bright it is. Shadows
        // are intentionally off renderer-wide - almost nothing in the scene
        // received them, so the shadow passes were pure cost.
        gl.toneMappingExposure = 1.0;
    }, [scene, gl]);

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

        // Throttled shader updates - skip on low quality
        if (
            performance.quality !== "low" &&
            now - lastShaderUpdate.current >= shaderUpdateInterval
        ) {
            try {
                updateAllShaders(clock.elapsedTime);
                lastShaderUpdate.current = now;
            } catch (error) {
                console.warn("Shader update failed, skipping:", error);
            }
        }
    });

    const envLook = customEnvironment
        ? null
        : getEnvLook(currentRoom?.id, performance.quality);

    return (
        <>
            <RouterIntegration />

            {/* Global fill light; each room adds its own key lighting */}
            <hemisphereLight
                intensity={customEnvironment ? 0 : 0.35}
                color="#f0f8ff"
                groundColor="#3a3226"
            />
            <directionalLight
                position={[10, 10, 5]}
                intensity={customEnvironment ? 0 : 0.6}
            />

            {envLook && (
                <Environment
                    key={currentRoom?.id}
                    frames={1}
                    resolution={64}
                    background={false}
                    environmentIntensity={envLook.intensity}
                >
                    <Lightformer
                        form="rect"
                        intensity={2}
                        color={envLook.sky}
                        position={[0, 5, 0]}
                        rotation-x={Math.PI / 2}
                        scale={[10, 10, 1]}
                    />
                    <Lightformer
                        form="rect"
                        intensity={1.5}
                        color={envLook.key}
                        position={[-5, 1, -1]}
                        rotation-y={Math.PI / 2}
                        scale={[10, 3, 1]}
                    />
                    <Lightformer
                        form="rect"
                        intensity={1}
                        color={envLook.fill}
                        position={[5, 1, 1]}
                        rotation-y={-Math.PI / 2}
                        scale={[10, 3, 1]}
                    />
                </Environment>
            )}

            <CameraController />
            <ArtAimController />
            <FairyCompanion />

            {/* Render only the current room */}
            {currentRoom && (
                <>
                    <Room key={currentRoom.id} config={currentRoom} />
                    {currentRoom.archways.map((archway) => (
                        <Door key={archway.id} archway={archway} />
                    ))}
                </>
            )}
        </>
    );
};
