import { NOISE_GLSL, SPACE_GLSL } from "../../rooms/cosmic/cosmicShaders";
import type { PortalScene } from "../../../configs/portalLooks";

// The worlds seen through the portals. Each scene is one `portalScene()`
// compiled into its own small program (only the scenes a room actually has
// get compiled, and every door with the same scene shares one).
//
// The surface is flat, but it reads as a hole: `at(depth)` follows the eye's
// ray through the doorway to a backdrop that far behind it, so layers at
// different depths slide past each other as you walk by. Coordinates are
// metres in the doorway's own space: x across, y up from the threshold.
// Palette: uA / uB / uC (see PORTAL_VIEWS for what each scene uses them for).

const COMMON = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform float uSeal;
uniform float uHalf;
uniform float uJamb;
uniform float uRound;
uniform float uMirror;
uniform vec3 uEye;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uRim;
varying vec2 vShape;
varying vec3 vRay;

vec3 gRay;
float gPix;

${NOISE_GLSL}
${SPACE_GLSL}

mat2 rot2(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, s, -s, c);
}

// Where the ray through this point of the doorway meets a backdrop
// \`depth\` metres behind the threshold.
vec2 at(float depth) {
    return vShape + gRay.xy * (depth / max(-gRay.z, 0.05));
}

// About one pixel, measured on a backdrop that deep (for antialiasing).
float px(float depth) {
    return gPix * (1.0 + depth / max(uEye.z, 0.3));
}

// Specks drifting upward: dust in sunbeams, fireflies, sparkles.
float motes(vec2 q, float density, float rise) {
    q *= density;
    q.y -= uTime * rise * density;
    q.x += sin(q.y * 0.7 + uTime * 0.3) * 0.3;
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash12(cell);
    vec2 o = vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5;
    float d = length(f - o * 0.6);
    return smoothstep(0.09, 0.0, d) * step(0.72, h) * (0.55 + 0.45 * sin(uTime * 2.0 + h * 40.0));
}
`;

const SCENES: Record<PortalScene, string> = {
    space: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec2 c = vShape - vec2(0.0, uJamb * 0.6);
    float rr = length(c);
    float twist = 0.6 / (0.4 + rr) * (0.6 + 0.4 * sin(uTime * 0.3));
    r.xy = rot2(twist + uTime * 0.05) * r.xy;
    vec3 col = spaceColor(r, uTime) * 1.4;
    float spiral = sin(atan(c.y, c.x) * 3.0 + rr * 9.0 - uTime * 1.2);
    col += uB * smoothstep(0.85, 1.0, spiral) * 0.12 * (1.0 - smoothstep(0.0, 1.4, rr));
    return col;
}`,

    moon: /* glsl */ `
vec3 portalScene() {
    vec3 col = spaceColor(gRay, uTime) * 0.9;
    // A grey moon hangs over the outpost
    vec2 q = at(12.0) - vec2(1.4, uJamb + 1.8);
    float R = 2.6;
    float d = length(q);
    vec3 n = vec3(q / R, sqrt(max(0.0, 1.0 - d * d / (R * R))));
    float lit = clamp(dot(n, normalize(vec3(-0.65, 0.45, 0.6))), 0.0, 1.0);
    float maria = fbm(vec3(q * 0.9, 4.0));
    float craters = smoothstep(0.55, 0.75, vnoise(vec3(q * 4.0, 1.0)));
    vec3 surface = mix(uA * 0.5, uA, smoothstep(0.35, 0.65, maria)) * (1.0 - craters * 0.25);
    surface *= 0.06 + 0.94 * lit;
    float disc = smoothstep(R, R - px(12.0) * 2.0, d);
    col = mix(col, surface, disc);
    col += uA * 0.16 * exp(-max(d - R, 0.0) * 1.5) * (1.0 - disc);
    // Meteors streaking past, closer in
    vec2 m = at(5.0);
    vec2 dirm = normalize(vec2(-1.0, -0.6));
    vec2 side = vec2(-dirm.y, dirm.x);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float t = fract(uTime * 0.16 + fi * 0.37);
        vec2 head = vec2(4.5 - fi * 1.3, uJamb + 3.0 + fi * 0.6) + dirm * t * 11.0;
        vec2 rel = m - head;
        float along = dot(rel, -dirm);
        float across = abs(dot(rel, side));
        float tail = step(0.0, along) * exp(-along * 1.3) * smoothstep(0.035 + along * 0.02, 0.0, across);
        col += uB * (tail * 1.5 + exp(-length(rel) * 9.0) * 1.8);
    }
    return col;
}`,

    night: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec3 col = mix(uB, uA, smoothstep(-0.15, 0.7, r.y));
    // The Milky Way
    float band = exp(-pow(dot(r, normalize(vec3(0.55, 0.25, 0.8))) * 4.0, 2.0));
    float dust = fbm(r * 5.0 + vec3(0.0, 0.0, uTime * 0.01));
    col += uC * band * (0.12 + 0.5 * smoothstep(0.35, 0.8, dust));
    col += starLayer(r, 110.0, 0.9, uTime) * 1.3 + starLayer(r, 240.0, 0.93, uTime) * (0.5 + band);
    // A shooting star now and then
    float cycle = floor(uTime / 7.0);
    float t = fract(uTime / 7.0) * 7.0;
    vec2 s = at(40.0);
    vec2 start = vec2((hash12(vec2(cycle, 1.0)) - 0.5) * 30.0, 18.0 + hash12(vec2(cycle, 2.0)) * 10.0);
    vec2 sd = normalize(vec2(hash12(vec2(cycle, 3.0)) - 0.5, -0.5));
    vec2 rel = s - (start + sd * t * 28.0);
    float along = dot(rel, -sd);
    float across = abs(dot(rel, vec2(-sd.y, sd.x)));
    col += vec3(0.9, 0.95, 1.0) * step(t, 1.2) * step(0.0, along) * exp(-along * 0.35) * smoothstep(0.25, 0.0, across);
    // Hills on the horizon, dark against the sky
    vec2 h = at(35.0);
    float ridge = 1.5 + 5.0 * fbm(vec3(h.x * 0.05, 3.0, 1.0));
    float aa = px(35.0) * 1.5;
    col = mix(col, uB * 0.1, smoothstep(ridge + aa, ridge - aa, h.y));
    return col;
}`,

    sky: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec3 col = mix(uB, uA, smoothstep(-0.25, 0.75, r.y));
    vec3 sunDir = normalize(vec3(0.35, 0.45, -0.8));
    float sd = max(dot(r, sunDir), 0.0);
    col += vec3(1.0, 0.95, 0.82) * (pow(sd, 600.0) * 4.0 + pow(sd, 10.0) * 0.3);
    // Three banks of cloud, the near ones drifting faster
    for (int i = 2; i >= 0; i--) {
        float fi = float(i);
        float depth = 5.0 + fi * fi * 10.0;
        vec2 q = at(depth) / (2.5 + fi * 4.0) + vec2(uTime * (0.05 - fi * 0.012), fi * 7.3);
        float z = fi * 3.1 + uTime * 0.02;
        float n = fbm(vec3(q, z));
        float cover = smoothstep(0.5, 0.68, n);
        float lit = smoothstep(0.45, 0.8, n - fbm(vec3(q + vec2(0.0, 0.06), z)) + 0.55);
        vec3 cloud = mix(uC, vec3(1.0), lit);
        col = mix(col, mix(cloud, col, fi * 0.22), cover);
    }
    return col;
}`,

    sun: /* glsl */ `
// Light off the pool, thrown across stone (after Dave Hoskins' tileable
// water caustic).
float caustic(vec2 uv, float t) {
    vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
    vec2 i = p;
    float c = 1.0;
    for (int n = 0; n < 4; n++) {
        float tt = t * (1.0 - 3.5 / float(n + 1));
        i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
}
vec3 portalScene() {
    vec3 r = gRay;
    // Warm air, brightest up toward the dome
    vec3 col = mix(uA * 0.72, uB, smoothstep(-0.3, 0.85, r.y));
    vec2 top = at(10.0) - vec2(sin(uTime * 0.05) * 0.6, uJamb + 9.0);
    float fromTop = length(top);
    col += uB * 0.5 * exp(-fromTop * 0.12);
    // Shafts of sun falling from the oculus
    float ang = atan(top.x, -top.y);
    vec2 around = vec2(cos(ang), sin(ang));
    float shafts = smoothstep(0.42, 0.85, fbm(vec3(around * 3.5, uTime * 0.04)));
    col += vec3(1.0, 0.93, 0.76) * shafts * smoothstep(0.8, 0.15, abs(ang)) * exp(-fromTop * 0.035) * 0.6;
    // The pool's light dancing on the floor, fading into the haze
    float t = uEye.y / max(-r.y, 0.001);
    vec2 floorAt = (uEye + r * t).xz;
    float onFloor = smoothstep(-0.005, -0.05, r.y) * smoothstep(70.0, 6.0, t);
    vec3 floorCol = uA * 0.55 + mix(uC, vec3(1.0, 0.96, 0.85), 0.6) * caustic(floorAt * 0.3, uTime * 0.35) * 0.9;
    col = mix(col, floorCol, onFloor);
    // ...and thrown up, faintly, onto the stone above
    vec2 w = at(7.0);
    col += uC * caustic(w * 0.16 + 3.0, uTime * 0.3) * 0.16 * smoothstep(1.0, 5.0, w.y);
    // Out-of-focus motes drifting through the light
    vec2 b = at(1.2) * 1.3;
    b.y -= uTime * 0.05;
    vec2 cell = floor(b);
    vec2 f = fract(b) - 0.5 - (vec2(hash12(cell + 1.3), hash12(cell + 4.1)) - 0.5) * 0.5;
    float h = hash12(cell);
    float rad = 0.1 + h * 0.18;
    float d = length(f);
    float disc = smoothstep(rad, rad * 0.86, d) * (0.6 + 0.4 * smoothstep(rad * 0.5, rad, d));
    col += vec3(1.0, 0.9, 0.72) * disc * 0.13 * step(0.72, h);
    col += vec3(1.0, 0.92, 0.75) * motes(at(2.0), 6.0, 0.08) * 0.7;
    return col;
}`,

    forest: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec3 col = mix(uA * 0.25, uB, smoothstep(-0.3, 0.9, r.y));
    // Rows of trunks, fading into the mist the further back they stand
    for (int i = 3; i >= 0; i--) {
        float fi = float(i);
        vec2 q = at(2.5 + fi * 3.5);
        float u = q.x / 1.7 + fi * 0.37;
        float cell = floor(u);
        float h = hash12(vec2(cell, fi));
        float x = fract(u) - 0.5 - (h - 0.5) * 0.5;
        float w = 0.07 + hash12(vec2(cell, fi + 9.0)) * 0.07 + max(0.0, 0.4 - q.y) * 0.05;
        float trunk = smoothstep(w, w - 0.015, abs(x)) * step(h, 0.8);
        vec3 bark = mix(vec3(0.02, 0.035, 0.03), mix(uA * 0.3, uB, 0.5), fi / 4.0);
        col = mix(col, bark, trunk);
        col = mix(col, uB * 0.6, 0.06);
    }
    // Light breaking through the canopy
    vec2 s = at(6.0);
    col += uB * 0.35 * pow(0.5 + 0.5 * sin(s.x * 0.9 + s.y * 0.3 + 0.5), 10.0) * smoothstep(0.0, 4.0, s.y);
    // Fireflies, and mist at the roots
    col += uC * motes(at(2.0), 2.5, 0.05) * 2.2;
    col = mix(col, uB * 0.7, smoothstep(0.6, -1.0, at(4.0).y) * 0.35);
    return col;
}`,

    farm: /* glsl */ `
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float sdSeg(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}
// A flat cartoon fill with a dark ink line round it.
vec3 inked(vec3 col, vec3 fill, float d, float aa) {
    col = mix(col, fill, smoothstep(aa, -aa, d));
    return mix(col, vec3(0.08, 0.04, 0.07), 1.0 - smoothstep(aa * 1.2, aa * 2.6, abs(d)));
}
vec3 portalScene() {
    vec3 r = gRay;
    // The sky over Nowhere, painted: yellow at the horizon, red through the
    // middle, purple at the top, streaked with cloud
    float up = r.y;
    vec3 col = mix(uA, vec3(0.86, 0.27, 0.22), smoothstep(0.0, 0.22, up));
    col = mix(col, uB, smoothstep(0.18, 0.6, up));
    vec2 sk = at(60.0);
    float streak = smoothstep(0.55, 0.75, fbm(vec3(sk.x * 0.02, sk.y * 0.12, 1.0)));
    col = mix(col, vec3(0.95, 0.55, 0.4), streak * 0.35 * smoothstep(0.02, 0.15, up) * (1.0 - smoothstep(0.3, 0.5, up)));
    vec3 sunDir = normalize(vec3(0.42, 0.06, -1.0));
    float sd = max(dot(r, sunDir), 0.0);
    col = mix(col, uC, smoothstep(0.9975, 0.9985, sd));
    col += uC * pow(sd, 40.0) * 0.35;

    vec2 g = at(40.0);
    float horizon = uEye.y;
    float aa = px(40.0) * 1.2;
    // Flat, empty, dusty ground
    vec3 dirt = mix(vec3(0.62, 0.36, 0.2), vec3(0.32, 0.17, 0.12), smoothstep(horizon, horizon - 14.0, g.y));
    dirt *= 0.9 + 0.1 * sin(g.y * 3.0 + fbm(vec3(g * 0.1, 2.0)) * 6.0);
    col = mix(col, dirt, smoothstep(horizon + aa, horizon - aa, g.y));
    float base = horizon - 2.6;

    // The dead tree
    vec2 t = g - vec2(10.5, base);
    float tree = sdSeg(t, vec2(0.0), vec2(0.5, 6.2), 0.35);
    tree = min(tree, sdSeg(t, vec2(0.3, 3.8), vec2(-2.6, 7.4), 0.14));
    tree = min(tree, sdSeg(t, vec2(0.45, 5.4), vec2(2.9, 8.0), 0.13));
    tree = min(tree, sdSeg(t, vec2(-1.3, 5.6), vec2(-2.0, 8.8), 0.09));
    tree = min(tree, sdSeg(t, vec2(1.9, 7.0), vec2(1.6, 9.4), 0.08));
    tree = min(tree, sdSeg(t, vec2(0.5, 6.2), vec2(0.1, 8.6), 0.1));
    col = inked(col, vec3(0.2, 0.12, 0.1), tree, aa);

    // The windpump: a lattice tower, a fan of many blades, a tail vane
    vec2 w = g - vec2(-11.0, base);
    float tower = min(sdSeg(w, vec2(-1.7, 0.0), vec2(-0.35, 13.0), 0.1), sdSeg(w, vec2(1.7, 0.0), vec2(0.35, 13.0), 0.1));
    for (int k = 0; k < 4; k++) {
        float y0 = float(k) * 3.25;
        float y1 = y0 + 3.25;
        float x0 = 1.7 - y0 / 13.0 * 1.35;
        float x1 = 1.7 - y1 / 13.0 * 1.35;
        tower = min(tower, sdSeg(w, vec2(-x0, y0), vec2(x1, y1), 0.05));
        tower = min(tower, sdSeg(w, vec2(x0, y0), vec2(-x1, y1), 0.05));
    }
    vec2 hub = w - vec2(0.0, 13.6);
    float tail = min(sdSeg(hub, vec2(0.0), vec2(4.2, 0.3), 0.08), sdBox(hub - vec2(4.6, 0.4), vec2(0.7, 0.9)));
    vec2 f = hub * vec2(1.0 / 0.72, 1.0);
    float fr = length(f);
    float sector = abs(fract((atan(f.y, f.x) + uTime * 0.6) / 6.28318 * 18.0) - 0.5) - 0.2;
    float fan = max(max(fr - 3.0, 0.7 - fr), sector * fr * 0.349);
    float pump = min(min(tower, tail), min(fan, abs(fr - 2.95) - 0.07));
    pump = min(pump, length(hub) - 0.35);
    col = inked(col, vec3(0.38, 0.33, 0.36), pump, aa);

    // The farmhouse: two storeys, a porch, a gable, a chimney, a little crooked
    vec2 p = g - vec2(-0.5, base);
    p.x += p.y * 0.035;
    float walls = sdBox(p - vec2(0.0, 3.6), vec2(4.6, 3.6));
    float roof = max(max(abs(p.x) * 0.78 + p.y - 11.6, 6.9 - p.y), abs(p.x) - 5.6);
    vec3 clapboard = vec3(0.93, 0.7, 0.66) * (0.92 + 0.08 * step(0.5, fract(p.y * 2.2)));
    vec3 slate = vec3(0.36, 0.3, 0.34);
    col = inked(col, vec3(0.42, 0.26, 0.24), sdBox(p - vec2(2.9, 10.2), vec2(0.42, 1.6)), aa);
    col = inked(col, clapboard, walls, aa);
    col = inked(col, slate, roof, aa);
    vec3 lamp = uC * 1.15;
    col = inked(col, lamp, length(p - vec2(0.0, 8.7)) - 0.75, aa);
    col = inked(col, lamp, sdBox(p - vec2(-2.4, 5.4), vec2(0.65, 0.8)), aa);
    col = inked(col, lamp * 0.85, sdBox(p - vec2(2.4, 5.4), vec2(0.65, 0.8)), aa);
    col = inked(col, lamp * 0.9, sdBox(p - vec2(-2.6, 1.7), vec2(0.7, 0.8)), aa);
    col = inked(col, vec3(0.45, 0.28, 0.22), sdBox(p - vec2(1.2, 1.35), vec2(0.6, 1.35)), aa);
    col = inked(col, slate, sdBox(p - vec2(0.0, 3.05), vec2(5.1, 0.22)), aa);
    float posts = 1e3;
    for (int k = 0; k < 4; k++) posts = min(posts, sdBox(p - vec2(-4.5 + float(k) * 3.0, 1.4), vec2(0.12, 1.45)));
    col = inked(col, vec3(0.95, 0.88, 0.82), posts, aa);
    return col;
}`,

    paint: /* glsl */ `
vec3 portalScene() {
    vec2 q = at(2.0) * 0.55;
    q.x *= uMirror;
    float t = uTime * 0.05;
    vec2 w = vec2(fbm(vec3(q, t)), fbm(vec3(q + vec2(5.2, 1.3), t)));
    vec2 w2 = vec2(
        fbm(vec3(q + 3.0 * w + vec2(1.7, 9.2), t * 1.3)),
        fbm(vec3(q + 3.0 * w + vec2(8.3, 2.8), t * 1.3))
    );
    float n = fbm(vec3(q + 3.0 * w2, t * 0.5));
    vec3 col = mix(uA, uB, smoothstep(0.25, 0.75, n));
    col = mix(col, uC, smoothstep(0.5, 0.95, length(w2 - 0.5) * 1.6));
    // Brush strokes following the flow, and the shine of wet paint
    col *= 0.88 + 0.12 * sin(dot(q + w2 * 1.5, vec2(34.0, 9.0)));
    col += vec3(1.0) * pow(max(0.0, n - 0.62), 2.0) * 3.0;
    return col;
}`,

    pixel: /* glsl */ `
vec3 portalScene() {
    vec3 col = vec3(0.008, 0.01, 0.03);
    for (int i = 1; i >= 0; i--) {
        float fi = float(i);
        vec2 q = at(2.5 + fi * 5.0);
        float size = 0.18 + fi * 0.12;
        vec2 cell = floor(q / size);
        vec2 f = fract(q / size);
        float h = hash12(cell + fi * 31.0);
        float wave = 0.5 + 0.5 * sin(cell.x * 0.45 + cell.y * 0.3 - uTime * (1.4 - fi * 0.4));
        float flick = hash12(cell + floor(uTime * 3.0 + h * 7.0));
        float lit = smoothstep(0.75, 0.95, h * 0.5 + wave * 0.55 + flick * 0.15);
        vec3 c = mix(uA, uB, step(0.5, hash12(cell + 7.0)));
        c = mix(c, uC, step(0.92, h));
        vec2 e = min(f, 1.0 - f);
        float pad = smoothstep(0.06, 0.14, min(e.x, e.y));
        col += c * (lit * pad * (1.3 - fi * 0.6) + 0.04 * pad);
    }
    // Scanlines, and the odd band glitching
    col *= 0.82 + 0.18 * sin(vShape.y * 260.0);
    float glitch = step(0.94, hash12(vec2(floor(vShape.y * 9.0), floor(uTime * 5.0))));
    col = mix(col, col.brg * 1.6 + uC * 0.2, glitch);
    return col;
}`,

    graphite: /* glsl */ `
vec3 portalScene() {
    vec2 q = at(1.2);
    q.x *= uMirror;
    vec3 col = uA - hash12(floor(q * 300.0)) * 0.05;
    float shade = fbm(vec3(q * 0.7, uTime * 0.03));
    // Hatching in three directions, darker where the drawing is shaded
    float ink = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float ang = 0.75 + fi * 0.85;
        vec2 dir = vec2(cos(ang), sin(ang));
        float wobble = vnoise(vec3(q * 3.0, fi * 5.0)) * 0.35;
        float line = abs(fract(dot(q, dir) * 18.0 + wobble) - 0.5);
        ink += smoothstep(0.16, 0.04, line) * smoothstep(0.4 + fi * 0.08, 0.6 + fi * 0.08, shade);
    }
    col = mix(col, uB, clamp(ink, 0.0, 1.0) * 0.75);
    // Contour lines, as if someone is still drawing
    float iso = abs(fract(shade * 5.0) - 0.5) / 5.0;
    float aa = max(fwidth(shade), 1e-4) * 1.5;
    col = mix(col, uB, (1.0 - smoothstep(0.0, aa, iso)) * 0.85);
    return col;
}`,

    collage: /* glsl */ `
vec3 portalScene() {
    vec3 col = (uA + uB) * 0.09 + 0.03;
    for (int i = 2; i >= 0; i--) {
        float fi = float(i);
        vec2 q = at(1.5 + fi * 2.5) * (1.6 - fi * 0.35);
        q.y += uTime * (0.12 + fi * 0.04);
        vec2 cell = floor(q);
        float h = hash12(cell + fi * 17.0);
        vec2 f = fract(q) - 0.5 - (vec2(hash12(cell + 3.0), hash12(cell + 5.0)) - 0.5) * 0.25;
        vec2 g = rot2(uTime * (h - 0.5) * 1.6 + h * 6.28) * f;
        float kind = mod(floor(h * 37.0), 4.0);
        float circle = length(g) - 0.24;
        float square = max(abs(g.x), abs(g.y)) - 0.19;
        float tri = max(abs(g.x) * 0.866 + g.y * 0.5, -g.y) - 0.13;
        float ring = abs(length(g) - 0.18) - 0.05;
        float d = kind < 1.0 ? circle : kind < 2.0 ? square : kind < 3.0 ? tri : ring;
        float pick = hash12(cell + 9.0);
        vec3 c = pick < 0.33 ? uA : pick < 0.66 ? uB : uC;
        float has = step(0.45, h);
        // a soft drop shadow, then the scrap of paper
        col = mix(col, col * 0.55, smoothstep(0.06, 0.0, d - 0.025) * 0.5 * has);
        col = mix(col, c * (1.0 - fi * 0.2), smoothstep(0.012, -0.012, d) * has);
    }
    return col;
}`,

    void: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec3 col = uA;
    // A floor grid running off into the white
    float t = uEye.y / max(-r.y, 0.001);
    vec2 floorAt = (uEye + r * t).xz;
    vec2 cell = abs(fract(floorAt * 0.5) - 0.5);
    float lineW = 0.02 + t * 0.006;
    float grid = smoothstep(lineW, lineW * 0.3, min(cell.x, cell.y)) * exp(-t * 0.045) * step(r.y, -0.002);
    col = mix(col, uB, grid * 0.45);
    // The eye, a long way off, watching you
    vec2 q = at(18.0) - vec2(0.0, uJamb + 1.2);
    float bt = fract(uTime / 6.5) * 6.5;
    float lid = 1.0 - smoothstep(0.0, 0.12, 0.12 - abs(bt - 6.3));
    float W = 2.2;
    float almond = max(abs(q.y) - (lid + 0.02) * (1.0 - (q.x * q.x) / (W * W)), abs(q.x) - W);
    vec2 look = clamp(uEye.xy * vec2(0.08, 0.05) - vec2(0.0, 0.06), vec2(-0.6), vec2(0.6));
    vec2 iq = q - look;
    float aa = px(18.0) * 1.5;
    float iris = smoothstep(aa, -aa, length(iq) - 0.62);
    vec3 eye = vec3(0.97);
    eye = mix(eye, uC * (0.75 + 0.25 * sin(atan(iq.y, iq.x) * 18.0)), iris);
    eye = mix(eye, vec3(0.02), smoothstep(aa, -aa, length(iq) - 0.24));
    eye += vec3(1.0) * smoothstep(0.12, 0.0, length(iq - vec2(-0.18, 0.2)));
    col = mix(col, eye, smoothstep(aa, -aa, almond));
    col = mix(col, uB, (1.0 - smoothstep(0.0, aa * 2.5, abs(almond))) * 0.9);
    return col;
}`,

    gallery: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec3 col = mix(uA * 0.55, uA, smoothstep(-0.5, 0.6, r.y));
    // Three walls of pictures, each sliding past the others
    for (int i = 2; i >= 0; i--) {
        float fi = float(i);
        vec2 q = at(2.0 + fi * 3.0);
        q.x += uTime * 0.08 * (1.0 + fi * 0.4) * (mod(fi, 2.0) * 2.0 - 1.0);
        vec2 cs = vec2(1.7, 1.5);
        vec2 cell = floor(q / cs);
        vec2 f = (fract(q / cs) - 0.5) * cs;
        float h = hash12(cell + fi * 5.0);
        float show = step(0.4, h);
        vec2 size = vec2(0.42 + h * 0.18, 0.34 + fract(h * 13.0) * 0.2);
        vec2 d = abs(f) - size;
        float outer = max(d.x, d.y);
        vec3 art = mix(uB, uC, hash12(cell + 2.0)) * (0.5 + 0.6 * vnoise(vec3(f * 5.0, h * 9.0)));
        vec3 gilt = vec3(0.78, 0.58, 0.26) * (0.8 + 0.2 * f.y / size.y);
        vec3 c = mix(gilt, art, step(outer + 0.07, 0.0));
        float haze = fi * 0.28;
        col = mix(col, mix(c, col, haze), step(outer, 0.0) * show);
        col += vec3(1.0, 0.9, 0.7) * 0.12 * exp(-length(f - vec2(0.0, size.y + 0.25)) * 3.0) * show * (1.0 - haze);
    }
    col += vec3(1.0, 0.92, 0.78) * motes(at(1.2), 5.0, 0.08) * 0.6;
    return col;
}`,

    terminal: /* glsl */ `
// One character cell: a made-up 5x7 glyph, different in every cell.
float glyph(vec2 f, float seed) {
    vec2 q = (f - vec2(0.12, 0.14)) / vec2(0.76, 0.72);
    if (q.x < 0.0 || q.y < 0.0 || q.x >= 1.0 || q.y >= 1.0) return 0.0;
    return step(0.56, hash12(floor(q * vec2(5.0, 7.0)) + seed * 13.7));
}
vec3 portalScene() {
    vec3 col = vec3(0.0, 0.012, 0.006);
    // Rain far back
    vec2 rq = at(8.0) / vec2(0.3, 0.42);
    float column = floor(rq.x);
    float speed = 1.5 + hash12(vec2(column, 1.0)) * 2.5;
    float trail = fract(rq.y * 0.035 + uTime * speed * 0.08 + hash12(vec2(column, 2.0)));
    vec2 rc = floor(rq);
    float rg = glyph(fract(rq), hash12(rc + floor(uTime * 3.0 + hash12(rc) * 5.0)));
    col += uB * rg * pow(trail, 5.0) * 0.3 + vec3(0.7, 1.0, 0.8) * rg * pow(trail, 40.0) * 0.4;
    // The terminal, close up: lines of code scrolling up, indented,
    // the odd one highlighted or dimmed like a comment
    vec2 tq = at(0.6);
    float ty = (tq.y - uTime * 0.25) / 0.11;
    float row = floor(ty);
    float x = (tq.x + uHalf - 0.15) / 0.065;
    float cell = floor(x);
    float indent = floor(hash12(vec2(row, 3.0)) * 4.0) * 2.0;
    float len = indent + 4.0 + floor(hash12(vec2(row, 7.0)) * 22.0);
    float inLine = step(indent, cell) * step(cell, len) * step(0.0, x) * (1.0 - step(0.85, hash12(vec2(row, 11.0))));
    float word = step(0.14, hash12(vec2(cell, row) * 0.37 + 4.0));
    float lit = inLine * word * glyph(vec2(fract(x), fract(ty)), hash12(vec2(cell, row)));
    float tone = hash12(vec2(row, 19.0));
    col += (tone < 0.15 ? uC : (tone < 0.3 ? uB * 0.45 : uB)) * lit * 1.1;
    // A cursor blinking at the prompt
    vec2 cur = vShape - vec2(-uHalf + 0.35, 0.4);
    col += uB * 1.5 * step(abs(cur.x), 0.035) * step(abs(cur.y), 0.055) * step(0.5, fract(uTime * 1.6));
    // CRT: scanlines and phosphor glow
    col *= 0.78 + 0.22 * sin(vShape.y * 380.0);
    col += uB * 0.035;
    return col;
}`,

    wave: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    vec3 col = mix(uA * 0.1, uA * 0.32, smoothstep(-0.6, 0.7, r.y));
    // Sound waves rolling past, further back
    vec2 w = at(6.0);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float y = uJamb + 1.0 + fi * 0.7 + sin(w.x * (0.9 + fi * 0.5) + uTime * (1.4 + fi * 0.6)) * (0.6 + fi * 0.15);
        col += mix(uB, uC, fi * 0.5) * exp(-abs(w.y - y) * 9.0) * 0.7;
    }
    // Ripples on the beat
    vec2 c = at(4.0) - vec2(0.0, 1.5);
    float beat = fract(uTime);
    col += uC * exp(-abs(length(c) - beat * 6.0) * 6.0) * (1.0 - beat) * 0.5;
    // An equalizer, up close
    vec2 q = at(2.5);
    float bi = floor(q.x / 0.24);
    float bx = fract(q.x / 0.24);
    float hb = hash12(vec2(bi, 3.0));
    float level = 0.25 + 1.7 * abs(sin(uTime * (1.3 + hb * 2.2) + bi * 0.7)) * (0.55 + 0.45 * sin(uTime * 0.6 + bi * 0.35));
    float inBar = step(0.14, bx) * step(bx, 0.86);
    float bar = inBar * step(0.0, q.y) * step(q.y, level) * step(0.3, fract(q.y / 0.11));
    float cap = inBar * step(abs(q.y - level - 0.08), 0.03);
    col = mix(col, mix(uB, uC, clamp(q.y / 2.2, 0.0, 1.0)) * 1.3, max(bar, cap));
    return col;
}`,

    club: /* glsl */ `
float laser(vec2 p, vec2 o, float ang, float core) {
    vec2 dir = vec2(sin(ang), cos(ang));
    vec2 rel = p - o;
    float across = abs(dot(rel, vec2(-dir.y, dir.x)));
    return step(0.0, dot(rel, dir)) * (exp(-across / core) + exp(-across / (core * 8.0)) * 0.25);
}
vec3 portalScene() {
    float beat = fract(uTime * 2.0); // 120 bpm
    vec3 col = vec3(0.01, 0.005, 0.02);
    // Smoke: the beams only show where there's haze
    float haze = 0.35 + 0.65 * fbm(vec3(at(4.0) * 0.35, uTime * 0.08));
    // An LED wall at the back, a ring of light pulsing out from the middle
    vec2 led = at(10.0) / 0.35;
    vec2 lc = floor(led);
    float ripple = sin(length(lc - vec2(0.0, (uJamb + 5.0) / 0.35)) * 0.5 - uTime * 6.0) * 0.5 + 0.5;
    float bulb = smoothstep(0.32, 0.18, length(fract(led) - 0.5));
    col += mix(uB, uC, 0.5 + 0.5 * sin(lc.x * 0.2 + uTime)) * bulb * (0.05 + 0.35 * pow(ripple, 4.0) * (1.0 - beat * 0.7));
    // Laser fans from the floor corners and the ceiling, sweeping
    vec2 p = at(5.0);
    float core = max(0.012, px(5.0) * 1.2);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 origin = i == 2 ? vec2(0.0, uJamb + 7.0) : vec2((fi * 2.0 - 1.0) * 4.5, -0.5);
        float aim = i == 2 ? 3.14159 : (fi * 2.0 - 1.0) * -0.45;
        float sweep = sin(uTime * (0.7 + fi * 0.23) + fi * 1.7) * 0.5;
        vec3 c = i == 0 ? uB : (i == 1 ? uC : vec3(0.3, 1.0, 0.55));
        for (int k = 0; k < 7; k++) {
            col += c * laser(p, origin, aim + sweep + (float(k) - 3.0) * 0.11, core) * haze * 0.9;
        }
        col += c * exp(-length(p - origin) * 1.5) * 1.2;
    }
    // Moving heads: wide soft beams from above, crossing
    vec2 m = at(3.0);
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float ang = 3.14159 + sin(uTime * 0.5 + fi * 3.0) * 0.7;
        vec2 dir = vec2(sin(ang), cos(ang));
        vec2 rel = m - vec2((fi - 0.5) * 3.0, uJamb + 3.5);
        float along = dot(rel, dir);
        float across = abs(dot(rel, vec2(-dir.y, dir.x)));
        col += mix(uB, uC, fi) * step(0.0, along) * exp(-across / (0.05 + along * 0.18)) * 0.3 * haze;
    }
    // A soft strobe every couple of seconds, and glitter in the air
    col += vec3(0.9, 0.85, 1.0) * pow(1.0 - fract(uTime * 0.5), 16.0) * 0.25;
    col += vec3(1.0) * motes(at(1.5), 4.0, 0.02) * (0.6 + 0.8 * pow(1.0 - beat, 3.0));
    return col;
}`,

    marble: /* glsl */ `
vec3 portalScene() {
    vec3 r = gRay;
    // Looking into a glass marble: coloured vanes twisting through clear glass
    vec2 q = at(3.0) - vec2(0.0, uJamb * 0.7);
    float d = length(q);
    float a = atan(q.y, q.x);
    float t = uTime * 0.15;
    vec3 col = mix(uA * 0.16, uA * 0.42, smoothstep(-0.5, 0.8, r.y));
    col += uA * 0.25 * exp(-d * 0.5);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float twist = a + d * (0.9 + fi * 0.15) - t * (1.0 + fi * 0.3) + fi * 2.094;
        float ribbon = abs(sin(twist));
        float w = 0.12 + 0.08 * sin(d * 2.0 + t + fi);
        float vane = smoothstep(w, w * 0.4, ribbon) * smoothstep(4.5, 0.5, d);
        vec3 c = fi < 0.5 ? uB : (fi < 1.5 ? uC : mix(uB, uC, 0.5) + 0.2);
        col = mix(col, c * (0.7 + 0.5 * (1.0 - ribbon / w)), vane * 0.85);
    }
    // Bubbles caught in the glass
    vec2 bq = at(2.2) * 2.2;
    vec2 cell = floor(bq);
    float h = hash12(cell);
    vec2 bf = fract(bq) - 0.5 - (vec2(hash12(cell + 2.0), hash12(cell + 5.0)) - 0.5) * 0.5;
    float ring = 1.0 - smoothstep(0.0, 0.025, abs(length(bf) - (0.05 + h * 0.08)));
    col += vec3(1.0) * ring * 0.3 * step(0.82, h);
    // A curved glint sliding over the glass, and sparkle
    vec2 s = at(1.0);
    float glint = exp(-pow(s.x * 0.8 + s.y * 0.3 - uJamb * 0.6 - sin(uTime * 0.4) * 0.6, 2.0) * 8.0);
    col += vec3(1.0, 0.97, 0.9) * glint * 0.16;
    col += mix(uB, uC, 0.5) * motes(at(1.6), 4.0, 0.03);
    return col;
}`,

    treasure: /* glsl */ `
float rupee(vec2 p) {
    p = abs(p);
    return max(p.x - 0.2, p.y + p.x - 0.46);
}
float heart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) return length(p - vec2(0.25, 0.75)) - 0.35355;
    vec2 m = p - 0.5 * max(p.x + p.y, 0.0);
    return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)), dot(m, m))) * sign(p.x - p.y);
}
// One rupee, turning: the flat table facet in front, bevels leaning out.
vec4 drawRupee(vec2 p, float spin, vec3 gem, float aa) {
    float c = cos(spin);
    vec2 g = vec2(p.x / max(abs(c), 0.15), p.y);
    float d = rupee(g);
    float table = rupee(g * 1.9);
    vec3 n = table < 0.0
        ? vec3(0.0, 0.0, 1.0)
        : normalize(vec3(sign(g.x) * 0.8 * sign(c), abs(g.y) > 0.16 ? sign(g.y) * 0.6 : 0.0, 0.7));
    vec3 L = normalize(vec3(-0.4, 0.7, 0.6));
    vec3 col = gem * (0.5 + 0.55 * max(dot(n, L), 0.0));
    col += pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 12.0) * 0.6;
    col += (1.0 - smoothstep(0.0, aa * 2.0, abs(table))) * 0.25;
    return vec4(col, smoothstep(aa, -aa, d));
}
vec3 portalScene() {
    vec3 r = gRay;
    // Honey-warm lantern light
    vec3 col = mix(uA * 0.85, vec3(1.0, 0.93, 0.78), smoothstep(-0.4, 0.6, r.y));
    col += vec3(1.0, 0.85, 0.55) * 0.35 * exp(-length(at(6.0) - vec2(0.0, uJamb)) * 0.25);
    // Paper lanterns, far back and out of focus
    vec2 lq = at(9.0);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 lp = vec2((fi - 1.5) * 4.2 + sin(uTime * 0.3 + fi) * 0.2, uJamb + 3.0 + mod(fi, 2.0) * 1.4);
        float d = length((lq - lp) * vec2(1.0, 0.85));
        col += vec3(1.0, 0.68, 0.38) * (smoothstep(1.0, 0.7, d) * 0.3 + exp(-d * 1.2) * 0.22);
    }
    // A few rupees turning in the air: green, blue, red
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float depth = 2.0 + fi * 1.6;
        vec2 home = vec2((fi - 1.0) * 1.3, uJamb * (0.55 + 0.12 * mod(fi, 2.0)) + sin(uTime * 0.9 + fi * 2.0) * 0.12);
        vec2 p = at(depth) - home;
        vec3 gem = i == 0 ? uB : (i == 1 ? vec3(0.3, 0.58, 1.0) : uC);
        vec4 rp = drawRupee(p, uTime * 0.8 + fi * 2.1, gem, px(depth) * 1.5);
        col = mix(col, rp.rgb, rp.a);
        col += gem * 0.16 * exp(-max(rupee(p), 0.0) * 6.0) * (1.0 - rp.a);
    }
    // A heart drifting up now and then
    vec2 hq = at(3.0);
    float ht = fract(uTime * 0.06);
    vec2 hp = vec2(1.9 + sin(ht * 9.0) * 0.25, -0.5 + ht * (uJamb + 4.0));
    float hd = heart((hq - hp) / 0.3 + vec2(0.0, 0.5)) * 0.3;
    float fade = smoothstep(0.0, 0.15, ht) * smoothstep(1.0, 0.8, ht);
    float haa = px(3.0) * 1.5;
    col = mix(col, vec3(1.0, 0.36, 0.45), smoothstep(haa, -haa, hd) * fade);
    // Sparkles
    col += vec3(1.0, 0.97, 0.85) * motes(at(1.4), 3.5, 0.06) * 1.4;
    return col;
}`,

    trophy: /* glsl */ `
vec3 portalScene() {
    vec2 q = at(8.0) - vec2(0.0, uJamb + 1.0);
    float d = length(q);
    vec2 dir = q / max(d, 1e-4);
    // A soft, warm light, breathing
    float breathe = 0.9 + 0.1 * sin(uTime * 0.8);
    vec3 col = uA * 0.22 + uA * 0.8 * exp(-d * 0.18);
    col += uB * (exp(-d * 0.9) * 1.4 + exp(-d * 2.8) * 1.2) * breathe;
    // Rays, soft-edged, two sets drifting against each other
    float rays = fbm(vec3(dir * 2.5, uTime * 0.05)) * 0.6 + fbm(vec3(dir * 6.0, 4.0 - uTime * 0.04)) * 0.4;
    col += uB * smoothstep(0.45, 0.85, rays) * exp(-d * 0.12) * 0.7;
    // A faint halo, like light in a lens
    col += uB * 0.1 * exp(-abs(d - 3.2) * 3.0);
    // Motes of light rising
    col += uB * motes(at(2.0), 3.0, 0.12) * 1.3;
    col += uC * motes(at(4.0), 2.0, 0.08) * 0.6;
    return col;
}`,
};

const MAIN = /* glsl */ `
void main() {
    gRay = normalize(vRay);
    gPix = max(fwidth(vShape.x), fwidth(vShape.y));
    vec3 col = portalScene() * (1.0 + uHover * 0.3);
    // Sealed (locked) doors: the view greys and dims
    col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))) * 0.35, uSeal);

    // The burning edge
    float d = (uRound > 0.5 && vShape.y > uJamb)
        ? uHalf - length(vShape - vec2(0.0, uJamb))
        : min(min(uHalf - abs(vShape.x), vShape.y), uRound > 0.5 ? 1e3 : uJamb - vShape.y);
    float flicker = vnoise(vec3(vShape * 3.0, uTime * 0.6)) * 0.6 + vnoise(vec3(vShape * 7.0, uTime)) * 0.4;
    float rim = exp(-max(d, 0.0) * (14.0 - uHover * 5.0)) * (0.7 + flicker * 0.8);
    col = mix(col, uRim, clamp(rim * 0.45, 0.0, 1.0)) + uRim * rim * (0.8 + uHover);
    gl_FragColor = vec4(col, 1.0);
}
`;

export const PORTAL_VERTEX = /* glsl */ `
uniform vec3 uEye;
varying vec2 vShape;
varying vec3 vRay;
void main() {
    vShape = position.xy;
    vRay = position - uEye;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const portalFragment = (scene: PortalScene) => COMMON + SCENES[scene] + MAIN;
