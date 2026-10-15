// 3d.saucedog.art serves the 3D world on its own: no landing page, no
// résumé, no welcome card and no names anywhere. Add ?worldonly to any URL
// to preview that mode locally (read once, so it survives in-app navigation).
// Guarded for Node, where vite.config.ts reads the portfolio data at build.
export const WORLD_ONLY =
    typeof window !== "undefined" &&
    (/(^|\.)3d\.saucedog\.art$/.test(window.location.hostname) ||
        new URLSearchParams(window.location.search).has("worldonly"));
