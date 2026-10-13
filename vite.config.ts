import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
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
