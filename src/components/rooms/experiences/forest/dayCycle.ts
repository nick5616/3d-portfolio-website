import * as THREE from "three";

// A short day: dawn -> day -> dusk -> night -> dawn. Keyframes over one
// cycle (0..1); everything in the forest reads its look from sampleSky().
export const CYCLE_SECONDS = 150;
export const START_PHASE = 0.03; // open on dawn

interface Key {
    at: number;
    top: string; // sky zenith
    horizon: string;
    fog: string;
    fogDensity: number;
    light: string; // sun (or moon) color
    lightIntensity: number;
    hemiSky: string;
    hemiGround: string;
    hemi: number;
    shafts: number; // god ray strength
    shaftColor: string;
    fairies: number; // fairy/firefly brightness
    stars: number;
    glow: number; // mushroom glow
}

const KEYS: Key[] = [
    { at: 0.0, top: "#5c6aa8", horizon: "#f3a98a", fog: "#c39a9a", fogDensity: 0.034, light: "#ffb27a", lightIntensity: 1.0, hemiSky: "#c9b2d8", hemiGround: "#3b3029", hemi: 0.55, shafts: 0.3, shaftColor: "#ffc9a0", fairies: 0.45, stars: 0.15, glow: 0.4 },
    { at: 0.12, top: "#6aa4e2", horizon: "#d4ecf2", fog: "#b8d3cc", fogDensity: 0.028, light: "#fff1d2", lightIntensity: 1.5, hemiSky: "#cfe6ff", hemiGround: "#44523a", hemi: 0.8, shafts: 0.22, shaftColor: "#fff2cc", fairies: 0.15, stars: 0, glow: 0.1 },
    { at: 0.25, top: "#4b8fdc", horizon: "#c1e4f2", fog: "#a6ccc4", fogDensity: 0.022, light: "#fffaf0", lightIntensity: 1.8, hemiSky: "#d8ecff", hemiGround: "#4a5a3c", hemi: 0.9, shafts: 0.17, shaftColor: "#fff6dc", fairies: 0.1, stars: 0, glow: 0.05 },
    { at: 0.4, top: "#5c8dd2", horizon: "#f2d9a2", fog: "#c6c19a", fogDensity: 0.026, light: "#ffd9a0", lightIntensity: 1.4, hemiSky: "#f2dcb8", hemiGround: "#4c4a34", hemi: 0.75, shafts: 0.26, shaftColor: "#ffd890", fairies: 0.2, stars: 0, glow: 0.1 },
    { at: 0.5, top: "#3b3e7a", horizon: "#ef8a5b", fog: "#8a6a76", fogDensity: 0.034, light: "#ff8a52", lightIntensity: 0.75, hemiSky: "#b38aa8", hemiGround: "#2e2428", hemi: 0.45, shafts: 0.3, shaftColor: "#ff9a6a", fairies: 0.6, stars: 0.1, glow: 0.5 },
    { at: 0.6, top: "#1a1e48", horizon: "#58487a", fog: "#3a3c5c", fogDensity: 0.04, light: "#9fb3ff", lightIntensity: 0.3, hemiSky: "#5a5f9a", hemiGround: "#181622", hemi: 0.28, shafts: 0.06, shaftColor: "#a8b8ff", fairies: 0.9, stars: 0.7, glow: 0.9 },
    { at: 0.75, top: "#070a1c", horizon: "#18223e", fog: "#111a2b", fogDensity: 0.045, light: "#8fa6ff", lightIntensity: 0.25, hemiSky: "#2c3566", hemiGround: "#0b0b12", hemi: 0.2, shafts: 0.05, shaftColor: "#9fb4ff", fairies: 1, stars: 1, glow: 1 },
    { at: 0.9, top: "#1a2350", horizon: "#6a5a8a", fog: "#47465f", fogDensity: 0.04, light: "#a9b8ff", lightIntensity: 0.3, hemiSky: "#6a6a9e", hemiGround: "#1a1820", hemi: 0.3, shafts: 0.08, shaftColor: "#c4b8ff", fairies: 0.8, stars: 0.5, glow: 0.8 },
    { at: 1.0, top: "#5c6aa8", horizon: "#f3a98a", fog: "#c39a9a", fogDensity: 0.034, light: "#ffb27a", lightIntensity: 1.0, hemiSky: "#c9b2d8", hemiGround: "#3b3029", hemi: 0.55, shafts: 0.3, shaftColor: "#ffc9a0", fairies: 0.45, stars: 0.15, glow: 0.4 },
];

export interface SkyState {
    top: THREE.Color;
    horizon: THREE.Color;
    fog: THREE.Color;
    fogDensity: number;
    light: THREE.Color;
    lightIntensity: number;
    lightDir: THREE.Vector3; // toward the sun by day, the moon by night
    sunDir: THREE.Vector3;
    hemiSky: THREE.Color;
    hemiGround: THREE.Color;
    hemi: number;
    shafts: number;
    shaftColor: THREE.Color;
    fairies: number;
    stars: number;
    glow: number;
}

const a = new THREE.Color();
const b = new THREE.Color();
const mix = (out: THREE.Color, x: string, y: string, t: number) =>
    out.copy(a.set(x)).lerp(b.set(y), t);

export const createSkyState = (): SkyState => ({
    top: new THREE.Color(),
    horizon: new THREE.Color(),
    fog: new THREE.Color(),
    fogDensity: 0.03,
    light: new THREE.Color(),
    lightIntensity: 1,
    lightDir: new THREE.Vector3(),
    sunDir: new THREE.Vector3(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemi: 0.5,
    shafts: 0,
    shaftColor: new THREE.Color(),
    fairies: 0,
    stars: 0,
    glow: 0,
});

// Fill `out` with the look at cycle position p (0..1).
export const sampleSky = (p: number, out: SkyState) => {
    const phase = ((p % 1) + 1) % 1;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].at < phase) i++;
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    const raw = (phase - k0.at) / (k1.at - k0.at);
    const t = raw * raw * (3 - 2 * raw);
    const lerp = (x: number, y: number) => x + (y - x) * t;

    mix(out.top, k0.top, k1.top, t);
    mix(out.horizon, k0.horizon, k1.horizon, t);
    mix(out.fog, k0.fog, k1.fog, t);
    mix(out.light, k0.light, k1.light, t);
    mix(out.hemiSky, k0.hemiSky, k1.hemiSky, t);
    mix(out.hemiGround, k0.hemiGround, k1.hemiGround, t);
    mix(out.shaftColor, k0.shaftColor, k1.shaftColor, t);
    out.fogDensity = lerp(k0.fogDensity, k1.fogDensity);
    out.lightIntensity = lerp(k0.lightIntensity, k1.lightIntensity);
    out.hemi = lerp(k0.hemi, k1.hemi);
    out.shafts = lerp(k0.shafts, k1.shafts);
    out.fairies = lerp(k0.fairies, k1.fairies);
    out.stars = lerp(k0.stars, k1.stars);
    out.glow = lerp(k0.glow, k1.glow);

    // Sun rises in the east at phase 0, peaks at 0.25, sets at 0.5.
    const angle = phase * Math.PI * 2;
    out.sunDir.set(Math.cos(angle), Math.sin(angle), 0.35).normalize();
    if (out.sunDir.y > -0.05) out.lightDir.copy(out.sunDir);
    else out.lightDir.copy(out.sunDir).negate(); // the moon, opposite
    // Keep the light from skimming exactly along the ground.
    out.lightDir.y = Math.max(out.lightDir.y, 0.25);
    out.lightDir.normalize();
    return out;
};

// The forest's one live sky, sampled each frame by ForestExperience and read
// by anything else in the forest that should follow the time of day.
export const forestSky = createSkyState();
