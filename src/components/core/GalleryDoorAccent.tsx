import * as THREE from "three";
import { GalleryDoorAccent as AccentKind } from "../../configs/galleryDoorStyles";

interface GalleryDoorAccentProps {
    accent: AccentKind;
    width: number;
    height: number;
    color: string;
    glowColor: string;
    frameColor: string;
}

// Small, cheap decorative meshes layered on top of a gallery door's frame,
// one style per hall category, so each door reads as "that room" at a
// glance instead of every gallery door looking like the same plain box with
// a different paint job. Everything here is expressed in the frame's own
// local space (origin = frame center, local +Z = outward through the
// doorway - the same space the <mesh> frame itself sits in), so it rides
// along with whatever position/rotation the parent group already has.
const ECLECTIC_COLORS = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#A78BFA", "#FF9F45"];

export const GalleryDoorAccent: React.FC<GalleryDoorAccentProps> = ({
    accent,
    width,
    height,
    color,
    glowColor,
    frameColor,
}) => {
    const z = 0.035; // just in front of the frame's front face (depth 0.06)

    switch (accent) {
        // Digital Art: a bright inset "bezel" - four thin bars just inside
        // the frame's edge, like a screen border.
        case "tech": {
            const inset = 0.18;
            const barThickness = 0.05;
            return (
                <group>
                    {[-1, 1].map((sign) => (
                        <mesh
                            key={`h-${sign}`}
                            position={[0, sign * (height / 2 + inset), z]}
                        >
                            <boxGeometry
                                args={[width + inset * 1.6, barThickness, 0.015]}
                            />
                            <meshStandardMaterial
                                color={glowColor}
                                emissive={glowColor}
                                emissiveIntensity={0.7}
                                metalness={0.9}
                                roughness={0.1}
                            />
                        </mesh>
                    ))}
                    {[-1, 1].map((sign) => (
                        <mesh
                            key={`v-${sign}`}
                            position={[sign * (width / 2 + inset), 0, z]}
                        >
                            <boxGeometry
                                args={[barThickness, height + inset * 1.6, 0.015]}
                            />
                            <meshStandardMaterial
                                color={glowColor}
                                emissive={glowColor}
                                emissiveIntensity={0.7}
                                metalness={0.9}
                                roughness={0.1}
                            />
                        </mesh>
                    ))}
                </group>
            );
        }

        // Paintings: gilded corner finials, like an ornate museum frame.
        case "ornate": {
            const finialSize = 0.16;
            const cx = width / 2 + 0.22;
            const cy = height / 2 + 0.22;
            return (
                <group>
                    {[
                        [-cx, cy],
                        [cx, cy],
                        [-cx, -cy],
                        [cx, -cy],
                    ].map(([x, y], i) => (
                        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 4]}>
                            <boxGeometry args={[finialSize, finialSize, 0.05]} />
                            <meshStandardMaterial
                                color={glowColor}
                                metalness={0.7}
                                roughness={0.25}
                            />
                        </mesh>
                    ))}
                </group>
            );
        }

        // Sketches: a couple of loose, hand-drawn-looking pencil strokes
        // near the top corner rather than a symmetric, "finished" motif.
        case "sketch": {
            return (
                <group position={[0, height / 2 + 0.22, z]}>
                    <mesh rotation={[0, 0, THREE.MathUtils.degToRad(-6)]}>
                        <boxGeometry args={[width * 0.5, 0.03, 0.01]} />
                        <meshStandardMaterial color={color} roughness={0.9} />
                    </mesh>
                    <mesh
                        position={[width * 0.12, 0.08, 0]}
                        rotation={[0, 0, THREE.MathUtils.degToRad(4)]}
                    >
                        <boxGeometry args={[width * 0.3, 0.025, 0.01]} />
                        <meshStandardMaterial color={frameColor} roughness={0.9} />
                    </mesh>
                </group>
            );
        }

        // Left-Handed Hall: an oversized "binding" running down the LEFT
        // edge only, like a book bound backwards - the frame is
        // deliberately lopsided rather than symmetric.
        case "asymmetric": {
            return (
                <mesh position={[-(width / 2 + 0.22), 0, z - 0.005]}>
                    <boxGeometry args={[0.3, height + 0.55, 0.07]} />
                    <meshStandardMaterial
                        color={glowColor}
                        roughness={0.55}
                        metalness={0.2}
                    />
                </mesh>
            );
        }

        // Miscellaneous: a scatter of mismatched colored tiles around the
        // frame - a deliberately un-themed, "everything drawer" look.
        case "eclectic": {
            const positions: [number, number][] = [
                [-width / 2 - 0.15, height / 2 + 0.15],
                [width / 2 + 0.15, height / 2 + 0.1],
                [-width / 2 - 0.2, -height / 2 - 0.1],
                [width / 2 + 0.1, -height / 2 - 0.2],
                [0, height / 2 + 0.28],
            ];
            return (
                <group>
                    {positions.map(([x, y], i) => (
                        <mesh key={i} position={[x, y, z]}>
                            <boxGeometry args={[0.14, 0.14, 0.04]} />
                            <meshStandardMaterial
                                color={ECLECTIC_COLORS[i % ECLECTIC_COLORS.length]}
                                roughness={0.6}
                            />
                        </mesh>
                    ))}
                </group>
            );
        }

        // Notes App Art: a ruled-paper margin line plus a folded corner,
        // like a torn notebook page.
        case "paper": {
            return (
                <group>
                    <mesh position={[-width / 2 + 0.3, 0, z]}>
                        <boxGeometry args={[0.03, height + 0.4, 0.01]} />
                        <meshStandardMaterial color="#C0392B" roughness={0.8} />
                    </mesh>
                    <mesh
                        position={[width / 2 - 0.05, height / 2 + 0.18, z]}
                        rotation={[0, 0, THREE.MathUtils.degToRad(45)]}
                    >
                        <planeGeometry args={[0.3, 0.3]} />
                        <meshStandardMaterial
                            color="#FFF8DC"
                            side={THREE.DoubleSide}
                            roughness={0.9}
                        />
                    </mesh>
                </group>
            );
        }

        // Gallery hub: four diagonal corner brackets, like a viewfinder -
        // this is the door TO the central hub every hall connects back to.
        case "hub": {
            const bx = width / 2 + 0.24;
            const by = height / 2 + 0.24;
            const armLength = 0.3;
            const armThickness = 0.05;
            return (
                <group>
                    {[
                        [-bx, by, 1, -1],
                        [bx, by, -1, -1],
                        [-bx, -by, 1, 1],
                        [bx, -by, -1, 1],
                    ].map(([x, y, hSign, vSign], i) => (
                        <group key={i} position={[x as number, y as number, z]}>
                            <mesh position={[((hSign as number) * armLength) / 2, 0, 0]}>
                                <boxGeometry args={[armLength, armThickness, 0.02]} />
                                <meshStandardMaterial
                                    color={glowColor}
                                    metalness={0.4}
                                    roughness={0.4}
                                />
                            </mesh>
                            <mesh position={[0, ((vSign as number) * armLength) / 2, 0]}>
                                <boxGeometry args={[armThickness, armLength, 0.02]} />
                                <meshStandardMaterial
                                    color={glowColor}
                                    metalness={0.4}
                                    roughness={0.4}
                                />
                            </mesh>
                        </group>
                    ))}
                </group>
            );
        }

        default:
            return null;
    }
};
