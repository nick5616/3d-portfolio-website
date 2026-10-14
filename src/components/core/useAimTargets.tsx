import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore } from "../../stores/sceneStore";

// "Look at a thing, press E": one crosshair raycast per frame across every
// registered object in a room, a single in-world prompt at whatever you're
// aiming at, and E / click / tap to use it. Rooms with lots of small
// interactables use this instead of an InteractionRaycaster per object.
//
//   const aim = useAimTargets();
//   <mesh ref={aim.bind("play", { reach: 4, prompt: () => <GemPrompt .../>, use: play })} />
//   ...
//   <aim.Prompt />

export interface AimDef {
    reach: number;
    prompt: () => React.ReactNode | null;
    use?: () => void;
}

const CENTER = new THREE.Vector2(0, 0);

export const useAimTargets = () => {
    const { camera, raycaster } = useThree();
    const objects = useRef(new Map<THREE.Object3D, string>());
    const defs = useRef(new Map<string, AimDef>());
    const [hovered, setHovered] = useState<string | null>(null);
    const hoveredRef = useRef<string | null>(null);
    const anchor = useRef<THREE.Group>(null);

    const bind = (id: string, def: AimDef) => {
        defs.current.set(id, def);
        return (object: THREE.Object3D | null) => {
            if (object) objects.current.set(object, id);
        };
    };

    useFrame(() => {
        let found: string | null = null;
        const point = new THREE.Vector3();
        if (!useSceneStore.getState().showStartPrompt) {
            raycaster.setFromCamera(CENTER, camera);
            // Unmounted objects have no parent; leave them out.
            const live = [...objects.current.keys()].filter((o) => o.parent);
            for (const hit of raycaster.intersectObjects(live, true)) {
                let o: THREE.Object3D | null = hit.object;
                while (o && !objects.current.has(o)) o = o.parent;
                if (!o) continue;
                const id = objects.current.get(o)!;
                const def = defs.current.get(id);
                if (!def) continue;
                if (hit.distance <= def.reach) {
                    found = id;
                    point.copy(hit.point);
                }
                break; // the nearest thing blocks anything behind it
            }
        }
        if (found !== hoveredRef.current) {
            hoveredRef.current = found;
            setHovered(found);
        }
        if (found && anchor.current) anchor.current.position.copy(point).y += 0.25;
    });

    useEffect(() => {
        const use = () => {
            const id = hoveredRef.current;
            if (id) defs.current.get(id)?.use?.();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat) use();
        };
        const onClick = () => {
            if (document.pointerLockElement || "ontouchstart" in window) use();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("click", onClick);
        window.addEventListener("virtualtap", onClick);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("click", onClick);
            window.removeEventListener("virtualtap", onClick);
        };
    }, []);

    const Prompt = useMemo(
        () =>
            function AimPrompt() {
                const id = hoveredRef.current;
                const content = id ? defs.current.get(id)?.prompt() : null;
                return (
                    <group ref={anchor}>
                        {content && (
                            <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                                {content}
                            </Html>
                        )}
                    </group>
                );
            },
        []
    );

    return { bind, hovered, Prompt };
};
