export interface DisplayConfig {
    id: string;
    url: string;
    title: string;
    description: string;
    screenshotUrl: string; // Screenshot to show initially
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
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

// Table of all displays in the portfolio
export const displaysConfig: DisplayConfig[] = [
    // Left wall displays
    {
        id: "curie-shop-desktop",
        url: "https://curie.shop",
        title: "Curie Shop",
        description: "An innovative 3D e-commerce platform featuring interactive product models powered by Google Model Viewer. Users can rotate, zoom, and explore products in 3D before purchasing.",
        screenshotUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=800&fit=crop&q=80",
        position: [-9, 2, -3],
        rotation: [0, Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 1200, height: 800 },
            mobile: { width: 375, height: 667 }
        }
    },
    {
        id: "curie-shop-mobile",
        url: "https://curie.shop",
        title: "Curie Shop Mobile",
        description: "Mobile view of the innovative 3D e-commerce platform with touch-optimized controls for exploring interactive product models.",
        screenshotUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=375&h=667&fit=crop&q=80",
        position: [-9, 2, 0],
        rotation: [0, Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 375, height: 812 },
            mobile: { width: 320, height: 640 }
        }
    },
    {
        id: "nicolas-portfolio",
        url: "https://nicolasbelovoskey.com",
        title: "Nicolas Belovoskey Portfolio",
        description: "Personal portfolio website showcasing development work and projects with modern design and interactive elements.",
        screenshotUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200&h=800&fit=crop&q=80",
        position: [-9, 2, 3],
        rotation: [0, Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 1200, height: 800 },
            mobile: { width: 375, height: 667 }
        }
    },
    
    // Right wall displays
    {
        id: "saucedog-art",
        url: "https://saucedog.art",
        title: "Saucedog Art",
        description: "A stunning collection of digital art pieces created by Saucedog, featuring vibrant colors and unique artistic styles.",
        screenshotUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=900&h=650&fit=crop&q=80",
        position: [9, 2, 0],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 900, height: 650 },
            mobile: { width: 375, height: 667 }
        }
    },
    {
        id: "pocket-coach",
        url: "https://pocket-coach-app-replit-app.replit.app/",
        title: "Pocket Coach",
        description: "A mobile fitness app that helps you track your progress and stay motivated with personalized coaching features.",
        screenshotUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=650&fit=crop&q=80",
        position: [9, 2, -3],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 300, height: 650 },
            mobile: { width: 280, height: 580 }
        }
    },
    {
        id: "vgq-mobile",
        url: "https://videogamequest.me",
        title: "Video Game Quest Mobile",
        description: "A mobile gaming platform for discovering and tracking video game quests and achievements with social features.",
        screenshotUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=320&h=680&fit=crop&q=80",
        position: [9, 2, 3],
        rotation: [0, -Math.PI / 2, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 320, height: 680 },
            mobile: { width: 300, height: 600 }
        }
    },
    
    // Back wall displays
    {
        id: "vgq-desktop",
        url: "https://videogamequest.me",
        title: "Video Game Quest",
        description: "A comprehensive gaming platform for discovering and tracking video game quests and achievements with detailed analytics.",
        screenshotUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=800&fit=crop&q=80",
        position: [-5, 2, -9],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 1200, height: 800 },
            mobile: { width: 375, height: 667 }
        }
    },
    {
        id: "curie-world",
        url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
        title: "Curie World",
        description: "A 3D shopping shelf and examine experience with interactive product models powered by Google Model Viewer.",
        screenshotUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=900&h=650&fit=crop&q=80",
        position: [5, 2, -9],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1],
        responsive: {
            desktop: { width: 900, height: 650 },
            mobile: { width: 375, height: 667 }
        }
    }
];

// Helper function to get display config by ID
export const getDisplayConfig = (id: string): DisplayConfig | undefined => {
    return displaysConfig.find(display => display.id === id);
};

// Helper function to get responsive dimensions based on device type
export const getDisplayDimensions = (config: DisplayConfig, isMobile: boolean) => {
    return isMobile ? config.responsive.mobile : config.responsive.desktop;
};