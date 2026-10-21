import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { sessionSeconds, setRoomPart, useRoomPart, useRoomSessionStore } from "../../../multiplayer/roomSession";
import { mulberry32 } from "../experiences/forest/forestGen";
import * as THREE from "three";
import { useUnlockStore } from "../../../stores/unlockStore";
import { RADIUS, WALL_HEIGHT } from "./atriumLayout";

// The Rupee Shop's Disco Ball: a mirror ball hung from the dome on a long
// chain, slowly turning, scattering flecks of light across the rotunda.
//
// It's the atrium's, not just its owner's: once anyone who has one has
// been here, it hangs for everyone in the room, turning in step, until the
// atrium empties (a room part, see multiplayer/roomSession.ts).

const BALL_Y = WALL_HEIGHT - 1.5;
const FLECKS = 260;

const Ball: React.FC<{ visible: boolean }> = ({ visible }) => {
    const ball = useRef<THREE.Mesh>(null);
    const flecks = useRef<THREE.Points>(null);
    const geometry = useMemo(() => {
        // Spots on the inside of the drum and the balconies: directions
        // from the ball, pushed out to the wall.
        const positions = new Float32Array(FLECKS * 3);
        const colors = new Float32Array(FLECKS * 3);
        const palette = ["#ffffff", "#ffd1f0", "#a8f4ff", "#fff0b0"].map((c) => new THREE.Color(c));
        // The same flecks for everyone.
        const rand = mulberry32(1977);
        for (let i = 0; i < FLECKS; i++) {
            const a = rand() * Math.PI * 2;
            const down = -0.15 - rand() * 0.9;
            const dir = new THREE.Vector3(Math.cos(a), down, Math.sin(a)).normalize();
            const reach = Math.min((RADIUS - 0.2) / Math.hypot(dir.x, dir.z), (BALL_Y - 0.1) / -dir.y);
            positions.set([dir.x * reach, dir.y * reach, dir.z * reach], i * 3);
            palette[i % palette.length].toArray(colors, i * 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
    }, []);
    useEffect(() => () => geometry.dispose(), [geometry]);

    useFrame(() => {
        // The room session's clock: the same turn on everyone's screen.
        const t = sessionSeconds();
        if (ball.current) ball.current.rotation.y = t * 0.4;
        if (flecks.current) {
            flecks.current.rotation.y = t * 0.4;
            (flecks.current.material as THREE.PointsMaterial).opacity = 0.55 + Math.sin(t * 3) * 0.1;
        }
    });

    return (
        <group position={[0, BALL_Y, 0]} visible={visible}>
            <mesh position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 2.4, 6]} />
                <meshStandardMaterial color="#8a8a90" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh ref={ball}>
                <icosahedronGeometry args={[0.7, 3]} />
                <meshStandardMaterial color="#d8e0ff" metalness={1} roughness={0.05} flatShading envMapIntensity={2.5} />
            </mesh>
            <points ref={flecks} geometry={geometry} raycast={() => null}>
                <pointsMaterial
                    size={0.22}
                    vertexColors
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </points>
        </group>
    );
};

export const DiscoBall: React.FC = () => {
    const owned = useUnlockStore((s) => Boolean(s.unlocked["shop-disco"]));
    const [hung] = useRoomPart<boolean>("disco", false);
    const seed = useRoomSessionStore((s) => s.session?.seed);
    useEffect(() => {
        if (owned && seed !== undefined) setRoomPart("disco", true);
    }, [owned, seed]);
    const shown = owned || hung;
    return (
        <>
            {/* Always there, just hidden (and its light dark) without the
                ball: a light coming or going changes every lit material's
                shader, and someone with a ball walking in shouldn't freeze
                the room while it all recompiles. Mounted, it's compiled
                with the rest of the room while it loads. */}
            <pointLight position={[0, BALL_Y, 0]} intensity={shown ? 6 : 0} distance={10} decay={1.5} color="#e8e0ff" />
            <Ball visible={shown} />
        </>
    );
};
