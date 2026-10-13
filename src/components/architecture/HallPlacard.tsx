import { Text } from "@react-three/drei";
import { ART_COLLECTIONS } from "../../data/portfolio";

const DISPLAY_FONT = "/fonts/Fraunces.ttf";

// The vinyl-lettering wall text museums put at a room's entrance: the
// collection's name, what it is, and why it exists. Copy comes from the
// art portfolio (nickel-tools content.ts), so both stay in sync.
export const HallPlacard: React.FC<{
    category: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    pieceCount?: number;
}> = ({ category, position, rotation = [0, 0, 0], pieceCount }) => {
    const collection = ART_COLLECTIONS[category];
    if (!collection) return null;
    const meta = [
        collection.mediums.slice(0, 3).join(" · "),
        pieceCount ? `${pieceCount} works` : "",
    ]
        .filter(Boolean)
        .join("   ·   ");

    return (
        <group position={position} rotation={rotation}>
            <Text
                font={DISPLAY_FONT}
                fontSize={0.42}
                anchorX="left"
                anchorY="top"
                color="#2a2420"
                maxWidth={3.4}
                lineHeight={1}
            >
                {collection.title}
            </Text>
            <mesh position={[0.6, -0.6, 0]}>
                <planeGeometry args={[1.2, 0.012]} />
                <meshBasicMaterial color="#b08d57" />
            </mesh>
            <Text
                position={[0, -0.72, 0]}
                fontSize={0.12}
                anchorX="left"
                anchorY="top"
                color="#3d3530"
                maxWidth={3.1}
                lineHeight={1.45}
            >
                {collection.description}
            </Text>
            {collection.why && (
                <Text
                    position={[0, -1.25, 0]}
                    font={DISPLAY_FONT}
                    fontSize={0.105}
                    anchorX="left"
                    anchorY="top"
                    color="#5a4f46"
                    maxWidth={3.1}
                    lineHeight={1.45}
                >
                    {`“${collection.why}”`}
                </Text>
            )}
            {meta && (
                <Text
                    position={[0, -1.95, 0]}
                    fontSize={0.07}
                    anchorX="left"
                    anchorY="top"
                    color="#7a6e64"
                    letterSpacing={0.14}
                >
                    {meta.toUpperCase()}
                </Text>
            )}
        </group>
    );
};
