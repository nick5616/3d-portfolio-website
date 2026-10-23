import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { PaperLantern, StripedAwning, ZeldaPot } from "../../models/shopDecor";

// Everything that makes the Rupee Shop feel like a little village shop:
// bunting under the beams, paper lanterns, clay pots in the corners,
// barrels and crates, a striped awning over the counter, round windows
// full of afternoon light. The room is 12 x 10 (x: -6..6, z: -5..5), the
// door on the west wall, the counter along the east.

const BUNTING_COLORS = ["#3ee58f", "#ff5d73", "#59b4ff", "#ffcc55", "#fff3dc"];

// Strings of little triangle flags, sagging between the walls.
const Bunting: React.FC<{ runs: { from: [number, number, number]; to: [number, number, number]; sag: number }[] }> = ({ runs }) => {
    const { cords, flags } = useMemo(() => {
        const cord = new THREE.MeshStandardMaterial({ color: "#e9dcc4", roughness: 0.9 });
        const cords: THREE.Mesh[] = [];
        const placements: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
        runs.forEach((run, r) => {
            const a = new THREE.Vector3(...run.from);
            const b = new THREE.Vector3(...run.to);
            const at = (t: number) => a.clone().lerp(b, t).add(new THREE.Vector3(0, -run.sag * 4 * t * (1 - t), 0));
            const points = Array.from({ length: 17 }, (_, i) => at(i / 16));
            cords.push(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.008, 4), cord));
            const yaw = -Math.atan2(b.z - a.z, b.x - a.x);
            const count = Math.round(a.distanceTo(b) / 0.42);
            for (let i = 1; i < count; i++) {
                placements.push({
                    matrix: new THREE.Matrix4().compose(
                        at(i / count),
                        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
                        new THREE.Vector3(1, 1, 1)
                    ),
                    color: new THREE.Color(BUNTING_COLORS[(i + r) % BUNTING_COLORS.length]),
                });
            }
        });
        const triangle = new THREE.Shape();
        triangle.moveTo(-0.14, 0);
        triangle.lineTo(0.14, 0);
        triangle.lineTo(0, -0.26);
        triangle.closePath();
        const flags = new THREE.InstancedMesh(
            new THREE.ShapeGeometry(triangle),
            new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }),
            placements.length
        );
        placements.forEach((p, i) => {
            flags.setMatrixAt(i, p.matrix);
            flags.setColorAt(i, p.color);
        });
        flags.computeBoundingSphere();
        return { cords, flags };
    }, [runs]);
    useEffect(
        () => () => {
            cords.forEach((m) => m.geometry.dispose());
            (cords[0]?.material as THREE.Material | undefined)?.dispose();
            flags.geometry.dispose();
            (flags.material as THREE.Material).dispose();
            flags.dispose();
        },
        [cords, flags]
    );
    return (
        <>
            {cords.map((mesh, i) => (
                <primitive key={i} object={mesh} />
            ))}
            <primitive object={flags} />
        </>
    );
};

const Barrel: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.9, 18]} />
            <meshStandardMaterial color="#8a5a34" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.455, 0]} scale={[1.08, 1, 1.08]}>
            <sphereGeometry args={[0.3, 18, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.3]} />
            <meshStandardMaterial color="#8a5a34" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
        {[0.15, 0.75].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.305, 0.018, 6, 28]} />
                <meshStandardMaterial color="#3b3330" metalness={0.6} roughness={0.5} />
            </mesh>
        ))}
        <mesh position={[0, 0.905, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.29, 18]} />
            <meshStandardMaterial color="#b98a5a" roughness={0.8} />
        </mesh>
    </group>
);

const Crate: React.FC<{ position: [number, number, number]; size?: number; rotation?: number }> = ({ position, size = 0.6, rotation = 0 }) => (
    <group position={position} rotation={[0, rotation, 0]}>
        <mesh position={[0, size / 2, 0]}>
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial color="#b88a52" roughness={0.85} />
        </mesh>
        {[-1, 1].map((side) => (
            <mesh key={side} position={[0, size / 2, side * (size / 2 + 0.005)]}>
                <boxGeometry args={[size * 0.98, size * 0.14, 0.012]} />
                <meshStandardMaterial color="#7a5430" roughness={0.85} />
            </mesh>
        ))}
    </group>
);

// A round window in a wall (built facing local +Z), bright with daylight.
const RoundWindow: React.FC<{ position: [number, number, number]; rotationY: number }> = ({ position, rotationY }) => (
    <group position={position} rotation={[0, rotationY, 0]}>
        <mesh>
            <circleGeometry args={[0.55, 32]} />
            <meshBasicMaterial color="#ffeec4" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
            <torusGeometry args={[0.56, 0.07, 10, 36]} />
            <meshStandardMaterial color="#6b4428" roughness={0.7} />
        </mesh>
        {[0, Math.PI / 2].map((r) => (
            <mesh key={r} position={[0, 0, 0.02]} rotation={[0, 0, r]}>
                <boxGeometry args={[1.1, 0.05, 0.03]} />
                <meshStandardMaterial color="#6b4428" roughness={0.7} />
            </mesh>
        ))}
        <pointLight position={[0, 0, 0.6]} intensity={1.2} distance={4} decay={2} color="#ffe2a8" />
    </group>
);

const BUNTING = [-4.6, -1.75, 1.75, 4.6].map((z) => ({
    from: [-5.85, 5.55, z] as [number, number, number],
    to: [5.85, 5.55, z] as [number, number, number],
    sag: 0.4,
}));

export const LANTERN_SPOTS: [number, number, number][] = [
    [0, 5.85, -3.5],
    [0, 5.85, 0],
    [0, 5.85, 3.5],
    [-3.6, 5.85, -2.4],
    [-3.6, 5.85, 2.4],
];

export const ShopDressing: React.FC = () => (
    <>
        <Bunting runs={BUNTING} />
        {LANTERN_SPOTS.map((spot, i) => (
            <PaperLantern key={i} position={spot} radius={i < 3 ? 0.24 : 0.17} cord={i < 3 ? 0.9 : 1.2} />
        ))}

        {/* Striped awning over the counter, from the back wall */}
        <group position={[5.9, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <StripedAwning width={6.2} length={1.9} tilt={0.25} stripes={13} />
        </group>

        {/* Pots, barrels and crates in the corners */}
        <ZeldaPot position={[-5.35, 0, -4.35]} />
        <ZeldaPot position={[-4.75, 0, -4.5]} scale={0.8} rotation={1} />
        <ZeldaPot position={[-5.4, 0, -3.7]} scale={0.7} rotation={2} />
        <ZeldaPot position={[-5.35, 0, 4.35]} rotation={0.5} />
        <ZeldaPot position={[-4.8, 0, 4.5]} scale={0.75} rotation={2.5} />
        <ZeldaPot position={[5.35, 0, -4.4]} scale={0.9} />
        <ZeldaPot position={[5.4, 0, 4.4]} scale={0.8} rotation={1.5} />
        <Barrel position={[-2.7, 0, -4.5]} />
        <Barrel position={[-1.95, 0, -4.55]} />
        <Crate position={[-2.4, 0, 4.45]} rotation={0.1} />
        <Crate position={[-2.4, 0.6, 4.45]} size={0.45} rotation={-0.25} />
        <Crate position={[-1.7, 0, 4.5]} size={0.5} rotation={0.3} />

        <RoundWindow position={[-2.4, 3.1, -4.99]} rotationY={0} />
        <RoundWindow position={[-2.4, 3.1, 4.99]} rotationY={Math.PI} />

        <RigidBody type="fixed" colliders={false}>
            <CylinderCollider args={[0.4, 0.55]} position={[-5.15, 0.4, -4.2]} />
            <CylinderCollider args={[0.4, 0.5]} position={[-5.15, 0.4, 4.4]} />
            <CylinderCollider args={[0.45, 0.7]} position={[-2.3, 0.45, -4.5]} />
            <CuboidCollider args={[0.7, 0.45, 0.35]} position={[-2.1, 0.45, 4.5]} />
        </RigidBody>
    </>
);
