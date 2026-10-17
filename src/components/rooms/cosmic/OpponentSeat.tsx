import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { characterAt } from "../../../multiplayer/characters";
import { useCosmicStore } from "./cosmicStore";
import { OPPONENTS } from "./opponents";
import { BOARD_POSITION, PLAY_SPOT, SEAT_ON_FLOOR, SEAT_ON_TABLE, colX } from "./cosmicLayout";
import { TravelerFigure } from "./TravelerFigure";
import { TypedSpeech } from "./TypedSpeech";

// Whoever plays you across the table, beside the board: Pibble, Willow or
// the Fairy King from the ladder, or the traveler of the visitor you're
// playing (or of whoever is playing the game you're watching). The Void
// needs no seat. Small ones stand on the table, the rest behind it.
//
// Where they stand and which way they face follow only from the game, so
// everyone watching the same game sees them the same: facing the spot
// where their player stands, glancing at each chip as it goes in.

const GLANCE_MS = 1600;

export const OpponentSeat: React.FC = () => {
    const seat = useCosmicStore((s) => s.seat);
    const speech = useCosmicStore((s) => s.seatSpeech);
    const group = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        const g = group.current;
        const base = g?.parent?.position;
        if (!g || !base) return;
        const last = useCosmicStore.getState().lastMove;
        const glancing = last && performance.now() - last.at < GLANCE_MS;
        const [tx, tz] = glancing ? [BOARD_POSITION[0] + colX(last.col), BOARD_POSITION[2]] : PLAY_SPOT;
        // Models face -Z; turn toward the target, smoothly.
        const yaw = Math.atan2(-(tx - base.x), -(tz - base.z));
        let d = yaw - g.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        g.rotation.y += d * Math.min(1, delta * 3);
    });

    if (!seat) return null;
    const figure =
        seat.kind === "bot"
            ? OPPONENTS[seat.bot].body!
            : { character: seat.character, color: seat.look };
    const def = characterAt(figure.character);
    const onTable = def.height < 1.2;
    const position = onTable ? SEAT_ON_TABLE : SEAT_ON_FLOOR;
    // Fairies hover well above their origin.
    const top = def.fairy ? 2.2 : def.height;

    return (
        <group position={position}>
            <group ref={group} rotation={[0, Math.PI, 0]}>
                <TravelerFigure
                    key={`${figure.character}:${figure.color}`}
                    character={figure.character}
                    color={figure.color}
                    pitch={-0.25}
                />
            </group>
            {/* Only the ladder's opponents talk; visitors speak for themselves. */}
            {seat.kind === "bot" && <TypedSpeech speech={speech} position={[0, top + 0.3, 0.2]} fontSize={0.12} maxWidth={1.9} />}
        </group>
    );
};
