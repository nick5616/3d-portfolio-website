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
                content: "✨",
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
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // An upscale, well lit space, such that the art can shine through. It's like a gallery in Manhattan or any upscale New York borough.
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
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // A high tech, sci-fi fantasy, highlighting software projects I've done through the years, in the form of directly rendering websites
        // on the face of box geometries, videos, and more native and interactive demonstrations. The aesthetic, geometries, and lighting
        // included in the room are futuristic and industrial, with a subtle etheral and utopic quality
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
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // A quirky and interesting room showing off who I am. I have a love for creation, learning, and relating to my fellow man.
        // I've been programming since I was 14. I'm about to be 26, and I've done a lot of creation in my life. I made things out of wood
        // as an adolescent and a teenager. I drew on paper with pencil often as a kid. But I was often messing with paper and glue,
        // just having a good time being resourceful and making things I wanted to. I'd imagine fantastical worlds, and this imagination
        // often outpaced my ability to create. I find this is still the case to this day. Though in my adult life, I've gotten much more
        // patient and my follow-through has improved. These days, I spend my time writing software for a living and for fun, often
        // programming late into the night, having done the same thing 9-5. I truly love what I do, and that includes more than software
        // engineering. I love to make art, and things in general. And so, I try to experiment with any medium I can reasonably get my
        // hands on. This year, 2025, I plan on trying/reinvigorating the following media (no order):
        // 1. Realism with pencil
        // 2. Animation-style rendering in digital art
        // 3. Instrumental music
        // 4. Poetry
        // 5. Learning to sing, and writing a song
        // 6. Woodworking (with an adult brain)
        // 7. Stick and poke tattooing
        // 8. Machine tattooing
        // 9. 3D modelling/animation
        // 10. Markers
        // 11. New media with Unreal game engine
        // 12. Photography
        // I also love exercising and keeping myself fit. I used to run a lot, to my dismay at the time due to being forced to by a family
        // very into it. These days, I appreciate aerobic/anaerobic exercise for what it is. I also love weighted calisthenics, building
        // my body, fashion, and generally moving in the direction I want. I have a beautiful partner who is an amazing artist, and my
        // inspiration to be my best, so that I may be worth being her one and only. I love you, Alicia.
        id: "about",
        name: "About & Contact",
        position: [20, 0, 0] as [number, number, number],
        dimensions: [20, 10, 20],
        lightPreset: {
            ambient: { intensity: 0.4, color: "#FFF5E1" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0.6,
                color: "#FFE0B2",
            },
            spots: [
                {
                    position: [-7, 6, -8] as [number, number, number],
                    target: [-7, 0, -8] as [number, number, number],
                    intensity: 0.7,
                    color: "#FFA07A",
                },
                {
                    position: [-8, 5, 0] as [number, number, number],
                    target: [-8, 2, 0] as [number, number, number],
                    intensity: 0.8,
                    color: "#F9EAD0",
                },
                {
                    position: [0, 5, 7] as [number, number, number],
                    target: [0, 1, 7] as [number, number, number],
                    intensity: 0.6,
                    color: "#6A5ACD",
                },
                {
                    position: [8, 5, 0] as [number, number, number],
                    target: [8, 2, 0] as [number, number, number],
                    intensity: 0.7,
                    color: "#48D1CC",
                },
                {
                    position: [7, 5, -7] as [number, number, number],
                    target: [7, 0, -7] as [number, number, number],
                    intensity: 0.6,
                    color: "#F0FFFF",
                },
            ],
        },
        interactiveElements: [
            {
                id: "about-text",
                type: "text",
                position: [7.99, 1, -2] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                scale: [0.5, 0.5, 1] as [number, number, number],
                content: "I like to make things.",
            },
            {
                id: "contact-info",
                type: "text",
                position: [7.99, 2, 4] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                scale: [0.25, 0.25, 1] as [number, number, number],
                content: `
                    Drop a line, as they say\n
                    Contact: nicolasbelovoskey@gmail.com\n
                    Here's my GitHub: github.com/nick5616
                `,
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
