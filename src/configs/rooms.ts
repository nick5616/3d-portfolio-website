// src/configs/rooms.ts
import { Archway, RoomConfig } from "../types/scene.types";
import { PortalFrameSpec, portalFrame } from "./portalLooks";

// The atrium is a three-tier rotunda; this is the drum's height, where the
// glass dome springs (see components/rooms/atrium/atriumLayout.ts).
const ATRIUM_CEILING_HEIGHT = 26;
const ATRIUM_DOOR_RADIUS = 11.9; // doors sit just inside the 12 m wall
// Mirrors LEVELS / STAIR_CENTER in atriumLayout.ts (kept as plain numbers
// so this config doesn't pull three.js in).
const ATRIUM_LEVELS = [0, 6.5, 13, 19.5] as const;
const ATRIUM_STAIR: [number, number] = [4.596, 4.596];
const ATRIUM_LIFT: [number, number] = [-4.596, -4.596];
// Upstairs portals sit in the arched frames RotundaShell builds 4 cm
// inside the 12 m wall; just in front of the frame's back plane.
const RADIUS_AT_UPPER_DOORS = 11.93;
const ATRIUM_BALCONY_ARRIVAL = 10.6; // where you land coming back out

// Door angles in the rotunda (see atriumLayout.ts): +X, +Z, -X, -Z.
const EAST = 0;
const SOUTH = Math.PI / 2;
const WEST = Math.PI;
const NORTH = Math.PI * 1.5;

type Vec3 = [number, number, number];
const facing = (angle: number): Vec3 => [0, Math.atan2(Math.cos(angle), Math.sin(angle)), 0];

// An upstairs portal in the atrium leading to `roomId`. The rotunda builds
// its marble surround, unless it has a frame of its own (then also set
// ownFrame in atriumLayout.ts's OPEN_DOORS).
const upstairsDoor = (
    roomId: string,
    level: number,
    angle: number,
    arriveAt: Vec3,
    frame: PortalFrameSpec = portalFrame("none")
): Archway => ({
    id: `to-${roomId}`,
    targetRoomId: roomId,
    position: [Math.cos(angle) * RADIUS_AT_UPPER_DOORS, ATRIUM_LEVELS[level], Math.sin(angle) * RADIUS_AT_UPPER_DOORS],
    rotation: facing(angle),
    width: 1.9,
    height: 3.25,
    appearance: "portal",
    frame,
    entrancePoint: { position: arriveAt, rotation: [0, 0, 0] },
});

// A room's way back, landing on the balcony in front of its portal.
const backToAtrium = (
    roomId: string,
    level: number,
    angle: number,
    position: Vec3,
    look: Partial<Archway> = {}
): Archway => ({
    id: `to-atrium-from-${roomId}`,
    targetRoomId: "atrium",
    position,
    rotation: [0, 0, 0],
    width: 1.9,
    height: 3.25,
    ...look,
    entrancePoint: {
        position: [
            Math.cos(angle) * ATRIUM_BALCONY_ARRIVAL,
            ATRIUM_LEVELS[level] + 1.5,
            Math.sin(angle) * ATRIUM_BALCONY_ARRIVAL,
        ],
        rotation: [0, 0, 0],
    },
});

// Rooms that light themselves only need a placeholder preset for the type.
const selfLit = (color: string) => ({
    ambient: { intensity: 0.2, color },
    directional: { position: [0, 8, 0] as Vec3, intensity: 0, color },
});
const PROJECTS_CEILING_HEIGHT = 6;
const RELAXATION_CEILING_HEIGHT = 6;
const GALLERY_ATRIUM_CEILING_HEIGHT = 7.5;
const GALLERY_HALL_CEILING_HEIGHT = 7.5;
const GALLERY_SECRET_ROOM_CEILING_HEIGHT = 6;
const SKETCHBOOK_WALL_HEIGHT = 5.5;
const ACHIEVEMENTS_CEILING_HEIGHT = 7;

// Simple, mostly-neutral light preset shared by the gallery wing's plain
// rectangular halls - each room's GcsArtFrameByIndex spotlighting comes from
// the frame itself; this just keeps the space readable.
const galleryHallLightPreset = (accent: string) => ({
    ambient: { intensity: 1.2, color: "#ffffff" },
    directional: {
        position: [0, 6, 0] as [number, number, number],
        intensity: 0,
        color: "#ffffff",
    },
    spots: [
        {
            position: [0, GALLERY_HALL_CEILING_HEIGHT - 1, 0] as [
                number,
                number,
                number
            ],
            target: [0, 0, 0] as [number, number, number],
            intensity: 1.5,
            color: accent,
            distance: 25,
            angle: Math.PI / 2.2,
            penumbra: 0.6,
        },
    ],
});

export const roomConfigs: { [key: string]: RoomConfig } = {
    atrium: {
        // DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT
        // A captivating display accompanied by greek pillars, fascinating and inspiring rays of light, and a major ethereal vibe.
        // It contains beautiful essence of life, through the lush, deep greens of plant life, and the intense blue or pristine waters,
        // with light shining through, making one question the significance of their daily struggles
        id: "atrium",
        name: "Atrium",
        position: [0, 0, 0] as [number, number, number],
        dimensions: [24, ATRIUM_CEILING_HEIGHT, 24], // circular: width is the diameter
        circular: true,
        floors: [
            { y: 0, label: "Ground Floor" },
            { y: ATRIUM_LEVELS[1], label: "Second Floor", innerRadius: 9.3 },
            { y: ATRIUM_LEVELS[2], label: "Third Floor", innerRadius: 9.3 },
            { y: ATRIUM_LEVELS[3], label: "Fourth Floor", innerRadius: 9.3 },
        ],
        mapFeatures: [
            { kind: "pool", position: [0, 0], radius: 3.35, floors: [0] },
            { kind: "stair", position: ATRIUM_STAIR, radius: 1.95 },
            { kind: "lift", position: ATRIUM_LIFT, radius: 1.95 },
        ],
        lightPreset: {
            ambient: { intensity: 0.1, color: "#ffff00" }, // Reduced from 0.5
            directional: {
                position: [10, 7.5, 0] as [number, number, number],
                intensity: 0.0002, // Reduced from 0.8
                color: "#ffff00",
            },
            spots: [
                {
                    position: [0, 6, 0] as [number, number, number],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 0.3, // Reduced from 1
                    color: "#ffff00",
                },
            ],
        },
        defaultEntrance: {
            // Inside the colonnade on the south side, facing the pool.
            position: [0, 1.5, 8] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        // The greek pillars are now the rotunda's two colonnades, built by
        // AtriumRoom itself.
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery",
                frame: portalFrame("gilded"),
                targetRoomId: "gallery",
                position: [-ATRIUM_DOOR_RADIUS, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    // The gallery is now the circular atrium hub directly (no
                    // lobby); land just inside its west-side door, facing in.
                    position: [-7, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
            {
                id: "to-projects",
                frame: portalFrame("terminal", "#39ff7a"),
                targetRoomId: "projects",
                position: [0, 0, -ATRIUM_DOOR_RADIUS] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
            {
                // Where the holodeck's door used to be.
                id: "to-rupee-shop",
                frame: portalFrame("shop"),
                targetRoomId: "rupee-shop",
                position: [ATRIUM_DOOR_RADIUS, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [-3.8, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
            // {
            //     id: "to-relaxation",
            //     targetRoomId: "relaxation",
            //     position: [0, 0, 9.77] as [number, number, number],
            //     rotation: [0, 0, 0] as [number, number, number],
            //     width: 3,
            //     height: 4,
            //     entrancePoint: {
            //         position: [0, 1.5, -2] as [number, number, number],
            //         rotation: [0, Math.PI, 0] as [number, number, number],
            //     },
            // },
            {
                // The atrium's one remaining bare wall - a hall of
                // plaques celebrating everything there is to find/do here.
                id: "to-achievements",
                frame: portalFrame("laurel"),
                targetRoomId: "achievements",
                position: [0, 0, ATRIUM_DOOR_RADIUS] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            // Upstairs portals (OPEN_DOORS in atriumLayout.ts swaps each
            // one's sealed bronze leaves for the portal).
            upstairsDoor("cosmic-connect-four", 1, EAST, [0, 1.5, 6.2]),
            upstairsDoor("meteor-math", 1, SOUTH, [0, 1.5, 6]),
            upstairsDoor("courage", 1, WEST, [-0.5, 1.5, 2.6]),
            upstairsDoor("sky-course", 1, NORTH, [0, 1.5, 2.5]),
            upstairsDoor("art-studio", 2, EAST, [-0.5, 1.5, 2.6]),
            upstairsDoor("jam-room", 2, SOUTH, [0, 1.5, 5.2]),
            upstairsDoor("bird-dog-studio", 2, WEST, [0, 1.5, 5.2]),
            upstairsDoor("marble-machine", 2, NORTH, [0, 1.5, 5.2]),
            upstairsDoor("forest", 3, EAST, [0, 1.5, 3.5]),
            upstairsDoor("observatory", 3, SOUTH, [0, 1.5, 8.2]),
        ],
    },

    // A floating platform in deep space: a table, a board, and across it,
    // the Void. Builds its own everything (CosmicConnectFourRoom).
    "cosmic-connect-four": {
        id: "cosmic-connect-four",
        name: "Cosmic Connect Four",
        position: [12, ATRIUM_LEVELS[1], 0] as [number, number, number],
        dimensions: [16, 12, 16], // circular platform, width = diameter
        circular: true,
        mapFeatures: [{ kind: "table", position: [0, 0], radius: 1.4 }],
        // The room lights itself; this only satisfies the type.
        lightPreset: {
            ambient: { intensity: 0.1, color: "#6b4cff" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0,
                color: "#ffffff",
            },
        },
        defaultEntrance: {
            position: [0, 1.5, 6.2] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [backToAtrium("cosmic", 1, EAST, [0, 0, 7.6], { frame: portalFrame("none") })],
    },

    // Second floor, south: the old holodeck's Meteor Multiplication, now
    // its own moon outpost.
    "meteor-math": {
        id: "meteor-math",
        name: "Meteor Math",
        position: [0, ATRIUM_LEVELS[1], 20] as Vec3,
        dimensions: [16, 12, 16],
        circular: true,
        lightPreset: selfLit("#9fb4ff"),
        defaultEntrance: { position: [0, 1.5, 6], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("meteor-math", 1, SOUTH, [0, 0, 7.6], { frame: portalFrame("airlock") })],
    },

    // Second floor, west: Muriel and Eustace's computer room.
    courage: {
        id: "courage",
        name: "Courage's Farmhouse Attic",
        position: [-20, ATRIUM_LEVELS[1], 0] as Vec3,
        dimensions: [8, 5, 8],
        lightPreset: selfLit("#ffe4b5"),
        defaultEntrance: { position: [-0.5, 1.5, 2.6], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("courage", 1, WEST, [-0.5, 0, 3.95], { width: 1.2, height: 2.4, appearance: "wood" })],
    },

    // Second floor, north: the gym, rebuilt as a timed parkour run.
    "sky-course": {
        id: "sky-course",
        name: "Sky Course",
        position: [0, ATRIUM_LEVELS[1], -20] as Vec3,
        dimensions: [60, 40, 60],
        circular: true,
        lightPreset: selfLit("#cfe6ff"),
        defaultEntrance: { position: [0, 1.5, 2.5], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("sky-course", 1, NORTH, [0, 0, 4.4], { frame: portalFrame("cloud") })],
    },

    // Third floor, east: the old holodeck classroom easel.
    "art-studio": {
        id: "art-studio",
        name: "Art Studio",
        position: [20, ATRIUM_LEVELS[2], 0] as Vec3,
        dimensions: [8, 5, 8],
        lightPreset: selfLit("#fffaf0"),
        defaultEntrance: { position: [-0.5, 1.5, 2.6], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("art-studio", 2, EAST, [-0.5, 0, 3.95], { width: 1.2, height: 2.4, appearance: "woodStudio" })],
    },

    // Third floor, south: make music by walking around.
    "jam-room": {
        id: "jam-room",
        name: "Jam Room",
        position: [0, ATRIUM_LEVELS[2], 20] as Vec3,
        dimensions: [14, 7, 14],
        lightPreset: selfLit("#ffd6f5"),
        defaultEntrance: { position: [0, 1.5, 5.2], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("jam-room", 2, SOUTH, [0, 0, 6.95], { width: 1.6, height: 2.8, frame: portalFrame("neon", "#ff4fd8") })],
    },

    // Third floor, west: Bird Dog's studio and DJ booth.
    "bird-dog-studio": {
        id: "bird-dog-studio",
        name: "Bird Dog Studio",
        position: [-20, ATRIUM_LEVELS[2], 0] as Vec3,
        dimensions: [16, 7, 14],
        lightPreset: selfLit("#b48cff"),
        defaultEntrance: { position: [0, 1.5, 5.2], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("bird-dog-studio", 2, WEST, [0, 0, 6.95], { width: 1.6, height: 2.8, frame: portalFrame("onair", "#b07bff") })],
    },

    // Third floor, north: a marble run you build yourself.
    "marble-machine": {
        id: "marble-machine",
        name: "Marble Machine",
        position: [0, ATRIUM_LEVELS[2], -20] as Vec3,
        dimensions: [14, 8, 14],
        lightPreset: selfLit("#fff1d6"),
        defaultEntrance: { position: [0, 1.5, 5.2], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("marble-machine", 2, NORTH, [0, 0, 6.95], { width: 1.6, height: 2.8, frame: portalFrame("brass") })],
    },

    // Fourth floor, east: the holodeck's Lost-Woods forest, a new one each
    // visit. The way home is a fairy stone.
    forest: {
        id: "forest",
        name: "The Forest",
        position: [20, ATRIUM_LEVELS[3], 0] as Vec3,
        dimensions: [80, 20, 80],
        circular: true,
        lightPreset: selfLit("#cfe6c0"),
        defaultEntrance: { position: [0, 1.5, 3.5], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("forest", 3, EAST, [0, 0, 6], { appearance: "fairyStone", width: 2, height: 3 })],
    },

    // Fourth floor, south: a rooftop terrace under the night sky.
    observatory: {
        id: "observatory",
        name: "Observatory",
        position: [0, ATRIUM_LEVELS[3], 20] as Vec3,
        dimensions: [24, 20, 24],
        circular: true,
        lightPreset: selfLit("#8fa8ff"),
        defaultEntrance: { position: [0, 1.5, 8.2], rotation: [0, 0, 0] },
        interactiveElements: [],
        archways: [backToAtrium("observatory", 3, SOUTH, [0, 0, 9.8], { frame: portalFrame("starstone") })],
    },

    // Ground floor, east, where the holodeck used to be.
    "rupee-shop": {
        id: "rupee-shop",
        name: "Rupee Shop",
        position: [20, 0, 0] as Vec3,
        dimensions: [12, 6, 10],
        lightPreset: selfLit("#ffd9a0"),
        defaultEntrance: { position: [-3.8, 1.5, 0], rotation: [0, Math.PI / 2, 0] },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-rupee-shop",
                frame: portalFrame("shop"),
                targetRoomId: "atrium",
                position: [-5.9, 0, 0],
                rotation: [0, Math.PI / 2, 0],
                width: 3,
                height: 4,
                entrancePoint: { position: [9.2, 1.5, 0], rotation: [0, -Math.PI / 2, 0] },
            },
        ],
    },


    // The circular hub of the gallery wing. Keeps the id "gallery" (no
    // separate lobby room anymore) so routing/theming/quick-access that
    // already targets "gallery" keeps working unchanged.
    gallery: {
        id: "gallery",
        name: "Art Gallery",
        position: [-20, 0, 0] as [number, number, number],
        dimensions: [20, GALLERY_ATRIUM_CEILING_HEIGHT, 20], // circular room, width is the diameter
        galleryRoomKind: { kind: "atrium" },
        circular: true,
        // GalleryAtriumRoom bypasses BaseRoom and lights itself directly, so
        // this preset only exists to satisfy the RoomConfig type.
        lightPreset: {
            ambient: { intensity: 0.3, color: "#fff5e6" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0,
                color: "#fff5e6",
            },
        },
        defaultEntrance: {
            position: [-7, 1.5, 0] as [number, number, number],
            rotation: [0, Math.PI / 2, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-gallery",
                frame: portalFrame("marble", "#ffc76a"),
                targetRoomId: "atrium",
                position: [-9.9, 0, 0] as [number, number, number],
                rotation: [0, Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [-7, 1.5, 0] as [number, number, number], // Clearly in front of the main atrium's own gallery door
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-digitalart",
                frame: portalFrame("marble", "#4ff0ff"),
                targetRoomId: "gallery-hall-digitalart",
                position: [9.9, 0, 0] as [number, number, number],
                rotation: [0, -Math.PI / 2, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-paintings",
                frame: portalFrame("marble", "#d9a441"),
                targetRoomId: "gallery-hall-paintings",
                position: [0, 0, 9.9] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-sketches",
                frame: portalFrame("marble", "#9a9aa2"),
                targetRoomId: "gallery-hall-sketches",
                position: [0, 0, -9.9] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 3.6] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
                // The sketchbook rotunda (and everything past it) costs
                // 5 rupees to open, once.
                lock: { id: "sketchbook", cost: 5 },
            },
        ],
    },

    "gallery-hall-digitalart": {
        id: "gallery-hall-digitalart",
        name: "Digital Art Hall",
        position: [-45, 0, 0] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "digitalart" },
        lightPreset: galleryHallLightPreset("#fff5e6"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-from-digitalart",
                frame: portalFrame("neon", "#4ff0ff"),
                targetRoomId: "gallery",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [9.9 - 2, 1.5, 0] as [number, number, number],
                    rotation: [0, Math.PI / 2, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-paintings": {
        id: "gallery-hall-paintings",
        name: "Paintings Hall",
        position: [-20, 0, -25] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "paintings" },
        lightPreset: galleryHallLightPreset("#ffe0cc"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-from-paintings",
                frame: portalFrame("gilded"),
                targetRoomId: "gallery",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    // Just inside the gallery's paintings door (south, +z)
                    position: [0, 1.5, 9.9 - 2] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-lefthanded",
                frame: portalFrame("gilded"),
                targetRoomId: "gallery-hall-lefthanded",
                position: [0, 0, -9.7] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 3.6] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    // Not a hall: a small domed marble rotunda holding one sketchbook on a
    // lectern under a shaft of light from the oculus. Keeps its old id so
    // routes, achievements and saved progress still line up.
    "gallery-hall-sketches": {
        id: "gallery-hall-sketches",
        name: "Sketchbook Rotunda",
        position: [-20, 0, 25] as [number, number, number],
        dimensions: [12, SKETCHBOOK_WALL_HEIGHT, 12], // circular, width = diameter
        galleryRoomKind: { kind: "sketchbook", category: "sketches" },
        circular: true,
        // SketchbookRotunda lights itself; this only satisfies the type.
        lightPreset: {
            ambient: { intensity: 0.2, color: "#fff1dc" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0,
                color: "#fff1dc",
            },
        },
        defaultEntrance: {
            position: [0, 1.5, 3.6] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-from-sketches",
                frame: portalFrame("marble", "#ffc76a"),
                targetRoomId: "gallery",
                position: [0, 0, 5.85] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 2.4,
                height: 3.6,
                entrancePoint: {
                    // Just inside the gallery's sketches door (north, -z)
                    position: [0, 1.5, -9.9 + 2] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
            {
                id: "to-gallery-hall-miscellaneous",
                frame: portalFrame("marble", "#ff6b6b"),
                targetRoomId: "gallery-hall-miscellaneous",
                position: [0, 0, -5.85] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 2.4,
                height: 3.6,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    // A second sketchbook rotunda: drawings made left-handed, in a book
    // bound the other way round.
    "gallery-hall-lefthanded": {
        id: "gallery-hall-lefthanded",
        name: "Left-Handed Rotunda",
        position: [-20, 0, -50] as [number, number, number],
        dimensions: [12, SKETCHBOOK_WALL_HEIGHT, 12], // circular, width = diameter
        galleryRoomKind: { kind: "sketchbook", category: "lefthanded" },
        circular: true,
        // SketchbookRotunda lights itself; this only satisfies the type.
        lightPreset: {
            ambient: { intensity: 0.2, color: "#fff1dc" },
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0,
                color: "#fff1dc",
            },
        },
        defaultEntrance: {
            position: [0, 1.5, 3.6] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-hall-paintings-from-lefthanded",
                frame: portalFrame("marble", "#d9a441"),
                targetRoomId: "gallery-hall-paintings",
                position: [0, 0, 5.85] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 2.4,
                height: 3.6,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
        ],
    },

    "gallery-hall-miscellaneous": {
        id: "gallery-hall-miscellaneous",
        name: "Miscellaneous Hall",
        position: [-20, 0, 50] as [number, number, number],
        dimensions: [20, GALLERY_HALL_CEILING_HEIGHT, 20],
        galleryRoomKind: { kind: "hall", category: "miscellaneous" },
        lightPreset: galleryHallLightPreset("#e0e8ff"),
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-hall-sketches-from-miscellaneous",
                frame: portalFrame("marble", "#9a9aa2"),
                targetRoomId: "gallery-hall-sketches",
                position: [0, 0, 9.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -3.6] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
            {
                // Deliberately smaller/subtler doorway - the "easter egg" that
                // leads to the notesappart room, worth finding if you go deep
                // enough.
                id: "to-gallery-hall-notesappart",
                frame: portalFrame("ink"),
                targetRoomId: "gallery-hall-notesappart",
                position: [0, 0, -9.7] as [number, number, number],
                rotation: [0, Math.PI, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [0, 1.5, 6] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    // Not really a hall any more: TruthRoom (a custom room, see
    // customRooms.ts) replaces it with a white void and a watching eye. It
    // keeps its hall kind so doors, music and theming treat it as part of
    // the gallery.
    "gallery-hall-notesappart": {
        id: "gallery-hall-notesappart",
        name: "Notes App Art",
        position: [-20, 0, 75] as [number, number, number],
        dimensions: [16, GALLERY_SECRET_ROOM_CEILING_HEIGHT, 16],
        galleryRoomKind: { kind: "hall", category: "notesappart" },
        lightPreset: galleryHallLightPreset("#d0ffe0"),
        defaultEntrance: {
            position: [0, 1.5, 6] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-gallery-hall-miscellaneous-from-notesappart",
                frame: portalFrame("ink"),
                targetRoomId: "gallery-hall-miscellaneous",
                position: [0, 0, 7.7] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 2,
                height: 3,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, Math.PI, 0] as [number, number, number],
                },
            },
        ],
    },

    projects: {
        id: "projects",
        name: "Software Projects",
        position: [0, 0, -20] as [number, number, number],
        dimensions: [20, PROJECTS_CEILING_HEIGHT, 20],
        // The lab lights itself (ProjectsRoom): low, cool fill so the
        // glowing project strands carry the room.
        lightPreset: {
            ambient: { intensity: 0.5, color: "#c8d8ff" },
            directional: {
                position: [0, 8, -5] as [number, number, number],
                intensity: 0,
                color: "#ffffff",
            },
        },
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [], // Interactive elements are now handled directly in ProjectsRoom component
        archways: [
            {
                id: "to-atrium-from-projects",
                frame: portalFrame("terminal", "#39ff7a"),
                targetRoomId: "atrium",
                position: [0, 0, 9.77] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, -7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    relaxation: {
        id: "relaxation",
        name: "Relaxation Room",
        position: [0, 0, 20] as [number, number, number],
        dimensions: [12, RELAXATION_CEILING_HEIGHT, 12], // Circular room with 12 unit diameter
        lightPreset: {
            ambient: { intensity: 0.3, color: "#E6F3FF" }, // Soft blue ambient
            directional: {
                position: [0, 8, 0] as [number, number, number],
                intensity: 0.2,
                color: "#B3D9FF",
            },
            spots: [
                {
                    position: [0, RELAXATION_CEILING_HEIGHT - 1, 0] as [
                        number,
                        number,
                        number
                    ],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 1.5,
                    color: "#E6F3FF",
                    distance: 15,
                    angle: Math.PI / 3,
                    penumbra: 0.5,
                },
                {
                    position: [0, RELAXATION_CEILING_HEIGHT - 2, 0] as [
                        number,
                        number,
                        number
                    ],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 0.8,
                    color: "#B3D9FF",
                    distance: 20,
                    angle: Math.PI / 2,
                    penumbra: 0.7,
                },
            ],
        },
        defaultEntrance: {
            position: [0, 1.5, 0] as [number, number, number],
            rotation: [0, Math.PI, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-relaxation",
                frame: portalFrame("marble", "#ffc76a"),
                targetRoomId: "atrium",
                position: [0, 0, -6] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },

    achievements: {
        id: "achievements",
        name: "Hall of Achievements",
        position: [0, 0, 40] as [number, number, number],
        dimensions: [20, ACHIEVEMENTS_CEILING_HEIGHT, 20],
        lightPreset: {
            ambient: { intensity: 0.5, color: "#fff5e6" },
            directional: {
                position: [0, 7, 0] as [number, number, number],
                intensity: 0.2,
                color: "#ffe9c7",
            },
            spots: [
                {
                    position: [0, ACHIEVEMENTS_CEILING_HEIGHT - 1, 0] as [
                        number,
                        number,
                        number
                    ],
                    target: [0, 0, 0] as [number, number, number],
                    intensity: 1.2,
                    color: "#ffe9c7",
                    distance: 25,
                    angle: Math.PI / 2.2,
                    penumbra: 0.6,
                },
            ],
        },
        defaultEntrance: {
            position: [0, 1.5, 7] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
        },
        interactiveElements: [],
        archways: [
            {
                id: "to-atrium-from-achievements",
                frame: portalFrame("laurel"),
                targetRoomId: "atrium",
                position: [0, 0, 9.77] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                width: 3,
                height: 4,
                entrancePoint: {
                    position: [0, 1.5, 7] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                },
            },
        ],
    },
};
