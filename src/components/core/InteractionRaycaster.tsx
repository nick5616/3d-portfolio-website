import { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
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

export interface PromptConfig {
    content: React.ReactNode | string;
    offset?: [number, number, number]; // Offset from target position [x, y, z]
    style?: React.CSSProperties; // For React node prompts
    visible?: boolean; // Control prompt visibility
    distanceScale?: boolean; // Whether to scale with distance
    fontSize?: number; // For string prompts using Three.js Text
    fadeTime?: number; // Time in ms for fade transition
}

export interface VisualConfig {
    cursorStyle?: string;
    highlightColor?: string;
    highlightIntensity?: number;
    customIndicator?: React.ReactNode;
    prompt?: PromptConfig;
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
    const [promptVisible, setPromptVisible] = useState(false);
    const [promptOpacity, setPromptOpacity] = useState(0);
    const lastTriggerTime = useRef<Record<string, number>>({});
    const mousePos = useRef(new THREE.Vector2());
    const [promptPosition, setPromptPosition] = useState<THREE.Vector3 | null>(
        null
    );
    const fadeTimeout = useRef<NodeJS.Timeout>();

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

    // Handle prompt visibility with fade
    useEffect(() => {
        const fadeTime = visual?.prompt?.fadeTime ?? 200; // Default 200ms fade

        if (fadeTimeout.current) {
            clearTimeout(fadeTimeout.current);
        }

        if (isHovering && visual?.prompt?.visible) {
            setPromptVisible(true);
            // Use requestAnimationFrame for smooth fade in
            requestAnimationFrame(() => setPromptOpacity(1));
        } else {
            // Fade out
            setPromptOpacity(0);
            // Remove from DOM after fade
            fadeTimeout.current = setTimeout(() => {
                setPromptVisible(false);
            }, fadeTime);
        }

        return () => {
            if (fadeTimeout.current) {
                clearTimeout(fadeTimeout.current);
            }
        };
    }, [isHovering, visual?.prompt?.visible]);

    // Calculate prompt position
    const updatePromptPosition = (targetObject: THREE.Object3D) => {
        if (!visual?.prompt?.visible || !isHovering) {
            return;
        }

        const offset = visual.prompt.offset || [0, 1, 0];
        const worldPos = new THREE.Vector3();
        targetObject.getWorldPosition(worldPos);

        worldPos.add(new THREE.Vector3(...offset));
        setPromptPosition(worldPos);
    };

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

        // Update prompt position
        if (isHit) {
            updatePromptPosition(targetObject);
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

    // Render prompt if configured
    const renderPrompt = () => {
        if (!visual?.prompt?.content || !promptPosition || !promptVisible)
            return null;

        const fadeTime = visual.prompt.fadeTime ?? 200;
        const baseStyle: React.CSSProperties = {
            transition: `opacity ${fadeTime}ms ease-in-out`,
            opacity: promptOpacity,
            pointerEvents: "none",
        };

        const isReactNode = typeof visual.prompt.content !== "string";

        if (isReactNode) {
            return (
                <Html
                    position={promptPosition}
                    style={{
                        transform: "translate(-50%, -100%)",
                        ...baseStyle,
                        ...visual.prompt.style,
                    }}
                    distanceFactor={visual.prompt.distanceScale ? 8 : undefined}
                >
                    {visual.prompt.content}
                </Html>
            );
        }

        return (
            <Text
                position={promptPosition}
                fontSize={visual.prompt.fontSize || 0.2}
                anchorX="center"
                anchorY="bottom"
                color="white"
                outlineWidth={0.02}
                outlineColor="black"
                material-opacity={promptOpacity}
                material-transparent={true}
            >
                {visual.prompt.content as string}
            </Text>
        );
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (fadeTimeout.current) {
                clearTimeout(fadeTimeout.current);
            }
            setPromptVisible(false);
            setPromptOpacity(0);
            setPromptPosition(null);
        };
    }, []);

    return renderPrompt();
};
