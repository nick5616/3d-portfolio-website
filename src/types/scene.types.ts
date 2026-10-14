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
    // Round rooms: doors sit on the curve exactly where authored (no
    // snapping to a flat wall) and the minimap draws a circle.
    circular?: boolean;
    // Rooms with more than one walkable storey, lowest first. The minimap
    // shows only the floor the player is standing on, and each archway
    // belongs to the floor at or just below its own y.
    floors?: RoomFloor[];
    // Extra shapes for the minimap (the atrium's pool and stair, a table).
    mapFeatures?: MapFeature[];
}

export interface RoomFloor {
    y: number; // walkable surface height
    label: string;
    // Balcony floors are rings around an open middle; the minimap draws
    // the hole.
    innerRadius?: number;
}

export interface MapFeature {
    kind: "stair" | "pool" | "table" | "lift";
    position: [number, number]; // x, z
    radius: number;
    floors?: number[]; // which floors it shows on (all when omitted)
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
    // "portal": a swirling starfield inside an arch instead of the usual
    // panel, frame and sign (the room builds the arch, unless `frame`).
    // "fairyStone": a standing stone with a hole in it (the forest).
    // "wood": a panelled wooden door with a brass plate (the farmhouse).
    appearance?: "portal" | "fairyStone" | "wood";
    // For portals in open spaces: the door brings its own stone arch.
    frame?: boolean;
}
