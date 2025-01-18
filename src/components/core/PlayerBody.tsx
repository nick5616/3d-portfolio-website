// src/components/core/PlayerBody.tsx
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import * as THREE from "three";

export const PlayerBody: React.FC = () => {
    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { flyMode } = useSceneStore();

    const playerRef = useRef<RapierRigidBody>(null);
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());

    useFrame((_, delta) => {
        if (!playerRef.current || flyMode) return; // Don't interfere in fly mode

        // Calculate movement direction based on camera orientation
        direction.current.set(0, 0, 0);
        if (movement.forward) direction.current.z += 1;
        if (movement.backward) direction.current.z -= 1;
        if (movement.left) direction.current.x += 1;
        if (movement.right) direction.current.x -= 1;
        direction.current.normalize();

        // Convert direction to camera's coordinate space
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const cameraRotation = new THREE.Euler(
            0,
            Math.atan2(cameraDirection.x, cameraDirection.z),
            0
        );
        direction.current.applyEuler(cameraRotation);

        // Get current velocity
        const currentVel = playerRef.current.linvel();

        // Calculate new velocity
        const speed = (movement.running ? 10 : 5) * 60 * delta;
        velocity.current.set(
            direction.current.x * speed,
            currentVel.y, // Maintain vertical velocity for gravity
            direction.current.z * speed
        );

        // Apply velocity
        playerRef.current.setLinvel(
            {
                x: velocity.current.x,
                y: velocity.current.y,
                z: velocity.current.z,
            },
            true
        );

        // Update camera position to follow player
        const pos = playerRef.current.translation();
        camera.position.set(pos.x, pos.y + 1.8, pos.z);
    });

    return (
        <RigidBody
            ref={playerRef}
            colliders={false}
            mass={1}
            type={flyMode ? "kinematicPosition" : "dynamic"}
            lockRotations
            enabledRotations={[false, false, false]}
            position={[0, 2, 5]} // Match initial camera position
        >
            <CapsuleCollider args={[0.9, 0.4]} position={[0, 1, 0]} />
        </RigidBody>
    );
};
