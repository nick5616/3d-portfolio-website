import { PROJECTS, PortfolioProject } from "../../data/portfolio";

// "Project DNA": each project's stack, encoded as colors you can read
// from across the room. Every technology belongs to one family; a strand's
// rungs are colored by its technologies' families, so a mostly-green strand
// is graphics-heavy, gold is ML, etc. The legend sits on the center console.

export interface TechFamily {
    id: string;
    label: string;
    color: string;
}

export const TECH_FAMILIES: TechFamily[] = [
    { id: "web", label: "Web & UI", color: "#59b4ff" },
    { id: "3d", label: "3D & graphics", color: "#3ee58f" },
    { id: "audio", label: "Audio & music", color: "#b07bff" },
    // Algorithmic ML: training/running models, vision, signal processing.
    { id: "ml", label: "ML & AI", color: "#ffcc55" },
    // Product engineering around hosted LLMs: prompts, APIs, backend glue.
    { id: "genai", label: "GenAI integration", color: "#ff4fd8" },
    { id: "backend", label: "Backend & cloud", color: "#ff9a6b" },
    { id: "realtime", label: "Real-time", color: "#ff5d73" },
];

const FAMILY_OF: Record<string, string> = {
    TypeScript: "web",
    JavaScript: "web",
    React: "web",
    "Next.js": "web",
    HTML: "web",
    CSS: "web",
    "Tailwind CSS": "web",
    "Framer Motion": "web",
    Lit: "web",
    HTMX: "web",
    Nivo: "web",
    UWP: "web",
    XAML: "web",
    "Three.js": "3d",
    WebGL: "3d",
    "React-Three-Fiber": "3d",
    "Canvas API": "3d",
    "Web Audio API": "audio",
    FFmpeg: "audio",
    Whisper: "ml",
    PyTorch: "ml",
    OpenCV: "ml",
    "LLM APIs": "genai",
    Python: "ml",
    PyQt6: "ml",
    Go: "backend",
    "Node.js": "backend",
    "Nest.js": "backend",
    Django: "backend",
    Flask: "backend",
    Redis: "backend",
    Docker: "backend",
    "Google Cloud Storage": "backend",
    "Google Cloud Platform": "backend",
    "Firebase Auth": "backend",
    "C#": "backend",
    Java: "backend",
    WebRTC: "realtime",
    WebSockets: "realtime",
};

export const familyOf = (tech: string): TechFamily =>
    TECH_FAMILIES.find((f) => f.id === FAMILY_OF[tech]) ?? TECH_FAMILIES[0];

export const CATEGORY_COLORS: Record<string, string> = {
    "Immersive Web": "#3ee58f",
    Games: "#ff5d73",
    Music: "#b07bff",
    "Machine Learning": "#ffcc55",
    "AI / Productivity": "#ffd98a",
    "Creative Productivity": "#ff9dd2",
    "Social Tools": "#59b4ff",
    "Social App": "#7cc8ff",
    Engineering: "#dce6f2",
    Experiments: "#9ff7d8",
    "Design System": "#f6a9ff",
    Work: "#ffb86b",
};

// Work shown in the old lab that isn't in content.ts yet. Kept here so
// nothing disappeared in the redesign; once these live in nickel-tools'
// content.ts they can be deleted from this list.
const LAB_EXTRAS: PortfolioProject[] = [
    {
        id: "curie-shop",
        title: "Curie: 3D shoe store",
        description:
            "Working with Curie: an e-commerce store where you rotate, zoom and explore products as interactive 3D models before buying. Desktop and touch.",
        why: null,
        category: "Work",
        status: "operational",
        date: null,
        tech: ["React", "WebGL"],
        tags: [],
        url: "https://curie.shop",
        source: null,
        backendSource: null,
        thumbnail: "/screenshots/curie-shop-desktop.png",
        preview: null,
    },
    {
        id: "curie-world",
        title: "Curie: WebXR shopping",
        description:
            "Working with Curie: a 3D shopping shelf and examine experience with interactive product models.",
        why: null,
        category: "Work",
        status: "operational",
        date: null,
        tech: ["WebGL", "Three.js"],
        tags: [],
        url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
        source: null,
        backendSource: null,
        thumbnail: "/screenshots/curie-world.png",
        preview: null,
    },
    {
        id: "curie-vision-pro",
        title: "Curie: Apple Vision Pro app",
        description:
            "Working with Curie: WebSpatial experiments bringing interactive 3D products to the Apple Vision Pro.",
        why: null,
        category: "Work",
        status: "operational",
        date: null,
        tech: ["React", "WebGL"],
        tags: [],
        url: "/webspatial-curie.gif",
        source: null,
        backendSource: null,
        thumbnail: "/webspatial-curie.gif",
        preview: "none",
    },
    {
        id: "recipe-api",
        title: "Recipe finder (2019)",
        description:
            "A college Web APIs project from when I was 20: tell it what ingredients you have, and it finds recipes you can make.",
        why: null,
        category: "Experiments",
        status: "archived",
        date: "2019",
        tech: ["JavaScript", "HTML", "CSS"],
        tags: [],
        url: "https://www.youtube.com/watch?v=fo0OTiUzHLU",
        source: null,
        backendSource: null,
        thumbnail: null,
        preview: "none",
    },
];

// Projects in ring order: grouped by category (so colors cluster), newest
// first within each.
// Lab-only stack corrections, confirmed by Nicole (2026-10-13). The Courage
// computer's replies come from an LLM (netlify/functions/console-chat.ts),
// which content.ts doesn't list yet. Move to content.ts when convenient.
const LAB_TECH_ADDITIONS: Record<string, string[]> = {
    "courage-computer": ["LLM APIs"],
};

export const LAB_PROJECTS: PortfolioProject[] = (() => {
    const all = [...PROJECTS, ...LAB_EXTRAS].map((p) =>
        LAB_TECH_ADDITIONS[p.id]
            ? { ...p, tech: [...p.tech, ...LAB_TECH_ADDITIONS[p.id].filter((t) => !p.tech.includes(t))] }
            : p
    );
    const order = [...new Set(all.map((p) => p.category))];
    return order.flatMap((category) => all.filter((p) => p.category === category));
})();

// Can this project's site be shown inside a frame? GitHub, YouTube and
// sites marked preview "none" can't (or shouldn't) be.
export const embedUrl = (project: PortfolioProject): string | null => {
    if (!project.url || project.preview === "none") return null;
    if (/github\.com|youtube\.com|youtu\.be/.test(project.url)) return null;
    if (/\.(gif|png|jpe?g|webp)$/i.test(project.url)) return null;
    return project.url;
};

// Every tech family a project's rungs use.
export const familiesOf = (project: PortfolioProject): Set<string> =>
    new Set((project.tech.length ? project.tech : ["TypeScript"]).map((t) => familyOf(t).id));
