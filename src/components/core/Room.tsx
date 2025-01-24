// src/components/core/Room.tsx
import { useRef } from "react";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import { InteractiveObject } from "./InteractiveObject";
import { useSceneStore } from "../../stores/sceneStore";
import { getRoomMaterials } from "../../configs/materials";

interface RoomProps {
  config: RoomConfig;
}

export const Room: React.FC<RoomProps> = ({ config }) => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const [width, height, depth] = config.dimensions;
  const wallThickness = 0.1;
  const doorWidth = 3;
  const doorHeight = 4;
  const materials = getRoomMaterials(config.id);

  const hasArchwayAtPosition = (pos: THREE.Vector3) => {
    return (
      config.archways?.some((arch) => {
        const archPos = new THREE.Vector2(arch.position[0], arch.position[2]);
        const wallPos = new THREE.Vector2(pos.x, pos.z);
        return archPos.distanceTo(wallPos) < 1;
      }) ?? false
    );
  };

  return (
    <group position={config.position}>
      {/* Lighting */}
      <ambientLight
        intensity={config.lightPreset.ambient.intensity}
        color={config.lightPreset.ambient.color}
      />
      <directionalLight
        ref={directionalLightRef}
        position={config.lightPreset.directional.position}
        intensity={config.lightPreset.directional.intensity}
        color={config.lightPreset.directional.color}
        castShadow
      />
      {/* Floor */}
      <RigidBody type="fixed">
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
      </RigidBody>
      {[
        {
          id: "north",
          position: new THREE.Vector3(0, height / 2, -depth / 2),
          rotation: new THREE.Euler(0, 0, 0),
          isVertical: false,
        },
        {
          id: "south",
          position: new THREE.Vector3(0, height / 2, depth / 2),
          rotation: new THREE.Euler(0, 0, 0),
          isVertical: false,
        },
        {
          id: "east",
          position: new THREE.Vector3(width / 2, height / 2, 0),
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          isVertical: true,
        },
        {
          id: "west",
          position: new THREE.Vector3(-width / 2, height / 2, 0),
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          isVertical: true,
        },
      ].map((wall) => {
        if (hasArchwayAtPosition(wall.position as THREE.Vector3)) {
          const sideWidth = (wall.isVertical ? depth : width - doorWidth) / 2;
          return (
            <group
              key={wall.id}
              position={wall.position}
              rotation={wall.rotation}
            >
              {/* Left segment */}
              <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[-sideWidth / 2 - doorWidth / 2, 0, 0]}>
                  <boxGeometry args={[sideWidth, height, wallThickness]} />
                  <primitive object={materials.walls} attach="material" />
                </mesh>
              </RigidBody>

              {/* Right segment */}
              <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[sideWidth / 2 + doorWidth / 2, 0, 0]}>
                  <boxGeometry args={[sideWidth, height, wallThickness]} />
                  <primitive object={materials.walls} attach="material" />
                </mesh>
              </RigidBody>

              {/* Top segment */}
              <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, height / 2 - doorHeight / 2, 0]}>
                  <boxGeometry
                    args={[doorWidth, height - doorHeight, wallThickness]}
                  />
                  <primitive object={materials.walls} attach="material" />
                </mesh>
              </RigidBody>
            </group>
          );
        } else {
          return (
            <RigidBody type="fixed" colliders="cuboid" key={wall.id}>
              <mesh position={wall.position} rotation={wall.rotation}>
                <boxGeometry
                  args={[
                    wall.isVertical ? depth : width,
                    height,
                    wallThickness,
                  ]}
                />
                <primitive object={materials.walls} attach="material" />
              </mesh>
            </RigidBody>
          );
        }
      })}
      {config.id === "gallery" && (
        <>
          {/* Vertical dividers */}
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={new THREE.Vector3(-width / 4, height / 2, 0)}>
              <boxGeometry args={[wallThickness, height, depth * 0.6]} />
              <primitive
                object={materials.dividers || materials.walls}
                attach="material"
              />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={new THREE.Vector3(width / 4, height / 2, 0)}>
              <boxGeometry args={[wallThickness, height, depth * 0.6]} />
              <primitive
                object={materials.dividers || materials.walls}
                attach="material"
              />
            </mesh>
          </RigidBody>
          {/* Horizontal connector */}
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={new THREE.Vector3(0, height / 2, 0)}>
              <boxGeometry args={[width / 2, height, wallThickness]} />
              <primitive
                object={materials.dividers || materials.walls}
                attach="material"
              />
            </mesh>
          </RigidBody>
        </>
      )}
      ```
      {/* Interactive elements */}
      {config.interactiveElements.map((element) => (
        <InteractiveObject key={element.id} element={element} />
      ))}
      <Preload all />
    </group>
  );
};
