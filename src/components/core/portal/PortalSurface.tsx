import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PortalView } from "../../../configs/portalLooks";
import { PORTAL_VERTEX, portalFragment } from "./portalScenes";

// The doorway itself: a flat arch (or rectangle) facing local +Z, threshold
// at y = 0, painted with the view of wherever it leads. It burns at the
// edge and brightens while aimed at.

// Hex colors go in as written (the shader works in display values, like
// the rest of this world's hand-written shaders).
const asIs = (hex: string) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

const archShape = (half: number, jamb: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, jamb);
    shape.absarc(0, jamb, half, 0, Math.PI, false);
    shape.lineTo(-half, 0);
    return shape;
};

export interface PortalSurfaceProps {
    view: PortalView;
    width: number;
    height: number; // threshold to the top
    shape?: "arch" | "rect";
    hovering: boolean;
    sealed?: boolean;
}

export const PortalSurface: React.FC<PortalSurfaceProps> = ({ view, width, height, shape = "arch", hovering, sealed = false }) => {
    const half = width / 2;
    const round = shape === "arch";
    const jamb = round ? Math.max(0.1, height - half) : height;
    const geometry = useMemo(() => {
        if (round) return new THREE.ShapeGeometry(archShape(half, jamb), 48);
        const plane = new THREE.PlaneGeometry(width, height);
        plane.translate(0, height / 2, 0);
        return plane;
    }, [round, half, jamb, width, height]);

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uHover: { value: 0 },
                    uSeal: { value: sealed ? 1 : 0 },
                    uHalf: { value: half },
                    uJamb: { value: jamb },
                    uRound: { value: round ? 1 : 0 },
                    uMirror: { value: view.mirror ? -1 : 1 },
                    uEye: { value: new THREE.Vector3(0, 1.6, 3) },
                    uA: { value: asIs(view.colors[0]) },
                    uB: { value: asIs(view.colors[1]) },
                    uC: { value: asIs(view.colors[2]) },
                    uRim: { value: asIs(view.rim) },
                },
                vertexShader: PORTAL_VERTEX,
                fragmentShader: portalFragment(view.scene),
                side: THREE.DoubleSide,
                toneMapped: false,
                fog: false,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [view, half, jamb, round]
    );
    useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
        },
        [geometry, material]
    );

    // The eye's position in the doorway's own space, every time it's drawn,
    // so the view behind it holds still in depth as you move.
    const mesh = useRef<THREE.Mesh>(null);
    useLayoutEffect(() => {
        const object = mesh.current;
        if (!object) return;
        const inverse = new THREE.Matrix4();
        object.onBeforeRender = (_renderer, _scene, camera) => {
            inverse.copy(object.matrixWorld).invert();
            material.uniforms.uEye.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
        };
        return () => {
            object.onBeforeRender = () => {};
        };
    }, [material]);

    useFrame(({ clock }, delta) => {
        const u = material.uniforms;
        u.uTime.value = clock.elapsedTime;
        const ease = Math.min(1, delta * 6);
        u.uHover.value += ((hovering ? 1 : 0) - u.uHover.value) * ease;
        u.uSeal.value += ((sealed ? 1 : 0) - u.uSeal.value) * Math.min(1, delta * 2);
    });

    return <mesh ref={mesh} geometry={geometry} material={material} />;
};
