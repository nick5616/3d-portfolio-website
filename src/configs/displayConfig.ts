import { DisplayType } from "../components/models/Web3DDisplay";

export interface DisplayConfig {
    id: string;
    url: string;
    title: string;
    description: string;
    screenshotUrl: string; // Screenshot to show initially
    position: [number, number, number];
    rotation?: [number, number, number];
    textSizeFactor?: number; // Factor to scale the text size (0.01 = 1%, 1 = 100%)
    scale?: [number, number, number];
    crtStyle?: boolean; // Enable 3D CRT monitor styling with thick curved glass and retro box
    lightColor?: string; // Hex color code for the omnidirectional point light emitted by the display
    displayType?: DisplayType; // Type of display: "web", "youtube", "gif", or "auto" (auto-detect)
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
        title: "Working with Curie: eCommerce Shoe Store with 3D Product Models",
        description:
            "An innovative 3D e-commerce platform featuring interactive product models powered by Google Model Viewer. Users can rotate, zoom, and explore products in 3D before purchasing.",
        screenshotUrl: "/screenshots/curie-shop-desktop.png",
        position: [-9.7, 2, -3],
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
        title: "Working with Curie: 3D eCommerce Shoe Store with Touch-Optimized Controls",
        description:
            "Mobile view of the innovative 3D e-commerce platform with touch-optimized controls for exploring interactive product models.",
        screenshotUrl: "/screenshots/curie-shop-mobile.png",
        position: [-9.7, 2, 0],
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
        position: [-9.7, 2, 3],
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
        title: "Saucedog Art: My Digital Art Portfolio 2D website with art before and up to 2023",
        description:
            "A stunning collection of digital art pieces created by Saucedog, featuring vibrant colors and unique artistic styles.",
        screenshotUrl: "/screenshots/saucedog-art.png",
        textSizeFactor: 0.7, // 70% of the original text size
        position: [9.7, 2, 0],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#ffffff",
        responsive: {
            desktop: desktopDimensions.imaginaryDesktop,
            mobile: mobileDimensions.pixel7,
        },
    },
    // {
    //     id: "pocket-coach",
    //     url: "https://pocketcoach.fitness",
    //     title: "Pocket Coach",
    //     description:
    //         "(down) A mobile fitness app that helps you track your progress and stay motivated with personalized coaching features. This one is down right now, I'm just not paying for intra to host and serve it.",
    //     screenshotUrl: "/screenshots/pocket-coach.png",
    //     position: [9.7, 2, -3],
    //     rotation: [0, -Math.PI / 2, 0],
    //     scale: [1.2, 1.2, 1],
    //     lightColor: "#00FF00",
    //     responsive: {
    //         desktop: mobileDimensions.iPhoneSE,
    //         mobile: { width: 280, height: 580 },
    //     },
    // },
    {
        id: "vgq-mobile",
        url: "https://videogamequest.me",
        title: "Video Game Quest: Mobile App convert todo-lists into gamified quests. Personal Project.",
        description:
            "A mobile gaming platform for discovering and tracking video game quests and achievements with social features.",
        screenshotUrl: "/screenshots/vgq-mobile.png",
        textSizeFactor: 0.9,
        position: [9.7, 2, 3],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        lightColor: "#ff00ff",
        responsive: {
            desktop: { width: 320, height: 680 },
            mobile: { width: 300, height: 600 },
        },
    },
    {
        id: "recipe-api-youtube",
        url: "https://www.youtube.com/watch?v=fo0OTiUzHLU",
        title: "Software Engineering Class, Web APIs Project: From College, 2019, when I was 20 years old.",
        description:
            "A college course project from 2019 that uses APIs to create a website that tells you what recipes you can make based on the ingredients you have in your house.",
        screenshotUrl: "/screenshots/vgq-mobile.png",
        textSizeFactor: 0.7, // 70% of the original text size
        position: [9.7, 2, 5],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        displayType: "youtube",
        lightColor: "#ff6b6b",
        responsive: {
            desktop: { width: 800, height: 450 },
            mobile: { width: 375, height: 667 },
        },
    },

    // Back wall displays
    {
        id: "vgq-desktop",
        url: "https://videogamequest.me",
        title: "Video Game Quest: Personal Project using GenAI in a React PWA to make a gamified journalling application",
        description:
            "A comprehensive gaming platform for discovering and tracking video game quests and achievements with detailed analytics.",
        screenshotUrl: "/screenshots/vgq-desktop.png",
        position: [-8, 2, -9.7],
        textSizeFactor: 0.7, // 70% of the original text size
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
        id: "tierlistify-mobile",
        url: "https://tierlistify.com",
        title: "Tierlistify: Personal Project Mobile-Optimized Tier List Builder and Manager",
        description:
            "A mobile tier list builder and manager with a focus on simplicity and efficiency.",
        screenshotUrl: "/screenshots/vgq-desktop.png",
        position: [-4, 2, -9.7],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        crtStyle: false, // Enable retro CRT styling
        lightColor: "#ff00ff",
        responsive: {
            desktop: { width: 320, height: 680 },
            mobile: { width: 375, height: 667 },
        },
    },
    {
        id: "friendex-mobile",
        url: "https://friendex.online/demo",
        title: "Friendex: Personal Project to make being a good friend easier.",
        description:
            "A mobile-only friend rolodex for collecting your friends.",
        screenshotUrl: "/screenshots/vgq-desktop.png",
        position: [-1, 2, -9.7],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        crtStyle: false, // Enable retro CRT styling
        lightColor: "#ff00ff",
        responsive: {
            desktop: { width: 320, height: 680 },
            mobile: { width: 375, height: 667 },
        },
    },
    {
        id: "webspatial-curie-gif",
        url: "/webspatial-curie.gif",
        title: "Working with Curie Apple Vision Pro App",
        description:
            "An animated demonstration of the WebSpatial Curie platform showcasing interactive 3D experiences and spatial web technologies.",
        screenshotUrl: "/webspatial-curie.gif",
        position: [2, 2, -9.7],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        displayType: "gif",
        lightColor: "#00aaff",
        responsive: {
            desktop: { width: 800, height: 600 },
            mobile: { width: 375, height: 667 },
        },
    },
    {
        id: "curie-world",
        url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
        title: "Working with Curie: WebXR Immersive Shopping Experience",
        description:
            "A 3D shopping shelf and examine experience with interactive product models powered by Google Model Viewer.",
        screenshotUrl: "/screenshots/curie-world.png",
        position: [6, 2, -9.7],
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
