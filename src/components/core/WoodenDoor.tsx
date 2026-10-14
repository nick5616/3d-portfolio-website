import React from "react";
import { Text } from "@react-three/drei";

// A plain old farmhouse door: four raised panels, a painted frame, a brass
// knob and a little brass plate saying where it goes. Built facing local
// +Z (into the room), threshold at y = 0.

interface WoodenDoorProps {
    position: [number, number, number];
    rotationY: number;
    width: number;
    height: number;
    label: string;
    hovering: boolean;
}

const WOOD = "#7a4a26";
const WOOD_DARK = "#5a3418";
const TRIM = "#e9e0cc";

export const WoodenDoor: React.FC<WoodenDoorProps> = ({ position, rotationY, width, height, label, hovering }) => {
    const glow = hovering ? 0.25 : 0;
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Leaf */}
            <mesh position={[0, height / 2, 0.02]}>
                <boxGeometry args={[width, height, 0.06]} />
                <meshStandardMaterial color={WOOD} roughness={0.75} emissive="#ffb070" emissiveIntensity={glow} />
            </mesh>
            {/* Raised panels: two up top, two below */}
            {[0.72, 0.28].map((v) =>
                [-1, 1].map((side) => (
                    <mesh key={`${v}${side}`} position={[side * width * 0.22, height * v, 0.06]}>
                        <boxGeometry args={[width * 0.34, height * (v > 0.5 ? 0.36 : 0.32), 0.02]} />
                        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
                    </mesh>
                ))
            )}
            {/* Knob */}
            <mesh position={[width * 0.38, height * 0.47, 0.09]}>
                <sphereGeometry args={[0.045, 16, 12]} />
                <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} />
            </mesh>
            {/* Painted frame */}
            {[-1, 1].map((side) => (
                <mesh key={side} position={[side * (width / 2 + 0.06), (height + 0.12) / 2, 0.03]}>
                    <boxGeometry args={[0.12, height + 0.12, 0.08]} />
                    <meshStandardMaterial color={TRIM} roughness={0.7} />
                </mesh>
            ))}
            <mesh position={[0, height + 0.06, 0.03]}>
                <boxGeometry args={[width + 0.24, 0.12, 0.08]} />
                <meshStandardMaterial color={TRIM} roughness={0.7} />
            </mesh>
            {/* Brass plate */}
            <mesh position={[0, height * 0.86, 0.075]}>
                <boxGeometry args={[Math.min(width * 0.7, 0.9), 0.14, 0.01]} />
                <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.35} />
            </mesh>
            <Text position={[0, height * 0.86, 0.082]} fontSize={0.075} color="#3a2410" anchorX="center" anchorY="middle" letterSpacing={0.1}>
                {label.toUpperCase()}
            </Text>
        </group>
    );
};
