// Typed access to portfolio.generated.json - synced from nickel-tools'
// content.ts by scripts/sync-portfolio-content.mjs. Don't edit the JSON by
// hand; change content.ts there and re-run the script.
import data from "./portfolio.generated.json";
import { WORLD_ONLY } from "../utils/site";

export interface PortfolioProject {
    id: string;
    title: string;
    description: string;
    why: string | null;
    category: string;
    status: string;
    date: string | null;
    tech: string[];
    tags: string[];
    url: string | null;
    source: string | null;
    backendSource: string | null;
    thumbnail: string | null;
    preview: "none" | { mobileScreens: string[] } | null;
}

export const PROFILE = data.profile as {
    name: string;
    headline: string;
    summary: string;
    links: { github: string; linkedin: string; email: string };
};

const HOME = "https://nicolebelovoskey.com";

// On the world-only domain nothing names anyone: links to this site's own
// rooms stay on that domain, and the portfolio itself is just "The World".
const nameless = (project: PortfolioProject): PortfolioProject => ({
    ...project,
    title: project.title.replace(/^Nicole['’]s World$/, "The World"),
    url: project.url?.startsWith(HOME) ? project.url.slice(HOME.length) || "/" : project.url,
});

export const PROJECTS = WORLD_ONLY
    ? (data.projects as PortfolioProject[]).map(nameless)
    : (data.projects as PortfolioProject[]);

// Experience/education as stated on software.nicolebelovoskey.com's bio.
// Only what that bio states - no invented titles or dates.
export const EXPERIENCE = [
    { org: "Microsoft", detail: "Software engineering. Internship on Factory Orchestrator, which I helped open-source." },
    { org: "DoorDash", detail: "Software engineering." },
    { org: "Early-stage startups", detail: "Several of them." },
];
export const EDUCATION = [
    { school: "Texas A&M University", degree: "B.S. Computer Science" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2025-10" -> "Oct 2025"; anything else is shown as written.
export const formatDate = (date: string | null) => {
    if (!date) return "";
    const match = /^(\d{4})-(\d{2})/.exec(date);
    return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : date;
};

export const hostOf = (url: string | null) => {
    if (!url) return "";
    try {
        return new URL(url).host.replace(/^www\./, "");
    } catch {
        return url;
    }
};

export interface ArtCollection {
    title: string;
    description: string;
    why: string | null;
    mediums: string[];
}

// Art collection copy (same as the art portfolio), keyed by gallery
// category id: digitalart, paintings, sketches, lefthanded, ...
export const ART_COLLECTIONS = (data as { artCollections?: Record<string, ArtCollection> })
    .artCollections ?? {};
