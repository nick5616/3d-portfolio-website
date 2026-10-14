// GLSL shared by the cosmic room's sky, floor, portals and Nothing.

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1, 0, 0));
    float n010 = hash13(i + vec3(0, 1, 0));
    float n110 = hash13(i + vec3(1, 1, 0));
    float n001 = hash13(i + vec3(0, 0, 1));
    float n101 = hash13(i + vec3(1, 0, 1));
    float n011 = hash13(i + vec3(0, 1, 1));
    float n111 = hash13(i + vec3(1, 1, 1));
    return mix(
        mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
        mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
        f.z
    );
}
float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        sum += amp * vnoise(p);
        p = p * 2.03 + vec3(1.7, 9.2, 3.1);
        amp *= 0.5;
    }
    return sum;
}
// Cosine palette (iq): the room's whole colour story in one line.
vec3 cosmicPalette(float t) {
    return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.33, 0.67)));
}
`;

// Starfield + nebula as seen through a window: `dir` is any unit
// direction, `t` is time. Used by the sky dome and the door portals.
export const SPACE_GLSL = /* glsl */ `
vec3 starLayer(vec3 dir, float scale, float threshold, float time) {
    vec3 cell = floor(dir * scale);
    vec3 local = fract(dir * scale) - 0.5;
    float h = hash13(cell);
    if (h < threshold) return vec3(0.0);
    vec3 offset = vec3(hash13(cell + 1.3), hash13(cell + 7.1), hash13(cell + 3.7)) - 0.5;
    float d = length(local - offset * 0.7);
    float twinkle = 0.65 + 0.35 * sin(time * (1.5 + h * 4.0) + h * 40.0);
    float core = smoothstep(0.09, 0.0, d) * twinkle;
    vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.6), hash13(cell + 11.0));
    return tint * core * (h - threshold) / (1.0 - threshold) * 3.0;
}

vec3 spaceColor(vec3 dir, float time) {
    // Slow drifting nebula, hue sliding through violet / teal / gold.
    vec3 p = dir * 2.2;
    float warp = fbm(p + vec3(0.0, 0.0, time * 0.02));
    float n = fbm(p * 1.6 + warp * 1.8 + vec3(time * 0.015, 0.0, 0.0));
    float wisps = smoothstep(0.42, 0.85, n);
    vec3 hue = cosmicPalette(0.72 + n * 0.45 + time * 0.004);
    vec3 nebula = hue * wisps * 0.55;
    nebula += vec3(0.16, 0.05, 0.28) * smoothstep(0.3, 0.7, warp) * 0.6;

    vec3 base = vec3(0.012, 0.006, 0.03);
    vec3 stars = starLayer(dir, 90.0, 0.92, time) + starLayer(dir, 220.0, 0.96, time) * 0.7;
    return base + nebula + stars;
}
`;
