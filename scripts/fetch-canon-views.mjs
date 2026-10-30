// Fetches the Canon views this site bakes in at build time - the showroom's
// projects and profile, and the art halls' wall text - into
// src/data/canon-views.generated.json. Runs before every build (prebuild).
// The art room and DJ room read their views at runtime instead
// (src/data/canon.ts).
//
// If Canon can't be reached the committed copy is kept, so a build never
// fails or ships empty because of the network.
//
// Usage: node scripts/fetch-canon-views.mjs   (CANON_BASE overrides the bucket)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.env.CANON_BASE ?? "https://storage.googleapis.com/canon-public";
const surfaces = { showroom: "holodeck-showroom", artRoom: "holodeck-art-room" };
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "canon-views.generated.json");

try {
    const out = {};
    for (const [key, surface] of Object.entries(surfaces)) {
        const response = await fetch(`${base}/views/${surface}.json`, { cache: "no-store" });
        if (!response.ok) throw new Error(`${surface}: ${response.status}`);
        const view = await response.json();
        if (view.view !== surface || view.viewVersion !== 1) throw new Error(`${surface}: unexpected view ${view.view} v${view.viewVersion}`);
        out[key] = view;
    }
    fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
    console.log(`Canon views: ${out.showroom.entries.length} projects, ${out.artRoom.entries.length} halls -> ${path.relative(process.cwd(), target)}`);
} catch (error) {
    if (!fs.existsSync(target)) throw error;
    console.warn(`Canon views not refreshed (${error.message}); keeping the committed copy.`);
}
