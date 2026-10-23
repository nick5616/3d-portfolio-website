import React from "react";
import * as THREE from "three";

// Cosy little-shop props, shared by the Rupee Shop and its doors: clay
// pots (the kind you'd want to throw), a striped scalloped awning, paper
// lanterns. Geometry and materials are made once and shared.

let made: ReturnType<typeof make> | null = null;
const make = () => {
    const potProfile = [
        [0, 0],
        [0.12, 0],
        [0.17, 0.03],
        [0.22, 0.1],
        [0.25, 0.2],
        [0.24, 0.3],
        [0.2, 0.38],
        [0.13, 0.43],
        [0.11, 0.46],
        [0.13, 0.49],
        [0.15, 0.52],
        [0.13, 0.535],
        [0.1, 0.5],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return {
        pot: new THREE.LatheGeometry(potProfile, 28),
        potBand: (() => {
            const g = new THREE.TorusGeometry(0.247, 0.012, 6, 32);
            g.rotateX(Math.PI / 2);
            return g;
        })(),
        clay: new THREE.MeshStandardMaterial({ color: "#c97a4a", roughness: 0.85, side: THREE.DoubleSide }),
        clayDark: new THREE.MeshStandardMaterial({ color: "#8a4a2a", roughness: 0.8 }),
        stripeA: new THREE.MeshStandardMaterial({ color: "#d94a3d", roughness: 0.8, side: THREE.DoubleSide }),
        stripeB: new THREE.MeshStandardMaterial({ color: "#fff3dc", roughness: 0.8, side: THREE.DoubleSide }),
        lanternGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffbf73").multiplyScalar(1.3), toneMapped: false }),
        lanternWood: new THREE.MeshStandardMaterial({ color: "#3e2616", roughness: 0.7 }),
        rib: new THREE.MeshBasicMaterial({ color: "#c46a2a", toneMapped: false }),
    };
};
const parts = () => (made ??= make());

export const ZeldaPot: React.FC<{ position: [number, number, number]; scale?: number; rotation?: number }> = ({
    position,
    scale = 1,
    rotation = 0,
}) => {
    const p = parts();
    return (
        <group position={position} scale={scale} rotation={[0, rotation, 0]}>
            <mesh geometry={p.pot} material={p.clay} />
            <mesh geometry={p.potBand} material={p.clayDark} position={[0, 0.28, 0]} />
            <mesh geometry={p.potBand} material={p.clayDark} position={[0, 0.19, 0]} scale={[1.02, 1, 1.02]} />
        </group>
    );
};

// Built at its back edge, running out along +Z and drooping by `tilt`.
export const StripedAwning: React.FC<{ width: number; length: number; tilt: number; stripes?: number }> = ({
    width,
    length,
    tilt,
    stripes = 9,
}) => {
    const p = parts();
    const stripe = width / stripes;
    return (
        <group rotation={[tilt, 0, 0]}>
            {Array.from({ length: stripes }, (_, i) => {
                const x = -width / 2 + (i + 0.5) * stripe;
                const material = i % 2 ? p.stripeB : p.stripeA;
                return (
                    <group key={i}>
                        <mesh position={[x, 0, length / 2]} material={material}>
                            <boxGeometry args={[stripe, 0.035, length]} />
                        </mesh>
                        {/* the scalloped edge, hanging straight down */}
                        <mesh position={[x, -0.0175, length]} rotation={[-tilt, 0, 0]} material={material}>
                            <circleGeometry args={[stripe / 2, 16, Math.PI, Math.PI]} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
};

// A round paper lantern, hanging from `position` by a short cord.
export const PaperLantern: React.FC<{ position: [number, number, number]; radius?: number; cord?: number }> = ({
    position,
    radius = 0.16,
    cord = 0.25,
}) => {
    const p = parts();
    return (
        <group position={position}>
            <mesh position={[0, -cord / 2, 0]} material={p.lanternWood}>
                <cylinderGeometry args={[0.006, 0.006, cord, 4]} />
            </mesh>
            <group position={[0, -cord - radius, 0]}>
                <mesh material={p.lanternGlow} scale={[1, 0.86, 1]}>
                    <sphereGeometry args={[radius, 20, 14]} />
                </mesh>
                {[-0.45, 0, 0.45].map((y) => (
                    <mesh key={y} position={[0, y * radius * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={p.rib}>
                        <torusGeometry args={[radius * Math.sqrt(1 - y * y) * 1.005, 0.005, 4, 24]} />
                    </mesh>
                ))}
                {[1, -1].map((side) => (
                    <mesh key={side} position={[0, side * radius * 0.86, 0]} material={p.lanternWood}>
                        <cylinderGeometry args={[radius * 0.4, radius * 0.4, 0.04, 12]} />
                    </mesh>
                ))}
            </group>
        </group>
    );
};
