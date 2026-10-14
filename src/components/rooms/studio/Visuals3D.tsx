import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Signal } from "./studioSignal";

// The song-visualizer's ideas, in the room with you: shapes of light that
// float over the stage in the middle of the studio, built from the same
// bands and spectrum as the LED wall. One mode at a time.

export type Mode3D = "orbit" | "helix" | "tunnel" | "terrain" | "geometry";
export const MODES_3D: Mode3D[] = ["orbit", "helix", "tunnel", "terrain", "geometry"];
export const MODE_NAMES: Record<Mode3D, string> = {
    orbit: "Radial",
    helix: "Helix",
    tunnel: "Tunnel",
    terrain: "Terrain",
    geometry: "Geometry",
};

interface ModeProps {
    signal: React.MutableRefObject<Signal>;
    palette: THREE.Color[];
}

const glow = () =>
    new THREE.MeshBasicMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
    });

const useInstanced = (geometry: THREE.BufferGeometry, count: number) => {
    const mesh = useMemo(() => {
        const m = new THREE.InstancedMesh(geometry, glow(), count);
        m.setColorAt(0, new THREE.Color());
        m.frustumCulled = false;
        return m;
    }, [geometry, count]);
    useEffect(
        () => () => {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        },
        [mesh]
    );
    return mesh;
};

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// Radial bars standing on a ring that turns slowly through the air.
const Orbit: React.FC<ModeProps> = ({ signal, palette }) => {
    const count = 96;
    const bars = useInstanced(useMemo(() => new THREE.BoxGeometry(0.05, 1, 0.05).translate(0, 0.5, 0), []), count);
    const core = useRef<THREE.Mesh>(null);
    const group = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        const b = signal.current;
        const t = clock.elapsedTime;
        const inner = 0.75 + b.bass * 0.45;
        for (let i = 0; i < count; i++) {
            const val = b.spectrum[Math.floor((i / count) * 128)] / 255;
            const a = (i / count) * Math.PI * 2;
            _p.set(Math.cos(a) * inner, Math.sin(a) * inner, 0);
            _q.setFromEuler(_e.set(0, 0, a - Math.PI / 2));
            _s.set(1, 0.05 + val * 1.6, 1);
            bars.setMatrixAt(i, _m.compose(_p, _q, _s));
            bars.setColorAt(i, _c.copy(palette[i % palette.length]).multiplyScalar(0.5 + val));
        }
        bars.instanceMatrix.needsUpdate = true;
        bars.instanceColor!.needsUpdate = true;
        if (group.current) group.current.rotation.set(Math.sin(t * 0.2) * 0.4, t * 0.25, t * 0.1);
        if (core.current) {
            core.current.scale.setScalar(0.4 + b.bass * 0.5 + b.drop * 0.4);
            (core.current.material as THREE.MeshBasicMaterial).color.copy(palette[0]).multiplyScalar(0.4 + b.bass);
        }
    });
    return (
        <group ref={group}>
            <primitive object={bars} />
            <mesh ref={core}>
                <sphereGeometry args={[1, 32, 16]} />
                <meshBasicMaterial transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
        </group>
    );
};

// A double helix of beads with glowing rungs, rising through the stage.
const Helix: React.FC<ModeProps> = ({ signal, palette }) => {
    const beads = 120;
    const rungs = 40;
    const beadMesh = useInstanced(useMemo(() => new THREE.SphereGeometry(0.05, 10, 8), []), beads * 2);
    const rungMesh = useInstanced(useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1, 6).rotateZ(Math.PI / 2), []), rungs);
    useFrame(({ clock }) => {
        const b = signal.current;
        const t = clock.elapsedTime;
        const height = 3.4;
        const amp = 0.6 + b.bass * 0.5 + b.mid * 0.2;
        const turns = 3;
        for (let strand = 0; strand < 2; strand++) {
            for (let i = 0; i < beads; i++) {
                const frac = i / beads;
                const val = b.spectrum[Math.floor(frac * 127)] / 255;
                const theta = frac * Math.PI * 2 * turns + t * 0.9 + strand * Math.PI;
                const r = amp * (0.7 + val * 0.6);
                _p.set(Math.cos(theta) * r, frac * height - height / 2, Math.sin(theta) * r);
                _s.setScalar(0.7 + val * 1.6);
                beadMesh.setMatrixAt(strand * beads + i, _m.compose(_p, _q.identity(), _s));
                beadMesh.setColorAt(strand * beads + i, _c.copy(palette[strand]).multiplyScalar(0.6 + val));
            }
        }
        for (let i = 0; i < rungs; i++) {
            const frac = (i + 0.5) / rungs;
            const val = b.spectrum[Math.floor(frac * 127)] / 255;
            const theta = frac * Math.PI * 2 * turns + t * 0.9;
            const r = amp * (0.7 + val * 0.6);
            _p.set(0, frac * height - height / 2, 0);
            _q.setFromEuler(_e.set(0, -theta, 0));
            _s.set(r * 2, 1 + val * 2, 1 + val * 2);
            rungMesh.setMatrixAt(i, _m.compose(_p, _q, _s));
            rungMesh.setColorAt(i, _c.copy(palette[(i + 2) % palette.length]).multiplyScalar(0.2 + val * 0.9));
        }
        [beadMesh, rungMesh].forEach((m) => {
            m.instanceMatrix.needsUpdate = true;
            m.instanceColor!.needsUpdate = true;
        });
    });
    return (
        <>
            <primitive object={beadMesh} />
            <primitive object={rungMesh} />
        </>
    );
};

// Rings racing toward you out of the stage, breathing with the spectrum.
const Tunnel: React.FC<ModeProps> = ({ signal, palette }) => {
    const count = 28;
    const rings = useInstanced(useMemo(() => new THREE.TorusGeometry(1, 0.02, 6, 64), []), count);
    const travel = useRef(0);
    useFrame(({ clock }, delta) => {
        const b = signal.current;
        const t = clock.elapsedTime;
        travel.current += delta * (0.6 + b.total * 3 + b.drop * 4);
        const length = 7;
        for (let i = 0; i < count; i++) {
            const depth = ((i / count) * length + travel.current) % length; // 0 far .. length near
            const val = b.spectrum[Math.floor((i / count) * 127)] / 255;
            const z = depth - length + 1.5;
            const fade = Math.sin((depth / length) * Math.PI);
            _p.set(Math.sin(t * 0.7 + depth) * 0.3, Math.cos(t * 0.5 + depth) * 0.2, z);
            _q.setFromEuler(_e.set(0, 0, t * 0.3 + i));
            _s.setScalar((0.6 + val * 0.9) * (0.6 + depth / length));
            rings.setMatrixAt(i, _m.compose(_p, _q, _s));
            rings.setColorAt(i, _c.copy(palette[i % palette.length]).multiplyScalar(fade * (0.4 + val)));
        }
        rings.instanceMatrix.needsUpdate = true;
        rings.instanceColor!.needsUpdate = true;
    });
    return <primitive object={rings} />;
};

// A synthwave landscape of light scrolling toward you; each new row is the
// spectrum of that moment.
const Terrain: React.FC<ModeProps> = ({ signal, palette }) => {
    const cols = 48;
    const rows = 36;
    const geometry = useMemo(() => new THREE.PlaneGeometry(6, 5, cols - 1, rows - 1).rotateX(-Math.PI / 2), []);
    const history = useRef(Array.from({ length: rows }, () => new Float32Array(cols)));
    const scroll = useRef(0);
    const material = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                wireframe: true,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
                fog: false,
            }),
        []
    );
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);
    useFrame((_, delta) => {
        const b = signal.current;
        scroll.current += delta * (2 + b.total * 6);
        while (scroll.current > 1) {
            scroll.current -= 1;
            const row = history.current.pop()!;
            for (let c = 0; c < cols; c++) {
                const mirror = Math.abs(c - (cols - 1) / 2) / ((cols - 1) / 2); // centre = low bins
                row[c] = (b.spectrum[Math.floor(mirror * 100)] / 255) * (0.3 + mirror * 0.9);
            }
            history.current.unshift(row);
        }
        const position = geometry.attributes.position as THREE.BufferAttribute;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Row 0 is the far edge: new rows appear there and roll toward you.
                position.setY(r * cols + c, history.current[r][c] * 1.4);
            }
        }
        position.needsUpdate = true;
        material.color.copy(palette[0]).lerp(palette[2], b.bass).multiplyScalar(0.6 + b.total + b.drop);
    });
    return <mesh geometry={geometry} material={material} position={[0, -1.2, -0.5]} />;
};

// Nested platonic solids in wireframe, flexing on the bass, with sparks
// thrown off on every drop.
const Geometry: React.FC<ModeProps> = ({ signal, palette }) => {
    const outer = useRef<THREE.Mesh>(null);
    const inner = useRef<THREE.Mesh>(null);
    const sparks = useRef<THREE.Points>(null);
    const sparkData = useMemo(() => {
        const count = 400;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return { count, positions, velocities, geometry, life: 0 };
    }, []);
    useEffect(() => () => sparkData.geometry.dispose(), [sparkData]);
    useFrame(({ clock }, delta) => {
        const b = signal.current;
        const t = clock.elapsedTime;
        if (outer.current) {
            outer.current.rotation.set(t * 0.3, t * 0.4, 0);
            outer.current.scale.setScalar(1.1 + b.bass * 0.6 + b.drop * 0.3);
            (outer.current.material as THREE.MeshBasicMaterial).color.copy(palette[0]).multiplyScalar(0.5 + b.mid);
        }
        if (inner.current) {
            inner.current.rotation.set(-t * 0.5, t * 0.2, t * 0.6);
            inner.current.scale.setScalar(0.6 + b.high * 0.6);
            (inner.current.material as THREE.MeshBasicMaterial).color.copy(palette[1]).multiplyScalar(0.5 + b.high * 1.5);
        }
        // Sparks burst out on drops and drift away.
        if (b.drop > 0.6 && sparkData.life <= 0.2) {
            sparkData.life = 1;
            for (let i = 0; i < sparkData.count; i++) {
                const v = new THREE.Vector3().randomDirection().multiplyScalar(1 + Math.random() * 3);
                sparkData.velocities.set([v.x, v.y, v.z], i * 3);
                sparkData.positions.set([0, 0, 0], i * 3);
            }
        }
        sparkData.life = Math.max(0, sparkData.life - delta * 0.7);
        for (let i = 0; i < sparkData.count * 3; i++) sparkData.positions[i] += sparkData.velocities[i] * delta;
        sparkData.geometry.attributes.position.needsUpdate = true;
        if (sparks.current) {
            const m = sparks.current.material as THREE.PointsMaterial;
            m.opacity = sparkData.life;
            m.color.copy(palette[2]);
        }
    });
    return (
        <>
            <mesh ref={outer}>
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial wireframe transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh ref={inner}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshBasicMaterial wireframe transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <points ref={sparks} geometry={sparkData.geometry} frustumCulled={false}>
                <pointsMaterial size={0.05} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </points>
        </>
    );
};

export const Visuals3D: React.FC<ModeProps & { mode: Mode3D }> = ({ mode, ...props }) => {
    switch (mode) {
        case "orbit":
            return <Orbit {...props} />;
        case "helix":
            return <Helix {...props} />;
        case "tunnel":
            return <Tunnel {...props} />;
        case "terrain":
            return <Terrain {...props} />;
        case "geometry":
            return <Geometry {...props} />;
    }
};
