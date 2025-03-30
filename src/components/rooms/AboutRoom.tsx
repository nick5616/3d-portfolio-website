import React from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";

interface AboutRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const AboutRoom: React.FC<AboutRoomProps> = ({ config }) => {
    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />

            {/* About room has no special elements beyond what's in the base room and interactive elements */}
        </>
    );
};
