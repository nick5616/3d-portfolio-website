import React from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { CourageExperience } from "./CourageExperience";
import { ArtExperience } from "./ArtExperience";
import { MathExperience } from "./MathExperience";
import { ForestExperience } from "./ForestExperience";
import { ForestPiano } from "./ForestPiano";

// The four programs that used to run inside the holodeck, each now a room
// of its own behind a door in the atrium.

// The farmhouse and the classroom were built for the holodeck's 8 x 8 m
// box, which sat half a metre west of centre (x from -4.5 to 3.5).
const SmallRoomShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <>
        <RoomEnvironmentReady />
        <RigidBody type="fixed" colliders={false}>
            {/* Floor, flush with the visible floorboards/tiles at y = 0.1 */}
            <CuboidCollider args={[4.2, 0.25, 4.2]} position={[-0.5, -0.15, 0]} />
            <CuboidCollider args={[4, 2.5, 0.1]} position={[-0.5, 2.5, -4.05]} />
            <CuboidCollider args={[4, 2.5, 0.1]} position={[-0.5, 2.5, 4.05]} />
            <CuboidCollider args={[0.1, 2.5, 4]} position={[-4.55, 2.5, 0]} />
            <CuboidCollider args={[0.1, 2.5, 4]} position={[3.55, 2.5, 0]} />
            <CuboidCollider args={[4, 0.1, 4]} position={[-0.5, 5.1, 0]} />
        </RigidBody>
        <ambientLight intensity={0.4} color="#f0f0f0" />
        {children}
    </>
);

export const CourageRoom: React.FC = () => (
    <SmallRoomShell>
        <CourageExperience />
    </SmallRoomShell>
);

export const ArtStudioRoom: React.FC = () => (
    <SmallRoomShell>
        <ArtExperience />
    </SmallRoomShell>
);

// The moon outpost: open sky, but you can only wander so far from the cannon.
export const MeteorMathRoom: React.FC = () => (
    <>
        <RoomEnvironmentReady />
        <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[40, 0.1, 40]} position={[0, -0.1, -8]} />
            {/* An invisible fence: you're a gunner, not an astronaut */}
            {/* ...and the city's shield is just past the cannon */}
            <CuboidCollider args={[9, 3, 0.2]} position={[0, 3, -1.2]} />
            <CuboidCollider args={[9, 3, 0.2]} position={[0, 3, 8.4]} />
            <CuboidCollider args={[0.2, 3, 5]} position={[-8.4, 3, 3.6]} />
            <CuboidCollider args={[0.2, 3, 5]} position={[8.4, 3, 3.6]} />
        </RigidBody>
        <MathExperience />
    </>
);

export const ForestRoom: React.FC = () => (
    <>
        <RoomEnvironmentReady />
        <ForestExperience />
        <ForestPiano />
    </>
);
