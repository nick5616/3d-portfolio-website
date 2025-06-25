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

interface SceneState {
    currentRoom: RoomConfig | null;
    controlMode: "firstPerson" | "pointAndClick";
    cameraTarget: THREE.Vector3;
    spotlightsEnabled: boolean;
    flyMode: boolean;
    isFirstPerson: boolean;
    isMobile: boolean;
    performance: {
        showStats: boolean;
        monitoring: boolean;
        quality: "low" | "medium" | "high";
    };
    // Virtual controls for mobile
    virtualMovement: MovementState;
    virtualRotation: RotationState;
    setVirtualMovement: (movement: MovementState) => void;
    setVirtualRotation: (rotation: RotationState) => void;
    updateMobileDetection: () => void;
    toggleFlyMode: () => void;
    loadRoom: (roomId: string) => void;
    setControlMode: (mode: "firstPerson" | "pointAndClick") => void;
    setCameraTarget: (target: THREE.Vector3) => void;
    teleportToRoom: (
        roomId: string,
        position: [number, number, number]
    ) => void;
    toggleSpotlights: () => void;
    setPerformanceQuality: (quality: "low" | "medium" | "high") => void;
    toggleStats: () => void;
    togglePerformanceMonitoring: () => void;
}

// Helper to detect mobile devices
const isMobileDevice = () => {
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        ) || window.innerWidth <= 768
    );
};

export const useSceneStore = create<SceneState>((set) => ({
    currentRoom: null,
    controlMode: "firstPerson",
    cameraTarget: new THREE.Vector3(0, 2, 5),
    spotlightsEnabled: false,
    isFirstPerson: true,
    isMobile: isMobileDevice(),

    performance: {
        showStats: false,
        monitoring: true,
        quality: "high",
    },
    flyMode: false,
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
    updateMobileDetection: () => set({ isMobile: isMobileDevice() }),
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
}));
