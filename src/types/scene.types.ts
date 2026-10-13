// src/types/scene.types.ts
import { ArtCategoryId } from "../configs/gcsConfig";

export type GalleryRoomKind =
    | { kind: "atrium" }
    | { kind: "hall"; category: ArtCategoryId }
    // Small domed marble room with a single sketchbook on a lectern.
    | { kind: "sketchbook"; category: ArtCategoryId };

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
    // Set only for rooms in the art gallery wing (lobby/atrium/halls) so
    // Room.tsx can dispatch to the right component without hardcoding ids.
    galleryRoomKind?: GalleryRoomKind;
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
    // A door that costs rupees to open the first time (stays open after).
    lock?: { id: string; cost: number };
}
