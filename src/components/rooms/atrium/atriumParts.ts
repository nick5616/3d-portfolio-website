import * as THREE from "three";

const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Position / Y-rotation / scale packed into a matrix for an InstancedMesh.
export const place = (
    x: number,
    y: number,
    z: number,
    rotationY = 0,
    scale: [number, number, number] = [1, 1, 1]
) =>
    new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rotationY),
        new THREE.Vector3(...scale)
    );

export const makeInstanced = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    matrices: THREE.Matrix4[]
) => {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
};

const lathe = (profile: [number, number][], segments: number) =>
    new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        segments
    );

// Shared, never disposed: tiny, and reused by every balustrade in the room.
let baluster: THREE.BufferGeometry | null = null;
// A turned baluster, 1 unit tall (scale Y to fit), base at y = 0.
export const getBalusterGeometry = () =>
    (baluster ??= lathe(
        [
            [0.0, 0.0],
            [0.06, 0.0],
            [0.06, 0.06],
            [0.034, 0.1],
            [0.03, 0.2],
            [0.052, 0.4],
            [0.058, 0.5],
            [0.044, 0.62],
            [0.024, 0.78],
            [0.034, 0.86],
            [0.056, 0.92],
            [0.056, 1.0],
            [0.0, 1.0],
        ],
        8
    ));

let urn: THREE.BufferGeometry | null = null;
// A classical planter urn, 1 unit tall, ~0.5 radius.
export const getUrnGeometry = () =>
    (urn ??= lathe(
        [
            [0.0, 0.0],
            [0.3, 0.0],
            [0.3, 0.07],
            [0.18, 0.13],
            [0.2, 0.22],
            [0.4, 0.42],
            [0.5, 0.62],
            [0.47, 0.8],
            [0.38, 0.87],
            [0.45, 0.93],
            [0.48, 1.0],
            [0.42, 1.0],
            [0.0, 0.94],
        ],
        16
    ));

// A wedge of a disc (pie slice) pointing along +X, extruded downward from
// y = 0 to y = -depth. Used for spiral stair treads.
export const wedgeGeometry = (radius: number, halfAngle: number, depth: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(Math.cos(-halfAngle) * radius, Math.sin(-halfAngle) * radius);
    shape.absarc(0, 0, radius, -halfAngle, halfAngle, false);
    shape.lineTo(0, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 6,
    });
    // Shape plane (x, y) -> floor plane (x, -z); extrusion +Z -> +Y.
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -depth, 0);
    return geometry;
};

// A surface swept between two curves sampled at the same parameters, as a
// strip of quads. `a(t)` / `b(t)` write into the target vector.
export const ribbonGeometry = (
    samples: number,
    a: (t: number, target: THREE.Vector3) => THREE.Vector3,
    b: (t: number, target: THREE.Vector3) => THREE.Vector3,
    uvScale: [number, number] = [1, 1]
) => {
    const positions = new Float32Array((samples + 1) * 2 * 3);
    const uvs = new Float32Array((samples + 1) * 2 * 2);
    const indices: number[] = [];
    const p = new THREE.Vector3();
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        a(t, p).toArray(positions, i * 6);
        b(t, p).toArray(positions, i * 6 + 3);
        uvs.set([t * uvScale[0], 0, t * uvScale[0], uvScale[1]], i * 4);
        if (i < samples) {
            const k = i * 2;
            indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
};

// Merge-and-forget: merges parts that share one material.
export { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
