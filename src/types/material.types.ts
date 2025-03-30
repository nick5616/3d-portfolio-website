import * as THREE from "three";

import { MeshStandardMaterial } from "three";

export interface RoomMaterials {
    walls: MeshStandardMaterial;
    floor: MeshStandardMaterial;
    ceiling: MeshStandardMaterial;
    dividers?: MeshStandardMaterial;
}

export interface WallSegment {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    size: THREE.Vector3;
}

export const createMaterialWithDebug = (params: {
    color: string;
    roughness: number;
    metalness: number;
    name: string;
}) => {
    const material = new THREE.MeshStandardMaterial({
        color: params.color,
        roughness: params.roughness,
        metalness: params.metalness,
        side: THREE.DoubleSide,
    });
    console.log(`Created material ${params.name}:`, {
        color: material.color,
        roughness: material.roughness,
        metalness: material.metalness,
    });
    return material;
};

// Atrium materials - marble white
export const atriumMaterials = {
    walls: createMaterialWithDebug({
        color: "#f5f5f5",
        roughness: 0.2,
        metalness: 0.1,
        name: "atrium-walls",
    }),
    floor: createMaterialWithDebug({
        color: "#e0e0e0",
        roughness: 0.3,
        metalness: 0.1,
        name: "atrium-floor",
    }),
};

// Gallery materials - pure gallery white
export const galleryMaterials = {
    walls: createMaterialWithDebug({
        color: "#ffffff",
        roughness: 0.1,
        metalness: 0.0,
        name: "gallery-walls",
    }),
    dividers: createMaterialWithDebug({
        color: "#f8f8f8",
        roughness: 0.15,
        metalness: 0.0,
        name: "gallery-dividers",
    }),
    floor: createMaterialWithDebug({
        color: "#e8e8e8",
        roughness: 0.2,
        metalness: 0.05,
        name: "gallery-floor",
    }),
};

// Projects room materials - concrete
export const projectsMaterials = {
    walls: createMaterialWithDebug({
        color: "#808080",
        roughness: 0.9,
        metalness: 0.0,
        name: "projects-walls",
    }),
    floor: createMaterialWithDebug({
        color: "#686868",
        roughness: 0.8,
        metalness: 0.0,
        name: "projects-floor",
    }),
};

export const getRoomMaterials = (roomId: string) => {
    console.log("Getting materials for room:", roomId);
    switch (roomId) {
        case "atrium":
            return atriumMaterials;
        case "gallery":
            return galleryMaterials;
        case "projects":
            return projectsMaterials;
        default:
            console.warn(
                "Unknown room ID, falling back to atrium materials:",
                roomId
            );
            return atriumMaterials;
    }
};
