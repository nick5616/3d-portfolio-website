// src/configs/rooms.ts
import { RoomConfig, InteractiveElement } from "../types/scene.types";

const ART_GALLERY_CEILING_HEIGHT = 7.5;
const ATRIUM_CEILING_HEIGHT = 7.5;
const PROJECTS_CEILING_HEIGHT = 6;
const ABOUT_CEILING_HEIGHT = 8;

const createArtLayout = (): InteractiveElement[] => [
    // North wall (-x)
    {
        id: "art-north-center",
        type: "model",
        position: [-9, 2.5, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        scale: [1.5, 1.5, 1] as [number, number, number],
        content: {
            type: "art-frame",
            imageUrl: "marvin-martian.jpg",
        },
    },

    // Higher surrounding pieces for North wall
    ...[-4.8, 5.5].map(
        (zOffset, i): InteractiveElement => ({
            id: `art-north-top-${i}`,
            type: "model",
            position: [-9, 3.6, zOffset] as [number, number, number],
            rotation: [0, Math.PI / 2, 0] as [number, number, number],
            scale: [0.8, 0.8, 1] as [number, number, number],
            content: {
                type: "art-frame",
                imageUrl: i === 0 ? "monster-under.jpg" : "chaos-bird.jpg",
            },
        })
    ),

    // Lower surrounding pieces for North wall
    ...[-6.5, 6.5].map(
        (zOffset, i): InteractiveElement => ({
            id: `art-north-bottom-${i}`,
            type: "model",
            position: [-9, 1.8, zOffset] as [number, number, number],
            rotation: [0, Math.PI / 2, 0] as [number, number, number],
            scale: [0.9, 0.9, 1] as [number, number, number],
            content: {
                type: "art-frame",
                imageUrl: i === 0 ? "teemo.jpg" : "tree-night.jpg",
            },
        })
    ),

    // South wall (left when entering) (indices 6-11)
    // Center piece
    {
        id: "art-south-center",
        type: "model",
        position: [0, 2.5, 9] as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number],
        scale: [1.5, 1.5, 1] as [number, number, number],
        content: {
            type: "art-frame",
            imageUrl: "wispette.jpg",
        },
    },

    // Side pieces for South wall
    ...[-4, 4].map(
        (xOffset, i): InteractiveElement => ({
            id: `art-south-side-${i}`,
            type: "model",
            position: [xOffset, 2.5, 9] as [number, number, number],
            rotation: [0, Math.PI, 0] as [number, number, number],
            scale: [1.2, 1.2, 1] as [number, number, number],
            content: {
                type: "art-frame",
                imageUrl: i === 0 ? "link-botw.jpg" : "okay-blue-heron.jpg",
            },
        })
    ),

    // Upper pieces for South wall
    ...[-6.1, 6.3].map(
        (xOffset, i): InteractiveElement => ({
            id: `art-south-upper-${i}`,
            type: "model",
            position: [xOffset, 3.5, 9] as [number, number, number],
            rotation: [0, Math.PI, 0] as [number, number, number],
            scale: [0.9, 0.9, 1] as [number, number, number],
            content: {
                type: "art-frame",
                imageUrl: "marvin-martian.jpg",
            },
        })
    ),

    // Back wall (-z) (indices 12-17)
    ...[-7, -2.5, 2.5, 7].map(
        (xOffset, i): InteractiveElement => ({
            id: `art-back-${i}`,
            type: "model",
            position: [xOffset, 2 + (i % 2) * 0.8, -9] as [
                number,
                number,
                number
            ],
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1.1, 1.1, 1] as [number, number, number],
            content: {
                type: "art-frame",
                imageUrl: "monster-under.jpg",
            },
        })
    ),

    // Entrance/Right wall paintings (+x) (indices 18-21)
    ...(
        [
            [-7, 2.5],
            [-4, 3],
            [4, 3],
            [7, 2.5],
        ] as const
    ).map(
        ([zOffset, height], i): InteractiveElement => ({
            id: `art-entrance-${i}`,
            type: "model",
            position: [9, height, zOffset] as [number, number, number],
            rotation: [0, -Math.PI / 2, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            content: {
                type: "art-frame",
                imageUrl: "chaos-bird.jpg",
            },
        })
    ),

    // Gallery title
    {
        id: "gallery-title",
        type: "text",
        position: [0, 8, -8.5] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        content: "",
        scale: [2, 2, 2] as [number, number, number],
    },
];

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
            position: [0, 1.5, 5] as [number, number, number],
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
                position: [-9.5, 0, 0] as [number, number, number],
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
                position: [0, 0, -9.5] as [number, number, number],
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
                position: [9.5, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [-2.5, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
        ],
    },

    gallery: {
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // An upscale, well lit space, such that the art can shine through. It's like a gallery in Manhattan or any upscale New York borough.
        id: "gallery",
        name: "Art Gallery",
        position: [-20, 0, 0] as [number, number, number],
        dimensions: [20, ART_GALLERY_CEILING_HEIGHT, 20],
        lightPreset: {
            ambient: { intensity: 1, color: "#ffffff" }, // Increased from 0.4
            directional: {
                position: [5, 5, 0] as [number, number, number],
                intensity: 2, // Increased from 0.5
                color: "#ffffff",
            },
            spots: [
                // North wall (left) spotlights - 6 lights for 6 frames
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [-8, ART_GALLERY_CEILING_HEIGHT / 2, -8] as [
                            number,
                            number,
                            number
                        ],
                        target: [-8, 2, -8] as [number, number, number],
                        intensity: 1.2, // Reduced from 1.2
                        color: "#ffffff",
                    })),
                // South wall spotlights
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [8, ART_GALLERY_CEILING_HEIGHT / 2, -8] as [
                            number,
                            number,
                            number
                        ],
                        target: [8, 2, -8] as [number, number, number],
                        intensity: 0.6,
                        color: "#ffffff",
                    })),
                // West wall (back) spotlights
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [-8, ART_GALLERY_CEILING_HEIGHT / 2, -8] as [
                            number,
                            number,
                            number
                        ],
                        target: [-8, 2, -8] as [number, number, number],
                        intensity: 0.6,
                        color: "#ffffff",
                    })),
                // East wall (entrance) spotlights
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [-8, ART_GALLERY_CEILING_HEIGHT / 2, 8] as [
                            number,
                            number,
                            number
                        ],
                        target: [-8, 2, 8] as [number, number, number],
                        intensity: 0.6,
                        color: "#ffffff",
                    })),
                // Corner down lights - 4 point lights in ceiling corners
                {
                    position: [-8, ART_GALLERY_CEILING_HEIGHT / 2, -8] as [
                        number,
                        number,
                        number
                    ],
                    target: [-8, 0, -8] as [number, number, number],
                    intensity: 8,
                    color: "#ffffff",
                },
                {
                    position: [8, ART_GALLERY_CEILING_HEIGHT / 2, -8] as [
                        number,
                        number,
                        number
                    ],
                    target: [8, 0, -8] as [number, number, number],
                    intensity: 0.8,
                    color: "#ffffff",
                },
                {
                    position: [-8, ART_GALLERY_CEILING_HEIGHT / 2, 8] as [
                        number,
                        number,
                        number
                    ],
                    target: [-8, 0, 8] as [number, number, number],
                    intensity: 0.8,
                    color: "#ffffff",
                },
                {
                    position: [8, ART_GALLERY_CEILING_HEIGHT / 2, 8] as [
                        number,
                        number,
                        number
                    ],
                    target: [8, 0, 8] as [number, number, number],
                    intensity: 0.8,
                    color: "#ffffff",
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
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // A high tech, sci-fi fantasy, highlighting software projects I've done through the years, in the form of directly rendering websites
        // on the face of box geometries, videos, and more native and interactive demonstrations. The aesthetic, geometries, and lighting
        // included in the room are futuristic and industrial, with a subtle etheral and utopic quality
        id: "projects",
        name: "Software Projects",
        position: [0, 0, -20] as [number, number, number],
        dimensions: [20, PROJECTS_CEILING_HEIGHT, 20],
        lightPreset: {
            ambient: { intensity: 0.4, color: "#ffffff" },
            directional: {
                position: [0, 8, -5] as [number, number, number],
                intensity: 0.6,
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
            rotation: [0, Math.PI, 0] as [number, number, number],
        },
        interactiveElements: [], // Interactive elements are now handled directly in ProjectsRoom component
        archways: [
            {
                id: "to-atrium-from-projects",
                targetRoomId: "atrium",
                position: [0, 0, 9.5] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
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
        interactiveElements: [
            {
                id: "about-text",
                type: "text",
                position: [3.8, 1, -1] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                scale: [0.4, 0.4, 1] as [number, number, number],
                content: "I like to make things.",
            },
            {
                id: "contact-info",
                type: "text",
                position: [3.8, 2, 2] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                scale: [0.2, 0.2, 0.8] as [number, number, number],
                content: `
                    Drop a line, as they say\n
                    Contact: nicolasbelovoskey@gmail.com\n
                    Here's my GitHub: github.com/nick5616
                `,
            },
        ],
        archways: [
            {
                id: "to-atrium-from-about",
                targetRoomId: "atrium",
                position: [-4, 0, 0] as [number, number, number],
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
};
