import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ArtPiece } from "../../../configs/artMetadata";
import { requestArtTexture } from "../../../utils/artTextureLoader";
import { resizedImageUrl } from "../../../utils/artImages";
import { createTunnelMaterial, setMap } from "./truthShaders";

// Through the eye: every drawing at once, streaming past down a white
// tunnel that corkscrews tighter the further in you go, wrapped in ink
// lines. At the end a black pupil swallows the view and you're put back
// where you stood.

const PANELS = 38;
const DURATION = 9.5;
const FAR = -48; // the camera's far plane is 50 m
const IMAGE_SIZE = 1024; // same URLs as the cards, so they come from cache

interface Panel {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    theta: number;
    radius: number;
    z: number;
    speed: number;
    wall: boolean;
}

const helixLines = () => {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: "#0b0b0c" }) // the white fog fades them out;
    for (let i = 0; i < 9; i++) {
        const start = (i / 9) * Math.PI * 2;
        const radius = 2.8 + (i % 3) * 0.5;
        const points: THREE.Vector3[] = [];
        for (let k = 0; k <= 60; k++) {
            const z = (k / 60) * FAR;
            const a = start + z * 0.09 + Math.sin(z * 0.35 + i) * 0.25;
            const r = radius + Math.sin(z * 0.5 + i * 2) * 0.35;
            points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
        }
        const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 240, 0.018 + (i % 2) * 0.012, 5);
        group.add(new THREE.Mesh(geometry, material));
    }
    return group;
};

export const TruthTunnel: React.FC<{
    pieces: ArtPiece[];
    returning: boolean;
    onEnd: () => void;
}> = ({ pieces, returning, onEnd }) => {
    const camera = useThree((state) => state.camera);
    const root = useRef<THREE.Group>(null);
    const lines = useMemo(helixLines, []);
    const pupil = useRef<THREE.Mesh>(null);
    const clock = useRef(0);
    const ended = useRef(false);
    const baseQuaternion = useMemo(() => camera.quaternion.clone(), [camera]);
    const roll = useMemo(() => new THREE.Quaternion(), []);
    const forwardAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);

    const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 12, 12), []);
    const textures = useRef<THREE.Texture[]>([]);

    const panels = useMemo<Panel[]>(
        () =>
            Array.from({ length: PANELS }, (_, i) => {
                const material = createTunnelMaterial();
                const mesh = new THREE.Mesh(geometry, material);
                mesh.frustumCulled = false;
                mesh.visible = false;
                mesh.raycast = () => undefined;
                const wall = i % 3 !== 0;
                return {
                    mesh,
                    material,
                    theta: Math.random() * Math.PI * 2,
                    radius: wall ? 2.4 + Math.random() * 0.8 : 1.2 + Math.random() * 1.8,
                    z: FAR * (i / PANELS) - 6,
                    speed: 0.8 + Math.random() * 0.5,
                    wall,
                };
            }),
        [geometry]
    );

    const giveTexture = (panel: Panel) => {
        const list = textures.current;
        if (!list.length) return;
        const texture = list[Math.floor(Math.random() * list.length)];
        setMap(panel.material, texture);
        const image = texture.image as { width: number; height: number };
        const aspect = image.width / Math.max(image.height, 1);
        const longest = panel.wall ? 2.6 : 1.5;
        panel.material.uniforms.uSize.value.set(
            aspect >= 1 ? longest : longest * aspect,
            aspect >= 1 ? longest / aspect : longest
        );
        panel.material.uniforms.uWall.value = panel.wall ? 1 : 0;
        panel.mesh.visible = true;
    };

    // Everything you've got, as fast as it'll come.
    useEffect(() => {
        const requests = pieces.slice(0, 40).map((piece) =>
            requestArtTexture(resizedImageUrl(piece.url, IMAGE_SIZE), { maxSize: IMAGE_SIZE })
        );
        requests.forEach((request) =>
            request.promise.then(
                (texture) => {
                    textures.current.push(texture);
                    panels.forEach((panel) => {
                        if (!panel.mesh.visible) giveTexture(panel);
                    });
                },
                () => undefined
            )
        );
        return () => requests.forEach((request) => request.release());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pieces, panels]);

    useEffect(
        () => () => {
            geometry.dispose();
            panels.forEach((panel) => panel.material.dispose());
            lines.children.forEach((child) => (child as THREE.Mesh).geometry.dispose());
            ((lines.children[0] as THREE.Mesh | undefined)?.material as THREE.Material | undefined)?.dispose();
        },
        [geometry, panels, lines]
    );

    // Line the tunnel up with where you were looking as you fell in.
    useEffect(() => {
        if (!root.current) return;
        root.current.position.copy(camera.position);
        root.current.quaternion.copy(camera.quaternion);
    }, [camera]);

    useFrame(({ clock: three }, rawDelta) => {
        const delta = Math.min(rawDelta, 1 / 20);
        clock.current += delta;
        const t = clock.current;
        const time = three.elapsedTime;

        // Faster and faster, twisting harder the deeper you go.
        const rush = 9 + 34 * THREE.MathUtils.smoothstep(t, 0.3, 6.5);
        const twist = 0.025 + 0.07 * THREE.MathUtils.smoothstep(t, 1, 7) * Math.sin(time * 0.6 + 0.8);
        // Near the end everything is drawn into the middle.
        const converge = THREE.MathUtils.smoothstep(t, DURATION - 2.2, DURATION - 0.6);

        panels.forEach((panel) => {
            panel.z += rush * panel.speed * delta;
            panel.theta += delta * (0.25 + (panel.wall ? 0.1 : 0.45));
            if (panel.z > 2) {
                panel.z = FAR - Math.random() * 10;
                panel.theta = Math.random() * Math.PI * 2;
                giveTexture(panel);
            }
            const u = panel.material.uniforms;
            u.uTime.value = time;
            u.uZ.value = panel.z;
            u.uTheta.value = panel.theta;
            u.uRadius.value = Math.max(0.05, panel.radius * (1 - converge * 0.95));
            u.uTwist.value = twist;
            u.uStretch.value = panel.wall ? 1 + rush / 14 : 1;
        });

        lines.rotation.z += delta * (0.3 + rush * 0.02);
        lines.scale.set(1 - converge * 0.9, 1 - converge * 0.9, 1);

        // The pupil at the end of the tunnel opens until it's all you see.
        if (pupil.current) {
            const open = THREE.MathUtils.smoothstep(t, DURATION - 1.6, DURATION);
            pupil.current.scale.setScalar(0.001 + open * open * 14);
        }

        // A slow, sick roll.
        if (!returning) {
            roll.setFromAxisAngle(forwardAxis, Math.sin(t * 0.55) * 0.28 + t * 0.04);
            camera.quaternion.copy(baseQuaternion).multiply(roll);
        }

        if (t >= DURATION && !ended.current) {
            ended.current = true;
            onEnd();
        }
    });

    return (
        <group ref={root}>
            <primitive object={lines} />
            {panels.map((panel, i) => (
                <primitive key={i} object={panel.mesh} />
            ))}
            <mesh ref={pupil} position={[0, 0, -7]} renderOrder={5}>
                <circleGeometry args={[1, 48]} />
                <meshBasicMaterial color="#050505" fog={false} toneMapped={false} depthTest={false} />
            </mesh>
        </group>
    );
};
