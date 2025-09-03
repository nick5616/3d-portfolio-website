import { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface TriggerAction {
    type: "click" | "keypress" | "hover";
    key?: string; // For keypress actions
    cooldown?: number; // Cooldown in milliseconds
}

export interface RaycastConfig {
    maxDistance?: number;
    includeChildren?: boolean;
    rayOrigin?: "center" | "mouse" | THREE.Vector3;
    rayLayers?: number[];
    triggerActions: TriggerAction[];
}

export interface RaycastCallbacks {
    onRayEnter?: (intersection: THREE.Intersection) => void;
    onRayExit?: () => void;
    onRayStay?: (intersection: THREE.Intersection) => void;
    onTrigger?: (
        action: TriggerAction,
        intersection: THREE.Intersection
    ) => void;
}

export interface VisualConfig {
    cursorStyle?: string;
    highlightColor?: string;
    highlightIntensity?: number;
    customIndicator?: React.ReactNode;
}

interface InteractionRaycasterProps {
    target: THREE.Object3D | React.RefObject<THREE.Object3D>;
    config: RaycastConfig;
    callbacks?: RaycastCallbacks;
    visual?: VisualConfig;
    enabled?: boolean;
}

export const InteractionRaycaster: React.FC<InteractionRaycasterProps> = ({
    target,
    config,
    callbacks,
    visual,
    enabled = true,
}) => {
    const { camera, raycaster } = useThree();
    const [isHovering, setIsHovering] = useState(false);
    const lastTriggerTime = useRef<Record<string, number>>({});
    const mousePos = useRef(new THREE.Vector2());

    // Handle mouse movement if using mouse-based raycasting
    useEffect(() => {
        if (config.rayOrigin === "mouse") {
            const handleMouseMove = (event: MouseEvent) => {
                mousePos.current.x =
                    (event.clientX / window.innerWidth) * 2 - 1;
                mousePos.current.y =
                    -(event.clientY / window.innerHeight) * 2 + 1;
            };

            window.addEventListener("mousemove", handleMouseMove);
            return () =>
                window.removeEventListener("mousemove", handleMouseMove);
        }
    }, [config.rayOrigin]);

    // Handle key press triggers
    useEffect(() => {
        const keyTriggers = config.triggerActions.filter(
            (action) => action.type === "keypress"
        );
        if (keyTriggers.length === 0) return;

        const handleKeyPress = (event: KeyboardEvent) => {
            if (!isHovering || !enabled) return;

            const trigger = keyTriggers.find((t) => t.key === event.key);
            if (!trigger) return;

            const now = Date.now();
            const lastTime =
                lastTriggerTime.current[`keypress-${trigger.key}`] || 0;
            if (now - lastTime < (trigger.cooldown || 0)) return;

            lastTriggerTime.current[`keypress-${trigger.key}`] = now;
            callbacks?.onTrigger?.(
                trigger,
                raycaster.intersectObject(
                    target instanceof THREE.Object3D ? target : target.current!,
                    config.includeChildren ?? true
                )[0]
            );
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [config.triggerActions, isHovering, enabled, target, callbacks]);

    // Handle click triggers
    useEffect(() => {
        if (!config.triggerActions.some((action) => action.type === "click"))
            return;

        const handleClick = () => {
            if (!isHovering || !enabled) return;

            const clickTrigger = config.triggerActions.find(
                (t) => t.type === "click"
            );
            if (!clickTrigger) return;

            const now = Date.now();
            const lastTime = lastTriggerTime.current["click"] || 0;
            if (now - lastTime < (clickTrigger.cooldown || 0)) return;

            lastTriggerTime.current["click"] = now;
            callbacks?.onTrigger?.(
                clickTrigger,
                raycaster.intersectObject(
                    target instanceof THREE.Object3D ? target : target.current!,
                    config.includeChildren ?? true
                )[0]
            );
        };

        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, [config.triggerActions, isHovering, enabled, target, callbacks]);

    // Update visual feedback
    useEffect(() => {
        if (!visual?.cursorStyle) return;
        document.body.style.cursor = isHovering
            ? visual.cursorStyle
            : "default";
        return () => {
            document.body.style.cursor = "default";
        };
    }, [isHovering, visual?.cursorStyle]);

    // Main raycasting logic
    useFrame(() => {
        if (!enabled) return;

        const targetObject =
            target instanceof THREE.Object3D ? target : target.current;
        if (!targetObject) return;

        // Set ray origin based on config
        switch (config.rayOrigin) {
            case "mouse":
                raycaster.setFromCamera(mousePos.current, camera);
                break;
            case "center":
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                break;
            default:
                if (config.rayOrigin instanceof THREE.Vector3) {
                    const direction = new THREE.Vector3();
                    direction
                        .subVectors(targetObject.position, config.rayOrigin)
                        .normalize();
                    raycaster.set(config.rayOrigin, direction);
                }
        }

        // Perform raycasting
        const intersects = raycaster.intersectObject(
            targetObject,
            config.includeChildren ?? true
        );

        const isHit =
            intersects.length > 0 &&
            (!config.maxDistance ||
                intersects[0].distance <= config.maxDistance);

        // Handle hover state changes
        if (isHit !== isHovering) {
            setIsHovering(isHit);
            if (isHit) {
                callbacks?.onRayEnter?.(intersects[0]);
            } else {
                callbacks?.onRayExit?.();
            }
        }

        // Handle continuous hover
        if (isHit) {
            callbacks?.onRayStay?.(intersects[0]);

            // Handle hover triggers
            const hoverTrigger = config.triggerActions.find(
                (t) => t.type === "hover"
            );
            if (hoverTrigger) {
                const now = Date.now();
                const lastTime = lastTriggerTime.current["hover"] || 0;
                if (now - lastTime >= (hoverTrigger.cooldown || 0)) {
                    lastTriggerTime.current["hover"] = now;
                    callbacks?.onTrigger?.(hoverTrigger, intersects[0]);
                }
            }
        }
    });

    return null;
};
