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

export const createMaterial = (params: {
    color: string;
    roughness: number;
    metalness: number;
}) => {
    return new THREE.MeshStandardMaterial({
        color: params.color,
        roughness: params.roughness,
        metalness: params.metalness,
        side: THREE.DoubleSide,
    });
};

// Atrium materials - marble white
export const atriumMaterials = {
    walls: createMaterial({
        color: "#f5f5f5",
        roughness: 0.2,
        metalness: 0.1,
    }),
    floor: createMaterial({
        color: "#e0e0e0",
        roughness: 0.3,
        metalness: 0.1,
    }),
};

// Gallery materials - pure gallery white
export const galleryMaterials = {
    walls: createMaterial({
        color: "#ffffff",
        roughness: 0.1,
        metalness: 0.0,
    }),
    dividers: createMaterial({
        color: "#f8f8f8",
        roughness: 0.15,
        metalness: 0.0,
    }),
    floor: createMaterial({
        color: "#e8e8e8",
        roughness: 0.2,
        metalness: 0.05,
    }),
};

// Projects room materials - concrete
export const projectsMaterials = {
    walls: createMaterial({
        color: "#808080",
        roughness: 0.9,
        metalness: 0.0,
    }),
    floor: createMaterial({
        color: "#686868",
        roughness: 0.8,
        metalness: 0.0,
    }),
};

export const getRoomMaterials = (roomId: string) => {
    switch (roomId) {
        case "atrium":
            return atriumMaterials;
        case "gallery":
            return galleryMaterials;
        case "projects":
            return projectsMaterials;
        default:
            // Unknown room ID, falling back to atrium materials
            return atriumMaterials;
    }
};
