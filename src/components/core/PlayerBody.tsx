import { useShallow } from "zustand/react/shallow";
// src/components/core/PlayerBody.tsx
import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
    RigidBody,
    CapsuleCollider,
    interactionGroups,
    useRapier,
} from "@react-three/rapier";
import type { RapierCollider, RapierRigidBody } from "@react-three/rapier";
import { useSceneStore } from "../../stores/sceneStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import * as THREE from "three";
import { playSound } from "../../audio/soundManager";
import { ROOM_SOUNDSCAPES } from "../../audio/soundManifest";
import { soundscapeKeyForRoom } from "../../audio/roomSoundscape";
import { carrier } from "../../stores/carrier";
import { useUnlockStore } from "../../stores/unlockStore";
import { useReadiness } from "../../stores/readinessStore";

const JUMP_FORCE = 4;
const JUMP_COOLDOWN = 500; // milliseconds
const UNDERGROUND_THRESHOLD = -10; // Y position below which the player is considered underground

const RUN_SPEED = 8;
const WALK_SPEED = 4;
const CROUCH_SPEED = 2; // CS2-style: crouching is slower than walking and can't be combined with sprint

const STANDING_EYE_HEIGHT = 1.8;
const CROUCH_EYE_HEIGHT = 1.3;
const CROUCH_TRANSITION_SPEED = 10; // higher = snappier crouch/stand transition

const STILL = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    running: false,
    jumping: false,
    crouching: false,
};

export const PlayerBody: React.FC = () => {
    const { camera } = useThree();
    const { movement: keys } = useKeyboardControls();
    const { world, rapier } = useRapier();
    // Probe from the capsule's lower sphere center straight down.
    const groundRay = useMemo(
        () => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }),
        [rapier]
    );
    // Only subscribe to values that change rarely. Position, velocity and
    // grounded state are written FROM this component's useFrame, so reading
    // them back through a subscription would re-render it every frame.
    const {
        flyMode,
        shouldTeleportPlayer,
        clearTeleportFlag,
        updatePlayerVelocity,
        setPlayerGrounded,
        updatePlayerPosition,
        currentRoom,
        roomEnvironmentReady,
    } = useSceneStore(
        useShallow((s) => ({
            flyMode: s.flyMode,
            shouldTeleportPlayer: s.shouldTeleportPlayer,
            clearTeleportFlag: s.clearTeleportFlag,
            updatePlayerVelocity: s.updatePlayerVelocity,
            setPlayerGrounded: s.setPlayerGrounded,
            updatePlayerPosition: s.updatePlayerPosition,
            currentRoom: s.currentRoom,
            roomEnvironmentReady: s.roomEnvironmentReady,
        }))
    );
    // Spawn position only matters at mount (PlayerBody is keyed by room).
    const [spawnPosition] = useState(
        () => useSceneStore.getState().playerPosition
    );

    // Throttle store writes: every write notifies every subscriber, so
    // writing position/velocity/grounded on every frame used to re-render
    // the whole app at the display's refresh rate even while standing still.
    const lastPublish = useRef({ time: 0, x: NaN, y: NaN, z: NaN });
    const lastGrounded = useRef<boolean | null>(null);
    const publishPlayerState = (
        x: number,
        y: number,
        z: number,
        vel: { x: number; y: number; z: number }
    ) => {
        const now = performance.now();
        const last = lastPublish.current;
        // (Written as "not within" so the NaN starting values count as moved.)
        const moved = !(
            Math.abs(x - last.x) <= 0.005 &&
            Math.abs(y - last.y) <= 0.005 &&
            Math.abs(z - last.z) <= 0.005
        );
        if (!moved || now - last.time < 1000 / 30) return;
        lastPublish.current = { time: now, x, y, z };
        updatePlayerPosition([x, y, z]);
        updatePlayerVelocity([vel.x, vel.y, vel.z]);
    };

    // Footsteps: one step per ~1.9 m walked (shorter strides when running
    // feel wrong at this scale, so it's distance-based, not time-based).
    const stride = useRef(0);
    const wasGrounded = useRef(true);
    const footstepSound =
        ROOM_SOUNDSCAPES[soundscapeKeyForRoom(currentRoom)]?.footsteps ??
        "footstep-stone";

    const playerRef = useRef<RapierRigidBody>(null);
    const colliderRef = useRef<RapierCollider>(null);
    const wasCarried = useRef(false);
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const [canJump, setCanJump] = useState(true);
    const lastJumpTime = useRef(0);
    // Cloud Boots (from the Rupee Shop): one more jump in mid-air.
    const airJumpUsed = useRef(false);
    const wasJumpHeld = useRef(false);
    const eyeHeight = useRef(STANDING_EYE_HEIGHT);

    // What's just below the feet, if anything. The capsule's lower sphere
    // center is 0.5 above the body origin and 0.3 above its bottom, so a hit
    // within 0.45 leaves 0.15 of slack.
    const probeGround = () => {
        const body = playerRef.current;
        if (!body) return null;
        const p = body.translation();
        groundRay.origin = { x: p.x, y: p.y + 0.5, z: p.z };
        return world.castRayAndGetNormal(
            groundRay,
            0.45,
            true,
            rapier.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            undefined,
            body
        );
    };
    // Ramps (the atrium's spiral stair) are frictionless so the capsule's
    // very high friction doesn't glue it to the slope; on those the player
    // is held in place by hand when idle and kept on the surface going down.
    const anchored = useRef(false);

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
            flyMode || !roomEnvironmentReady || anchored.current ? 0 : 1,
            true
        );
    }, [flyMode, roomEnvironmentReady]);

    useFrame((_, delta) => {
        if (!playerRef.current) return;
        // Behind the loading screen the body settles onto the floor, but
        // keys held through a door don't walk you anywhere yet.
        const movement = useReadiness.getState().ready ? keys : STILL;

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
            const playerPosition = useSceneStore.getState().playerPosition;
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
            publishPlayerState(
                flightPosition.x,
                flightPosition.y,
                flightPosition.z,
                { x: 0, y: 0, z: 0 }
            );
            return;
        }

        // Carried (the fairy lift): no collisions, no gravity, exactly where
        // the carrier says. A movement key lets go once it allows it.
        if (carrier.active !== wasCarried.current) {
            wasCarried.current = carrier.active;
            colliderRef.current?.setSensor(carrier.active);
            playerRef.current.setGravityScale(
                carrier.active || flyMode || !roomEnvironmentReady ? 0 : 1,
                true
            );
            anchored.current = false;
        }
        if (carrier.active) {
            playerRef.current.setTranslation(carrier.position, true);
            playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            if (!useSceneStore.getState().cameraOverride) {
                camera.position.set(
                    carrier.position.x,
                    carrier.position.y + eyeHeight.current,
                    carrier.position.z
                );
            }
            const moving =
                movement.forward || movement.backward || movement.left || movement.right || movement.jumping;
            if (carrier.releasable && moving) carrier.releaseRequested = true;
            publishPlayerState(carrier.position.x, carrier.position.y, carrier.position.z, { x: 0, y: 0, z: 0 });
            return;
        }

        if (carrier.launch) {
            playerRef.current.setLinvel(carrier.launch, true);
            carrier.launch = null;
            lastJumpTime.current = Date.now(); // so the ramp/ground logic leaves it alone
        }

        // Always keep camera following the player
        const pos = playerRef.current.translation();
        if (!useSceneStore.getState().cameraOverride) {
            camera.position.set(pos.x, pos.y + eyeHeight.current, pos.z);
        }

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

        const currentTime = Date.now();
        const ground = probeGround();
        // Barely moving vertically, or (on ramps, where the body rises and
        // falls as it walks) standing just above something solid.
        const isGrounded =
            Math.abs(playerRef.current.linvel().y) < 0.1 || ground !== null;
        const slippery = ground !== null && ground.collider.friction() < 0.05;
        const wantsToMove =
            movement.forward || movement.backward || movement.left || movement.right;
        const justJumped = currentTime - lastJumpTime.current < 300;

        // Idle on a frictionless ramp: switch gravity off and hold still,
        // or the player would slowly slide back down the stairs.
        const anchor = slippery && !wantsToMove && !movement.jumping && !justJumped;
        if (anchor !== anchored.current) {
            anchored.current = anchor;
            playerRef.current.setGravityScale(
                anchor || flyMode || !roomEnvironmentReady ? 0 : 1,
                true
            );
        }
        if (anchor) playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);

        // Report ground contact state (only when it actually changes)
        if (lastGrounded.current !== isGrounded) {
            lastGrounded.current = isGrounded;
            setPlayerGrounded(isGrounded);
        }
        if (isGrounded && !wasGrounded.current && roomEnvironmentReady) {
            playSound("land");
        }
        wasGrounded.current = isGrounded;
        if (isGrounded) {
            const v = playerRef.current.linvel();
            stride.current += Math.hypot(v.x, v.z) * delta;
            if (stride.current > 1.9) {
                stride.current = 0;
                playSound(footstepSound, {
                    volume: movement.crouching ? 0.5 : 1,
                });
            }
        }

        // Reset jump ability when grounded
        if (
            isGrounded &&
            !canJump &&
            currentTime - lastJumpTime.current > JUMP_COOLDOWN
        ) {
            setCanJump(true);
        }

        // Cloud Boots: a fresh press of jump while airborne, once per hop.
        const jumpPressed = movement.jumping && !wasJumpHeld.current;
        wasJumpHeld.current = movement.jumping;
        if (ground !== null) airJumpUsed.current = false;
        if (
            jumpPressed &&
            ground === null &&
            !airJumpUsed.current &&
            currentTime - lastJumpTime.current > 150 &&
            useUnlockStore.getState().unlocked["shop-boots"]
        ) {
            const v = playerRef.current.linvel();
            playerRef.current.setLinvel({ x: v.x, y: JUMP_FORCE * 1.05, z: v.z }, true);
            airJumpUsed.current = true;
            lastJumpTime.current = currentTime;
            playSound("jump", { rate: 1.25 });
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
            playSound("jump");
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

            // Walking down a ramp, follow the surface instead of skipping
            // off it into a hop every few steps: the vertical speed that
            // keeps the velocity parallel to the slope, plus a little.
            if (slippery && ground && !justJumped) {
                // Triangle meshes are two-sided; make the normal point up.
                const s = ground.normal.y < 0 ? -1 : 1;
                const n = { x: ground.normal.x * s, y: ground.normal.y * s, z: ground.normal.z * s };
                const alongSurface =
                    -(velocity.current.x * n.x + velocity.current.z * n.z) /
                    Math.max(n.y, 0.3);
                if (alongSurface < 0) {
                    velocity.current.y = Math.min(velocity.current.y, alongSurface - 0.2);
                }
            }

            // Apply the velocity
            playerRef.current.setLinvel(velocity.current, true);
        }

        // Publish position/velocity for rupees, doors and the minimap
        const currentPosition = playerRef.current.translation();
        publishPlayerState(
            currentPosition.x,
            currentPosition.y,
            currentPosition.z,
            playerRef.current.linvel()
        );
    });

    return (
        <RigidBody
            ref={playerRef}
            mass={1}
            type="dynamic"
            gravityScale={flyMode || !roomEnvironmentReady ? 0 : 1}
            enabledRotations={[false, false, false]}
            lockRotations
            position={spawnPosition}
            friction={20}
            restitution={0}
            collisionGroups={interactionGroups(0, [0, 1])}
        >
            <CapsuleCollider
                ref={colliderRef}
                args={[0.5, 0.3]}
                position={[0, 1, 0]}
                friction={20}
            />
        </RigidBody>
    );
};
