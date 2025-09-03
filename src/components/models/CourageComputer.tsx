import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { useSceneStore } from "../../stores/sceneStore";

interface CourageComputerProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
}

export const CourageComputer: React.FC<CourageComputerProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
}) => {
    // References for animations
    const crtScreenRef = useRef<THREE.Mesh>(null);
    const scanLineRef = useRef<THREE.Mesh>(null);
    const powerLEDRef = useRef<THREE.Mesh>(null);

    const { console: consoleState } = useSceneStore();

    // AI personality state
    const [currentText, setCurrentText] = useState("COMPUTER");
    const [isTyping, setIsTyping] = useState(false);
    const [cursor, setCursor] = useState("_");

    // Snarky AI messages
    const snarkyMessages = [
        "WHAT DO YOU WANT?",
        "I'M VERY BUSY HERE...",
        "COURAGE IS THAT YOU?",
        "STUPID DOG!",
        "ANALYZING... RESULTS: MEH",
        "ERROR 404: CARE NOT FOUND",
        "I KNOW THINGS YOU DON'T",
        "BEEP BOOP... JUST KIDDING",
        "LEAVE ME ALONE",
        "PROCESSING SARCASM...",
    ];

    // CRT screen material with phosphor glow
    const crtScreenMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#001a1a",
            emissive: "#003333",
            emissiveIntensity: 0.3,
            roughness: 0.9,
        });
    }, []);

    // Text material with CRT glow
    const textMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#00ff88",
            emissive: "#00ff88",
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
        });
    }, []);

    // Low-poly curved glass - visible effect, good performance
    const curvedGlassGeometry = useMemo(() => {
        // Create a simple curved plane using PlaneGeometry with subdivision
        const geometry = new THREE.PlaneGeometry(1.7, 1.1, 8, 6); // Low subdivision for performance

        // Apply subtle curve by modifying vertex positions
        const positionAttribute = geometry.getAttribute("position");
        const positions = positionAttribute.array as Float32Array;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];

            // Calculate distance from center for curve effect
            const distanceFromCenter = Math.sqrt(x * x + y * y);
            const maxDistance = Math.sqrt(0.9 * 0.9 + 0.6 * 0.6); // Half width/height
            const normalizedDistance = distanceFromCenter / maxDistance;

            // Apply inward curve (concave like real CRT glass)
            const curve = normalizedDistance * normalizedDistance * -0.08; // Negative for inward curve
            positions[i + 2] = curve; // Move Z position backward (inward)
        }

        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();

        return geometry;
    }, []);

    const curvedGlassMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            transparent: true,
            opacity: 0.15,
            color: new THREE.Color(0.88, 1.0, 0.92),
            roughness: 0.02,
            metalness: 0.0,
            depthWrite: false,
        });
    }, []);

    // AI behavior - change messages periodically
    useEffect(() => {
        if (consoleState.isActive) return; // pause AI when console is active
        const messageInterval = setInterval(() => {
            if (!isTyping) {
                setIsTyping(true);
                setCurrentText("");

                setTimeout(() => {
                    const randomMessage =
                        snarkyMessages[
                            Math.floor(Math.random() * snarkyMessages.length)
                        ];
                    let i = 0;
                    const typeInterval = setInterval(() => {
                        setCurrentText(randomMessage.slice(0, i + 1));
                        i++;
                        if (i >= randomMessage.length) {
                            clearInterval(typeInterval);
                            setIsTyping(false);
                        }
                    }, 100);
                }, 500);
            }
        }, 8000);

        return () => clearInterval(messageInterval);
    }, [isTyping, consoleState.isActive]);

    // Cursor blinking
    useEffect(() => {
        const cursorInterval = setInterval(() => {
            setCursor((prev) => (prev === "_" ? " " : "_"));
        }, 500);

        return () => clearInterval(cursorInterval);
    }, []);

    // Animations
    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;

        // CRT screen flicker
        if (crtScreenRef.current) {
            const material = crtScreenRef.current
                .material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = 0.3 + Math.sin(elapsed * 60) * 0.02;
        }

        // Scanline movement
        if (scanLineRef.current) {
            scanLineRef.current.position.y =
                Math.sin(elapsed * 2) * 0.55 + 0.05;
            const material = scanLineRef.current
                .material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = 0.6 + Math.sin(elapsed * 12) * 0.3;
        }

        // Power LED pulsing
        if (powerLEDRef.current) {
            const material = powerLEDRef.current
                .material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = 0.8 + Math.sin(elapsed * 3) * 0.4;
        }

        // No glass animation needed anymore
    });

    // Build console screen text
    const consoleLines = consoleState.history.slice(-8); // last N lines
    const promptLine = `> ${consoleState.input}${cursor}`;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Main CRT Monitor Body */}
            <RigidBody type="fixed" colliders="cuboid">
                {/* Monitor Housing - Deep CRT style */}
                <mesh position={[0, 0, -0.5]}>
                    <boxGeometry args={[2.4, 1.8, 1.0]} />
                    <meshStandardMaterial
                        color="#e8e8e8"
                        roughness={0.4}
                        metalness={0.1}
                    />
                </mesh>

                {/* Front Bezel */}
                <mesh position={[0, 0, 0.05]}>
                    <boxGeometry args={[2.2, 1.6, 0.1]} />
                    <meshStandardMaterial
                        color="#f0f0f0"
                        roughness={0.3}
                        metalness={0.05}
                    />
                </mesh>

                {/* CRT Screen Surface */}
                <mesh ref={crtScreenRef} position={[0, 0.05, 0.1]}>
                    <planeGeometry args={[1.8, 1.2]} />
                    <primitive object={crtScreenMaterial} />
                </mesh>

                {/* Screen Content Area */}
                <mesh position={[0, 0.05, 0.101]}>
                    <planeGeometry args={[1.7, 1.1]} />
                    <meshStandardMaterial
                        color="#001a1a"
                        emissive="#002222"
                        emissiveIntensity={0.2}
                    />
                </mesh>

                {/* Raised Screen Bezel - covers z-fighting edges */}
                {/* Top bezel */}
                <mesh position={[0, 0.65, 0.11]}>
                    <boxGeometry args={[1.9, 0.1, 0.02]} />
                    <meshStandardMaterial
                        color="#2a2a2a"
                        roughness={0.3}
                        metalness={0.1}
                    />
                </mesh>
                {/* Bottom bezel */}
                <mesh position={[0, -0.55, 0.11]}>
                    <boxGeometry args={[1.9, 0.1, 0.02]} />
                    <meshStandardMaterial
                        color="#2a2a2a"
                        roughness={0.3}
                        metalness={0.1}
                    />
                </mesh>
                {/* Left bezel */}
                <mesh position={[-0.9, 0.05, 0.11]}>
                    <boxGeometry args={[0.1, 1.3, 0.02]} />
                    <meshStandardMaterial
                        color="#2a2a2a"
                        roughness={0.3}
                        metalness={0.1}
                    />
                </mesh>
                {/* Right bezel */}
                <mesh position={[0.9, 0.05, 0.11]}>
                    <boxGeometry args={[0.1, 1.2, 0.02]} />
                    <meshStandardMaterial
                        color="#2a2a2a"
                        roughness={0.3}
                        metalness={0.1}
                    />
                </mesh>

                {/* Scanlines */}
                <mesh ref={scanLineRef} position={[0, 0, 0.102]}>
                    <planeGeometry args={[1.7, 0.02]} />
                    <meshStandardMaterial
                        color="#00ff88"
                        transparent
                        opacity={0.3}
                        emissive="#00ff88"
                        emissiveIntensity={0.6}
                    />
                </mesh>

                {/* Brand Label */}
                <mesh position={[-0.8, -0.6, 0.06]}>
                    <planeGeometry args={[0.3, 0.08]} />
                    <meshStandardMaterial color="#333333" />
                </mesh>

                {/* Power LED */}
                <mesh ref={powerLEDRef} position={[0.9, -0.6, 0.06]}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshStandardMaterial
                        color="#00ff00"
                        emissive="#00ff00"
                        emissiveIntensity={1.0}
                    />
                </mesh>

                {/* Power Button */}
                <mesh position={[0.7, -0.6, 0.06]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
                    <meshStandardMaterial
                        color="#666666"
                        metalness={0.3}
                        roughness={0.7}
                    />
                </mesh>
            </RigidBody>

            {/* Low-poly curved CRT glass panel */}
            <mesh position={[0, 0.04, 0.19]}>
                <primitive object={curvedGlassGeometry} />
                <primitive object={curvedGlassMaterial} />
            </mesh>

            {/* AI/Console Text Display */}
            {!consoleState.isActive && (
                <Text
                    position={[0, 0.05, 0.103]}
                    fontSize={0.08}
                    color="#00ff88"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={1.5}
                    textAlign="center"
                >
                    {currentText + (isTyping ? "" : cursor)}
                </Text>
            )}

            {/* Console screen - lines stacked, prompt at bottom */}
            {consoleState.isActive && (
                <group position={[0, 0.05, 0.103]}>
                    {consoleLines.map((line, idx) => (
                        <Text
                            key={idx}
                            position={[0, -0.3 + idx * 0.08, 0]}
                            fontSize={0.07}
                            color="#00ff88"
                            anchorX="left"
                            anchorY="middle"
                            maxWidth={1.5}
                        >
                            {line}
                        </Text>
                    ))}
                    <Text
                        position={[-0.82, 0.4, 0]}
                        fontSize={0.07}
                        color="#00ff88"
                        anchorX="left"
                        anchorY="middle"
                        maxWidth={1.5}
                    >
                        {promptLine}
                    </Text>
                </group>
            )}

            {/* Computer Base/Stand */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, -1.2, -0.3]}>
                    <boxGeometry args={[1.5, 0.3, 0.8]} />
                    <meshStandardMaterial
                        color="#cccccc"
                        roughness={0.4}
                        metalness={0.2}
                    />
                </mesh>

                {/* Stand neck */}
                <mesh position={[0, -0.9, -0.2]}>
                    <cylinderGeometry args={[0.08, 0.12, 0.6, 8]} />
                    <meshStandardMaterial
                        color="#888888"
                        metalness={0.6}
                        roughness={0.3}
                    />
                </mesh>
            </RigidBody>

            {/* CRT Glow Effect */}
            <pointLight
                position={[0, 0, 0.5]}
                intensity={0.8}
                distance={2.5}
                color="#00ff88"
                decay={2}
            />

            {/* Static/interference effect - reduced for performance */}
            {Array.from({ length: 5 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[
                        ((i % 3) - 1) * 0.5,
                        (Math.floor(i / 3) - 0.5) * 0.3 + 0.05,
                        0.104,
                    ]}
                >
                    <planeGeometry args={[0.01, 0.01]} />
                    <meshStandardMaterial
                        color="#00ff88"
                        transparent
                        opacity={0.2}
                        emissive="#00ff88"
                        emissiveIntensity={0.3}
                    />
                </mesh>
            ))}
        </group>
    );
};
