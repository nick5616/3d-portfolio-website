import React from "react";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { CosmicSky } from "./CosmicSky";
import { CosmicPlatform } from "./CosmicPlatform";
import { ConnectFourGame } from "./ConnectFourGame";
import { ChipAltar } from "./ChipAltar";
import { Nothing } from "./Nothing";
import { RoomRupeeSpawner } from "../../models/RoomRupeeSpawner";
import { ALTAR_POSITION, BOARD_POSITION, DOOR_Z, HOLD_Y } from "./cosmicLayout";

// Cosmic Connect Four. Through the second-floor portal: a disc of black
// glass adrift in deep space, a table, a board, and across it Nothing - a
// vast eyeless thing of pale light that some would call God, whose
// intentions toward you are not known. You play rubies (or whatever you
// take from the altar); it plays light. Far behind it, a board the size of
// a building shows the same game, move for move, bounce for bounce.

export const CosmicConnectFourRoom: React.FC = () => (
    <>
        <RoomEnvironmentReady />
        <CosmicSky />

        <ambientLight intensity={0.18} color="#7a5cff" />
        <hemisphereLight intensity={0.35} color="#6a58c8" groundColor="#120820" />
        {/* A cool key on the board from over your shoulder */}
        <spotLight
            position={[0.6, 5.2, 3.6]}
            target-position={[BOARD_POSITION[0], BOARD_POSITION[1] + HOLD_Y / 2, BOARD_POSITION[2]]}
            angle={0.5}
            penumbra={0.7}
            intensity={28}
            decay={1.4}
            distance={14}
            color="#e6dcff"
        />
        <pointLight position={[0, 1.9, 2.6]} intensity={2} distance={5} decay={2} color="#ffb070" />

        <CosmicPlatform />
        <Nothing />
        <ConnectFourGame />
        <ChipAltar />
        <RoomRupeeSpawner
            roomId="cosmic-connect-four"
            dimensions={[16, 12, 16]}
            position={[0, 0, 0]}
            numRupees={2}
            rupeeScale={0.3}
            spawnDelay={500}
            pickPosition={pickRupeeSpot}
        />
    </>
);

// Out on the rim of the platform, on your side of the table, clear of the
// altar and the door.
const pickRupeeSpot = (): [number, number, number] => {
    for (let attempt = 0; attempt < 30; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 4.5 + Math.random() * 2.8;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const nearAltar = Math.hypot(x - ALTAR_POSITION[0], z - ALTAR_POSITION[2]) < 1.2;
        const nearDoor = Math.hypot(x, z - DOOR_Z) < 1.6;
        if (z > -1 && !nearAltar && !nearDoor) return [x, 0.5, z];
    }
    return [4.5, 0.5, 3];
};
