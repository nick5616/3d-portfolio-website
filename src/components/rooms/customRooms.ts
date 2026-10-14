import { ComponentType, LazyExoticComponent, lazy } from "react";

// Rooms that build everything themselves (floors, walls, lights, readiness)
// rather than going through BaseRoom. Each one is its own chunk, fetched the
// first time someone walks in.
const room = <T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) =>
    lazy(() => load().then((module) => ({ default: module[name] as ComponentType })));

export const CUSTOM_ROOMS: Record<string, LazyExoticComponent<ComponentType>> = {
    "cosmic-connect-four": room(() => import("./cosmic/CosmicConnectFourRoom"), "CosmicConnectFourRoom"),
    "meteor-math": room(() => import("./experiences/ExperienceRooms"), "MeteorMathRoom"),
    courage: room(() => import("./experiences/ExperienceRooms"), "CourageRoom"),
    "art-studio": room(() => import("./experiences/ExperienceRooms"), "ArtStudioRoom"),
    forest: room(() => import("./experiences/ExperienceRooms"), "ForestRoom"),
    "jam-room": room(() => import("./jam/JamRoom"), "JamRoom"),
    "bird-dog-studio": room(() => import("./studio/BirdDogStudio"), "BirdDogStudio"),
    "sky-course": room(() => import("./skycourse/SkyCourse"), "SkyCourse"),
    "rupee-shop": room(() => import("./shop/RupeeShop"), "RupeeShop"),
    observatory: room(() => import("./observatory/Observatory"), "Observatory"),
    "marble-machine": room(() => import("./marble/MarbleMachine"), "MarbleMachine"),
};
