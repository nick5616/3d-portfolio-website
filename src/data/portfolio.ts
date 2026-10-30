// The showroom's projects and profile, from Canon's holodeck-showroom view
// (github.com/nick5616/content-pipeline), baked in at build time by
// scripts/fetch-canon-views.mjs. Content is edited in Canon, not here.
// The view is mapped onto the shapes the site has always used.
import views from "./canon-views.generated.json";
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

interface Term {
    slug: string;
    label: string;
}

interface ShowroomEntry {
    slug: string;
    title: string;
    summary: string;
    why: string;
    status: string | null;
    category: Term | null;
    date: { value: string; label: string | null } | null;
    tech: string[];
    tags: string[];
    mediums: string[];
    links: { rel: string; url: string }[];
    thumbnail: { url: string } | null;
    preview: { kind: string; urls: string[] };
}

interface CanonViews {
    showroom: {
        profile: { name: string; headline?: string; summary?: string; links?: Record<string, string> };
        taxonomy: { tech: Term[]; tags: Term[]; mediums: Term[] };
        entries: ShowroomEntry[];
    };
    artRoom: {
        taxonomy: { mediums: Term[] };
        entries: { slug: string; title: string; summary: string; why: string; mediums: string[] }[];
    };
}

const { showroom, artRoom } = views as unknown as CanonViews;

const labels = (terms: Term[]) => new Map(terms.map((t) => [t.slug, t.label]));
const techLabel = labels(showroom.taxonomy.tech);
const tagLabel = labels(showroom.taxonomy.tags);
const link = (e: ShowroomEntry, rel: string) => e.links.find((l) => l.rel === rel)?.url ?? null;

const toProject = (e: ShowroomEntry): PortfolioProject => ({
    id: e.slug,
    title: e.title,
    description: e.summary,
    why: e.why || null,
    category: e.category?.label ?? "",
    status: e.status ?? "operational",
    // Free-text dates keep their wording; formatDate turns 2025-10 into "Oct 2025".
    date: e.date ? e.date.label ?? e.date.value : null,
    tech: e.tech.map((s) => techLabel.get(s) ?? s),
    tags: e.tags.map((s) => tagLabel.get(s) ?? s),
    url: link(e, "live") ?? link(e, "source"),
    // A repo that is the project's only link is both its url and its source.
    source: link(e, "source") ?? (link(e, "live")?.startsWith("https://github.com/") ? link(e, "live") : null),
    backendSource: link(e, "backend-source"),
    thumbnail: e.thumbnail?.url ?? null,
    preview:
        e.preview.kind === "none"
            ? "none"
            : e.preview.kind === "phones"
              ? { mobileScreens: e.preview.urls }
              : null, // desktop and laser-room frame the live link, as before
});

export const PROFILE = {
    name: showroom.profile.name,
    headline: showroom.profile.headline ?? "",
    summary: showroom.profile.summary ?? "",
    links: {
        github: showroom.profile.links?.github ?? "",
        linkedin: showroom.profile.links?.linkedin ?? "",
        email: showroom.profile.links?.email ?? "",
    },
};

// Newest first: the view is already sorted that way.
const projects = showroom.entries.map(toProject);

const HOME = "https://nicolebelovoskey.com";

// On the world-only domain nothing names anyone: links to this site's own
// rooms stay on that domain, and the portfolio itself is just "The World".
const nameless = (project: PortfolioProject): PortfolioProject => ({
    ...project,
    title: project.title.replace(/^Nicole['’]s World$/, "The World"),
    url: project.url?.startsWith(HOME) ? project.url.slice(HOME.length) || "/" : project.url,
});

export const PROJECTS = WORLD_ONLY ? projects.map(nameless) : projects;

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

// The halls' wall text (what the art portfolio says about each
// collection), keyed by gallery category id: digitalart, paintings, ...
const mediumLabel = labels(artRoom.taxonomy.mediums);
export const ART_COLLECTIONS: Record<string, ArtCollection> = Object.fromEntries(
    artRoom.entries.map((e) => [
        e.slug,
        { title: e.title, description: e.summary, why: e.why || null, mediums: e.mediums.map((s) => mediumLabel.get(s) ?? s) },
    ])
);
