// src/components/core/PlayerBody.tsx
import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
    RigidBody,
    CapsuleCollider,
    interactionGroups,
    useRapier,
} from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import * as THREE from "three";

const JUMP_FORCE = 4;
const JUMP_COOLDOWN = 500; // milliseconds
const UNDERGROUND_THRESHOLD = -10; // Y position below which the player is considered underground

const RUN_SPEED = 8;
const WALK_SPEED = 4;
const CROUCH_SPEED = 2; // CS2-style: crouching is slower than walking and can't be combined with sprint

const STANDING_EYE_HEIGHT = 1.8;
const CROUCH_EYE_HEIGHT = 1.3;
const CROUCH_TRANSITION_SPEED = 10; // higher = snappier crouch/stand transition

export const PlayerBody: React.FC = () => {
    const { camera } = useThree();
    const { movement } = useKeyboardControls();
    const { world } = useRapier();
    const {
        flyMode,
        shouldTeleportPlayer,
        playerPosition,
        clearTeleportFlag,
        updatePlayerVelocity,
        setPlayerGrounded,
        updatePlayerPosition,
        currentRoom,
        roomEnvironmentReady,
    } = useSceneStore();

    const playerRef = useRef<RapierRigidBody>(null);
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const [canJump, setCanJump] = useState(true);
    const lastJumpTime = useRef(0);
    const eyeHeight = useRef(STANDING_EYE_HEIGHT);

    // Helper to check if player is grounded
    const checkIfGrounded = () => {
        if (!playerRef.current) return false;
        const currentVel = playerRef.current.linvel();
        // Consider player grounded if vertical velocity is very small
        return Math.abs(currentVel.y) < 0.1;
    };

    // Gravity only applies to the physics body outside of flight - while
    // flying the body is driven directly from the camera every frame below,
    // so leaving gravity on would fight that and yank the player down the
    // instant flight is toggled off. It's also held off until the room
    // reports its collision bodies are ready: right after a teleport, the
    // new room's floor RigidBody hasn't necessarily registered with the
    // Rapier world yet, and without this the player could start falling
    // before there's anything underneath them - the underground safety net
    // (below) would then just bounce them back up into the same still-not-
    // ready room, repeating for as long as it takes to become ready. This
    // was previously dead code: roomEnvironmentReady existed in the store
    // and was documented as existing for exactly this purpose, but nothing
    // ever actually read it.
    useEffect(() => {
        playerRef.current?.setGravityScale(
            flyMode || !roomEnvironmentReady ? 0 : 1,
            true
        );
    }, [flyMode, roomEnvironmentReady]);

    useFrame((_, delta) => {
        if (!playerRef.current) return;

        // Smoothly transition eye height between standing and crouched, CS2-style
        const targetEyeHeight = movement.crouching
            ? CROUCH_EYE_HEIGHT
            : STANDING_EYE_HEIGHT;
        eyeHeight.current = THREE.MathUtils.lerp(
            eyeHeight.current,
            targetEyeHeight,
            Math.min(delta * CROUCH_TRANSITION_SPEED, 1)
        );

        // Handle teleportation (process even before room is ready so player
        // is positioned correctly while waiting for floor colliders)
        if (shouldTeleportPlayer) {
            playerRef.current.setTranslation(
                {
                    x: playerPosition[0],
                    y: playerPosition[1],
                    z: playerPosition[2],
                },
                true
            );
            playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
            clearTeleportFlag();
        }

        if (flyMode) {
            // Free flight: the camera leads (CameraController moves it in full
            // 3D based on look direction + movement keys) and the physics body
            // just follows along underneath it, instead of the usual body-leads
            // arrangement. Without this, the rigid body stayed put (or fell
            // under gravity) and the unconditional camera-follows-body sync
            // below immediately snapped the camera back, so flying appeared to
            // do nothing.
            const flightPosition = {
                x: camera.position.x,
                y: camera.position.y - 1.8,
                z: camera.position.z,
            };
            playerRef.current.setTranslation(flightPosition, true);
            playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            updatePlayerPosition([
                flightPosition.x,
                flightPosition.y,
                flightPosition.z,
            ]);
            return;
        }

        // Always keep camera following the player
        const pos = playerRef.current.translation();
        camera.position.set(pos.x, pos.y + eyeHeight.current, pos.z);

        // Underground safety net — if the player clips below the world, snap them back
        if (pos.y < UNDERGROUND_THRESHOLD) {
            const entrance = currentRoom?.defaultEntrance.position ?? [0, 1.5, 0];
            playerRef.current.setTranslation(
                { x: entrance[0], y: entrance[1] + 4, z: entrance[2] },
                true
            );
            playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }

        // Update player position in store for collision detection
        const currentPosition = playerRef.current.translation();
        updatePlayerPosition([
            currentPosition.x,
            currentPosition.y,
            currentPosition.z,
        ]);

        const currentTime = Date.now();
        const isGrounded = checkIfGrounded();

        // Report ground contact state
        setPlayerGrounded(isGrounded);

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

            // Set movement speed (reduced in air). Crouching overrides running -
            // CS2-style, you can't sprint while crouched.
            const speed = movement.crouching
                ? CROUCH_SPEED
                : movement.running
                ? RUN_SPEED
                : WALK_SPEED;
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

        // Update player velocity in scene store
        if (playerRef.current) {
            const currentVel = playerRef.current.linvel();
            updatePlayerVelocity([currentVel.x, currentVel.y, currentVel.z]);
        }

    });

    return (
        <RigidBody
            ref={playerRef}
            mass={1}
            type="dynamic"
            gravityScale={flyMode || !roomEnvironmentReady ? 0 : 1}
            enabledRotations={[false, false, false]}
            lockRotations
            position={playerPosition}
            friction={20}
            restitution={0}
            collisionGroups={interactionGroups(0, [0, 1])}
        >
            <CapsuleCollider
                args={[0.5, 0.3]}
                position={[0, 1, 0]}
                friction={20}
            />
        </RigidBody>
    );
};
