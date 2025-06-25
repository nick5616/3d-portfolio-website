// src/configs/materials.ts
import * as THREE from "three";
import { RoomMaterials } from "../types/material.types";

// Material disposal utility
export const disposeMaterials = (materials: RoomMaterials) => {
    Object.values(materials).forEach((material) => {
        if (material && typeof material.dispose === 'function') {
            material.dispose();
        }
    });
};

// Create materials with consistent settings
const createRoomMaterials = (config: {
    wallColor: string;
    floorColor: string;
    ceilingColor: string;
    emissiveColor?: string;
    emissiveIntensity?: number;
    wallRoughness?: number;
    wallMetalness?: number;
    floorRoughness?: number;
    floorMetalness?: number;
    ceilingRoughness?: number;
    ceilingMetalness?: number;
    dividerColor?: string;
}): RoomMaterials => {
    const materials: RoomMaterials = {
        walls: new THREE.MeshStandardMaterial({
            color: config.wallColor,
            roughness: config.wallRoughness ?? 0.4,
            metalness: config.wallMetalness ?? 0.1,
            side: THREE.DoubleSide,
            envMapIntensity: 0.5,
        }),
        floor: new THREE.MeshStandardMaterial({
            color: config.floorColor,
            roughness: config.floorRoughness ?? 0.5,
            metalness: config.floorMetalness ?? 0.1,
        }),
        ceiling: new THREE.MeshStandardMaterial({
            color: config.ceilingColor,
            roughness: config.ceilingRoughness ?? 0.3,
            metalness: config.ceilingMetalness ?? 0.05,
            emissive: config.emissiveColor ?? config.ceilingColor,
            emissiveIntensity: config.emissiveIntensity ?? 0.05,
            side: THREE.DoubleSide,
        }),
    };

    // Add divider material if specified
    if (config.dividerColor) {
        materials.dividers = new THREE.MeshStandardMaterial({
            color: config.dividerColor,
            roughness: 0.7,
            metalness: 0.0,
            side: THREE.DoubleSide,
            envMapIntensity: 0.3,
        });
    }

    return materials;
};

// Material configurations
const materialConfigs = {
    atrium: {
        wallColor: "#f5f5f5",
        floorColor: "#e0e0e0",
        ceilingColor: "#ffffff",
        emissiveColor: "#ffffff",
        emissiveIntensity: 0.1,
        wallRoughness: 0.3,
        wallMetalness: 0.1,
        floorRoughness: 0.3,
        floorMetalness: 0.1,
        ceilingRoughness: 0.2,
        ceilingMetalness: 0.05,
    },
    gallery: {
        wallColor: "#ffffff",
        floorColor: "#e8e8e8",
        ceilingColor: "#ffffff",
        emissiveColor: "#ffd700",
        emissiveIntensity: 0.05,
        dividerColor: "#ffffff",
        wallRoughness: 0.4,
        wallMetalness: 0.1,
        floorRoughness: 0.5,
        floorMetalness: 0.1,
        ceilingRoughness: 0.3,
        ceilingMetalness: 0.2,
    },
    projects: {
        wallColor: "#1a1a1a",
        floorColor: "#2a2a2a",
        ceilingColor: "#0a0a0a",
        emissiveColor: "#00ffff",
        emissiveIntensity: 0.1,
        wallRoughness: 0.7,
        wallMetalness: 0.3,
        floorRoughness: 0.6,
        floorMetalness: 0.2,
        ceilingRoughness: 0.8,
        ceilingMetalness: 0.4,
    },
    about: {
        wallColor: "#f0e6d3",
        floorColor: "#e6d5c3",
        ceilingColor: "#f5e6d3",
        emissiveColor: "#ffa500",
        emissiveIntensity: 0.05,
        wallRoughness: 0.6,
        wallMetalness: 0.1,
        floorRoughness: 0.5,
        floorMetalness: 0.1,
        ceilingRoughness: 0.4,
        ceilingMetalness: 0.05,
    },
};

// Cache to store created materials and prevent recreation
const materialsCache = new Map<string, RoomMaterials>();

export const getRoomMaterials = (roomId: string): RoomMaterials => {
    // Check cache first
    if (materialsCache.has(roomId)) {
        return materialsCache.get(roomId)!;
    }

    // Create new materials
    const config = materialConfigs[roomId as keyof typeof materialConfigs];
    if (!config) {
        console.warn(`No material configuration found for room: ${roomId}, using atrium materials`);
        return getRoomMaterials('atrium');
    }

    const materials = createRoomMaterials(config);
    materialsCache.set(roomId, materials);
    return materials;
};

// Cleanup function to dispose of cached materials
export const disposeCachedMaterials = (roomId?: string) => {
    if (roomId) {
        const materials = materialsCache.get(roomId);
        if (materials) {
            disposeMaterials(materials);
            materialsCache.delete(roomId);
        }
    } else {
        // Dispose all cached materials
        materialsCache.forEach((materials) => {
            disposeMaterials(materials);
        });
        materialsCache.clear();
    }
};

// Legacy materials for backwards compatibility
export const atriumMaterials = createRoomMaterials(materialConfigs.atrium);
export const galleryMaterials = createRoomMaterials(materialConfigs.gallery);
export const projectsMaterials = createRoomMaterials(materialConfigs.projects);
export const aboutMaterials = createRoomMaterials(materialConfigs.about);
