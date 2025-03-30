import React from "react";
import { RoomConfig } from "../../types/scene.types";

interface DefaultRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const DefaultRoom: React.FC<DefaultRoomProps> = (
    // Using _ prefix to indicate intentionally unused params
    _props
) => {
    // Default room has no special elements beyond what's in the base room
    return null;
};
