import { useEffect } from "react";
import { RoomConfig } from "../types/scene.types";
import { useSceneStore } from "../stores/sceneStore";
import { ROOM_SOUNDSCAPES } from "./soundManifest";
import { setSoundscape } from "./soundManager";

export const soundscapeKeyForRoom = (room: RoomConfig | null | undefined) => {
    const kind = room?.galleryRoomKind;
    if (kind?.kind === "sketchbook") return "gallery-sketchbook";
    if (kind?.kind === "hall") return "gallery-hall";
    return room?.id ?? "atrium";
};

// Crossfades music + ambience whenever the player changes rooms.
export const useRoomSoundscape = () => {
    const room = useSceneStore((s) => s.currentRoom);
    const key = soundscapeKeyForRoom(room);
    useEffect(() => {
        const scape = ROOM_SOUNDSCAPES[key];
        setSoundscape(scape?.music, scape?.ambience);
    }, [key]);
};
