export interface DisplayConfig {
    id: string;
    url: string;
    title: string;
    description: string;
    screenshotUrl: string; // Screenshot to show initially
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    crtStyle?: boolean; // Enable 3D CRT monitor styling with thick curved glass and retro box
    lightColor?: string; // Hex color code for the omnidirectional point light emitted by the display
    responsive: {
        desktop: {
            width: number;
            height: number;
        };
        mobile: {
            width: number;
            height: number;
        };
    };
}

export const mobileDimensions = {
    pixel7: { width: 393, height: 852 },
    iPhoneSE: { width: 375, height: 667 },
};

export const desktopDimensions = {
    imaginaryDesktop: { width: 1200, height: 800 },
};

// Table of all displays in the portfolio
export const displaysConfig: DisplayConfig[] = [
    // Left wall displays
    {
        id: "curie-shop-desktop",
        url: "https://curie.shop",
        title: "Curie Shop",
        description:
            "An innovative 3D e-commerce platform featuring interactive product models powered by Google Model Viewer. Users can rotate, zoom, and explore products in 3D before purchasing.",
        screenshotUrl: "/screenshots/curie-shop-desktop.png",
        position: [-9, 2, -3],
        rotation: [0, Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#999999",
        responsive: {
            desktop: desktopDimensions.imaginaryDesktop,
            mobile: mobileDimensions.pixel7,
        },
    },
    {
        id: "curie-shop-mobile",
        url: "https://curie.shop",
        title: "Curie Shop Mobile",
        description:
            "Mobile view of the innovative 3D e-commerce platform with touch-optimized controls for exploring interactive product models.",
        screenshotUrl: "/screenshots/curie-shop-mobile.png",
        position: [-9, 2, 0],
        rotation: [0, Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#999999",
        responsive: {
            desktop: mobileDimensions.iPhoneSE,
            mobile: mobileDimensions.pixel7,
        },
    },
    {
        id: "nicolas-portfolio",
        url: "https://nicolasbelovoskey.com",
        title: "Nicolas Belovoskey Portfolio",
        description:
            "Personal portfolio website showcasing development work and projects with modern design and interactive elements.",
        screenshotUrl: "/screenshots/nicolas-portfolio.png",
        position: [-9, 2, 3],
        rotation: [0, Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        crtStyle: false, // Enable retro CRT styling
        lightColor: "#ffff00",
        responsive: {
            desktop: desktopDimensions.imaginaryDesktop,
            mobile: mobileDimensions.pixel7,
        },
    },

    // Right wall displays
    {
        id: "saucedog-art",
        url: "https://saucedog.art",
        title: "Saucedog Art",
        description:
            "A stunning collection of digital art pieces created by Saucedog, featuring vibrant colors and unique artistic styles.",
        screenshotUrl: "/screenshots/saucedog-art.png",
        position: [9, 2, 0],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#ffffff",
        responsive: {
            desktop: desktopDimensions.imaginaryDesktop,
            mobile: mobileDimensions.pixel7,
        },
    },
    {
        id: "pocket-coach",
        url: "https://pocket-coach-app-replit-app.replit.app/",
        title: "Pocket Coach",
        description:
            "A mobile fitness app that helps you track your progress and stay motivated with personalized coaching features.",
        screenshotUrl: "/screenshots/pocket-coach.png",
        position: [9, 2, -3],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#00FF00",
        responsive: {
            desktop: mobileDimensions.iPhoneSE,
            mobile: { width: 280, height: 580 },
        },
    },
    {
        id: "vgq-mobile",
        url: "https://videogamequest.me",
        title: "Video Game Quest Mobile",
        description:
            "A mobile gaming platform for discovering and tracking video game quests and achievements with social features.",
        screenshotUrl: "/screenshots/vgq-mobile.png",
        position: [9, 2, 3],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#ff00ff",
        responsive: {
            desktop: { width: 320, height: 680 },
            mobile: { width: 300, height: 600 },
        },
    },

    // Back wall displays
    {
        id: "vgq-desktop",
        url: "https://videogamequest.me",
        title: "Video Game Quest",
        description:
            "A comprehensive gaming platform for discovering and tracking video game quests and achievements with detailed analytics.",
        screenshotUrl: "/screenshots/vgq-desktop.png",
        position: [-5, 2, -9],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        crtStyle: false, // Enable retro CRT styling
        lightColor: "#ff00ff",
        responsive: {
            desktop: { width: 1200, height: 800 },
            mobile: { width: 375, height: 667 },
        },
    },
    {
        id: "curie-world",
        url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
        title: "Curie World",
        description:
            "A 3D shopping shelf and examine experience with interactive product models powered by Google Model Viewer.",
        screenshotUrl: "/screenshots/curie-world.png",
        position: [5, 2, -9],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#dddddd",
        responsive: {
            desktop: { width: 900, height: 650 },
            mobile: { width: 375, height: 667 },
        },
    },
];

// Helper function to get display config by ID
export const getDisplayConfig = (id: string): DisplayConfig | undefined => {
    return displaysConfig.find((display) => display.id === id);
};

// Helper function to get responsive dimensions based on device type
export const getDisplayDimensions = (
    config: DisplayConfig,
    isMobile: boolean
) => {
    // Always use desktop dimensions for a consistent portfolio experience
    // regardless of the viewing device
    return config.responsive.desktop;
};
