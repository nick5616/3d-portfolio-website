import * as THREE from "three";

// Something in the world that carries the player (the atrium's fairy lift).
// While `active`, PlayerBody stops simulating the player: it switches the
// capsule's collisions off, holds gravity, and puts the body exactly at
// `position` every frame. When `releasable`, any movement key lets go: the
// body asks for release and walks away under its own control.
//
// A plain mutable object rather than a store: it's written and read every
// frame, and nothing needs to re-render when it changes.
export const carrier = {
    active: false,
    position: new THREE.Vector3(), // body origin (0.2 below the capsule's feet)
    releasable: false,
    releaseRequested: false,
    // A one-off fling (bounce pads): PlayerBody sets this velocity on its
    // next frame and clears it.
    launch: null as { x: number; y: number; z: number } | null,
};
