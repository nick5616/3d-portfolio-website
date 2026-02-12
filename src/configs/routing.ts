// src/configs/routing.ts
export interface RoomRoute {
    path: string;
    roomId: string;
    title: string;
    description?: string;
}

export interface ExperienceRoute {
    path: string;
    experienceId: string;
    title: string;
}

export const roomRoutes: RoomRoute[] = [
    {
        path: "/",
        roomId: "atrium",
        title: "Portfolio Atrium",
        description: "Welcome to the central hub",
    },
    {
        path: "/atrium",
        roomId: "atrium",
        title: "Portfolio Atrium",
        description: "Welcome to the central hub",
    },
    {
        path: "/art-gallery",
        roomId: "gallery",
        title: "Art Gallery",
        description: "Digital art collection and creative works",
    },
    {
        path: "/gallery",
        roomId: "gallery",
        title: "Art Gallery",
        description: "Digital art collection and creative works",
    },
    {
        path: "/software",
        roomId: "projects",
        title: "Software Projects",
        description: "Portfolio of development work and applications",
    },
    {
        path: "/projects",
        roomId: "projects",
        title: "Software Projects",
        description: "Portfolio of development work and applications",
    },
    {
        path: "/holodeck",
        roomId: "about",
        title: "Interactive Holodeck",
        description: "Interactive experiences and personal information",
    },
    {
        path: "/about",
        roomId: "about",
        title: "Interactive Holodeck",
        description: "Interactive experiences and personal information",
    },
    {
        path: "/relaxation",
        roomId: "relaxation",
        title: "Relaxation Room",
        description: "A peaceful space for meditation and relaxation",
    },
];

// Holodeck experience routes — each experience has a canonical path and short aliases
export const experienceRoutes: ExperienceRoute[] = [
    { path: "/holodeck/courage-the-cowardly-dog", experienceId: "computer", title: "Courage the Cowardly Dog" },
    { path: "/holodeck/courage", experienceId: "computer", title: "Courage the Cowardly Dog" },
    { path: "/courage", experienceId: "computer", title: "Courage the Cowardly Dog" },
    { path: "/holodeck/gym", experienceId: "fitness", title: "Gym" },
    { path: "/gym", experienceId: "fitness", title: "Gym" },
    { path: "/fitness", experienceId: "fitness", title: "Gym" },
    { path: "/holodeck/art", experienceId: "art", title: "Art Studio" },
    { path: "/art", experienceId: "art", title: "Art Studio" },
    { path: "/holodeck/math", experienceId: "math", title: "Math" },
    { path: "/math", experienceId: "math", title: "Math" },
    { path: "/holodeck/forest", experienceId: "forest", title: "Forest" },
    { path: "/forest", experienceId: "forest", title: "Forest" },
];

// Canonical path per experience (first /holodeck/* entry)
const experienceIdToPath = new Map<string, string>([
    ["computer", "/holodeck/courage-the-cowardly-dog"],
    ["fitness", "/holodeck/gym"],
    ["art", "/holodeck/art"],
    ["math", "/holodeck/math"],
    ["forest", "/holodeck/forest"],
]);

// Quick lookup maps
const pathToExperienceId = new Map<string, string>(
    experienceRoutes.map((route) => [route.path, route.experienceId])
);

// Create a map for quick lookup
export const pathToRoomId = new Map<string, string>(
    roomRoutes.map((route) => [route.path, route.roomId])
);

// Create reverse map for room ID to path
export const roomIdToPath = new Map<string, string>([
    ["atrium", "/atrium"],
    ["gallery", "/art-gallery"],
    ["projects", "/software"],
    ["about", "/holodeck"],
    ["relaxation", "/relaxation"],
]);

// Helper function to get room ID from path (also matches experience routes → "about")
export const getRoomIdFromPath = (path: string): string | null => {
    return pathToRoomId.get(path) || (pathToExperienceId.has(path) ? "about" : null);
};

// Helper function to get path from room ID
export const getPathFromRoomId = (roomId: string): string | null => {
    return roomIdToPath.get(roomId) || null;
};

// Helper function to get route metadata
export const getRouteByPath = (path: string): RoomRoute | null => {
    return roomRoutes.find((route) => route.path === path) || null;
};

// Get the experience ID from a URL path (returns null if not an experience route)
export const getExperienceFromPath = (path: string): string | null => {
    return pathToExperienceId.get(path) || null;
};

// Get the canonical URL path for an experience ID
export const getPathFromExperience = (experienceId: string): string | null => {
    return experienceIdToPath.get(experienceId) || null;
};

// Helper function to extract holodeck experience from URL (legacy query param support)
export const getHolodeckExperienceFromURL = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get("experience");
};

// Helper function to build holodeck URL with experience (legacy)
export const buildHolodeckURL = (experience?: string): string => {
    const basePath = "/holodeck";
    if (experience && experience !== "off") {
        return `${basePath}?experience=${experience}`;
    }
    return basePath;
};
