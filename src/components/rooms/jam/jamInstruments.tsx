import React from "react";
import * as THREE from "three";
import { InstrumentId } from "./jamAudio";

// The jam room's instruments: chunky toy versions, each recognisable from
// across the room. Every model is centred on the origin and fits inside
// its `half` extents (used for its physics box).

export interface InstrumentInfo {
    id: InstrumentId;
    name: string;
    color: string;
    half: [number, number, number];
}

export const INSTRUMENTS: InstrumentInfo[] = [
    { id: "drum", name: "Big Drum", color: "#ff4d5e", half: [0.2, 0.17, 0.2] },
    { id: "snare", name: "Snare", color: "#4da6ff", half: [0.18, 0.1, 0.18] },
    { id: "hat", name: "Cymbals", color: "#ffd23c", half: [0.2, 0.14, 0.2] },
    { id: "clap", name: "Clappy Hands", color: "#ffa64d", half: [0.2, 0.14, 0.1] },
    { id: "bass", name: "Bass", color: "#b06bff", half: [0.12, 0.28, 0.06] },
    { id: "piano", name: "Piano", color: "#f4f1ea", half: [0.26, 0.06, 0.12] },
    { id: "bells", name: "Bells", color: "#3ee58f", half: [0.24, 0.07, 0.13] },
    { id: "synth", name: "Synth", color: "#3ee5c8", half: [0.22, 0.07, 0.14] },
];
export const instrumentInfo = (id: InstrumentId) => INSTRUMENTS.find((i) => i.id === id)!;

const Mat: React.FC<{ color: string; metal?: boolean; glow?: number }> = ({ color, metal, glow = 0 }) => (
    <meshStandardMaterial
        color={color}
        roughness={metal ? 0.25 : 0.45}
        metalness={metal ? 0.9 : 0}
        emissive={color}
        emissiveIntensity={glow}
    />
);

const Drum: React.FC<{ color: string; radius: number; depth: number }> = ({ color, radius, depth }) => (
    <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
            <cylinderGeometry args={[radius, radius, depth, 28]} />
            <Mat color={color} />
        </mesh>
        {[-1, 1].map((side) => (
            <group key={side} position={[0, (side * depth) / 2, 0]}>
                <mesh>
                    <cylinderGeometry args={[radius * 0.96, radius * 0.96, 0.006, 28]} />
                    <Mat color="#fbf6ea" />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[radius, 0.014, 8, 32]} />
                    <Mat color="#e8c25a" metal />
                </mesh>
            </group>
        ))}
    </group>
);

export const InstrumentModel: React.FC<{ id: InstrumentId; glow?: number }> = ({ id, glow = 0 }) => {
    const info = instrumentInfo(id);
    switch (id) {
        case "drum":
            return (
                <group>
                    <Drum color={info.color} radius={0.19} depth={0.3} />
                    <mesh position={[0.12, 0.2, 0.05]} rotation={[0, 0, -0.9]}>
                        <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
                        <Mat color="#8a5a32" />
                    </mesh>
                    <mesh position={[0.24, 0.29, 0.05]}>
                        <sphereGeometry args={[0.04, 12, 8]} />
                        <Mat color="#fff" glow={glow} />
                    </mesh>
                </group>
            );
        case "snare":
            return (
                <group>
                    <group rotation={[-Math.PI / 2, 0, 0]}>
                        <Drum color={info.color} radius={0.17} depth={0.13} />
                    </group>
                    {[-0.35, 0.35].map((angle) => (
                        <mesh key={angle} position={[0, 0.085, 0]} rotation={[0, angle, Math.PI / 2]}>
                            <cylinderGeometry args={[0.009, 0.012, 0.36, 8]} />
                            <Mat color="#e9cf9a" />
                        </mesh>
                    ))}
                </group>
            );
        case "hat":
            return (
                <group>
                    <mesh position={[0, -0.04, 0]}>
                        <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
                        <Mat color="#c9c9d6" metal />
                    </mesh>
                    {[0.04, 0.08].map((y, i) => (
                        <mesh key={y} position={[0, y, 0]} rotation={[i ? Math.PI : 0, 0, 0]}>
                            <coneGeometry args={[0.2, 0.035, 32, 1, true]} />
                            <meshStandardMaterial
                                color={info.color}
                                metalness={1}
                                roughness={0.2}
                                side={THREE.DoubleSide}
                                emissive={info.color}
                                emissiveIntensity={glow}
                            />
                        </mesh>
                    ))}
                    <mesh position={[0, -0.13, 0]}>
                        <cylinderGeometry args={[0.1, 0.12, 0.02, 16]} />
                        <Mat color="#3a3a48" />
                    </mesh>
                </group>
            );
        case "clap":
            return (
                <group>
                    {[-1, 1].map((side) => (
                        <group key={side} position={[side * 0.07, 0, 0]} rotation={[0, 0, side * -0.25]}>
                            <mesh scale={[0.35, 1, 0.8]}>
                                <sphereGeometry args={[0.11, 16, 12]} />
                                <Mat color={info.color} glow={glow} />
                            </mesh>
                            {[-0.045, -0.015, 0.015, 0.045].map((z, k) => (
                                <mesh key={z} position={[0, 0.12 + (k === 1 || k === 2 ? 0.02 : 0), z]}>
                                    <capsuleGeometry args={[0.016, 0.06, 4, 8]} />
                                    <Mat color={info.color} />
                                </mesh>
                            ))}
                        </group>
                    ))}
                </group>
            );
        case "bass":
            return (
                <group>
                    <mesh position={[0, -0.14, 0]} scale={[1, 1.15, 0.45]}>
                        <sphereGeometry args={[0.12, 20, 14]} />
                        <Mat color={info.color} glow={glow} />
                    </mesh>
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[0.04, 0.34, 0.025]} />
                        <Mat color="#5a3a20" />
                    </mesh>
                    <mesh position={[0, 0.27, 0]}>
                        <boxGeometry args={[0.07, 0.06, 0.03]} />
                        <Mat color="#2a1a10" />
                    </mesh>
                    {[-0.012, 0.004, 0.02].map((x) => (
                        <mesh key={x} position={[x - 0.004, 0.02, 0.016]}>
                            <boxGeometry args={[0.003, 0.48, 0.003]} />
                            <Mat color="#ddd" metal />
                        </mesh>
                    ))}
                </group>
            );
        case "piano":
            return (
                <group>
                    <mesh position={[0, -0.02, 0]}>
                        <boxGeometry args={[0.52, 0.06, 0.24]} />
                        <Mat color="#1e1e26" />
                    </mesh>
                    {Array.from({ length: 10 }, (_, k) => (
                        <mesh key={k} position={[-0.225 + k * 0.05, 0.018, 0.04]}>
                            <boxGeometry args={[0.046, 0.025, 0.14]} />
                            <Mat color="#fbf8f0" glow={glow * 0.3} />
                        </mesh>
                    ))}
                    {[0, 1, 3, 4, 5, 7, 8].map((k) => (
                        <mesh key={k} position={[-0.2 + k * 0.05, 0.036, 0.0]}>
                            <boxGeometry args={[0.028, 0.02, 0.08]} />
                            <Mat color="#111" />
                        </mesh>
                    ))}
                </group>
            );
        case "bells": {
            const colors = ["#ff4d5e", "#ff9a4d", "#ffd23c", "#3ee58f", "#4da6ff", "#7a6bff", "#c46bff"];
            return (
                <group>
                    {[-0.08, 0.08].map((z) => (
                        <mesh key={z} position={[0, -0.04, z]}>
                            <boxGeometry args={[0.48, 0.03, 0.02]} />
                            <Mat color="#7a4a2a" />
                        </mesh>
                    ))}
                    {colors.map((c, k) => (
                        <mesh key={c} position={[-0.2 + k * 0.067, 0, 0]}>
                            <boxGeometry args={[0.05, 0.02, 0.24 - k * 0.018]} />
                            <Mat color={c} metal glow={glow * 0.5} />
                        </mesh>
                    ))}
                </group>
            );
        }
        case "synth":
            return (
                <group>
                    <mesh>
                        <boxGeometry args={[0.44, 0.08, 0.26]} />
                        <Mat color="#2a2a3a" />
                    </mesh>
                    <mesh position={[0, 0.042, -0.07]}>
                        <boxGeometry args={[0.36, 0.005, 0.06]} />
                        <meshBasicMaterial color={info.color} toneMapped={false} />
                    </mesh>
                    {Array.from({ length: 5 }, (_, k) => (
                        <mesh key={k} position={[-0.16 + k * 0.08, 0.055, 0.02]}>
                            <cylinderGeometry args={[0.018, 0.018, 0.03, 12]} />
                            <Mat color={["#ff4d5e", "#ffd23c", "#3ee58f", "#4da6ff", "#c46bff"][k]} glow={glow} />
                        </mesh>
                    ))}
                    {Array.from({ length: 8 }, (_, k) => (
                        <mesh key={k} position={[-0.175 + k * 0.05, 0.045, 0.09]}>
                            <boxGeometry args={[0.044, 0.012, 0.06]} />
                            <Mat color="#f4f1ea" />
                        </mesh>
                    ))}
                </group>
            );
    }
};
