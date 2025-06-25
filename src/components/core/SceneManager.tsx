import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Environment } from "@react-three/drei";
import { Room } from "./Room";
import { CameraController } from "./CameraController";
import { RoomTransitionTrigger } from "./RoomTransitionTrigger";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";
import { roomConfigs } from "../../configs/rooms";
import { RoomConfig, Archway } from "../../types/scene.types";

export const SceneManager: React.FC = () => {
    const { scene } = useThree();
    const { loadRoom, performance, currentRoom } = useSceneStore();
    const fpsGraph = useRef<number[]>([]);

    // Get adjacent rooms for smooth transitions
    const getAdjacentRooms = (room: RoomConfig) => {
        if (!room) return [];
        return room.archways.map((archway) => roomConfigs[archway.targetRoomId]).filter(Boolean);
    };

    const adjacentRooms = currentRoom ? getAdjacentRooms(currentRoom) : [];
    const allVisibleRooms = currentRoom ? [currentRoom, ...adjacentRooms] : [];

    useEffect(() => {
        // Initialize scene
        scene.fog = new THREE.Fog("#000000", 10, 20);
        loadRoom("atrium");
    }, [scene, loadRoom]);

    useFrame(({ gl }) => {
        // Performance monitoring
        if (performance.monitoring) {
            fpsGraph.current.push(gl.info.render.frame);
            if (fpsGraph.current.length > 100) fpsGraph.current.shift();
        }
    });

    return (
        <>
            <Environment preset="city" />
            <CameraController />
            {/* Render current room + adjacent rooms for smooth transitions */}
            {allVisibleRooms.map((room) => (
                <Room key={room.id} config={room} />
            ))}
            {/* Render transition triggers only for current room to avoid duplication */}
            {currentRoom?.archways.map((archway) => (
                <RoomTransitionTrigger key={archway.id} archway={archway} />
            ))}
        </>
    );
};
