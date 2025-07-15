// src/stores/sceneStore.ts
import { create } from "zustand";
import * as THREE from "three";
import { RoomConfig } from "../types/scene.types";
import { roomConfigs } from "../configs/rooms";

interface MovementState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
}

interface RotationState {
    x: number;
    y: number;
}

interface CameraData {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
}

interface SceneData {
    objectCount: number;
    lightCount: number;
}

interface SceneState {
    currentRoom: RoomConfig | null;
    controlMode: "firstPerson" | "pointAndClick";
    cameraTarget: THREE.Vector3;
    cameraRotation?: [number, number, number];
    playerPosition: [number, number, number];
    shouldTeleportPlayer: boolean;
    spotlightsEnabled: boolean;
    flyMode: boolean;
    isFirstPerson: boolean;
    isInteracting: boolean;
    performance: {
        showStats: boolean;
        monitoring: boolean;
        quality: "low" | "medium" | "high";
    };
    minimap: {
        enabled: boolean;
        visible: boolean;
    };
    // Camera and scene data for UI components
    cameraData: CameraData;
    sceneData: SceneData;
    // Virtual controls for mobile
    virtualMovement: MovementState;
    virtualRotation: RotationState;
    setVirtualMovement: (movement: MovementState) => void;
    setVirtualRotation: (rotation: RotationState) => void;
    setIsInteracting: (interacting: boolean) => void;
    updateCameraData: (cameraData: CameraData) => void;
    updateSceneData: (sceneData: SceneData) => void;
    clearTeleportFlag: () => void;
    toggleFlyMode: () => void;
    loadRoom: (roomId: string) => void;
    setControlMode: (mode: "firstPerson" | "pointAndClick") => void;
    setCameraTarget: (target: THREE.Vector3) => void;
    teleportToRoom: (
        roomId: string,
        position: [number, number, number],
        rotation?: [number, number, number]
    ) => void;
    toggleSpotlights: () => void;
    setPerformanceQuality: (quality: "low" | "medium" | "high") => void;
    toggleStats: () => void;
    togglePerformanceMonitoring: () => void;
    toggleMinimap: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
    currentRoom: null,
    controlMode: "firstPerson",
    cameraTarget: new THREE.Vector3(0, 2, 5),
    cameraRotation: undefined,
    playerPosition: [0, 2.5, 5],
    shouldTeleportPlayer: false,
    spotlightsEnabled: false,
    isFirstPerson: true,
    isInteracting: false,

    performance: {
        showStats: false,
        monitoring: true,
        quality: "high",
    },
    minimap: {
        enabled: true,
        visible: false,
    },
    flyMode: false,
    // Camera and scene data for UI components
    cameraData: {
        position: { x: 0, y: 2.5, z: 5 },
        rotation: { x: 0, y: 0, z: 0 },
    },
    sceneData: {
        objectCount: 0,
        lightCount: 0,
    },
    // Virtual controls state
    virtualMovement: {
        forward: false,
        backward: false,
        left: false,
        right: false,
    },
    virtualRotation: {
        x: 0,
        y: 0,
    },
    setVirtualMovement: (movement) => set({ virtualMovement: movement }),
    setVirtualRotation: (rotation) => set({ virtualRotation: rotation }),
    setIsInteracting: (interacting) => set({ isInteracting: interacting }),
    updateCameraData: (cameraData) => set({ cameraData }),
    updateSceneData: (sceneData) => set({ sceneData }),
    clearTeleportFlag: () => set({ shouldTeleportPlayer: false }),
    toggleFlyMode: () => set((state) => ({ flyMode: !state.flyMode })),
    loadRoom: (roomId) => {
        const config = roomConfigs[roomId];
        if (config) {
            set({ currentRoom: config });
        } else {
            console.error(`Room configuration not found for ID: ${roomId}`);
        }
    },
    setControlMode: (mode) =>
        set({
            controlMode: mode,
            isFirstPerson: mode === "firstPerson",
        }),
    setCameraTarget: (target) => set({ cameraTarget: target }),
    teleportToRoom: (roomId, position, rotation) => {
        console.log(`🏠 Store: teleportToRoom called - changing to ${roomId}`, {
            position,
            rotation,
        });
        const config = roomConfigs[roomId];
        if (config) {
            console.log(`📋 Store: Room config found for ${roomId}`, config);
            set({
                currentRoom: config,
                cameraTarget: new THREE.Vector3(...position),
                cameraRotation: rotation,
                playerPosition: position,
                shouldTeleportPlayer: true,
            });
            console.log(`🔄 Store: State updated - shouldTeleportPlayer: true`);
        } else {
            console.error(
                `❌ Store: Room configuration not found for ID: ${roomId}`
            );
        }
    },
    toggleSpotlights: () =>
        set((state) => ({ spotlightsEnabled: !state.spotlightsEnabled })),
    setPerformanceQuality: (quality) =>
        set((state) => ({
            performance: { ...state.performance, quality },
        })),
    toggleStats: () =>
        set((state) => ({
            performance: {
                ...state.performance,
                showStats: !state.performance.showStats,
            },
        })),
    togglePerformanceMonitoring: () =>
        set((state) => ({
            performance: {
                ...state.performance,
                monitoring: !state.performance.monitoring,
            },
        })),
    toggleMinimap: () =>
        set((state) => ({
            minimap: {
                ...state.minimap,
                visible: !state.minimap.visible,
            },
        })),
}));
