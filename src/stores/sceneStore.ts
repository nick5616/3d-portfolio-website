// src/stores/sceneStore.ts
import { create } from "zustand";
import * as THREE from "three";
import { RoomConfig } from "../types/scene.types";
import { roomConfigs } from "../configs/rooms";
import { Meteor } from "../types/math-game.types";
import {
    loadPerformanceSettings,
    savePerformanceSettings,
} from "../utils/localStorage";

// Configuration for experience-specific rotation angles (in radians)
// Each angle represents the optimal orientation for the user to face when the experience loads
const EXPERIENCE_ROTATION_ANGLES: Record<string, number> = {
    // Current experiences
    computer: 0,
    fitness: Math.PI,
    art: 0,
    math: 0,
    forest: Math.PI / 4,
    off: 0,
};

interface MovementState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    running: boolean;
    jumping: boolean;
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

interface MathGameState {
    isActive: boolean;
    meteors: Meteor[];
    score: number;
}

interface ConsoleState {
    isActive: boolean;
    input: string;
    history: string[];
    isProcessing: boolean;
    scrollOffset: number; // How many lines to scroll up from the bottom
    rainbowMode: boolean; // Whether to show debug colors
}

interface SceneState {
    currentRoom: RoomConfig | null;
    controlMode: "firstPerson" | "pointAndClick";
    cameraTarget: THREE.Vector3;
    cameraRotation?: [number, number, number];
    playerPosition: [number, number, number];
    playerVelocity: [number, number, number]; // Add player velocity
    shouldTeleportPlayer: boolean;
    roomEnvironmentReady: boolean; // Add this flag
    spotlightsEnabled: boolean;
    galleryWhiteLightMode: boolean; // Gallery light mode: true = white lights, false = custom colors
    flyMode: boolean;
    isFirstPerson: boolean;
    isInteracting: boolean;
    lastTeleportTime: number; // Add global teleportation debounce
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
    // Math game state
    mathGame: MathGameState;
    // Console interaction state
    console: ConsoleState;
    // Virtual controls for mobile
    virtualMovement: MovementState;
    virtualRotation: RotationState;
    setVirtualMovement: (movement: MovementState) => void;
    setVirtualRotation: (rotation: RotationState) => void;
    // Educational modal state
    isEducationalModalOpen: boolean;
    setEducationalModalOpen: (open: boolean) => void;
    // Math game actions
    setMathGameActive: (active: boolean) => void;
    updateMathGameMeteors: (
        meteors: Meteor[] | ((prev: Meteor[]) => Meteor[])
    ) => void;
    setMathGameScore: (score: number | ((prev: number) => number)) => void;
    // Console actions
    setConsoleActive: (active: boolean) => void;
    setConsoleInput: (input: string | ((prev: string) => string)) => void;
    appendConsoleInput: (text: string) => void;
    backspaceConsoleInput: () => void;
    pushConsoleHistory: (line: string) => void;
    replaceLastConsoleHistory: (line: string) => void;
    clearConsole: () => void;
    setConsoleProcessing: (processing: boolean) => void;
    scrollConsoleUp: () => void;
    scrollConsoleDown: () => void;
    resetConsoleScroll: () => void;
    toggleRainbowMode: () => void;
    // General scene actions
    setIsInteracting: (interacting: boolean) => void;
    updateCameraData: (cameraData: CameraData) => void;
    updateSceneData: (sceneData: SceneData) => void;
    updatePlayerVelocity: (velocity: [number, number, number]) => void; // Add velocity update function
    clearTeleportFlag: () => void;
    toggleFlyMode: () => void;
    setRoomEnvironmentReady: (ready: boolean) => void;
    loadRoom: (roomId: string) => void;
    setControlMode: (mode: "firstPerson" | "pointAndClick") => void;
    setCameraTarget: (target: THREE.Vector3) => void;
    teleportToRoom: (
        roomId: string,
        position: [number, number, number],
        rotation?: [number, number, number]
    ) => void;
    toggleSpotlights: () => void;
    toggleGalleryLightMode: () => void;
    setPerformanceQuality: (quality: "low" | "medium" | "high") => void;
    toggleStats: () => void;
    togglePerformanceMonitoring: () => void;
    toggleMinimap: () => void;
    rotateUser: (angle?: number) => void;
    getExperienceRotationAngle: (experience: string) => number;
    playerGrounded: boolean;
    setPlayerGrounded: (grounded: boolean) => void;

    // Holodeck loading state
    holodeckLoading: boolean;
    holodeckLoadingExperience: string | null;
    setHolodeckLoading: (loading: boolean, experience?: string | null) => void;

    // Room transition loading state
    roomTransitionLoading: boolean;
    roomTransitionFrom: string | null;
    roomTransitionTo: string | null;
    setRoomTransitionLoading: (
        loading: boolean,
        from?: string | null,
        to?: string | null
    ) => void;
}

export const useSceneStore = create<SceneState>((set) => {
    console.log("🏗️ Initializing scene store");

    // Load persisted performance settings
    const savedPerformanceSettings = loadPerformanceSettings();

    return {
        currentRoom: null, // Don't set a default room
        controlMode: "firstPerson",
        cameraTarget: new THREE.Vector3(0, 0, 0),
        cameraRotation: undefined,
        playerPosition: [0, 0, 0], // Don't set a default position
        playerVelocity: [0, 0, 0], // Initialize player velocity
        shouldTeleportPlayer: false,
        roomEnvironmentReady: false, // Initialize room environment ready flag
        spotlightsEnabled: false,
        galleryWhiteLightMode: true, // Default to white light mode
        isFirstPerson: true,
        isInteracting: false,
        lastTeleportTime: 0,
        playerGrounded: false,

        performance: savedPerformanceSettings,
        minimap: {
            enabled: true,
            visible: true,
        },
        flyMode: false,
        // Camera and scene data for UI components
        cameraData: {
            position: { x: 0, y: 0.5, z: 5 },
            rotation: { x: 0, y: 0, z: 0 },
        },
        sceneData: {
            objectCount: 0,
            lightCount: 0,
        },
        // Math game initial state
        mathGame: {
            isActive: false,
            meteors: [],
            score: 0,
        },
        // Console initial state
        console: {
            isActive: false,
            input: "",
            history: [],
            isProcessing: false,
            scrollOffset: 0,
            rainbowMode: false,
        },
        // Virtual controls state
        virtualMovement: {
            forward: false,
            backward: false,
            left: false,
            right: false,
            running: false,
            jumping: false,
        },
        virtualRotation: {
            x: 0,
            y: 0,
        },
        setVirtualMovement: (movement) => set({ virtualMovement: movement }),
        // Educational modal state
        isEducationalModalOpen: true, // Start with modal open
        setEducationalModalOpen: (open) =>
            set({ isEducationalModalOpen: open }),
        setVirtualRotation: (rotation) => set({ virtualRotation: rotation }),
        // Math game actions
        setMathGameActive: (active) =>
            set((state) => ({
                mathGame: { ...state.mathGame, isActive: active },
            })),
        updateMathGameMeteors: (meteors) =>
            set((state) => ({
                mathGame: {
                    ...state.mathGame,
                    meteors:
                        typeof meteors === "function"
                            ? meteors(state.mathGame.meteors)
                            : meteors,
                },
            })),
        setMathGameScore: (score) =>
            set((state) => ({
                mathGame: {
                    ...state.mathGame,
                    score:
                        typeof score === "function"
                            ? score(state.mathGame.score)
                            : score,
                },
            })),
        // Console actions
        setConsoleActive: (active) =>
            set((state) => ({
                console: { ...state.console, isActive: active },
            })),
        setConsoleInput: (input) =>
            set((state) => ({
                console: {
                    ...state.console,
                    input:
                        typeof input === "function"
                            ? input(state.console.input)
                            : input,
                },
            })),
        appendConsoleInput: (text) =>
            set((state) => ({
                console: {
                    ...state.console,
                    input: state.console.input + text,
                },
            })),
        backspaceConsoleInput: () =>
            set((state) => ({
                console: {
                    ...state.console,
                    input: state.console.input.slice(0, -1),
                },
            })),
        pushConsoleHistory: (line) =>
            set((state) => ({
                console: {
                    ...state.console,
                    history: [...state.console.history, line],
                },
            })),
        replaceLastConsoleHistory: (line) =>
            set((state) => ({
                console: {
                    ...state.console,
                    history:
                        state.console.history.length > 0
                            ? [...state.console.history.slice(0, -1), line]
                            : [line],
                },
            })),
        clearConsole: () =>
            set((state) => ({
                console: { ...state.console, history: [], input: "" },
            })),
        setConsoleProcessing: (processing) =>
            set((state) => ({
                console: { ...state.console, isProcessing: processing },
            })),
        scrollConsoleUp: () =>
            set((state) => {
                const MAX_VISIBLE_LINES = 6;
                const maxOffset = Math.max(
                    0,
                    state.console.history.length - MAX_VISIBLE_LINES
                );

                return {
                    console: {
                        ...state.console,
                        scrollOffset: Math.min(
                            state.console.scrollOffset + 1,
                            maxOffset
                        ),
                    },
                };
            }),
        scrollConsoleDown: () =>
            set((state) => ({
                console: {
                    ...state.console,
                    scrollOffset: Math.max(state.console.scrollOffset - 1, 0),
                },
            })),
        resetConsoleScroll: () =>
            set((state) => ({
                console: { ...state.console, scrollOffset: 0 },
            })),
        toggleRainbowMode: () =>
            set((state) => ({
                console: {
                    ...state.console,
                    rainbowMode: !state.console.rainbowMode,
                },
            })),

        setIsInteracting: (interacting) => set({ isInteracting: interacting }),
        updateCameraData: (cameraData) => set({ cameraData }),
        updateSceneData: (sceneData) => set({ sceneData }),
        updatePlayerVelocity: (velocity) => set({ playerVelocity: velocity }), // Update player velocity
        clearTeleportFlag: () => set({ shouldTeleportPlayer: false }),
        toggleFlyMode: () => set((state) => ({ flyMode: !state.flyMode })),
        setRoomEnvironmentReady: (ready) =>
            set({ roomEnvironmentReady: ready }),
        loadRoom: (roomId) => {
            const config = roomConfigs[roomId];
            if (config) {
                set({
                    currentRoom: config,
                    roomEnvironmentReady: false,
                });
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
            console.log(
                `🏠 Store: teleportToRoom called - changing to ${roomId}`,
                {
                    position,
                    rotation,
                }
            );
            const config = roomConfigs[roomId];
            if (config) {
                console.log(
                    `📋 Store: Room config found for ${roomId}`,
                    config
                );
                set({
                    currentRoom: config,
                    cameraTarget: new THREE.Vector3(...position),
                    cameraRotation: rotation,
                    playerPosition: position,
                    shouldTeleportPlayer: true,
                    lastTeleportTime: Date.now(),
                    roomEnvironmentReady: false, // Reset environment ready flag
                });
                console.log(
                    `🔄 Store: State updated - shouldTeleportPlayer: true`
                );
            } else {
                console.error(
                    `❌ Store: Room configuration not found for ID: ${roomId}`
                );
            }
        },
        toggleSpotlights: () =>
            set((state) => ({ spotlightsEnabled: !state.spotlightsEnabled })),
        toggleGalleryLightMode: () =>
            set((state) => ({
                galleryWhiteLightMode: !state.galleryWhiteLightMode,
            })),
        setPerformanceQuality: (quality) =>
            set((state) => {
                const newPerformance = { ...state.performance, quality };
                savePerformanceSettings(newPerformance);
                return { performance: newPerformance };
            }),
        toggleStats: () =>
            set((state) => {
                const newPerformance = {
                    ...state.performance,
                    showStats: !state.performance.showStats,
                };
                savePerformanceSettings(newPerformance);
                return { performance: newPerformance };
            }),
        togglePerformanceMonitoring: () =>
            set((state) => {
                const newPerformance = {
                    ...state.performance,
                    monitoring: !state.performance.monitoring,
                };
                savePerformanceSettings(newPerformance);
                return { performance: newPerformance };
            }),
        toggleMinimap: () =>
            set((state) => ({
                minimap: {
                    ...state.minimap,
                    visible: !state.minimap.visible,
                },
            })),
        rotateUser: (angle?: number) => {
            set((state) => {
                // Get current rotation or default to [0, 0, 0]
                const currentRotation = state.cameraRotation || [0, 0, 0];

                // Use provided angle or get from experience config
                let rotationAngle = angle;
                if (rotationAngle === undefined) {
                    // Get the current experience from the room ID or default to "off"
                    const currentExperience = state.currentRoom?.id || "off";
                    rotationAngle =
                        EXPERIENCE_ROTATION_ANGLES[currentExperience] || 0;
                }

                // Apply the rotation to the Y axis
                const newRotation: [number, number, number] = [
                    currentRotation[0],
                    currentRotation[1] + rotationAngle,
                    currentRotation[2],
                ];
                return { cameraRotation: newRotation };
            });
        },
        getExperienceRotationAngle: (experience: string) => {
            return EXPERIENCE_ROTATION_ANGLES[experience] || 0;
        },
        setPlayerGrounded: (grounded) => set({ playerGrounded: grounded }),

        // Holodeck loading state
        holodeckLoading: false,
        holodeckLoadingExperience: null,
        setHolodeckLoading: (loading, experience) => {
            const updates: any = { holodeckLoading: loading };

            // Only update the experience if one is provided
            // This preserves the experience during the fade-out phase
            if (experience !== undefined) {
                updates.holodeckLoadingExperience = experience;
            }

            set(updates);
        },

        // Room transition loading state
        roomTransitionLoading: false,
        roomTransitionFrom: null,
        roomTransitionTo: null,
        setRoomTransitionLoading: (loading, from, to) => {
            const updates: any = { roomTransitionLoading: loading };

            // Only update the room info if provided
            if (from !== undefined) {
                updates.roomTransitionFrom = from;
            }
            if (to !== undefined) {
                updates.roomTransitionTo = to;
            }

            set(updates);
        },
    };
});
