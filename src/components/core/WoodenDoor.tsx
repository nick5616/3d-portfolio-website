import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { PortalView } from "../../configs/portalLooks";
import { PortalSurface } from "./portal/PortalSurface";

// A plain old door: four raised panels, a painted frame, a brass knob and a
// little brass plate saying where it goes. It stands ajar, light leaking
// round it, and swings open while you look at it, showing the portal it's
// been hiding. Built facing local +Z (into the room), threshold at y = 0.

interface WoodenDoorProps {
    position: [number, number, number];
    rotationY: number;
    width: number;
    height: number;
    label: string;
    hovering: boolean;
    view: PortalView;
    // "farmhouse": stained, creaky (Courage's attic). "studio": painted
    // teal and spattered with paint (the art studio).
    variant?: "farmhouse" | "studio";
}

const LOOKS = {
    farmhouse: { wood: "#7a4a26", panel: "#5a3418", trim: "#e9e0cc", splats: [] as string[] },
    studio: { wood: "#2f7f86", panel: "#25666c", trim: "#f6f1e6", splats: ["#e63946", "#ffd23f", "#1d70d6", "#f6f1e6", "#e63946", "#ffd23f", "#7ac74f"] },
};
const AJAR = 0.16;
const OPEN = 1.1;

export const WoodenDoor: React.FC<WoodenDoorProps> = ({
    position,
    rotationY,
    width,
    height,
    label,
    hovering,
    view,
    variant = "farmhouse",
}) => {
    const look = LOOKS[variant];
    const hinge = useRef<THREE.Group>(null);
    const light = useRef<THREE.PointLight>(null);
    const open = useRef(AJAR);
    useFrame((_, delta) => {
        open.current += ((hovering ? OPEN : AJAR) - open.current) * Math.min(1, delta * 3.5);
        // swinging toward the room, on the left-hand hinge
        if (hinge.current) hinge.current.rotation.y = -open.current;
        if (light.current) light.current.intensity = 0.5 + 2.6 * (open.current / OPEN);
    });
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Clear of the wall behind */}
            <group position={[0, 0, 0.05]}>
                <PortalSurface view={view} width={width} height={height} shape="rect" hovering={hovering} />
                <pointLight ref={light} position={[0, height * 0.5, 0.5]} distance={4} decay={2} color={view.light} />

                <group ref={hinge} position={[-width / 2, 0, 0.045]}>
                    <group position={[width / 2, 0, 0]}>
                        {/* Leaf */}
                        <mesh position={[0, height / 2, 0]}>
                            <boxGeometry args={[width, height, 0.06]} />
                            <meshStandardMaterial color={look.wood} roughness={0.75} />
                        </mesh>
                        {/* Raised panels: two up top, two below */}
                        {[0.72, 0.28].map((v) =>
                            [-1, 1].map((side) => (
                                <mesh key={`${v}${side}`} position={[side * width * 0.22, height * v, 0.04]}>
                                    <boxGeometry args={[width * 0.34, height * (v > 0.5 ? 0.36 : 0.32), 0.02]} />
                                    <meshStandardMaterial color={look.panel} roughness={0.8} />
                                </mesh>
                            ))
                        )}
                        {/* Paint spatters, on the panels */}
                        {look.splats.map((color, i) => (
                            <mesh
                                key={i}
                                position={[
                                    (i % 2 ? 1 : -1) * width * 0.22 + (((i * 0.37) % 1) - 0.5) * width * 0.24,
                                    height * ((i >> 1) % 2 ? 0.28 : 0.72) + (((i * 0.61) % 1) - 0.5) * height * 0.22,
                                    0.051,
                                ]}
                            >
                                <circleGeometry args={[0.03 + ((i * 0.29) % 1) * 0.05, 12]} />
                                <meshStandardMaterial color={color} roughness={0.4} />
                            </mesh>
                        ))}
                        {/* Knob */}
                        <mesh position={[width * 0.38, height * 0.47, 0.07]}>
                            <sphereGeometry args={[0.045, 16, 12]} />
                            <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} />
                        </mesh>
                        {/* Brass plate */}
                        <mesh position={[0, height * 0.86, 0.055]}>
                            <boxGeometry args={[Math.min(width * 0.7, 0.9), 0.14, 0.01]} />
                            <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.35} />
                        </mesh>
                        <Text
                            position={[0, height * 0.86, 0.062]}
                            fontSize={0.075}
                            color="#3a2410"
                            anchorX="center"
                            anchorY="middle"
                            letterSpacing={0.1}
                        >
                            {label.toUpperCase()}
                        </Text>
                    </group>
                </group>

                {/* Painted frame */}
                {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * (width / 2 + 0.06), (height + 0.12) / 2, 0.03]}>
                        <boxGeometry args={[0.12, height + 0.12, 0.1]} />
                        <meshStandardMaterial color={look.trim} roughness={0.7} />
                    </mesh>
                ))}
                <mesh position={[0, height + 0.06, 0.03]}>
                    <boxGeometry args={[width + 0.24, 0.12, 0.1]} />
                    <meshStandardMaterial color={look.trim} roughness={0.7} />
                </mesh>
            </group>
        </group>
    );
};
