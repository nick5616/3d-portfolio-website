import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUnlockStore } from "../../stores/unlockStore";

// The Rupee Shop's Fairy Friend: a little pink light that flits around just
// ahead of you in every room, trailing sparkles, with a soft glow of its own.

const glowTexture = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

const TRAIL = 24;

const Fairy: React.FC = () => {
    const camera = useThree((s) => s.camera);
    const group = useRef<THREE.Group>(null);
    const wings = useRef<THREE.Group>(null);
    const trail = useRef<THREE.Points>(null);
    const state = useMemo(() => ({ position: camera.position.clone(), t: 0, history: [] as THREE.Vector3[] }), [camera]);
    const resources = useMemo(() => {
        const texture = glowTexture();
        const positions = new Float32Array(TRAIL * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return { texture, geometry };
    }, []);
    useEffect(() => () => {
        resources.texture.dispose();
        resources.geometry.dispose();
    }, [resources]);
    const forward = useMemo(() => new THREE.Vector3(), []);
    const target = useMemo(() => new THREE.Vector3(), []);

    useFrame((_, delta) => {
        state.t += delta;
        const t = state.t;
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        // Up ahead and off to one side, wandering in little loops.
        target
            .copy(camera.position)
            .addScaledVector(forward, 1.4 + Math.sin(t * 0.7) * 0.3)
            .add(new THREE.Vector3(Math.sin(t * 1.3) * 0.7, -0.15 + Math.sin(t * 2.1) * 0.2, Math.cos(t * 1.1) * 0.4));
        // Snap after a teleport rather than flying across the world.
        if (state.position.distanceTo(target) > 15) state.position.copy(target);
        state.position.lerp(target, Math.min(1, delta * 2.2));
        group.current?.position.copy(state.position);
        if (wings.current) wings.current.rotation.y = Math.sin(t * 30) * 0.6;

        state.history.unshift(state.position.clone());
        if (state.history.length > TRAIL) state.history.length = TRAIL;
        const attribute = resources.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < TRAIL; i++) {
            const p = state.history[Math.min(i, state.history.length - 1)];
            attribute.setXYZ(i, p.x + Math.sin(t * 7 + i) * 0.03, p.y - i * 0.004, p.z + Math.cos(t * 6 + i) * 0.03);
        }
        attribute.needsUpdate = true;
    });

    return (
        <>
            <group ref={group}>
                <mesh raycast={() => null}>
                    <sphereGeometry args={[0.035, 10, 8]} />
                    <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
                <sprite scale={[0.5, 0.5, 1]} raycast={() => null}>
                    <spriteMaterial map={resources.texture} color="#ff9de2" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                </sprite>
                <group ref={wings}>
                    {[-1, 1].map((side) => (
                        <mesh key={side} position={[side * 0.05, 0.02, 0]} rotation={[0, 0, side * 0.4]} raycast={() => null}>
                            <planeGeometry args={[0.07, 0.1]} />
                            <meshBasicMaterial color="#e8f6ff" transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
                        </mesh>
                    ))}
                </group>
                <pointLight intensity={0.8} distance={3} decay={2} color="#ff9de2" />
            </group>
            <points ref={trail} geometry={resources.geometry} frustumCulled={false} raycast={() => null}>
                <pointsMaterial
                    map={resources.texture}
                    color="#ffd1f0"
                    size={0.06}
                    transparent
                    opacity={0.7}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </points>
        </>
    );
};

export const FairyCompanion: React.FC = () => {
    const owned = useUnlockStore((s) => Boolean(s.unlocked["shop-fairy"]));
    return owned ? <Fairy /> : null;
};
