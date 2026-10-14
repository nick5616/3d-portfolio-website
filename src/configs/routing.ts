// src/configs/routing.ts
export interface RoomRoute {
    path: string;
    roomId: string;
    title: string;
    description?: string;
}

// Every room's canonical path comes first; later entries for the same room
// are aliases (old holodeck links, short names) that land in the same place.
export const roomRoutes: RoomRoute[] = [
    { path: "/atrium", roomId: "atrium", title: "Portfolio Atrium", description: "Welcome to the central hub" },
    { path: "/", roomId: "atrium", title: "Portfolio Atrium" },
    { path: "/art-gallery", roomId: "gallery", title: "Art Gallery", description: "Digital art collection and creative works" },
    { path: "/gallery", roomId: "gallery", title: "Art Gallery" },
    { path: "/software", roomId: "projects", title: "Software Projects", description: "Portfolio of development work and applications" },
    { path: "/projects", roomId: "projects", title: "Software Projects" },
    { path: "/relaxation", roomId: "relaxation", title: "Relaxation Room" },
    {
        path: "/achievements",
        roomId: "achievements",
        title: "Hall of Achievements",
        description: "A wall of plaques celebrating everything there is to find and do",
    },
    { path: "/rupee-shop", roomId: "rupee-shop", title: "Rupee Shop", description: "Spend what you've found" },
    { path: "/shop", roomId: "rupee-shop", title: "Rupee Shop" },

    // Second floor: games
    {
        path: "/cosmic-connect-four",
        roomId: "cosmic-connect-four",
        title: "Cosmic Connect Four",
        description: "A game of Connect Four against Nothing, adrift in deep space",
    },
    { path: "/meteor-math", roomId: "meteor-math", title: "Meteor Math", description: "Times tables on the moon" },
    { path: "/math", roomId: "meteor-math", title: "Meteor Math" },
    { path: "/holodeck/math", roomId: "meteor-math", title: "Meteor Math" },
    { path: "/courage", roomId: "courage", title: "Courage's Farmhouse Attic", description: "The computer has opinions" },
    { path: "/courage-the-cowardly-dog", roomId: "courage", title: "Courage's Farmhouse Attic" },
    { path: "/holodeck/courage", roomId: "courage", title: "Courage's Farmhouse Attic" },
    { path: "/holodeck/courage-the-cowardly-dog", roomId: "courage", title: "Courage's Farmhouse Attic" },
    { path: "/sky-course", roomId: "sky-course", title: "Sky Course", description: "A timed run across floating platforms" },
    { path: "/gym", roomId: "sky-course", title: "Sky Course" },
    { path: "/fitness", roomId: "sky-course", title: "Sky Course" },
    { path: "/holodeck/gym", roomId: "sky-course", title: "Sky Course" },

    // Third floor: making things
    { path: "/art-studio", roomId: "art-studio", title: "Art Studio", description: "Paint something for the wall" },
    { path: "/art", roomId: "art-studio", title: "Art Studio" },
    { path: "/holodeck/art", roomId: "art-studio", title: "Art Studio" },
    { path: "/jam-room", roomId: "jam-room", title: "Jam Room", description: "Make music without knowing how" },
    { path: "/jam", roomId: "jam-room", title: "Jam Room" },
    { path: "/bird-dog", roomId: "bird-dog-studio", title: "Bird Dog Studio", description: "Music by Bird Dog, with visuals" },
    { path: "/studio", roomId: "bird-dog-studio", title: "Bird Dog Studio" },
    { path: "/marble-machine", roomId: "marble-machine", title: "Marble Machine", description: "Build a run, drop a marble" },

    // Fourth floor: wonder
    { path: "/forest", roomId: "forest", title: "The Forest", description: "A Lost Woods that grows anew every visit" },
    { path: "/holodeck/forest", roomId: "forest", title: "The Forest" },
    { path: "/observatory", roomId: "observatory", title: "Observatory", description: "Constellations made of my work" },

    // The holodeck is gone; its old links land in the atrium.
    { path: "/holodeck", roomId: "atrium", title: "Portfolio Atrium" },
    { path: "/about", roomId: "atrium", title: "Portfolio Atrium" },
];

export const pathToRoomId = new Map<string, string>(roomRoutes.map((route) => [route.path, route.roomId]));

// The first route listed for each room is its canonical path.
export const roomIdToPath = new Map<string, string>();
roomRoutes.forEach((route) => {
    if (!roomIdToPath.has(route.roomId)) roomIdToPath.set(route.roomId, route.path);
});

export const getRoomIdFromPath = (path: string): string | null => pathToRoomId.get(path) || null;

export const getPathFromRoomId = (roomId: string): string | null => roomIdToPath.get(roomId) || null;

export const getRouteByPath = (path: string): RoomRoute | null =>
    roomRoutes.find((route) => route.path === path) || null;
