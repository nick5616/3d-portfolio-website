import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { characterAt, newMotion } from "../../../multiplayer/characters";

// One of the travelers (multiplayer/characters.tsx), standing still: the
// opponents on the ladder, and every visitor on the tables stand. Scaled so
// it's `height` tall. Never in the way of an aim ray.

const noRaycast = () => null;

export const TravelerFigure: React.FC<{
    character: number;
    color: number;
    height?: number;
    pitch?: number;
}> = ({ character, color, height, pitch = 0 }) => {
    const def = characterAt(character);
    const root = useRef<THREE.Group>(null);
    const motion = useMemo(() => ({ ...newMotion(), pitch }), [pitch]);
    const tint = useMemo(() => new THREE.Color(color), [color]);
    useLayoutEffect(() => {
        root.current?.traverse((o) => (o.raycast = noRaycast));
    });
    const { Model } = def;
    return (
        <group ref={root} scale={height ? height / def.height : 1}>
            <Model color={tint} motion={motion} />
        </group>
    );
};
