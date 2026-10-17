import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { characterAt } from "../../../multiplayer/characters";
import { useCosmicStore } from "./cosmicStore";
import { OPPONENTS } from "./opponents";
import { SEAT_ON_FLOOR, SEAT_ON_TABLE } from "./cosmicLayout";
import { TravelerFigure } from "./TravelerFigure";
import { TypedSpeech } from "./TypedSpeech";

// Whoever plays you across the table, beside the board: Pibble, Willow or
// the Fairy King from the ladder, or the traveler of the visitor you're
// playing (or of whoever is playing the game you're watching). The Void
// needs no seat. Small ones stand on the table, the rest behind it, and
// they turn to keep you in view.

export const OpponentSeat: React.FC = () => {
    const seat = useCosmicStore((s) => s.seat);
    const speech = useCosmicStore((s) => s.seatSpeech);
    const group = useRef<THREE.Group>(null);
    const target = useRef(new THREE.Vector3());

    useFrame(({ camera }, delta) => {
        const g = group.current;
        if (!g) return;
        target.current.copy(camera.position);
        g.parent?.worldToLocal(target.current);
        // Models face -Z; turn toward the camera, smoothly.
        const yaw = Math.atan2(-(target.current.x - g.position.x), -(target.current.z - g.position.z));
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
