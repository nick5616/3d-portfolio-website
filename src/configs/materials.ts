// src/configs/materials.ts
import * as THREE from "three";
import { RoomMaterials } from "../types/material.types";

// Atrium - marble white
export const atriumMaterials = {
  walls: new THREE.MeshStandardMaterial({
    color: "#f5f5f5",
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: "#e0e0e0",
    roughness: 0.3,
    metalness: 0.1,
  }),
};

// Gallery - flat white
export const galleryMaterials = {
  walls: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.9, // Very rough for flat appearance
    metalness: 0.0, // No metallic quality
    side: THREE.DoubleSide,
  }),
  dividers: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: "#f0f0f0",
    roughness: 0.7,
    metalness: 0.0,
  }),
};

// Projects - concrete
export const projectsMaterials = {
  walls: new THREE.MeshStandardMaterial({
    color: "#808080",
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: "#686868",
    roughness: 0.9,
    metalness: 0.0,
  }),
};

// About - dark theme
export const aboutMaterials = {
  walls: new THREE.MeshStandardMaterial({
    color: "#2c2c2c",
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    roughness: 0.7,
    metalness: 0.1,
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
