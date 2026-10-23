// What every door in the world looks like. Doors are portals: an arch you
// look straight through into the room on the other side (the view, picked
// by destination), held in a frame that belongs to the room it stands in.
// Plain data, so rooms.ts can use the types without pulling in three.js.

// One painted world per kind of destination (see core/portal/portalScenes.ts).
export type PortalScene =
    | "space" // deep space, a swirling nebula
    | "moon" // a moon over the outpost, meteors streaking past
    | "night" // a starry sky with the Milky Way over dark hills
    | "sky" // open sky and drifting clouds
    | "sun" // the atrium as light: sun shafts, pool caustics, bokeh
    | "forest" // dark trunks, light through the canopy, fireflies
    | "farm" // a painted sunset over Nowhere: the farmhouse, windpump, dead tree
    | "paint" // wet oil paint, swirling
    | "pixel" // a grid of lit pixels, scanlines, glitches
    | "graphite" // paper, pencil hatching, contour lines
    | "collage" // cut-paper shapes tumbling past
    | "void" // a white void with a floor grid and a watching eye
    | "gallery" // picture frames hanging in warm light
    | "terminal" // a green-screen terminal, code scrolling, rain behind
    | "wave" // an equalizer, sound waves, beat ripples
    | "club" // a laser show: fans, moving heads, an LED wall, haze
    | "marble" // inside a glass marble: twisting coloured vanes
    | "treasure" // warm shop light, a few rupees turning, a heart
    | "trophy"; // radiant light, rays, rising motes

export interface PortalView {
    scene: PortalScene;
    // The scene's palette; each scene says what the three are for.
    colors: [string, string, string];
    rim: string; // the burning edge
    light: string; // the light it throws into the room
    mirror?: boolean; // drawn the other way round (the left-handed wing)
}

// Keyed by destination room id.
export const PORTAL_VIEWS: Record<string, PortalView> = {
    // Every way home shows the atrium: gold, cream, pool water.
    atrium: { scene: "sun", colors: ["#f3b45c", "#fff4dc", "#7fd6c8"], rim: "#ffc76a", light: "#ffd59a" },

    // Ground floor
    // wall, art, art
    gallery: { scene: "gallery", colors: ["#f1e2c6", "#b8453a", "#2f6d8f"], rim: "#ffd88a", light: "#ffe2b0" },
    // -, phosphor, highlighted lines
    projects: { scene: "terminal", colors: ["#000000", "#39ff7a", "#b4ffd0"], rim: "#39ff7a", light: "#39ff7a" },
    // shop light, green rupee, red rupee
    "rupee-shop": { scene: "treasure", colors: ["#f2b866", "#3ee58f", "#ff5d73"], rim: "#ffd27a", light: "#ffc77a" },
    // gold, light, -
    achievements: { scene: "trophy", colors: ["#e8a93a", "#fff2c2", "#ffffff"], rim: "#ffd36a", light: "#ffd36a" },
    relaxation: { scene: "sky", colors: ["#7fb4e8", "#e6f3ff", "#c9d8ea"], rim: "#e6f3ff", light: "#cfe6ff" },

    // Second floor: games
    // (fixed nebula), spiral, -
    "cosmic-connect-four": { scene: "space", colors: ["#6b4cff", "#8c59ff", "#ffb848"], rim: "#ffb848", light: "#b48cff" },
    // moon, meteors, -
    "meteor-math": { scene: "moon", colors: ["#c9cdd6", "#ffb35a", "#ffffff"], rim: "#ffc06a", light: "#9fb4ff" },
    // horizon, top of the sky, sun and lamplight
    courage: { scene: "farm", colors: ["#ffcf5a", "#3d1a52", "#ffe9a0"], rim: "#ff9a4a", light: "#ffb070" },
    // zenith, horizon, cloud shadow
    "sky-course": { scene: "sky", colors: ["#3a86e0", "#d9ecff", "#aebdd6"], rim: "#ffffff", light: "#cfe6ff" },

    // Third floor: making things
    // paint, paint, paint
    "art-studio": { scene: "paint", colors: ["#d7263d", "#ffd23f", "#1b6fd6"], rim: "#ffe9a8", light: "#fff0d0" },
    // room, wave, wave
    "jam-room": { scene: "wave", colors: ["#ff4fd8", "#ff8ae8", "#7bf1ff"], rim: "#ff7ae0", light: "#ff8ae8" },
    // -, magenta, cyan
    "bird-dog-studio": { scene: "club", colors: ["#7a3cff", "#ff3df0", "#3df0ff"], rim: "#c39bff", light: "#b48cff" },
    // glass, vane, vane
    "marble-machine": { scene: "marble", colors: ["#e8a85a", "#2f8fff", "#ff5a36"], rim: "#ffd08a", light: "#ffd6a0" },

    // Fourth floor: wonder
    // floor, canopy light, fireflies
    forest: { scene: "forest", colors: ["#1f5a3a", "#7fe0c8", "#e8ff8a"], rim: "#8ff2d0", light: "#8ff2ff" },
    // zenith, horizon, Milky Way
    observatory: { scene: "night", colors: ["#05081a", "#22346e", "#a9b9ff"], rim: "#b5c6ff", light: "#8fa8ff" },

    // The gallery wing
    // cyan, magenta, glitch
    "gallery-hall-digitalart": { scene: "pixel", colors: ["#00e5ff", "#ff3df0", "#fff27a"], rim: "#4ff0ff", light: "#5fe8ff" },
    // oils
    "gallery-hall-paintings": { scene: "paint", colors: ["#6e2a1a", "#d9a441", "#2c4a6b"], rim: "#ffcf7a", light: "#ffc890" },
    // paper, graphite
    "gallery-hall-sketches": { scene: "graphite", colors: ["#eeeae0", "#2a2a2e", "#2a2a2e"], rim: "#3a3a3e", light: "#f4f0e6" },
    // paper, sepia, drawn the other way round
    "gallery-hall-lefthanded": {
        scene: "graphite",
        colors: ["#f1e4c9", "#5a3416", "#5a3416"],
        rim: "#6b3e1c",
        light: "#ffe3b3",
        mirror: true,
    },
    // paper scraps
    "gallery-hall-miscellaneous": { scene: "collage", colors: ["#ff6b6b", "#4ecdc4", "#ffd93d"], rim: "#ffffff", light: "#ffe9d0" },
    // white, ink, iris
    "gallery-hall-notesappart": { scene: "void", colors: ["#f7f7f4", "#1a1a1a", "#3c6e47"], rim: "#141414", light: "#ffffff" },
};

export const viewFor = (targetRoomId: string): PortalView => PORTAL_VIEWS[targetRoomId] ?? PORTAL_VIEWS.atrium;

// The frame a portal stands in. "none" when the room builds the doorway
// itself (the atrium's marble surrounds upstairs, the cosmic platform's
// obsidian arch).
export type PortalFrameStyle =
    | "none"
    | "obsidian" // dark stone, gold line
    | "starstone" // obsidian studded with stars (observatory)
    | "airlock" // bolted metal, hazard stripes, a beacon (moon outpost)
    | "marble" // pilasters, archivolt, keystone gem (gallery wing)
    | "gilded" // an ornate gold picture frame
    | "neon" // glowing tubes
    | "onair" // neon, with an ON AIR sign (the studio)
    | "brass" // pipes, rivets, turning gears (marble machine)
    | "crystal" // rock bristling with rupee crystals
    | "laurel" // gold laurels and a star (achievements)
    | "circuit" // gunmetal with pulsing traces
    | "terminal" // matte black, blinking server LEDs, a cursor (software projects)
    | "shop" // a striped awning, a sign, lanterns, pots (the rupee shop)
    | "image" // a frame painted as a PNG (see docs/door-frames.md)
    | "cloud" // puffs of cloud (sky course)
    | "ink"; // a doodled outline (the notes app)

export interface PortalFrameSpec {
    style: PortalFrameStyle;
    accent?: string;
    // "image" only: the PNG (under public/), and how big it hangs in metres,
    // its bottom edge centred on the threshold.
    src?: string;
    size?: [number, number];
}

// Shorthand for rooms.ts.
export const portalFrame = (style: PortalFrameStyle, accent?: string): PortalFrameSpec => ({ style, accent });
export const imageFrame = (src: string, size: [number, number]): PortalFrameSpec => ({ style: "image", src, size });
