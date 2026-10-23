import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { seo } from "./seo";

// Door review (src/debug/doorReview.ts): the dev server keeps the verdicts
// in docs/door-review.json. Only this machine may read or write it.
const doorReview = (): Plugin => ({
    name: "door-review",
    apply: "serve",
    configureServer(server) {
        const file = path.resolve(__dirname, "docs/door-review.json");
        server.middlewares.use("/__door-review", (req, res) => {
            const from = req.socket.remoteAddress ?? "";
            if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(from)) {
                res.statusCode = 403;
                res.end();
                return;
            }
            if (req.method === "GET") {
                res.setHeader("Content-Type", "application/json");
                res.end(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : '{"version":1,"doors":{}}');
                return;
            }
            if (req.method === "POST") {
                let body = "";
                req.on("data", (chunk) => (body += chunk));
                req.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        fs.mkdirSync(path.dirname(file), { recursive: true });
                        fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
                        res.statusCode = 204;
                    } catch {
                        res.statusCode = 400;
                    }
                    res.end();
                });
                return;
            }
            res.statusCode = 405;
            res.end();
        });
    },
});

export default defineConfig({
    plugins: [react(), seo(), doorReview()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    optimizeDeps: {
        include: ["@react-three/fiber", "@react-three/drei", "three"],
    },
    build: {
        // The world chunk is big by nature (three.js + the physics engine's
        // WebAssembly); it's only loaded after the landing page.
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
            // world.html is the nameless shell 3d.saucedog.art serves.
            input: {
                main: path.resolve(__dirname, "index.html"),
                world: path.resolve(__dirname, "world.html"),
            },
            output: {
                // Libraries change far less often than the site, so keep them
                // in their own long-cached files: a deploy that only touches
                // the site doesn't make returning visitors re-download them.
                manualChunks(id) {
                    // Vite/Rollup runtime helpers (dynamic-import preloading,
                    // CommonJS interop) are shared by every chunk; left alone
                    // they get hoisted into the physics chunk, which made the
                    // landing page import it.
                    if (id.includes("vite/preload-helper") || id.includes("commonjsHelpers")) return "runtime";
                    if (!id.includes("node_modules")) return undefined;
                    // React (and the scheduler it shares with R3F) must not
                    // end up inside a 3D chunk, or the landing page would
                    // preload the whole 3D stack.
                    if (/node_modules[\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\/]/.test(id)) return "vendor-react";
                    if (id.includes("@dimforge") || id.includes("@react-three/rapier")) return "vendor-physics";
                    if (/node_modules[\\/]three[\\/]/.test(id)) return "vendor-three";
                    if (id.includes("@react-three") || id.includes("troika") || id.includes("three-")) return "vendor-r3f";
                    return undefined;
                },
            },
        },
    },
});
