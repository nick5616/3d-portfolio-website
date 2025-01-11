export interface RoomConfig {
    id: string;
    name: string;
    position: [number, number, number];
    lightPreset: LightPreset;
    interactiveElements: InteractiveElement[];
    portals: Portal[];
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
    }[];
}

export interface InteractiveElement {
    id: string;
    type: "model" | "image" | "text" | "video";
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    onClick?: () => void;
    onHover?: () => void;
    content: any;
}

export interface Portal {
    id: string;
    targetRoomId: string;
    position: [number, number, number];
    rotation: [number, number, number];
}
