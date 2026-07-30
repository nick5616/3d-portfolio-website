// src/utils/rupeeGeometry.ts
// The Zelda-style hexagonal rupee gem shape, factored out so decorative
// (non-collectible) uses - like the achievement wall's rupee plaques - can
// render the real rupee silhouette instead of a generic placeholder shape.
import * as THREE from "three";

export const createRupeeGeometry = (): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array([
        // Front hexagon vertices (0-6)
        0, 0, 0, 0, 2.0, 0, 0.866, 1.0, 0, 0.866, -1.0, 0, 0, -2.0, 0, -0.866,
        -1.0, 0, -0.866, 1.0, 0,

        // Back hexagon vertices (7-13)
        0, 0, -0.5, 0, 2.0, -0.5, 0.866, 1.0, -0.5, 0.866, -1.0, -0.5, 0, -2.0,
        -0.5, -0.866, -1.0, -0.5, -0.866, 1.0, -0.5,

        // Middle ridge vertices (14-19). Each one is the matching front-hex
        // vertex scaled by the same RIDGE_SCALE factor from the center -
        // that uniform radial scale is what makes every side facet a true
        // planar quad (a frustum lateral face), not just two triangles that
        // are almost, but not quite, coplanar. Hand-picked numbers here
        // (rather than an exact multiple) cause a visible crease down the
        // middle of each facet once the gem is flat-shaded.
        0, 2.6, -0.25, 1.126, 1.3, -0.25, 1.126, -1.3, -0.25, 0, -2.6, -0.25,
        -1.126, -1.3, -0.25, -1.126, 1.3, -0.25,
    ]);

    const indices = new Uint16Array([
        // Front hexagon faces
        0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1,

        // Back hexagon faces
        7, 8, 9, 7, 9, 10, 7, 10, 11, 7, 11, 12, 7, 12, 13, 7, 13, 8,

        // Connect front to middle ridge
        1, 14, 2, 14, 15, 2, 2, 15, 3, 15, 16, 3, 3, 16, 4, 16, 17, 4, 4, 17,
        5, 17, 18, 5, 5, 18, 6, 18, 19, 6, 6, 19, 1, 19, 14, 1,

        // Connect back to middle ridge
        8, 14, 9, 14, 15, 9, 9, 15, 10, 15, 16, 10, 10, 16, 11, 16, 17, 11, 11,
        17, 12, 17, 18, 12, 12, 18, 13, 18, 19, 13, 13, 19, 8, 19, 14, 8,
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // De-index so each triangle owns its own vertices - otherwise
    // computeVertexNormals() averages normals across shared vertices at
    // facet edges, which smooths the gem into a rounded blob instead of
    // showing distinct, light-catching facets.
    const flatGeometry = geometry.toNonIndexed();
    flatGeometry.computeVertexNormals();

    return flatGeometry;
};
