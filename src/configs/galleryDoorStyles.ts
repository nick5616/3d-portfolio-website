import { ArtCategoryId } from "./gcsConfig";
import { roomColors } from "./roomColors";

// Decorative treatment Door.tsx renders on top of the base door/frame for
// gallery-wing doors - a small, cheap-to-render motif per destination so
// each hall's door reads as "that room" even before you step through it.
export type GalleryDoorAccent =
    | "hub" // the circular gallery atrium itself
    | "tech" // digitalart
    | "ornate" // paintings
    | "sketch" // sketches
    | "asymmetric" // lefthanded
    | "eclectic" // miscellaneous
    | "paper"; // notesappart

export interface GalleryDoorStyle {
    color: string;
    frameColor: string;
    glowColor: string;
    roughness: number;
    metalness: number;
    accent: GalleryDoorAccent;
}

// Keyed by the target room's identity: either its gallery category, or
// "gallery" for the hub. Colors are pulled from roomColors so a door's color
// always matches how the minimap represents that same room.
export const galleryDoorStyles: Record<
    ArtCategoryId | "gallery",
    GalleryDoorStyle
> = {
    gallery: {
        color: roomColors["gallery"],
        frameColor: "#8A6D2F",
        glowColor: "#FFEFC2",
        roughness: 0.45,
        metalness: 0.35,
        accent: "hub",
    },
    digitalart: {
        color: roomColors["gallery-hall-digitalart"],
        frameColor: "#1A1A2E",
        glowColor: "#00FFFF",
        roughness: 0.15,
        metalness: 0.85,
        accent: "tech",
    },
    paintings: {
        color: roomColors["gallery-hall-paintings"],
        frameColor: "#D4AF37",
        glowColor: "#FFE3C4",
        roughness: 0.7,
        metalness: 0.2,
        accent: "ornate",
    },
    sketches: {
        color: roomColors["gallery-hall-sketches"],
        frameColor: "#3A3A3A",
        glowColor: "#F5F5F5",
        roughness: 0.9,
        metalness: 0.02,
        accent: "sketch",
    },
    lefthanded: {
        color: roomColors["gallery-hall-lefthanded"],
        frameColor: "#5C3A21",
        glowColor: "#FFE3B3",
        roughness: 0.6,
        metalness: 0.15,
        accent: "asymmetric",
    },
    miscellaneous: {
        color: roomColors["gallery-hall-miscellaneous"],
        frameColor: "#2F2F2F",
        glowColor: "#FFFFFF",
        roughness: 0.5,
        metalness: 0.25,
        accent: "eclectic",
    },
    notesappart: {
        color: "#FFF8DC",
        frameColor: "#C0392B",
        glowColor: roomColors["gallery-hall-notesappart"],
        roughness: 0.85,
        metalness: 0.0,
        accent: "paper",
    },
};
