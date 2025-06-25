// src/configs/createProjectsLayout.ts
import { InteractiveElement } from "../types/scene.types";
import { displaysConfig } from "./displayConfig";

export const createProjectsLayout = (): InteractiveElement[] => {
    // Convert display configs to interactive elements
    const displayElements: InteractiveElement[] = displaysConfig.map(display => ({
        id: `project-${display.id}`,
        type: "web" as const,
        position: display.position,
        rotation: display.rotation || [0, 0, 0],
        scale: display.scale || [1, 1, 1],
        content: {
            url: display.url,
            title: display.title,
            description: display.description,
            screenshotUrl: display.screenshotUrl,
            responsive: display.responsive,
        },
    }));

    // Add the title element
    const titleElement: InteractiveElement = {
        id: "projects-title",
        type: "text",
        position: [0, 4, -5] as [number, number, number],
        content: "🚧",
        scale: [1.5, 1.5, 1.5] as [number, number, number],
    };

    return [...displayElements, titleElement];
};
