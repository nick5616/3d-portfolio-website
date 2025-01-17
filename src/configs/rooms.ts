// src/configs/rooms.ts
import { RoomConfig, InteractiveElement } from "../types/scene.types";
import { getArtImageUrl } from "./artConfig";
import { createProjectsLayout } from "./createProjectsLayout";

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
            imageUrl: getArtImageUrl(0),
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
                imageUrl: getArtImageUrl(i + 1),
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
                imageUrl: getArtImageUrl(i + 3),
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
            imageUrl: getArtImageUrl(6),
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
                imageUrl: getArtImageUrl(i + 7),
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
                imageUrl: getArtImageUrl(i + 9),
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
                imageUrl: getArtImageUrl(i + 12),
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
                imageUrl: getArtImageUrl(i + 18),
            },
        })
    ),

    // Gallery title
    {
        id: "gallery-title",
        type: "text",
        position: [0, 8, -8.5] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        content: "Art Gallery",
        scale: [2, 2, 2] as [number, number, number],
    },
];

export const roomConfigs: { [key: string]: RoomConfig } = {
    atrium: {
        id: "atrium",
        name: "Atrium",
        position: [0, 0, 0] as [number, number, number],
        dimensions: [20, 10, 20], // width, height, depth
        lightPreset: {
            ambient: { intensity: 0.5, color: "#ffffff" },
            directional: {
                position: [10, 10, 0] as [number, number, number],
                intensity: 0.8,
                color: "#ffffff",
            },
            spots: [
                {
                    position: [0, 8, 0] as [number, number, number],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 1,
                    color: "#ffffff",
                },
            ],
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
            {
                id: "atrium-label",
                type: "text",
                position: [0, 4, 0] as [number, number, number],
                content: "Welcome to the Portfolio",
                scale: [1, 1, 1] as [number, number, number],
            },
        ],
        archways: [
            {
                id: "to-gallery",
                targetRoomId: "gallery",
                position: [-9.5, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
            },
            {
                id: "to-projects",
                targetRoomId: "projects",
                position: [0, 0, -9.5] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
            },
            {
                id: "to-about",
                targetRoomId: "about",
                position: [9.5, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 2,
                height: 3,
            },
        ],
    },

    gallery: {
        id: "gallery",
        name: "Art Gallery",
        position: [-20, 0, 0] as [number, number, number],
        dimensions: [20, 10, 20],
        lightPreset: {
            ambient: { intensity: 1.0, color: "#ffffff" }, // Increased from 0.4
            directional: {
                position: [5, 5, 0] as [number, number, number],
                intensity: 1.0, // Increased from 0.5
                color: "#ffffff",
            },
            spots: [
                // North wall (left) spotlights - 6 lights for 6 frames
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [-8, 6, -7 + i * 3] as [
                            number,
                            number,
                            number
                        ],
                        target: [-9, 2, -7 + i * 3] as [number, number, number],
                        intensity: 0.6, // Reduced from 1.2
                        color: "#ffffff",
                    })),
                // South wall spotlights
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [8, 6, -7 + i * 3] as [
                            number,
                            number,
                            number
                        ],
                        target: [9, 2, -7 + i * 3] as [number, number, number],
                        intensity: 0.6,
                        color: "#ffffff",
                    })),
                // West wall (back) spotlights
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [-7 + i * 3, 6, -8] as [
                            number,
                            number,
                            number
                        ],
                        target: [-7 + i * 3, 2, -9] as [number, number, number],
                        intensity: 0.6,
                        color: "#ffffff",
                    })),
                // East wall (entrance) spotlights
                ...Array(6)
                    .fill(0)
                    .map((_, i) => ({
                        position: [-7 + i * 3, 6, 8] as [
                            number,
                            number,
                            number
                        ],
                        target: [-7 + i * 3, 2, 9] as [number, number, number],
                        intensity: 0.6,
                        color: "#ffffff",
                    })),
            ],
        },
        interactiveElements: createArtLayout(),
        archways: [
            {
                id: "to-atrium-from-gallery",
                targetRoomId: "atrium",
                position: [9.5, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
            },
        ],
    },

    projects: {
        id: "projects",
        name: "Software Projects",
        position: [0, 0, -20] as [number, number, number],
        dimensions: [20, 10, 20],
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
        interactiveElements: createProjectsLayout(),
        archways: [
            {
                id: "to-atrium-from-projects",
                targetRoomId: "atrium",
                position: [0, 0, 9.5] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 3,
                height: 4,
            },
        ],
    },

    about: {
        id: "about",
        name: "About & Contact",
        position: [20, 0, 0] as [number, number, number],
        dimensions: [20, 10, 20],
        lightPreset: {
            ambient: { intensity: 0.5, color: "#ffffff" },
            directional: {
                position: [5, 5, 0] as [number, number, number],
                intensity: 0.7,
                color: "#ffffff",
            },
            spots: [
                {
                    position: [5, 6, 0] as [number, number, number],
                    target: [5, 0, 0] as [number, number, number],
                    intensity: 0.9,
                    color: "#ffffff",
                },
            ],
        },
        interactiveElements: [
            {
                id: "about-title",
                type: "text",
                position: [5, 4, 0] as [number, number, number],
                scale: [1.5, 1.5, 1.5] as [number, number, number],
                content: "About Me",
            },
            {
                id: "about-text",
                type: "text",
                position: [5, 3, 0] as [number, number, number],
                scale: [0.5, 0.5, 1] as [number, number, number],
                content: "I like to make things.",
            },
            {
                id: "contact-info",
                type: "text",
                position: [5, 2, 0] as [number, number, number],
                scale: [0.25, 0.25, 1] as [number, number, number],
                content:
                    "Contact: email@example.com\nGitHub: github.com/username",
            },
            // Decorative pillars
            ...Array(4)
                .fill(0)
                .map(
                    (_, i): InteractiveElement => ({
                        id: `about-pillar-${i}`,
                        type: "model",
                        position: [
                            3 + (i % 2) * 4,
                            0,
                            -3 + Math.floor(i / 2) * 6,
                        ] as [number, number, number],
                        scale: [0.4, 3, 0.4] as [number, number, number],
                        content: "greek-pillar",
                    })
                ),
        ],
        archways: [
            {
                id: "to-atrium-from-about",
                targetRoomId: "atrium",
                position: [-9.5, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
            },
        ],
    },
};
