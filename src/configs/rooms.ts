// src/configs/rooms.ts
import { RoomConfig, InteractiveElement } from "../types/scene.types";

const ART_GALLERY_CEILING_HEIGHT = 7.5;
const ATRIUM_CEILING_HEIGHT = 7.5;
const PROJECTS_CEILING_HEIGHT = 6;
const ABOUT_CEILING_HEIGHT = 8;
const RELAXATION_CEILING_HEIGHT = 6;

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
                    position: [7, 1.5, 0] as [number, number, number],
                    rotation: [0, -Math.PI, 0] as [number, number, number],
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
            {
                id: "to-relaxation",
                targetRoomId: "relaxation",
                position: [0, 0, 9.77] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -2] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
        ],
    },

    gallery: {
        id: "gallery",
        name: "Art Gallery",
        position: [-20, 0, 0] as [number, number, number],
        dimensions: [20, ART_GALLERY_CEILING_HEIGHT, 20],
        lightPreset: {
            ambient: { intensity: 1, color: "#ffffff" }, // Minimal ambient light
            directional: {
                position: [5, 5, 0] as [number, number, number],
                intensity: 0, // No directional light - spotlights only
                color: "#ffffff",
            },
            spots: [
                // ═══════════════════════════════════════════════════════════════════════════
                // INDIVIDUAL SPOTLIGHTS FOR EACH ART PIECE (22 total: 14 outer + 8 inner)
                // Spotlights positioned away from art pieces to shine ONTO them
                // Targets are the actual art piece positions
                // ═══════════════════════════════════════════════════════════════════════════

                // OUTER WALL SPOTLIGHTS (14 art pieces)
                // North Wall (z = -9.75): 4 pieces at x = [-7.5, -1.5, 1.5, 7.5]
                {
                    position: [-7.5, ART_GALLERY_CEILING_HEIGHT, -6] as [
                        number,
                        number,
                        number
                    ],
                    target: [-7.5, 2.8, -9.75] as [number, number, number],
                    intensity: 10,
                    color: "#ff0000", // red
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [-1.5, ART_GALLERY_CEILING_HEIGHT, -6] as [
                        number,
                        number,
                        number
                    ],
                    target: [-1.5, 2.8, -9.75] as [number, number, number],
                    intensity: 10,
                    color: "#ff00ff",
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [7.5, ART_GALLERY_CEILING_HEIGHT, -6] as [
                        number,
                        number,
                        number
                    ],
                    target: [7.5, 2.8, -9.75] as [number, number, number],
                    intensity: 10,
                    color: "#8b4513", // brown
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },

                // South Wall (z = 9.75): 4 pieces at x = [-7.5, -1.5, 1.5, 7.5]
                {
                    position: [-7.5, ART_GALLERY_CEILING_HEIGHT, 6] as [
                        number,
                        number,
                        number
                    ],
                    target: [-7.5, 2.8, 9.75] as [number, number, number],
                    intensity: 10,
                    color: "#00ff99", // light green
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [1.5, ART_GALLERY_CEILING_HEIGHT, 6] as [
                        number,
                        number,
                        number
                    ],
                    target: [1.5, 2.8, 9.75] as [number, number, number],
                    intensity: 10,
                    color: "#ffff00", // courageous yellow
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [7.5, ART_GALLERY_CEILING_HEIGHT, 6] as [
                        number,
                        number,
                        number
                    ],
                    target: [7.5, 2.8, 9.75] as [number, number, number],
                    intensity: 10,
                    color: "#6495ed", // unsaturated blue from the rainbow
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 5,
                    penumbra: 0.3,
                },

                // West Wall (x = -9.75): 4 pieces at z = [-7.5, -1.5, 1.5, 7.5]
                {
                    position: [-6, ART_GALLERY_CEILING_HEIGHT, -7.5] as [
                        number,
                        number,
                        number
                    ],
                    target: [-9.75, 2.8, -7.5] as [number, number, number],
                    intensity: 5,
                    color: "#ff00ff",
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [-6, ART_GALLERY_CEILING_HEIGHT, -1.5] as [
                        number,
                        number,
                        number
                    ],
                    target: [-9.75, 2.8, -1.5] as [number, number, number],
                    intensity: 10,
                    color: "#191970", // midnight blue
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [-6, ART_GALLERY_CEILING_HEIGHT, 1.5] as [
                        number,
                        number,
                        number
                    ],
                    target: [-9.75, 2.8, 1.5] as [number, number, number],
                    intensity: 10,
                    color: "#800080", // unsaturated purple
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [-6, ART_GALLERY_CEILING_HEIGHT, 7.5] as [
                        number,
                        number,
                        number
                    ],
                    target: [-9.75, 2.8, 7.5] as [number, number, number],
                    intensity: 10,
                    color: "#008000", // sea moss
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },

                // East Wall (x = 9.75): 2 pieces at z = [-7.5, 7.5] (filtered for entrance)
                {
                    position: [6, ART_GALLERY_CEILING_HEIGHT, -7.5] as [
                        number,
                        number,
                        number
                    ],
                    target: [9.75, 2.8, -7.5] as [number, number, number],
                    intensity: 10,
                    color: "#f5f5dc", // sand
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                {
                    position: [6, ART_GALLERY_CEILING_HEIGHT, 7.5] as [
                        number,
                        number,
                        number
                    ],
                    target: [9.75, 2.8, 7.5] as [number, number, number],
                    intensity: 10,
                    color: "#808080", // grey
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },

                // INNER WALL SPOTLIGHTS (8 art pieces - 1 per vertical section, no crossbar)
                // Section 1: Left Outside Top (x=-5.25, z=-4)
                {
                    position: [-9.5, ART_GALLERY_CEILING_HEIGHT, -4] as [
                        number,
                        number,
                        number
                    ],
                    target: [-5.25, 2.8, -4] as [number, number, number],
                    intensity: 10,
                    color: "#00ffff", // light blue
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 2: Left Inside Top (x=-4.75, z=-2)
                {
                    position: [-2, ART_GALLERY_CEILING_HEIGHT, -2] as [
                        number,
                        number,
                        number
                    ],
                    target: [-4.75, 2.8, -2] as [number, number, number],
                    intensity: 10,
                    color: "#ff00ff", // purple
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 4: Right Inside Top (x=4.75, z=-2)
                {
                    position: [2, ART_GALLERY_CEILING_HEIGHT, -2] as [
                        number,
                        number,
                        number
                    ],
                    target: [4.75, 2.8, -2] as [number, number, number],
                    intensity: 10,
                    color: "#ffff00", // yellow
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 5: Right Outside Top (x=5.25, z=-4)
                {
                    position: [9, ART_GALLERY_CEILING_HEIGHT, -4] as [
                        number,
                        number,
                        number
                    ],
                    target: [5.25, 2.8, -4] as [number, number, number],
                    intensity: 10,
                    color: "#ffa000", // orange
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 6: Left Outside Bottom (x=-5.25, z=4)
                {
                    position: [-9, ART_GALLERY_CEILING_HEIGHT, 4] as [
                        number,
                        number,
                        number
                    ],
                    target: [-5.25, 2.8, 4] as [number, number, number],
                    intensity: 10,
                    color: "#aaaaaa", // grey
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 7: Left Inside Bottom (x=-4.75, z=2)
                {
                    position: [0, ART_GALLERY_CEILING_HEIGHT, 2] as [
                        number,
                        number,
                        number
                    ],
                    target: [-4.75, 2.8, 2] as [number, number, number],
                    intensity: 10,
                    color: "#927b7b", // sepia
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 9: Right Inside Bottom (x=4.75, z=2)
                {
                    position: [0, ART_GALLERY_CEILING_HEIGHT, 2] as [
                        number,
                        number,
                        number
                    ],
                    target: [4.75, 2.8, 2] as [number, number, number],
                    intensity: 10,
                    color: "#134113", // nature green
                    distance: 20,
                    decay: 0.5,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
                // Section 10: Right Outside Bottom (x=5.25, z=4)
                {
                    position: [10, ART_GALLERY_CEILING_HEIGHT, 4] as [
                        number,
                        number,
                        number
                    ],
                    target: [5.25, 2.8, 4] as [number, number, number],
                    intensity: 10,
                    color: "#0000ff", // blue
                    distance: 20,
                    decay: 1,
                    angle: Math.PI / 4,
                    penumbra: 0.3,
                },
            ],
        },
        defaultEntrance: {
            position: [7, 1.5, 0] as [number, number, number],
            rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        },
        interactiveElements: [], // Art frames are handled by GalleryRoom component
        archways: [
            {
                id: "to-atrium-from-gallery",
                targetRoomId: "atrium",
                position: [9.73, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [-7, 1.5, 0] as [number, number, number], // Clearly in front of gallery, away from play room
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
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
