// src/configs/materials.ts
import * as THREE from "three";
import { RoomMaterials } from "../types/material.types";

// Load ceiling drop tiles textures
const ceilingDropTilesLoader = new THREE.TextureLoader();
const ceilingDropTilesBaseColor = ceilingDropTilesLoader.load(
    "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_basecolor.jpg"
);
const ceilingDropTilesNormal = ceilingDropTilesLoader.load(
    "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_normal.jpg"
);
const ceilingDropTilesRoughness = ceilingDropTilesLoader.load(
    "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_roughness.jpg"
);
const ceilingDropTilesAO = ceilingDropTilesLoader.load(
    "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_ambientOcclusion.jpg"
);

// Configure texture properties
ceilingDropTilesBaseColor.wrapS = ceilingDropTilesBaseColor.wrapT =
    THREE.RepeatWrapping;
ceilingDropTilesNormal.wrapS = ceilingDropTilesNormal.wrapT =
    THREE.RepeatWrapping;
ceilingDropTilesRoughness.wrapS = ceilingDropTilesRoughness.wrapT =
    THREE.RepeatWrapping;
ceilingDropTilesAO.wrapS = ceilingDropTilesAO.wrapT = THREE.RepeatWrapping;

// Set texture repeat for proper tiling
const tileRepeat = 4;
ceilingDropTilesBaseColor.repeat.set(tileRepeat, tileRepeat);
ceilingDropTilesNormal.repeat.set(tileRepeat, tileRepeat);
ceilingDropTilesRoughness.repeat.set(tileRepeat, tileRepeat);
ceilingDropTilesAO.repeat.set(tileRepeat, tileRepeat);

// Atrium - marble white with ethereal glow and ceiling drop tiles
export const atriumMaterials = {
    walls: new THREE.MeshStandardMaterial({
        color: "#f5f5f5",
        roughness: 0.3,
        metalness: 0.1,
        side: THREE.DoubleSide,
        envMapIntensity: 0.5,
    }),
    floor: new THREE.MeshStandardMaterial({
        color: "#e0e0e0",
        roughness: 0.3,
        metalness: 0.1,
    }),
    ceiling: new THREE.MeshStandardMaterial({
        map: ceilingDropTilesBaseColor,
        normalMap: ceilingDropTilesNormal,
        roughnessMap: ceilingDropTilesRoughness,
        aoMap: ceilingDropTilesAO,
        roughness: 0.3,
        metalness: 0.1,
        side: THREE.DoubleSide,
        envMapIntensity: 0.3,
    }),
};

// Gallery - elegant white with subtle gold accents
export const galleryMaterials = {
    walls: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide,
    }),
    dividers: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide,
        envMapIntensity: 0.3,
    }),
    floor: new THREE.MeshStandardMaterial({
        color: "#e8e8e8",
        roughness: 0.5,
        metalness: 0.1,
    }),
    ceiling: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.3,
        metalness: 0.2,
        emissive: "#ffd700",
        emissiveIntensity: 0.05,
        side: THREE.DoubleSide,
    }),
};

// Projects - futuristic dark with tech patterns
export const projectsMaterials = {
    walls: new THREE.MeshStandardMaterial({
        color: "#1a1a1a",
        roughness: 0.7,
        metalness: 0.3,
        side: THREE.DoubleSide,
    }),
    floor: new THREE.MeshStandardMaterial({
        color: "#2a2a2a",
        roughness: 0.6,
        metalness: 0.2,
    }),
    ceiling: new THREE.MeshStandardMaterial({
        color: "#0a0a0a",
        roughness: 0.8,
        metalness: 0.4,
        emissive: "#00ffff",
        emissiveIntensity: 0.1,
        side: THREE.DoubleSide,
    }),
};

// About - warm and inviting with natural tones
export const aboutMaterials = {
    walls: new THREE.MeshStandardMaterial({
        color: "#f0e6d3",
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
    }),
    floor: new THREE.MeshStandardMaterial({
        color: "#e6d5c3",
        roughness: 0.5,
        metalness: 0.1,
    }),
    ceiling: new THREE.MeshStandardMaterial({
        color: "#f5e6d3",
        roughness: 0.4,
        metalness: 0.05,
        emissive: "#ffa500",
        emissiveIntensity: 0.05,
        side: THREE.DoubleSide,
    }),
};

export const getRoomMaterials = (roomId: string): RoomMaterials => {
    switch (roomId) {
        case "atrium":
            return atriumMaterials;
        case "gallery":
            return galleryMaterials;
        case "projects":
            return projectsMaterials;
        case "about":
            return aboutMaterials;
        default:
            return atriumMaterials;
    }
};
