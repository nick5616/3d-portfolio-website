import React, { useRef, useState } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { InteractionRaycaster } from "../core/InteractionRaycaster";
import { Text } from "@react-three/drei";

// Interaction prompt component - copied from Door.tsx
const InteractionPrompt: React.FC<{ action: string }> = ({ action }) => (
    <div
        style={{
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "Arial, sans-serif",
            whiteSpace: "nowrap",
        }}
    >
        Press{" "}
        <kbd
            style={{
                background: "#fff",
                color: "#000",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "12px",
                fontWeight: "bold",
            }}
        >
            E
        </kbd>{" "}
        {action}
    </div>
);

interface LightSwitchProps {
    position: [number, number, number];
    rotation: [number, number, number];
    onToggle: (isWhiteLight: boolean) => void;
    isWhiteLight: boolean;
}

export const LightSwitch: React.FC<LightSwitchProps> = ({
    position,
    rotation,
    onToggle,
    isWhiteLight,
}) => {
    const switchRef = useRef<THREE.Object3D>(null);
    const [isHovering, setIsHovering] = useState(false);

    const handleToggle = () => {
        onToggle(!isWhiteLight);
    };

    return (
        <group position={position} rotation={rotation}>
            {/* Switch base/wall plate - this is now the interactive target */}
            <mesh ref={switchRef as any} position={[0, 0, 0.01]}>
                <boxGeometry args={[0.3, 0.4, 0.02]} />
                <meshStandardMaterial
                    color="#f0f0f0"
                    roughness={0.3}
                    metalness={0.1}
                />
            </mesh>

            {/* Switch toggle button - visual only */}
            <mesh position={[0, isWhiteLight ? 0.05 : -0.05, 0.03]}>
                <boxGeometry args={[0.15, 0.08, 0.02]} />
                <meshStandardMaterial
                    color={isWhiteLight ? "#4CAF50" : "#FF9800"}
                    roughness={0.2}
                    metalness={0.3}
                />
            </mesh>

            {/* InteractionRaycaster - copied exactly from Door.tsx */}
            <InteractionRaycaster
                target={switchRef}
                config={{
                    maxDistance: 6,
                    includeChildren: true,
                    rayOrigin: "center",
                    triggerActions: [
                        { type: "click", cooldown: 1000 },
                        { type: "keypress", key: "e", cooldown: 1000 },
                        { type: "hover" },
                    ],
                }}
                callbacks={{
                    onRayEnter: () => {
                        console.log("Light switch hover enter");
                        setIsHovering(true);
                    },
                    onRayExit: () => {
                        console.log("Light switch hover exit");
                        setIsHovering(false);
                    },
                    onTrigger: (action) => {
                        if (
                            action.type === "click" ||
                            action.type === "keypress"
                        ) {
                            handleToggle();
                        }
                    },
                }}
                visual={{
                    cursorStyle: "pointer",
                    highlightColor: "#ffffff",
                    highlightIntensity: 0.2,
                    prompt: {
                        content: (
                            <InteractionPrompt action="Click for custom light/white light" />
                        ),
                        offset: [0, 0, 0],
                        visible: isHovering,
                        distanceScale: true,
                        style: {
                            userSelect: "none",
                        },
                    },
                }}
            />

            {/* Simple 3D text label */}
            <Text
                position={[-0.15, 0.3, 0.02]}
                fontSize={0.08}
                color="#080808"
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.001}
                outlineColor="#ffffff"
            >
                Lights
            </Text>

            {/* Collision body for interaction */}
            <RigidBody type="fixed" position={[0, 0, 0]}>
                <mesh>
                    <boxGeometry args={[0.4, 0.5, 0.1]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>
            </RigidBody>
        </group>
    );
};
