import { useEffect } from "react";
import App from "./App";
import { WORLD_ONLY } from "./utils/site";

// The 3D world, loaded as its own chunk (three.js, the physics engine and
// every room), so the landing and Basic pages never download any of it.
export default function WorldApp() {
    useEffect(() => {
        document.documentElement.classList.add("world-mode");
        document.title = WORLD_ONLY ? "The World" : "Nicole Belovoskey · The World";
        return () => document.documentElement.classList.remove("world-mode");
    }, []);
    return <App />;
}
