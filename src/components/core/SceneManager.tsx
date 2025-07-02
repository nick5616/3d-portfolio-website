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
        // Performance monitoring
        if (performance.monitoring) {
            fpsGraph.current.push(gl.info.render.frame);
            if (fpsGraph.current.length > 100) fpsGraph.current.shift();
        }

        // Update all enhanced shaders
        try {
            updateAllShaders(clock.elapsedTime);
        } catch (error) {
            // Enhanced shaders not available, skip
        }
    });

    return (
        <>
            {/* Enhanced lighting setup */}
            <ambientLight intensity={0.3} color="#f0f8ff" />
            <directionalLight 
                position={[10, 10, 5]} 
                intensity={0.8}
                castShadow
                shadow-mapSize={[2048, 2048]}
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
                environmentIntensity={0.6}
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
