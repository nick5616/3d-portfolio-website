import React from "react";
import { Text } from "@react-three/drei";
import { STANDING_STYLE, standingOf, useDoorReview } from "../../debug/doorReview";

// Door review (localhost): each door's verdict, floating over it.
export const DoorReviewMarker: React.FC<{
    reviewKey: string;
    look: string;
    position: [number, number, number];
    rotationY: number;
}> = ({ reviewKey, look, position, rotationY }) => {
    const hidden = useDoorReview((s) => s.hidden);
    const entry = useDoorReview((s) => s.doors[reviewKey]);
    if (hidden) return null;
    const style = STANDING_STYLE[standingOf(entry, look)];
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 0.2, 0]}>
                <circleGeometry args={[0.06, 20]} />
                <meshBasicMaterial color={style.color} toneMapped={false} />
            </mesh>
            <Text
                fontSize={0.12}
                letterSpacing={0.08}
                color={style.color}
                outlineWidth={0.01}
                outlineColor="#05070c"
                anchorX="center"
                anchorY="middle"
            >
                {style.label.toUpperCase()}
            </Text>
        </group>
    );
};
