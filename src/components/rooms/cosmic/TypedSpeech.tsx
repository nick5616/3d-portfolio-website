import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Speech } from "./cosmicStore";

// Words typed out in the air, then left to fade: the Void's above its
// wheels, and whoever sits across the table above their head.

const DISPLAY_FONT = "/fonts/Fraunces.ttf";
const TYPE_RATE = 34; // characters per second

export const TypedSpeech: React.FC<{
    speech: Speech | null;
    position: [number, number, number];
    fontSize?: number;
    maxWidth?: number;
    color?: string;
}> = ({ speech, position, fontSize = 0.22, maxWidth = 4.2, color = "#f6e6c0" }) => {
    const [shown, setShown] = useState("");
    const typed = useRef(0);
    const age = useRef(0);
    const opacity = useRef(0);
    const textRef = useRef<THREE.Mesh & { fillOpacity: number; outlineOpacity: number }>(null);

    useEffect(() => {
        typed.current = 0;
        age.current = 0;
        setShown("");
    }, [speech?.key]);

    useFrame((_, delta) => {
        if (!speech) return;
        const full = speech.text;
        if (typed.current < full.length) {
            const before = Math.floor(typed.current);
            typed.current = Math.min(full.length, typed.current + delta * TYPE_RATE);
            const after = Math.floor(typed.current);
            if (after !== before) setShown(full.slice(0, after));
        } else {
            age.current += delta;
        }
        const target = age.current > 4 + full.length * 0.03 ? 0 : 1;
        opacity.current += (target - opacity.current) * Math.min(1, delta * 3);
        if (textRef.current) {
            textRef.current.fillOpacity = opacity.current;
            textRef.current.outlineOpacity = opacity.current;
        }
    });

    return (
        <Text
            ref={textRef}
            font={DISPLAY_FONT}
            position={position}
            fontSize={fontSize}
            maxWidth={maxWidth}
            lineHeight={1.25}
            textAlign="center"
            color={color}
            outlineWidth={fontSize * 0.055}
            outlineColor="#120822"
            anchorX="center"
            anchorY="bottom"
        >
            {shown}
        </Text>
    );
};
