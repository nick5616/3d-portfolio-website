// src/configs/rooms.ts
import { RoomConfig, InteractiveElement } from "../types/scene.types";

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
                scale: [2, 2, 2] as [number, number, number],
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
                width: 3,
                height: 4,
            },
        ],
    },

    gallery: {
        id: "gallery",
        name: "Art Gallery",
        position: [-20, 0, 0] as [number, number, number],
        dimensions: [20, 10, 20],
        lightPreset: {
            ambient: { intensity: 0.3, color: "#ffffff" },
            directional: {
                position: [5, 5, 0] as [number, number, number],
                intensity: 0.5,
                color: "#ffffff",
            },
            spots: Array(5)
                .fill(0)
                .map((_, i) => ({
                    position: [-5, 4, -4 + i * 2] as [number, number, number],
                    target: [-5, 2, -4 + i * 2] as [number, number, number],
                    intensity: 1,
                    color: "#ffffff",
                })),
        },
        interactiveElements: [
            // Art frames along walls
            ...Array(5)
                .fill(0)
                .map(
                    (_, i): InteractiveElement => ({
                        id: `art-frame-north-${i}`,
                        type: "image",
                        position: [-5, 2, -4 + i * 2] as [
                            number,
                            number,
                            number
                        ],
                        rotation: [0, Math.PI / 2, 0] as [
                            number,
                            number,
                            number
                        ],
                        scale: [1.5, 1.5, 1] as [number, number, number],
                        content: `/images/art/piece-${i + 1}.jpg`,
                    })
                ),
            ...Array(5)
                .fill(0)
                .map(
                    (_, i): InteractiveElement => ({
                        id: `art-frame-south-${i}`,
                        type: "image",
                        position: [5, 2, -4 + i * 2] as [
                            number,
                            number,
                            number
                        ],
                        rotation: [0, -Math.PI / 2, 0] as [
                            number,
                            number,
                            number
                        ],
                        scale: [1.5, 1.5, 1] as [number, number, number],
                        content: `/images/art/piece-${i + 6}.jpg`,
                    })
                ),
            {
                id: "gallery-title",
                type: "text",
                position: [0, 4, -9] as [number, number, number],
                content: "Art Gallery",
                scale: [1.5, 1.5, 1.5] as [number, number, number],
            },
        ],
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
        interactiveElements: [
            // Project displays in a grid formation
            ...Array(6)
                .fill(0)
                .map(
                    (_, i): InteractiveElement => ({
                        id: `project-${i}`,
                        type: "model",
                        position: [
                            -7.5 + (i % 3) * 7.5,
                            2,
                            -5 + Math.floor(i / 3) * 5,
                        ] as [number, number, number],
                        rotation: [0, 0, 0] as [number, number, number],
                        scale: [3, 2, 0.2] as [number, number, number],
                        content: "project-display",
                    })
                ),
            {
                id: "projects-title",
                type: "text",
                position: [0, 4, -5] as [number, number, number],
                content: "Software Projects",
                scale: [1.5, 1.5, 1.5] as [number, number, number],
            },
        ],
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
                scale: [1, 1, 1] as [number, number, number],
                content:
                    "I'm a software developer passionate about creating immersive experiences...",
            },
            {
                id: "contact-info",
                type: "text",
                position: [5, 2, 0] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number],
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
