import React from "react";
import { RoomConfig } from "../../types/scene.types";
import { RoomComments } from "./RoomComments";

interface DefaultRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const DefaultRoom: React.FC<DefaultRoomProps> = ({ config }) => {
    // Default room has no special elements beyond what's in the base room
    return (
        <>
            {/* Room annotation comments */}
            <RoomComments roomId={config.id} />
        </>
    );
};
