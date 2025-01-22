// src/components/core/PlayerBody.tsx
import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import * as THREE from "three";

const JUMP_FORCE = 4;
const JUMP_COOLDOWN = 500; // milliseconds

export const PlayerBody: React.FC = () => {
    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { flyMode } = useSceneStore();

    const playerRef = useRef<RapierRigidBody>(null);
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const [canJump, setCanJump] = useState(true);
    const lastJumpTime = useRef(0);

    // Helper to check if player is grounded
    const checkIfGrounded = () => {
        if (!playerRef.current) return false;
        const currentVel = playerRef.current.linvel();
        // Consider player grounded if vertical velocity is very small
        return Math.abs(currentVel.y) < 0.1;
    };

    useFrame(() => {
        if (!playerRef.current || flyMode) return;

        const currentTime = Date.now();
        const isGrounded = checkIfGrounded();

        // Reset jump ability when grounded
        if (
            isGrounded &&
            !canJump &&
            currentTime - lastJumpTime.current > JUMP_COOLDOWN
        ) {
            setCanJump(true);
        }

        // Handle jumping
        if (movement.jumping && canJump && isGrounded) {
            const currentVel = playerRef.current.linvel();
            playerRef.current.setLinvel(
                {
                    x: currentVel.x,
                    y: JUMP_FORCE,
                    z: currentVel.z,
                },
                true
            );
            setCanJump(false);
            lastJumpTime.current = currentTime;
        }

        // Calculate movement direction based on camera orientation
        direction.current.set(0, 0, 0);
        if (movement.forward) direction.current.z += 1;
        if (movement.backward) direction.current.z -= 1;
        if (movement.left) direction.current.x += 1;
        if (movement.right) direction.current.x -= 1;

        if (direction.current.length() > 0) {
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

            // Set movement speed (reduced in air)
            const speed = movement.running ? 8 : 4;
            const airMultiplier = isGrounded ? 1 : 1;

            // Apply horizontal movement
            velocity.current.set(
                direction.current.x * speed * airMultiplier,
                currentVel.y, // Keep vertical velocity
                direction.current.z * speed * airMultiplier
            );

            // Apply the velocity
            playerRef.current.setLinvel(velocity.current, true);
        }

        // Update camera position to follow player
        const pos = playerRef.current.translation();
        camera.position.set(pos.x, pos.y + 1.8, pos.z);
    });

    return (
        <RigidBody
            ref={playerRef}
            mass={1}
            type="dynamic"
            enabledRotations={[false, false, false]}
            lockRotations
            position={[0, 2, 5]}
            friction={20}
            restitution={0}
        >
            <CapsuleCollider
                args={[0.5, 0.3]}
                position={[0, 1, 0]}
                friction={20}
            />
        </RigidBody>
    );
};
