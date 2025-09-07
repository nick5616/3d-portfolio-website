// src/configs/routing.ts
export interface RoomRoute {
    path: string;
    roomId: string;
    title: string;
    description?: string;
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
];

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
]);

// Helper function to get room ID from path
export const getRoomIdFromPath = (path: string): string | null => {
    return pathToRoomId.get(path) || null;
};

// Helper function to get path from room ID
export const getPathFromRoomId = (roomId: string): string | null => {
    return roomIdToPath.get(roomId) || null;
};

// Helper function to get route metadata
export const getRouteByPath = (path: string): RoomRoute | null => {
    return roomRoutes.find((route) => route.path === path) || null;
};

// Helper function to extract holodeck experience from URL
export const getHolodeckExperienceFromURL = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get("experience");
};

// Helper function to build holodeck URL with experience
export const buildHolodeckURL = (experience?: string): string => {
    const basePath = "/holodeck";
    if (experience && experience !== "off") {
        return `${basePath}?experience=${experience}`;
    }
    return basePath;
};
