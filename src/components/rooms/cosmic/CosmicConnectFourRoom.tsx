import React from "react";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { CosmicSky } from "./CosmicSky";
import { CosmicPlatform } from "./CosmicPlatform";
import { ConnectFourGame } from "./ConnectFourGame";
import { ChipAltar } from "./ChipAltar";
import { OpponentAltar } from "./OpponentAltar";
import { OpponentSeat } from "./OpponentSeat";
import { VisitorTables } from "./VisitorTables";
import { Nothing } from "./Nothing";
import { RoomRupeeSpawner } from "../../models/RoomRupeeSpawner";
import {
    ALTAR_POSITION,
    BOARD_POSITION,
    DOOR_Z,
    HOLD_Y,
    OPPONENT_ALTAR_POSITION,
    TABLES_POSITION,
} from "./cosmicLayout";

// Cosmic Connect Four. Through the second-floor portal: a disc of black
// glass adrift in deep space, a table, a board, and behind it the Void - a
// vast eyeless thing of pale light that some would call God, whose
// intentions toward you are not known. You play rubies (or whatever you
// take from the altar on your left) against whoever you pick from the
// altar on your right: Pibble, then Willow, then the Fairy King, and only
// then the Void itself, which plays light. Behind you, everyone else in
// the room: watch their games, or challenge them. Far behind the Void, a
// board the size of a building shows your board, move for move.

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
        <OpponentSeat />
        <ChipAltar />
        <OpponentAltar />
        <VisitorTables />
        <RoomRupeeSpawner
            roomId="cosmic-connect-four"
            dimensions={[16, 12, 16]}
            position={[0, 0, 0]}
            numRupees={2}
            rupeeScale={0.3}
            pickPosition={pickRupeeSpot}
        />
    </>
);

// Out on the rim of the platform, on your side of the table, clear of the
// altar and the door.
const pickRupeeSpot = (_: number, rand: () => number): [number, number, number] => {
    for (let attempt = 0; attempt < 30; attempt++) {
        const angle = rand() * Math.PI * 2;
        const r = 4.5 + rand() * 2.8;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const nearAltar = [ALTAR_POSITION, OPPONENT_ALTAR_POSITION, TABLES_POSITION].some(
            ([ax, , az]) => Math.hypot(x - ax, z - az) < 1.2
        );
        const nearDoor = Math.hypot(x, z - DOOR_Z) < 1.6;
        if (z > -1 && !nearAltar && !nearDoor) return [x, 0.5, z];
    }
    return [4.5, 0.5, 3];
};
