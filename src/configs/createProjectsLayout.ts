// src/configs/createProjectsLayout.ts
import { InteractiveElement } from "../types/scene.types";

export const createProjectsLayout = (): InteractiveElement[] => [
    // Back wall - 3 project displays
    ...[-5, 0, 5].map(
        (xOffset, i): InteractiveElement => ({
            id: `project-back-${i}`,
            type: "model",
            position: [xOffset, 2, -9] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number], // Base rotation is now forward
            scale: [1.2, 1.2, 1] as [number, number, number],
            content: "project-display",
        })
    ),

    // Left wall - 2 displays facing center
    ...[-3, 3].map(
        (zOffset, i): InteractiveElement => ({
            id: `project-left-${i}`,
            type: "model",
            position: [-9, 2, zOffset] as [number, number, number],
            rotation: [0, Math.PI / 4, 0] as [number, number, number], // 45° inward
            scale: [1.2, 1.2, 1] as [number, number, number],
            content: "project-display",
        })
    ),

    // Right wall - 2 displays facing center
    ...[-3, 3].map(
        (zOffset, i): InteractiveElement => ({
            id: `project-right-${i}`,
            type: "model",
            position: [9, 2, zOffset] as [number, number, number],
            rotation: [0, -Math.PI / 4, 0] as [number, number, number], // -45° inward
            scale: [1.2, 1.2, 1] as [number, number, number],
            content: "project-display",
        })
    ),

    // Title
    {
        id: "projects-title",
        type: "text",
        position: [0, 4, -5] as [number, number, number],
        content: "🚧",
        scale: [1.5, 1.5, 1.5] as [number, number, number],
    },
];
