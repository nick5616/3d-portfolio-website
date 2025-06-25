import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Environment } from "@react-three/drei";
import { Room } from "./Room";
import { CameraController } from "./CameraController";
import { RoomTransitionTrigger } from "./RoomTransitionTrigger";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";

export const SceneManager: React.FC = () => {
    const { scene } = useThree();
    const { 
        loadRoom, 
        performance, 
        currentRoomId, 
        currentRoom,
        getAdjacentRoomIds,
        shouldRenderRoom,
        isTransitioning 
    } = useSceneStore();
    const fpsGraph = useRef<number[]>([]);

    useEffect(() => {
        // Initialize scene
        scene.fog = new THREE.Fog("#000000", 10, 20);
        loadRoom("atrium");
    }, [loadRoom, scene]);

    useFrame(({ gl }) => {
        // Performance monitoring
        if (performance.monitoring) {
            fpsGraph.current.push(gl.info.render.frame);
            if (fpsGraph.current.length > 100) fpsGraph.current.shift();
        }
    });

    // Get adjacent room IDs for transition triggers
    const adjacentRoomIds = getAdjacentRoomIds();
    const roomsToShowTransitions = currentRoomId ? [currentRoomId, ...adjacentRoomIds] : [];

    return (
        <>
            <Environment preset="city" />
            <CameraController />
            
            {/* Render only the current room */}
            {currentRoom && (
                <Room key={currentRoom.id} config={currentRoom} />
            )}
            
            {/* Render transition triggers only for current and adjacent rooms */}
            {roomsToShowTransitions.map((roomId) => {
                const roomConfig = roomConfigs[roomId];
                if (!roomConfig) return null;
                
                return roomConfig.archways.map((archway) => (
                    <RoomTransitionTrigger key={`${roomId}-${archway.id}`} archway={archway} />
                ));
            })}
            
            {/* Loading indicator during transitions */}
            {isTransitioning && (
                <mesh position={[0, 5, 0]} visible={false}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
                </mesh>
            )}
        </>
    );
};
