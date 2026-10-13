// Pulls the project list + profile from the nickel-tools repo (the single
// source of truth shared by the desktop OS and software.nicolebelovoskey.com)
// into src/data/portfolio.generated.json for this site's landing page,
// Basic portfolio and 3D projects room.
//
// Usage: node scripts/sync-portfolio-content.mjs [path/to/nickel-tools]
// (defaults to ../nickel-tools next to this repo). Re-run after editing
// content.ts over there, then commit the regenerated JSON.
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const nickelTools = path.resolve(process.argv[2] ?? path.join(repoRoot, "..", "nickel-tools"));
const contentFile = path.join(nickelTools, "app", "data", "content.ts");
const profileFile = path.join(nickelTools, "app", "data", "profile.ts");
if (!fs.existsSync(contentFile)) {
    console.error(`Can't find ${contentFile}`);
    process.exit(1);
}

// content.ts imports React description components only used by the desktop
// OS; stub those (and React) out so the data bundles on its own.
const stubPlugin = {
    name: "stub-ui",
    setup(b) {
        b.onResolve({ filter: /^(react|@\/components\/.*)$/ }, (args) => ({
            path: args.path,
            namespace: "stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents:
                "const Stub = () => null; export default Stub; export const BatchAnalyzerDescription = Stub;",
            loader: "js",
        }));
    },
};

const entry = path.join(os.tmpdir(), `portfolio-sync-entry-${Date.now()}.ts`);
fs.writeFileSync(
    entry,
    `export { getPortfolioProjects, NICKEL_SYSTEM } from ${JSON.stringify(contentFile)};
     export { PROFILE } from ${JSON.stringify(profileFile)};`
);
const outfile = path.join(os.tmpdir(), `portfolio-sync-${Date.now()}.mjs`);
await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    plugins: [stubPlugin],
    alias: { "@": nickelTools },
    logLevel: "warning",
});
const { getPortfolioProjects, NICKEL_SYSTEM, PROFILE } = await import(
    pathToFileURL(outfile).href
);
fs.rmSync(entry);
fs.rmSync(outfile);

// "2025-10" / "2025-10-03" sort as-is; free text like "Sometime in like
// Oct 2025" sorts by the month/year it mentions; undated goes last.
const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const sortKey = (date) => {
    if (!date) return "0000";
    if (/^\d{4}-\d{2}/.test(date)) return date;
    const year = date.match(/(19|20)\d{2}/)?.[0];
    const month = MONTHS.findIndex((m) => date.toLowerCase().includes(m));
    return year ? `${year}-${String(month + 1 || 1).padStart(2, "0")}` : "0000";
};

// Software-portfolio view (softwareOverride applied, hidden entries removed),
// newest first. Only plain data is kept.
const projects = getPortfolioProjects("software")
    .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        why: p.why ?? null,
        category: p.category,
        status: p.status,
        date: p.date ?? null,
        tech: p.tech,
        tags: p.tags,
        url: p.url ?? (p.route ? `https://nickeltools.dev${p.route}` : null),
        source: p.source ?? null,
        backendSource: p.backendSource ?? null,
        thumbnail: p.thumbnail ? `https://nickeltools.dev${p.thumbnail}` : null,
        preview: p.preview ?? null,
    }))
    .sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)));

// Art collections (artOverride applied), keyed by gallery category id
// (/art-gallery/<id>), for the wall placards in each gallery hall.
const artCollections = Object.fromEntries(
    getPortfolioProjects("art")
        .filter((p) => p.route?.startsWith("/art-gallery/"))
        .map((p) => [
            p.route.split("/").pop().replace("digital-art", "digitalart"),
            {
                title: p.title,
                description: p.description,
                why: p.why ?? null,
                mediums: p.mediums,
            },
        ])
);

const output = {
    syncedFrom: "nickel-tools/app/data/content.ts",
    version: NICKEL_SYSTEM.version,
    profile: PROFILE,
    projects,
    artCollections,
};
const target = path.join(repoRoot, "src", "data", "portfolio.generated.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(output, null, 2) + "\n");
console.log(`Wrote ${projects.length} projects to ${path.relative(repoRoot, target)}`);
