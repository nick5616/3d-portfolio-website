import React, { useEffect, useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomConfig } from "../../types/scene.types";
import { EnhancedMaterialSystem } from "../../configs/enhancedMaterials";
import { RoomEnvironmentReady } from "../core/RoomEnvironmentReady";
import { GodRays, DustMotes } from "../effects/GodRays";
import { Sketchbook } from "../sketchbook/Sketchbook";
import { getLightPoolMaterial } from "../models/artFrameParts";

interface SketchbookRotundaProps {
    config: RoomConfig;
    width: number;
    height: number;
}

// A small domed marble room: ten pilasters, a cornice, a coffered dome
// open at the top, and one shaft of light falling through the oculus onto
// a lectern holding the sketchbook.
const LECTERN_TILT = 0.32; // radians; far edge raised toward the reader

export const SketchbookRotunda: React.FC<SketchbookRotundaProps> = ({
    width,
    height: wallHeight,
}) => {
    const radius = width / 2;
    const system = EnhancedMaterialSystem.getInstance();
    const domeStart = 0.22; // oculus opening (radians from the top)
    const oculusRadius = radius * Math.sin(domeStart);
    const oculusY = wallHeight + radius * Math.cos(domeStart);

    const materials = useMemo(
        () => ({
            floor: system.pbr("marble-white", {
                repeat: 3,
                fallbackColor: "#ece6dc",
                roughness: 0.45,
                metalness: 0,
                envMapIntensity: 1.3,
                anisotropy: 8,
            }),
            wall: system.pbr("marble-white", {
                repeat: [7, 1.4],
                fallbackColor: "#f1ebe1",
                tint: "#f7efe3",
                roughness: 0.7,
                metalness: 0,
            }),
            dome: system.pbr("marble-white", {
                repeat: [6, 2],
                fallbackColor: "#f4eee4",
                tint: "#fbf3e6",
                roughness: 0.85,
                metalness: 0,
            }),
            trim: system.flat("rotunda-trim", {
                color: "#e9e0cf",
                roughness: 0.5,
                metalness: 0,
            }),
            inlay: system.flat("rotunda-inlay", {
                color: "#284a3b",
                roughness: 0.25,
                metalness: 0,
            }),
            bronze: system.flat("rotunda-bronze", {
                color: "#9c7a45",
                roughness: 0.35,
                metalness: 1,
            }),
            walnut: system.flat("rotunda-walnut", {
                color: "#3b2619",
                roughness: 0.5,
                metalness: 0,
            }),
        }),
        [system]
    );
    // Seen from inside: the wall cylinder and dome face inward, and the
    // open-cylinder mouldings need both faces. (These materials are unique
    // to this room, so changing their side is safe.)
    useEffect(() => {
        materials.wall.side = THREE.BackSide;
        materials.dome.side = THREE.BackSide;
        materials.trim.side = THREE.DoubleSide;
        [materials.wall, materials.dome, materials.trim].forEach((m) => (m.needsUpdate = true));
    }, [materials]);

    // Ten pilasters, one merged instanced geometry, skipping the doorways
    // (doors sit at +-Z, i.e. 90 and 270 degrees).
    const pilasters = useMemo(() => {
        const shaft = new THREE.BoxGeometry(0.46, wallHeight - 0.75, 0.16);
        shaft.translate(0, (wallHeight - 0.75) / 2 + 0.35, 0);
        const base = new THREE.BoxGeometry(0.62, 0.35, 0.26);
        base.translate(0, 0.175, 0);
        const capital = new THREE.BoxGeometry(0.66, 0.28, 0.28);
        capital.translate(0, wallHeight - 0.26, 0);
        const geometry = mergeGeometries([shaft, base, capital])!;
        [shaft, base, capital].forEach((g) => g.dispose());
        const mesh = new THREE.InstancedMesh(geometry, materials.trim, 10);
        const matrix = new THREE.Matrix4();
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const position = new THREE.Vector3(
                Math.cos(angle) * (radius - 0.07),
                0,
                Math.sin(angle) * (radius - 0.07)
            );
            matrix.makeRotationY(-angle + Math.PI / 2);
            matrix.setPosition(position);
            mesh.setMatrixAt(i, matrix);
        }
        return mesh;
    }, [materials.trim, radius, wallHeight]);
    useEffect(() => () => pilasters.geometry.dispose(), [pilasters]);

    // Wall colliders: a ring of boxes (cylinder hull colliders are solid
    // discs - see the gallery atrium notes).
    const wallColliders = useMemo(() => {
        const segments = 24;
        const chord = 2 * radius * Math.sin(Math.PI / segments) * 1.1;
        return Array.from({ length: segments }, (_, i) => {
            const angle = (i / segments) * Math.PI * 2;
            return {
                position: [
                    Math.cos(angle) * (radius + 0.15),
                    wallHeight / 2,
                    Math.sin(angle) * (radius + 0.15),
                ] as [number, number, number],
                rotation: [0, -angle + Math.PI / 2, 0] as [number, number, number],
                halfExtents: [chord / 2, wallHeight / 2, 0.15] as [number, number, number],
            };
        });
    }, [radius, wallHeight]);

    const sconces = useMemo(
        () =>
            Array.from({ length: 10 }, (_, i) => {
                const angle = ((i + 0.5) / 10) * Math.PI * 2;
                return { angle };
            }).filter(({ angle }) => {
                // keep clear of the doors at 90 / 270 degrees
                const deg = (angle * 180) / Math.PI;
                return Math.abs(deg - 90) > 20 && Math.abs(deg - 270) > 20;
            }),
        []
    );

    const lecternTop: [number, number, number] = [0, 1.08, 0];

    return (
        <>
            <RoomEnvironmentReady />

            {/* Light: the oculus is the key light; everything else is soft */}
            <ambientLight intensity={0.18} color="#fff1dc" />
            <hemisphereLight intensity={0.25} color="#fff4e2" groundColor="#6b5a45" />
            <spotLight
                position={[0, oculusY - 0.3, 0]}
                target-position={[0, 0, 0]}
                angle={0.3}
                penumbra={0.75}
                intensity={55}
                decay={1.6}
                color="#ffe8c2"
            />
            <pointLight
                position={[0, 2.1, 0.35]}
                intensity={0.9}
                distance={3}
                decay={2}
                color="#ffe2b5"
            />

            {/* Floor */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[radius + 0.5, 0.1, radius + 0.5]} position={[0, -0.1, 0]} />
            </RigidBody>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.floor}>
                <circleGeometry args={[radius, 64]} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} material={materials.inlay}>
                <ringGeometry args={[radius * 0.42, radius * 0.47, 64]} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={materials.bronze}>
                <ringGeometry args={[1.0, 1.06, 64]} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} material={materials.inlay}>
                <circleGeometry args={[1.0, 64]} />
            </mesh>

            {/* Walls */}
            {wallColliders.map((collider, i) => (
                <RigidBody key={i} type="fixed" colliders={false}>
                    <CuboidCollider
                        args={collider.halfExtents}
                        position={collider.position}
                        rotation={collider.rotation}
                    />
                </RigidBody>
            ))}
            <mesh position={[0, wallHeight / 2, 0]} material={materials.wall}>
                <cylinderGeometry args={[radius, radius, wallHeight, 72, 1, true]} />
            </mesh>
            <primitive object={pilasters} />

            {/* Base molding + cornice */}
            <mesh position={[0, 0.14, 0]} material={materials.trim}>
                <cylinderGeometry args={[radius - 0.04, radius - 0.04, 0.28, 72, 1, true]} />
            </mesh>
            <mesh position={[0, wallHeight - 0.05, 0]} material={materials.trim}>
                <cylinderGeometry args={[radius - 0.32, radius - 0.02, 0.45, 72, 1, true]} />
            </mesh>

            {/* Dome with an open oculus */}
            <mesh position={[0, wallHeight, 0]} material={materials.dome}>
                <sphereGeometry
                    args={[radius, 72, 24, 0, Math.PI * 2, domeStart, Math.PI / 2 - domeStart]}
                />
            </mesh>
            {[0.55, 0.95].map((phi) => (
                <mesh
                    key={phi}
                    position={[0, wallHeight + radius * Math.cos(phi) - 0.02, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    material={materials.trim}
                >
                    <torusGeometry args={[radius * Math.sin(phi) - 0.04, 0.06, 8, 72]} />
                </mesh>
            ))}
            {/* Sky through the oculus */}
            <mesh position={[0, oculusY + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[oculusRadius + 0.05, 48]} />
                <meshBasicMaterial color="#fff6e3" toneMapped={false} />
            </mesh>

            {/* The shaft of light and the dust drifting through it */}
            <GodRays
                height={oculusY}
                radiusTop={oculusRadius * 0.95}
                radiusBottom={1.35}
                intensity={0.2}
                color="#ffe6b5"
            />
            <DustMotes radius={1.1} height={oculusY - 1} count={260} />

            {/* Sconces with soft pools of light on the wall */}
            {sconces.map(({ angle }) => {
                const x = Math.cos(angle) * (radius - 0.03);
                const z = Math.sin(angle) * (radius - 0.03);
                const rotY = -angle - Math.PI / 2;
                return (
                    <group key={angle} position={[x, 2.6, z]} rotation={[0, rotY, 0]}>
                        <mesh position={[0, 0.25, 0.01]} material={getLightPoolMaterial("#ffd8a0", 0.22)}>
                            <planeGeometry args={[1.6, 2.2]} />
                        </mesh>
                        <mesh position={[0, 0, 0.08]} material={materials.bronze}>
                            <cylinderGeometry args={[0.05, 0.09, 0.22, 12]} />
                        </mesh>
                        <mesh position={[0, 0.16, 0.08]}>
                            <sphereGeometry args={[0.06, 12, 8]} />
                            <meshBasicMaterial color="#ffdca8" toneMapped={false} />
                        </mesh>
                    </group>
                );
            })}

            {/* Lectern */}
            <RigidBody type="fixed" colliders={false}>
                <CylinderCollider args={[0.55, 0.42]} position={[0, 0.55, 0]} />
            </RigidBody>
            <mesh position={[0, 0.06, 0]} material={materials.trim}>
                <cylinderGeometry args={[0.42, 0.46, 0.12, 32]} />
            </mesh>
            <mesh position={[0, 0.55, 0]} material={materials.walnut}>
                <cylinderGeometry args={[0.11, 0.16, 0.9, 16]} />
            </mesh>
            <mesh position={[0, 0.98, 0]} material={materials.bronze}>
                <cylinderGeometry args={[0.2, 0.14, 0.08, 16]} />
            </mesh>
            <group position={lecternTop} rotation={[LECTERN_TILT, 0, 0]}>
                <mesh position={[0, -0.02, 0]} material={materials.walnut}>
                    <boxGeometry args={[0.98, 0.04, 0.74]} />
                </mesh>
                {/* Ledge that stops the book sliding off */}
                <mesh position={[0, 0.0, 0.37]} material={materials.bronze}>
                    <boxGeometry args={[0.9, 0.03, 0.02]} />
                </mesh>
            </group>
            <Sketchbook
                position={[lecternTop[0], lecternTop[1] + 0.002 * Math.cos(LECTERN_TILT), lecternTop[2]]}
                rotation={[LECTERN_TILT, 0, 0]}
            />
        </>
    );
};
