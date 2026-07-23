// src/configs/rooms.ts
import { RoomConfig, InteractiveElement } from "../types/scene.types";

const ATRIUM_CEILING_HEIGHT = 7.5;
const PROJECTS_CEILING_HEIGHT = 6;
const ABOUT_CEILING_HEIGHT = 8;
const RELAXATION_CEILING_HEIGHT = 6;
const GALLERY_ATRIUM_CEILING_HEIGHT = 7.5;
const GALLERY_HALL_CEILING_HEIGHT = 7.5;
const GALLERY_SECRET_ROOM_CEILING_HEIGHT = 6;

// Simple, mostly-neutral light preset shared by the gallery wing's plain
// rectangular halls - each room's GcsArtFrameByIndex spotlighting comes from
// the frame itself; this just keeps the space readable.
const galleryHallLightPreset = (accent: string) => ({
    ambient: { intensity: 1.2, color: "#ffffff" },
    directional: {
        position: [0, 6, 0] as [number, number, number],
        intensity: 0,
        color: "#ffffff",
    },
    spots: [
        {
            position: [0, GALLERY_HALL_CEILING_HEIGHT - 1, 0] as [
                number,
                number,
                number
            ],
            target: [0, 0, 0] as [number, number, number],
            intensity: 1.5,
            color: accent,
            distance: 25,
            angle: Math.PI / 2.2,
            penumbra: 0.6,
        },
    ],
});

export const roomConfigs: { [key: string]: RoomConfig } = {
    atrium: {
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // A captivating display accompanied by greek pillars, fascinating and inspiring rays of light, and a major ethereal vibe.
        // It contains beautiful essence of life, through the lush, deep greens of plant life, and the intense blue or pristine waters,
        // with light shining through, making one question the significance of their daily struggles
        id: "atrium",
        name: "Atrium",
        position: [0, 0, 0] as [number, number, number],
        dimensions: [20, ATRIUM_CEILING_HEIGHT, 20], // width, height, depth (reduced height by 25%)
        lightPreset: {
            ambient: { intensity: 0.1, color: "#ffff00" }, // Reduced from 0.5
            directional: {
                position: [10, 7.5, 0] as [number, number, number],
                intensity: 0.0002, // Reduced from 0.8
                color: "#ffff00",
            },
            spots: [
                {
                    position: [0, 6, 0] as [number, number, number],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 0.3, // Reduced from 1
                    color: "#ffff00",
                },
            ],
        },
        defaultEntrance: {
            position: [0, 1.5, 12] as [number, number, number],
            rotation: [0, Math.PI, 0] as [number, number, number],
        },
        interactiveElements: [
            // Circular arrangement of pillars
            ...Array(8)
                .fill(0)
                .map((_, i): InteractiveElement => {
                    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8; // Offset to avoid blocking archways
                    const radius = 8;
                    return {
                        id: `pillar-${i}`,
                        type: "model",
                        position: [
                            Math.cos(angle) * radius,
                            0,
                            Math.sin(angle) * radius,
                        ] as [number, number, number],
                        scale: [0.5, 4, 0.5] as [number, number, number],
                        content: "greek-pillar",
                    };
                }),
        ],
        archways: [
            {
                id: "to-gallery",
                targetRoomId: "gallery",
                position: [-9.77, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    // The gallery is now the circular atrium hub directly (no
                    // lobby); land just inside its west-side door, facing in.
                    position: [-7, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
            {
                id: "to-projects",
                targetRoomId: "projects",
                position: [0, 0, -9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
            {
                id: "to-about",
                targetRoomId: "about",
                position: [9.77, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [-2.5, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
            // {
            //     id: "to-relaxation",
            //     targetRoomId: "relaxation",
            //     position: [0, 0, 9.77] as [number, number, number],
            //     rotation: [0, 0, 0] as [number, number, number],
            //     width: 3,
            //     height: 4,
            //     entrancePoint: {
            //         position: [0, 1.5, -2] as [number, number, number],
            //         rotation: [0, Math.PI, 0] as [number, number, number],
            //     },
            // },
        ],
    },

    // The circular hub of the gallery wing. Keeps the id "gallery" (no
    // separate lobby room anymore) so routing/theming/quick-access that
    // already targets "gallery" keeps working unchanged.
    gallery: {
        id: "gallery",
        name: "Art Gallery",
        position: [-20, 0, 0] as [number, number, number],
        dimensions: [20, GALLERY_ATRIUM_CEILING_HEIGHT, 20], // circular room, width is the diameter
        galleryRoomKind: { kind: "atrium" },
        // GalleryAtriumRoom bypasses BaseRoom and lights itself directly, so
        // this preset only exists to satisfy the RoomConfig type.
        lightPreset: {
            ambient: { intensity: 0.3, color: "#fff5e6" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0,
                color: "#fff5e6",
            },
        },
        defaultEntrance: {
            position: [-7, 1.5, 0] as [number, number, number],
            rotation: [0, Math.PI / 2, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-gallery",
                targetRoomId: "atrium",
                position: [-9.9, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [-7, 1.5, 0] as [number, number, number], // Clearly in front of the main atrium's own gallery door
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-digitalart",
                targetRoomId: "gallery-hall-digitalart",
                position: [9.9, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-paintings",
                targetRoomId: "gallery-hall-paintings",
                position: [0, 0, 9.9] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-sketches",
                targetRoomId: "gallery-hall-sketches",
                position: [0, 0, -9.9] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-digitalart": {
        id: "gallery-hall-digitalart",
        name: "Digital Art Hall",
        position: [-45, 0, 0] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "digitalart" },
        lightPreset: galleryHallLightPreset("#fff5e6"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-from-digitalart",
                targetRoomId: "gallery",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [9.9 - 2, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-paintings": {
        id: "gallery-hall-paintings",
        name: "Paintings Hall",
        position: [-20, 0, -25] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "paintings" },
        lightPreset: galleryHallLightPreset("#ffe0cc"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-from-paintings",
                targetRoomId: "gallery",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -9.9 + 2] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-lefthanded",
                targetRoomId: "gallery-hall-lefthanded",
                position: [0, 0, -9.7] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-sketches": {
        id: "gallery-hall-sketches",
        name: "Sketches Hall",
        position: [-20, 0, 25] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "sketches" },
        lightPreset: galleryHallLightPreset("#e0e8ff"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-from-sketches",
                targetRoomId: "gallery",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 9.9 - 2] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-miscellaneous",
                targetRoomId: "gallery-hall-miscellaneous",
                position: [0, 0, -9.7] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-lefthanded": {
        id: "gallery-hall-lefthanded",
        name: "Left-Handed Hall",
        position: [-20, 0, -50] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "lefthanded" },
        lightPreset: galleryHallLightPreset("#ffe0cc"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-hall-paintings-from-lefthanded",
                targetRoomId: "gallery-hall-paintings",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-miscellaneous": {
        id: "gallery-hall-miscellaneous",
        name: "Miscellaneous Hall",
        position: [-20, 0, 50] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "miscellaneous" },
        lightPreset: galleryHallLightPreset("#e0e8ff"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-hall-sketches-from-miscellaneous",
                targetRoomId: "gallery-hall-sketches",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
            {
                // Deliberately smaller/subtler doorway - the "easter egg" that
                // leads to the notesappart room, worth finding if you go deep
                // enough.
                id: "to-gallery-hall-notesappart",
                targetRoomId: "gallery-hall-notesappart",
                position: [0, 0, -9.7] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [0, 1.5, 6] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-notesappart": {
        id: "gallery-hall-notesappart",
        name: "Notes App Art",
        position: [-20, 0, 75] as [number, number, number],
        dimensions: [16, GALLERY_SECRET_ROOM_CEILING_HEIGHT, 16],
        galleryRoomKind: { kind: "hall", category: "notesappart" },
        lightPreset: galleryHallLightPreset("#d0ffe0"),
        defaultEntrance: {
            position: [0, 1.5, 6] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-hall-miscellaneous-from-notesappart",
                targetRoomId: "gallery-hall-miscellaneous",
                position: [0, 0, 7.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
        ],
    },

    projects: {
        id: "projects",
        name: "Software Projects",
        position: [0, 0, -20] as [number, number, number],
        dimensions: [20, PROJECTS_CEILING_HEIGHT, 20],
        lightPreset: {
            ambient: { intensity: 4.5, color: "#ffffff" },
            directional: {
                position: [0, 8, -5] as [number, number, number],
                intensity: 0,
                color: "#ffffff",
            },
            spots: Array(3)
                .fill(0)
                .map((_, i) => ({
                    position: [-5 + i * 5, 6, -5] as [number, number, number],
                    target: [-5 + i * 5, 0, -5] as [number, number, number],
                    intensity: 0.8,
                    color: "#ffffff",
                })),
        },
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [], // Interactive elements are now handled directly in ProjectsRoom component
        archways: [
            {
                id: "to-atrium-from-projects",
                targetRoomId: "atrium",
                position: [0, 0, 9.77] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    about: {
        id: "about",
        name: "Play Place",
        position: [20, 0, 0] as [number, number, number],
        dimensions: [8, ABOUT_CEILING_HEIGHT, 8],
        lightPreset: {
            ambient: { intensity: 0.4, color: "#FFF5E1" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0.6,
                color: "#FFE0B2",
            },
            spots: [
                {
                    position: [-3, 6, -3] as [number, number, number],
                    target: [-3, 0, -3] as [number, number, number],
                    intensity: 0.7,
                    color: "#FFA07A",
                },
                {
                    position: [-3.5, 5, 0] as [number, number, number],
                    target: [-3.5, 2, 0] as [number, number, number],
                    intensity: 0.8,
                    color: "#F9EAD0",
                },
                {
                    position: [0, 5, 3.5] as [number, number, number],
                    target: [0, 1, 3.5] as [number, number, number],
                    intensity: 0.6,
                    color: "#6A5ACD",
                },
                {
                    position: [3.5, 5, 0] as [number, number, number],
                    target: [3.5, 2, 0] as [number, number, number],
                    intensity: 0.7,
                    color: "#48D1CC",
                },
                {
                    position: [3, 5, -3] as [number, number, number],
                    target: [3, 0, -3] as [number, number, number],
                    intensity: 0.6,
                    color: "#F0FFFF",
                },
            ],
        },
        defaultEntrance: {
            position: [-2.5, 1.6, 0] as [number, number, number],
            rotation: [0, Math.PI / 2, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-about",
                targetRoomId: "atrium",
                position: [-4.4, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [7, 1.5, 0] as [number, number, number],
                    rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                },
            },
        ],
    },

    relaxation: {
        id: "relaxation",
        name: "Relaxation Room",
        position: [0, 0, 20] as [number, number, number],
        dimensions: [12, RELAXATION_CEILING_HEIGHT, 12], // Circular room with 12 unit diameter
        lightPreset: {
            ambient: { intensity: 0.3, color: "#E6F3FF" }, // Soft blue ambient
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0.2,
                color: "#B3D9FF",
            },
            spots: [
                {
                    position: [0, RELAXATION_CEILING_HEIGHT - 1, 0] as [
                        number,
                        number,
                        number
                    ],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 1.5,
                    color: "#E6F3FF",
                    distance: 15,
                    angle: Math.PI / 3,
                    penumbra: 0.5,
                },
                {
                    position: [0, RELAXATION_CEILING_HEIGHT - 2, 0] as [
                        number,
                        number,
                        number
                    ],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 0.8,
                    color: "#B3D9FF",
                    distance: 20,
                    angle: Math.PI / 2,
                    penumbra: 0.7,
                },
            ],
        },
        defaultEntrance: {
            position: [0, 1.5, 0] as [number, number, number],
            rotation: [0, Math.PI, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-relaxation",
                targetRoomId: "atrium",
                position: [0, 0, -6] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },
};
