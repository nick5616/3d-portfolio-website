import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PortfolioProject } from "../../data/portfolio";
import { CATEGORY_COLORS, familyOf } from "./projectDna";

export const STRAND_HEIGHT = 2.1;
const STRAND_RADIUS = 0.22;
const BASE_Y = 0.55;
const STRUCTURE_COLOR = "#eef3ff";
// Gap between the top of the helix and its title/category labels.
const LABEL_LIFT = 0.45;

const nodeGeometry = new THREE.SphereGeometry(0.045, 10, 8);
const rungGeometry = (() => {
    const geometry = new THREE.CylinderGeometry(0.016, 0.016, STRAND_RADIUS * 2, 6);
    geometry.rotateZ(Math.PI / 2); // along X
    return geometry;
})();

// One project as a slowly turning double helix. Rungs are colored by the
// technology family of each item in its stack; the two backbones by its
// category. Brightens and spins up while aimed at.
export const ProjectStrand: React.FC<{
    project: PortfolioProject;
    position: [number, number, number];
    facing: number; // rotation.y so the label faces the room center
    aimed: boolean;
    enabledFamilies?: Record<string, boolean>;
}> = ({ project, position, facing, aimed, enabledFamilies }) => {
    const spin = useRef<THREE.Group>(null);
    const categoryColor = CATEGORY_COLORS[project.category] ?? "#dce6f2";

    const { rungs, nodes, backbone } = useMemo(() => {
        const techs = project.tech.length ? project.tech : ["TypeScript"];
        const count = THREE.MathUtils.clamp(techs.length * 2 + 4, 8, 16);
        // Newer projects twist a little tighter (pure flair).
        const year = Number((project.date ?? "2020").slice(0, 4)) || 2020;
        const twist = 0.5 + THREE.MathUtils.clamp((year - 2019) / 8, 0, 1) * 0.35;
        const step = STRAND_HEIGHT / (count - 1);

        const rungs = new THREE.InstancedMesh(rungGeometry, undefined, count);
        const nodes = new THREE.InstancedMesh(nodeGeometry, undefined, count * 2);
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const color = new THREE.Color();
        const pointsA: THREE.Vector3[] = [];
        const pointsB: THREE.Vector3[] = [];

        for (let k = 0; k < count; k++) {
            const angle = k * twist;
            const y = BASE_Y + k * step;
            const a = new THREE.Vector3(Math.cos(angle) * STRAND_RADIUS, y, Math.sin(angle) * STRAND_RADIUS);
            const b = a.clone().multiply(new THREE.Vector3(-1, 1, -1));
            pointsA.push(a);
            pointsB.push(b);

            quaternion.setFromAxisAngle(up, -angle);
            matrix.compose(new THREE.Vector3(0, y, 0), quaternion, new THREE.Vector3(1, 1, 1));
            rungs.setMatrixAt(k, matrix);
            rungs.setColorAt(k, color.set(familyOf(techs[k % techs.length]).color));

            matrix.makeTranslation(a.x, a.y, a.z);
            nodes.setMatrixAt(k * 2, matrix);
            matrix.makeTranslation(b.x, b.y, b.z);
            nodes.setMatrixAt(k * 2 + 1, matrix);
            // Nodes and backbones are plain white so the rung colors (the
            // stack) are the only color you read on a helix.
            color.set(STRUCTURE_COLOR);
            nodes.setColorAt(k * 2, color);
            nodes.setColorAt(k * 2 + 1, color);
        }

        const tube = (points: THREE.Vector3[]) =>
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), count * 6, 0.012, 5, false);
        const backbone = mergeGeometries([tube(pointsA), tube(pointsB)])!;
        return { rungs, nodes, backbone };
    }, [project, categoryColor]);

    // Holographic look: unlit, additive, not tone mapped.
    const glow = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            }),
        []
    );
    const backboneMaterial = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: STRUCTURE_COLOR,
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            }),
        [categoryColor]
    );

    useEffect(() => {
        rungs.material = glow;
        nodes.material = glow;
    }, [rungs, nodes, glow]);

    // Rungs whose tech family is switched off at the console go dark.
    useEffect(() => {
        const techs = project.tech.length ? project.tech : ["TypeScript"];
        const color = new THREE.Color();
        for (let k = 0; k < rungs.count; k++) {
            const family = familyOf(techs[k % techs.length]);
            color.set(family.color);
            if (enabledFamilies && enabledFamilies[family.id] === false) {
                color.multiplyScalar(0.08);
            }
            rungs.setColorAt(k, color);
        }
        if (rungs.instanceColor) rungs.instanceColor.needsUpdate = true;
    }, [rungs, project, enabledFamilies]);

    useEffect(
        () => () => {
            rungs.dispose();
            nodes.dispose();
            backbone.dispose();
            glow.dispose();
            backboneMaterial.dispose();
        },
        [rungs, nodes, backbone, glow, backboneMaterial]
    );

    const level = useRef(0);
    useFrame((_, delta) => {
        const target = aimed ? 1 : 0;
        level.current += (target - level.current) * Math.min(1, delta * 6);
        if (spin.current) {
            spin.current.rotation.y += delta * (0.25 + level.current * 0.9);
            const s = 1 + level.current * 0.06;
            spin.current.scale.set(s, s, s);
        }
        glow.opacity = 0.6 + level.current * 0.4;
        backboneMaterial.opacity = 0.45 + level.current * 0.45;
    });

    return (
        <group position={position} rotation={[0, facing, 0]}>
            <group ref={spin}>
                <primitive object={rungs} />
                <primitive object={nodes} />
                <mesh geometry={backbone} material={backboneMaterial} />
            </group>
            <Text
                position={[0, BASE_Y + STRAND_HEIGHT + LABEL_LIFT + 0.12, 0]}
                fontSize={0.12}
                maxWidth={1.2}
                textAlign="center"
                anchorX="center"
                anchorY="bottom"
                color={aimed ? "#ffffff" : "#d8e4ff"}
                outlineWidth={0.004}
                outlineColor="#05060d"
            >
                {project.title}
            </Text>
            <Text
                position={[0, BASE_Y + STRAND_HEIGHT + LABEL_LIFT, 0]}
                fontSize={0.065}
                anchorX="center"
                anchorY="bottom"
                color={categoryColor}
                letterSpacing={0.12}
            >
                {`${project.category.toUpperCase()}${project.date ? ` · ${project.date.slice(0, 4)}` : ""}`}
            </Text>
        </group>
    );
};
