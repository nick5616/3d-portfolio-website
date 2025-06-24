// src/configs/createProjectsLayout.ts
import { InteractiveElement } from "../types/scene.types";

export const createProjectsLayout = (): InteractiveElement[] => [
    // Left wall - Curie Shop (desktop)
    {
        id: "project-left-curie",
        type: "web" as const,
        position: [-9, 2, -3] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://curie.shop",
            title: "Curie Shop",
            width: 850,
            height: 650,
            description:
                "An innovative 3D e-commerce platform featuring interactive product models powered by Google Model Viewer. Users can rotate, zoom, and explore products in 3D before purchasing.",
            fallbackImage:
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
        },
    },

    // Left wall - Curie Shop (mobile)
    {
        id: "project-left-curie-mobile",
        type: "web" as const,
        position: [-9, 2, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://curie.shop",
            title: "Curie Shop Mobile",
            width: 375,
            height: 812,
            description:
                "Mobile view of the innovative 3D e-commerce platform with touch-optimized controls for exploring interactive product models.",
            fallbackImage:
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
        },
    },

    // Left wall - Nicolas Belovoskey Portfolio (desktop)
    {
        id: "project-left-nicolas",
        type: "web" as const,
        position: [-9, 2, 3] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://nicolasbelovoskey.com",
            title: "Nicolas Belovoskey",
            width: 1200,
            height: 800,
            description:
                "Personal portfolio website showcasing development work and projects.",
            fallbackImage:
                "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=600&fit=crop",
        },
    },

    // Right wall - Saucedog Art
    {
        id: "project-right-saucedog",
        type: "web" as const,
        position: [9, 2, 0] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://saucedog.art",
            title: "Saucedog Art",
            width: 850,
            height: 650,
            description:
                "A collection of art pieces created by Saucedog, a digital artist.",
            fallbackImage:
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
        },
    },

    // Right wall - Pocket Coach (mobile)
    {
        id: "project-right-coach",
        type: "web" as const,
        position: [9, 2, -3] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://pocket-coach-app-replit-app.replit.app/",
            title: "Pocket Coach",
            width: 300,
            height: 650,
            description:
                "A mobile app that helps you track your progress and stay motivated.",
            fallbackImage:
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
        },
    },

    // Right wall - Video Game Quest (mobile)
    {
        id: "project-right-vgq-mobile",
        type: "web" as const,
        position: [9, 2, 3] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://videogamequest.me",
            title: "Video Game Quest",
            width: 320,
            height: 680,
            description:
                "A mobile gaming platform for discovering and tracking video game quests and achievements.",
            fallbackImage:
                "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop",
        },
    },

    // Back wall - Video Game Quest (desktop)
    {
        id: "project-back-vgq-desktop",
        type: "web" as const,
        position: [-5, 2, -9] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://videogamequest.me",
            title: "Video Game Quest",
            width: 1200,
            height: 800,
            description:
                "A comprehensive gaming platform for discovering and tracking video game quests and achievements.",
            fallbackImage:
                "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop",
        },
    },

    // Back wall - Curie World
    {
        id: "project-back-amplify",
        type: "web" as const,
        position: [5, 2, -9] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
            title: "Curie World",
            width: 900,
            height: 650,
            description:
                "A 3D shopping shelf and examine experience with interactive product models powered by Google Model Viewer.",
            fallbackImage:
                "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=600&fit=crop",
        },
    },

    // Title
    {
        id: "projects-title",
        type: "text",
        position: [0, 4, -5] as [number, number, number],
        content: "🚧",
        scale: [1.5, 1.5, 1.5] as [number, number, number],
    },
];
