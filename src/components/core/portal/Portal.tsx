import React from "react";
import { Text } from "@react-three/drei";
import type { PortalFrameSpec, PortalView } from "../../../configs/portalLooks";
import { PortalSurface } from "./PortalSurface";
import { FRAME_LABEL, PortalFrame, labelLift } from "./PortalFrames";

// A door you can see through: the view of where it leads (PortalSurface),
// in a frame that belongs to the room it stands in, lettered with the
// destination's name and throwing that place's light into this one.

interface PortalProps {
    position: [number, number, number]; // threshold centre
    rotationY: number; // local +Z faces the viewer
    width: number;
    height: number; // threshold to the top of the arch
    view: PortalView;
    hovering: boolean;
    frame?: PortalFrameSpec;
    label?: string; // lettered over the frame (frames only)
    sealed?: boolean; // locked: the view greys out
}

export const Portal: React.FC<PortalProps> = ({ position, rotationY, width, height, view, hovering, frame, label, sealed }) => {
    const half = width / 2;
    const jamb = Math.max(0.1, height - half);
    const framed = frame && frame.style !== "none";
    const lettering = frame ? FRAME_LABEL[frame.style] : FRAME_LABEL.none;
    const accent = frame?.accent ?? view.rim;
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <PortalSurface view={view} width={width} height={height} hovering={hovering} sealed={sealed} />
            {framed && (
                <PortalFrame spec={frame!} half={half} jamb={jamb} height={height} fallbackAccent={view.rim} label={label} />
            )}
            {framed && label && !lettering.inFrame && (
                <Text
                    font={lettering.font ?? "/fonts/Fraunces.ttf"}
                    position={[0, height + labelLift(frame!, height), 0.08]}
                    fontSize={0.16}
                    letterSpacing={lettering.font ? 0.02 : 0.2}
                    color={lettering.color ?? (lettering.accent ? accent : "#e9c77a")}
                    anchorX="center"
                    anchorY="middle"
                >
                    {lettering.format ? lettering.format(label) : label.toUpperCase()}
                </Text>
            )}
            <pointLight
                position={[0, height * 0.55, 0.6]}
                intensity={sealed ? 0.8 : hovering ? 4 : 2.2}
                distance={5}
                decay={2}
                color={view.light}
            />
        </group>
    );
};
