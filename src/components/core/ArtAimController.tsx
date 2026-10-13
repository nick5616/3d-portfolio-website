import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { artTargets, useArtInspectStore } from "../../stores/artInspectStore";
import { useSceneStore } from "../../stores/sceneStore";
import { detectIsMobile } from "../../utils/deviceDetection";
import { isWorldUnfocused } from "../../utils/worldFocus";

const REACH = 5; // meters - close enough to want a better look
const CENTER = new THREE.Vector2(0, 0);

// One crosshair raycast per frame against every registered art frame,
// instead of a raycaster component per frame. Opens the inspect view on E
// (or a tap/click on mobile) while a piece is aimed at.
export const ArtAimController: React.FC = () => {
    const camera = useThree((state) => state.camera);
    const raycaster = useRef(new THREE.Raycaster());
    const objects = useRef<THREE.Object3D[]>([]);
    const frame = useRef(0);

    useFrame(() => {
        // Every other frame is plenty for a hover state.
        if (frame.current++ % 2 !== 0) return;
        const { setAimed, inspecting } = useArtInspectStore.getState();
        if (inspecting || artTargets.size === 0 || isWorldUnfocused()) {
            setAimed(null);
            return;
        }

        objects.current.length = 0;
        const owners = new Map<THREE.Object3D, string>();
        artTargets.forEach((target, id) => {
            const object = target.object.current;
            if (object) {
                objects.current.push(object);
                owners.set(object, id);
            }
        });

        raycaster.current.setFromCamera(CENTER, camera);
        raycaster.current.far = REACH;
        const hit = raycaster.current.intersectObjects(objects.current, false)[0];
        const id = hit ? owners.get(hit.object) : undefined;
        const target = id ? artTargets.get(id) : undefined;
        setAimed(
            id && target
                ? { id, category: target.category, index: target.index }
                : null
        );
    });

    useEffect(() => {
        const open = () => {
            const { aimed, inspecting, openInspect } =
                useArtInspectStore.getState();
            if (!aimed || inspecting) return false;
            if (useSceneStore.getState().isInteracting) return false;
            openInspect(aimed.category, aimed.index);
            return true;
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code === "KeyE" && !event.repeat && open()) {
                event.stopPropagation();
            }
        };
        // Mobile has no E key: a tap while aiming at a piece opens it.
        // (VirtualControls turns taps inside the joysticks into
        // "virtualtap", since those suppress the browser's click.) Desktop
        // clicks are left alone - they're for pointer lock and doors.
        const isMobile = detectIsMobile();
        const onTap = () => {
            if (isMobile) open();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("virtualtap", onTap);
        window.addEventListener("click", onTap);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("virtualtap", onTap);
            window.removeEventListener("click", onTap);
        };
    }, []);

    return null;
};
