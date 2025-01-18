// src/stores/sceneStore.ts
import { create } from "zustand";
import * as THREE from "three";
import { RoomConfig } from "../types/scene.types";
import { roomConfigs } from "../configs/rooms";

interface SceneState {
    currentRoom: RoomConfig | null;
    controlMode: "firstPerson" | "pointAndClick";
    cameraTarget: THREE.Vector3;
    spotlightsEnabled: boolean;
    flyMode: boolean;
    performance: {
        showStats: boolean;
        monitoring: boolean;
    };
    toggleFlyMode: () => void;
    loadRoom: (roomId: string) => void;
    setControlMode: (mode: "firstPerson" | "pointAndClick") => void;
    setCameraTarget: (target: THREE.Vector3) => void;
    teleportToRoom: (
        roomId: string,
        position: [number, number, number]
    ) => void;
    toggleSpotlights: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
    currentRoom: null,
    controlMode: "firstPerson",
    cameraTarget: new THREE.Vector3(0, 2, 5),
    spotlightsEnabled: false,

    performance: {
        showStats: false,
        monitoring: true,
    },
    flyMode: false,
    toggleFlyMode: () => set((state) => ({ flyMode: !state.flyMode })),
    loadRoom: (roomId) => {
        const config = roomConfigs[roomId];
        if (config) {
            set({ currentRoom: config });
        } else {
            console.error(`Room configuration not found for ID: ${roomId}`);
        }
    },
    setControlMode: (mode) => set({ controlMode: mode }),
    setCameraTarget: (target) => set({ cameraTarget: target }),
    teleportToRoom: (roomId, position) => {
        const config = roomConfigs[roomId];
        if (config) {
            set({
                currentRoom: config,
                cameraTarget: new THREE.Vector3(...position),
            });
        }
    },
    toggleSpotlights: () =>
        set((state) => ({ spotlightsEnabled: !state.spotlightsEnabled })),
}));
