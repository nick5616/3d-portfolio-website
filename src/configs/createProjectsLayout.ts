// src/configs/createProjectsLayout.ts
import { InteractiveElement } from "../types/scene.types";

export const createProjectsLayout = (): InteractiveElement[] => [
    // Left wall - Curie Shop
    {
        id: "project-left-curie",
        type: "web" as const,
        position: [-9, 2, -3] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://curie.shop",
            title: "Curie Shop",
            width: 2000,
            height: 1200,
            description:
                "An innovative 3D e-commerce platform featuring interactive product models powered by Google Model Viewer. Users can rotate, zoom, and explore products in 3D before purchasing.",
            fallbackImage:
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
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

    // Right wall - Pocket Coach
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

    // Back wall - Amplify App (new display with desktop dimensions)
    {
        id: "project-back-amplify",
        type: "web" as const,
        position: [0, 2, -9] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1.2, 1.2, 1] as [number, number, number],
        content: {
            url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
            title: "Portfolio App",
            width: 1400,
            height: 900,
            description:
                "A modern web application showcasing portfolio and project work.",
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
