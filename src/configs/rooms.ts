// src/configs/rooms.ts
import { RoomConfig, InteractiveElement } from "../types/scene.types";

export const roomConfigs: { [key: string]: RoomConfig } = {
    atrium: {
        id: "atrium",
        name: "Atrium",
        position: [0, 0, 0] as [number, number, number],
        lightPreset: {
            ambient: {
                intensity: 0.5,
                color: "#ffffff",
            },
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
            ...Array(12)
                .fill(0)
                .map((_, i): InteractiveElement => {
                    const angle = (i / 12) * Math.PI * 2;
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
            // Room label
            {
                id: "atrium-label",
                type: "text",
                position: [0, 4, -7] as [number, number, number],
                content: "Welcome to the Portfolio",
                scale: [2, 2, 2] as [number, number, number],
            },
        ],
        portals: [
            {
                id: "to-gallery",
                targetRoomId: "gallery",
                position: [-8, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
            },
            {
                id: "to-projects",
                targetRoomId: "projects",
                position: [0, 0, -8] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
            },
            {
                id: "to-about",
                targetRoomId: "about",
                position: [0, 0, 8] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
            },
        ],
    },

    gallery: {
        id: "gallery",
        name: "Art Gallery",
        position: [-15, 0, 0] as [number, number, number],
        lightPreset: {
            ambient: {
                intensity: 0.3,
                color: "#ffffff",
            },
            directional: {
                position: [5, 5, 0] as [number, number, number],
                intensity: 0.5,
                color: "#ffffff",
            },
            spots: Array(10)
                .fill(0)
                .map((_, i) => ({
                    position: [-15, 4, -4 + i * 2] as [number, number, number],
                    target: [-15, 2, -4 + i * 2] as [number, number, number],
                    intensity: 1,
                    color: "#ffffff",
                })),
        },
        interactiveElements: [
            // Two large central pillars
            {
                id: "gallery-pillar-1",
                type: "model",
                position: [-15, 0, -2] as [number, number, number],
                scale: [2, 4, 0.5] as [number, number, number],
                content: "display-pillar",
            },
            {
                id: "gallery-pillar-2",
                type: "model",
                position: [-15, 0, 2] as [number, number, number],
                scale: [2, 4, 0.5] as [number, number, number],
                content: "display-pillar",
            },
            // Art display frames
            ...Array(10)
                .fill(0)
                .map(
                    (_, i): InteractiveElement => ({
                        id: `art-frame-${i}`,
                        type: "image",
                        position: [-19.9, 2, -4 + i * 2] as [
                            number,
                            number,
                            number
                        ],
                        scale: [0.1, 1.5, 1.5] as [number, number, number],
                        content: `/images/art/tree-night.jpg`,
                    })
                ),
        ],
        portals: [
            {
                id: "to-atrium-from-gallery",
                targetRoomId: "atrium",
                position: [-10, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
            },
        ],
    },

    projects: {
        id: "projects",
        name: "Software Projects",
        position: [0, 0, -15] as [number, number, number],
        lightPreset: {
            ambient: {
                intensity: 0.4,
                color: "#ffffff",
            },
            directional: {
                position: [0, 8, -15] as [number, number, number],
                intensity: 0.6,
                color: "#ffffff",
            },
        },
        interactiveElements: [
            // Project displays in a grid
            ...Array(6)
                .fill(0)
                .map(
                    (_, i): InteractiveElement => ({
                        id: `project-${i}`,
                        type: "model",
                        position: [
                            -7.5 + (i % 3) * 7.5,
                            2,
                            -19 + Math.floor(i / 3) * 5,
                        ] as [number, number, number],
                        scale: [3, 2, 0.2] as [number, number, number],
                        content: `project-display`,
                    })
                ),
        ],
        portals: [
            {
                id: "to-atrium-from-projects",
                targetRoomId: "atrium",
                position: [0, 0, -10] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
            },
        ],
    },

    about: {
        id: "about",
        name: "About & Contact",
        position: [0, 0, 15] as [number, number, number],
        lightPreset: {
            ambient: {
                intensity: 0.5,
                color: "#ffffff",
            },
            directional: {
                position: [0, 5, 20] as [number, number, number],
                intensity: 0.7,
                color: "#ffffff",
            },
        },
        interactiveElements: [
            {
                id: "about-text",
                type: "text",
                position: [0, 3, 18] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number],
                content: "About Me\n\nWelcome to my portfolio...",
            },
            {
                id: "contact-info",
                type: "text",
                position: [0, 2, 18] as [number, number, number],
                scale: [0.8, 0.8, 0.8] as [number, number, number],
                content:
                    "Contact: email@example.com\nGitHub: github.com/username",
            },
        ],
        portals: [
            {
                id: "to-atrium-from-about",
                targetRoomId: "atrium",
                position: [0, 0, 10] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
            },
        ],
    },
};
