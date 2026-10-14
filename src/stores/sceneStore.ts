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
import { detectIsMobile } from "../utils/deviceDetection";
import { useAchievementStore } from "./achievementStore";

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
    // Normalized horizontal facing direction (derived from the camera quaternion,
    // not the Euler rotation, since CameraController composes rotation in YXZ order
    // while camera.rotation decodes in XYZ order — using rotation.y directly would
    // misreport yaw whenever pitch is non-zero).
    facing: { x: number; z: number };
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
    cameraTarget: THREE.Vector3;
    cameraRotation?: [number, number, number];
    playerPosition: [number, number, number];
    playerVelocity: [number, number, number]; // Add player velocity
    shouldTeleportPlayer: boolean;
    roomEnvironmentReady: boolean; // Add this flag
    spotlightsEnabled: boolean;
    galleryWhiteLightMode: boolean; // Gallery light mode: true = white lights, false = custom colors
    flyMode: boolean;
    isInteracting: boolean;
    // When true, something else (e.g. the sketchbook reader) owns the
    // camera: PlayerBody stops pinning it to the body and CameraController
    // stops steering it.
    cameraOverride: boolean;
    setCameraOverride: (override: boolean) => void;
    // When true, a room (e.g. the forest with its day/night cycle) owns
    // all lighting: the global fill lights and reflection environment
    // switch off so its nights can actually get dark.
    customEnvironment: boolean;
    setCustomEnvironment: (custom: boolean) => void;
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
    movementJoystickIntensity: number; // 0 to 1, how far joystick is pushed
    cameraJoystickIntensity: number; // 0 to 1, how far joystick is pushed
    setVirtualMovement: (movement: MovementState) => void;
    setVirtualRotation: (rotation: RotationState) => void;
    setMovementJoystickIntensity: (intensity: number) => void;
    setCameraJoystickIntensity: (intensity: number) => void;
    // Educational modal state
    isEducationalModalOpen: boolean;
    setEducationalModalOpen: (open: boolean) => void;
    // Start prompt state
    showStartPrompt: boolean;
    setShowStartPrompt: (show: boolean) => void;
    // Notice shown when Control (crouch) collides with a reserved browser
    // shortcut (e.g. Ctrl+D) and steals focus/pointer lock
    crouchKeyNotice: boolean;
    setCrouchKeyNotice: (show: boolean) => void;
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
    playerGrounded: boolean;
    setPlayerGrounded: (grounded: boolean) => void;
    updatePlayerPosition: (position: [number, number, number]) => void;

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
        cameraTarget: new THREE.Vector3(0, 0, 0),
        cameraRotation: [0, 0, 0],
        playerPosition: [0, 0, 0], // Don't set a default position
        playerVelocity: [0, 0, 0], // Initialize player velocity
        shouldTeleportPlayer: false,
        roomEnvironmentReady: false, // Initialize room environment ready flag
        spotlightsEnabled: false,
        galleryWhiteLightMode: true, // Default to white light mode
        isInteracting: false,
        cameraOverride: false,
        setCameraOverride: (override) => set({ cameraOverride: override }),
        customEnvironment: false,
        setCustomEnvironment: (custom) => set({ customEnvironment: custom }),
        lastTeleportTime: 0,
        playerGrounded: false,

        performance: savedPerformanceSettings,
        minimap: {
            enabled: true,
            // Hidden by default on mobile - the small screen makes it more clutter than
            // help, but the settings menu can still toggle it back on.
            visible: !detectIsMobile(),
        },
        flyMode: false,
        // Camera and scene data for UI components
        cameraData: {
            position: { x: 0, y: 0.5, z: 5 },
            rotation: { x: 0, y: 0, z: 0 },
            facing: { x: 0, z: -1 },
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
        movementJoystickIntensity: 0,
        cameraJoystickIntensity: 0,
        setVirtualMovement: (movement) => set({ virtualMovement: movement }),
        setVirtualRotation: (rotation) => set({ virtualRotation: rotation }),
        setMovementJoystickIntensity: (intensity) =>
            set({ movementJoystickIntensity: intensity }),
        setCameraJoystickIntensity: (intensity) =>
            set({ cameraJoystickIntensity: intensity }),
        // Educational modal state
        isEducationalModalOpen: true, // Start with modal open
        setEducationalModalOpen: (open) =>
            set({ isEducationalModalOpen: open }),
        // Start prompt state
        showStartPrompt: false,
        setShowStartPrompt: (show) => set({ showStartPrompt: show }),
        // Ctrl-shortcut collision notice
        crouchKeyNotice: false,
        setCrouchKeyNotice: (show) => set({ crouchKeyNotice: show }),
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
            set((state) => {
                const newScore =
                    typeof score === "function"
                        ? score(state.mathGame.score)
                        : score;
                useAchievementStore.getState().checkMathScore(newScore);
                return {
                    mathGame: { ...state.mathGame, score: newScore },
                };
            }),
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
        toggleFlyMode: () =>
            set((state) => {
                const flyMode = !state.flyMode;
                if (flyMode) useAchievementStore.getState().unlock("flight");
                return { flyMode };
            }),
        setRoomEnvironmentReady: (ready) =>
            set({ roomEnvironmentReady: ready }),
        loadRoom: (roomId) => {
            const config = roomConfigs[roomId];
            if (config) {
                // Arrive at the room's entrance. (Without this the player
                // spawned at the origin, which in the atrium is the middle
                // of the fountain.)
                const { position, rotation } = config.defaultEntrance;
                set({
                    currentRoom: config,
                    roomEnvironmentReady: false,
                    playerPosition: position,
                    cameraTarget: new THREE.Vector3(...position),
                    cameraRotation: rotation,
                    shouldTeleportPlayer: true,
                });
                useAchievementStore.getState().discoverRoom(roomId);
            } else {
                console.error(`Room configuration not found for ID: ${roomId}`);
            }
        },
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
                // Only a real room change resets readiness. Teleporting
                // within the same room (holodeck experience switches do
                // this) doesn't remount the room, so nothing would ever set
                // the flag back to true - gravity stayed off and the player
                // floated above the floor sliding around with no friction.
                const changingRoom =
                    useSceneStore.getState().currentRoom?.id !== roomId;
                set({
                    currentRoom: config,
                    cameraTarget: new THREE.Vector3(...position),
                    cameraRotation: rotation,
                    playerPosition: position,
                    shouldTeleportPlayer: true,
                    lastTeleportTime: Date.now(),
                    ...(changingRoom ? { roomEnvironmentReady: false } : {}),
                });
                useAchievementStore.getState().discoverRoom(roomId);
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
                if (newPerformance.showStats)
                    useAchievementStore.getState().unlock("debug-info");
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
            set((state) => {
                const visible = !state.minimap.visible;
                if (visible) useAchievementStore.getState().unlock("minimap");
                return { minimap: { ...state.minimap, visible } };
            }),
        setPlayerGrounded: (grounded) => set({ playerGrounded: grounded }),
        updatePlayerPosition: (position) => set({ playerPosition: position }),

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
