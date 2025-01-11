import { create } from "zustand";
import * as THREE from "three";
import { RoomConfig } from "../types/scene.types";

interface SceneState {
    currentRoom: RoomConfig | null;
    controlMode: "firstPerson" | "pointAndClick";
    cameraTarget: THREE.Vector3;
    performance: {
        showStats: boolean;
        monitoring: boolean;
    };
    loadRoom: (roomId: string) => void;
    setControlMode: (mode: "firstPerson" | "pointAndClick") => void;
    setCameraTarget: (target: THREE.Vector3) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
    currentRoom: null,
    controlMode: "firstPerson",
    cameraTarget: new THREE.Vector3(0, 2, 5),
    performance: {
        showStats: false,
        monitoring: true,
    },
    loadRoom: async (roomId) => {
        // This would typically load from an API or configuration file
        // For now, we'll return a mock room configuration
        const mockRoomConfig: RoomConfig = {
            id: roomId,
            name: `Room ${roomId}`,
            position: [0, 0, 0],
            lightPreset: {
                ambient: {
                    intensity: 0.5,
                    color: "#ffffff",
                },
                directional: {
                    position: [5, 5, 5],
                    intensity: 0.8,
                    color: "#ffffff",
                },
            },
            interactiveElements: [],
            portals: [],
        };
        set({ currentRoom: mockRoomConfig });
    },
    setControlMode: (mode) => set({ controlMode: mode }),
    setCameraTarget: (target) => set({ cameraTarget: target }),
}));
