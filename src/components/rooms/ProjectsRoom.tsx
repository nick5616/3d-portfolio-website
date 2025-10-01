import React from "react";
import { RoomConfig } from "../../types/scene.types";
import { InteractiveObject } from "../core/InteractiveObject";
import { displaysConfig } from "../../configs/displayConfig";

interface ProjectsRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const ProjectsRoom: React.FC<ProjectsRoomProps> = ({ config }) => {
    // Convert display configs to interactive elements
    const projectDisplays = displaysConfig.map((display) => ({
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
            crtStyle: display.crtStyle,
            lightColor: display.lightColor,
            responsive: display.responsive,
        },
    }));

    return (
        <>
            {/* Project displays - render the interactive web displays */}
            {projectDisplays.map((element) => (
                <InteractiveObject key={element.id} element={element} />
            ))}
        </>
    );
};
