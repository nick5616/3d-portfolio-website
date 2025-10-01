// src/types/scene.types.ts
export interface RoomConfig {
    id: string;
    name: string;
    position: [number, number, number];
    dimensions: [number, number, number]; // width, height, depth
    lightPreset: LightPreset;
    interactiveElements: InteractiveElement[];
    archways: Archway[];
    defaultEntrance: {
        position: [number, number, number];
        rotation: [number, number, number];
    };
}

export interface LightPreset {
    ambient: {
        intensity: number;
        color: string;
    };
    directional: {
        position: [number, number, number];
        intensity: number;
        color: string;
    };
    spots?: {
        position: [number, number, number];
        target: [number, number, number];
        intensity: number;
        color: string;
        distance?: number;
        decay?: number;
        angle?: number;
        penumbra?: number;
    }[];
}

export interface InteractiveElement {
    id: string;
    type: "model" | "image" | "text" | "video" | "web";
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    onClick?: () => void;
    onHover?: () => void;
    content: any;
}

export interface Archway {
    id: string;
    targetRoomId: string;
    position: [number, number, number];
    rotation: [number, number, number];
    width: number;
    height: number;
    entrancePoint?: {
        position: [number, number, number];
        rotation: [number, number, number];
    };
}
