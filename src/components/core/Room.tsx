import { useRef, useMemo } from "react";
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
  const [width, height, depth] = config.dimensions;
  const wallThickness = 0.1;
  const doorWidth = 3;
  const doorHeight = 4;
  const isGallery = config.id === "gallery";

  // Get materials based on room type
  const materials = useMemo(() => getRoomMaterials(config.id), [config.id]);

  const renderWallWithArch = (
    basePos: THREE.Vector3,
    rotation: [number, number, number],
    size: [number, number, number],
    archway = false
  ) => {
    if (!archway) {
      return (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh position={basePos} rotation={rotation}>
            <boxGeometry args={size} />
            <primitive object={materials.walls} attach="material" />
          </mesh>
        </RigidBody>
      );
    }

    const segments = [];
    const [wallWidth, wallHeight, wallDepth] = size;

    // Left section
    segments.push({
      position: new THREE.Vector3(
        basePos.x - (wallWidth / 4 + doorWidth / 4),
        basePos.y,
        basePos.z
      ),
      size: [(wallWidth - doorWidth) / 2, wallHeight, wallDepth],
    });

    // Right section
    segments.push({
      position: new THREE.Vector3(
        basePos.x + (wallWidth / 4 + doorWidth / 4),
        basePos.y,
        basePos.z
      ),
      size: [(wallWidth - doorWidth) / 2, wallHeight, wallDepth],
    });

    // Top section
    segments.push({
      position: new THREE.Vector3(
        basePos.x,
        basePos.y + (wallHeight - doorHeight) / 2,
        basePos.z
      ),
      size: [doorWidth, wallHeight - doorHeight, wallDepth],
    });

    return segments.map((segment, idx) => (
      <RigidBody key={`segment-${idx}`} type="fixed" colliders="cuboid">
        <mesh position={segment.position} rotation={rotation}>
          <boxGeometry args={segment.size} />
          <primitive object={materials.walls} attach="material" />
        </mesh>
      </RigidBody>
    ));
  };

  // Gallery divider configuration
  const galleryDividers = useMemo(() => {
    if (!isGallery) return [];

    return [
      // Vertical dividers
      {
        position: new THREE.Vector3(-width / 4, height / 2, 0),
        size: [wallThickness, height, depth * 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
      {
        position: new THREE.Vector3(width / 4, height / 2, 0),
        size: [wallThickness, height, depth * 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
      // Horizontal connector
      {
        position: new THREE.Vector3(0, height / 2, 0),
        size: [width / 2, height, wallThickness] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
    ];
  }, [isGallery, width, height, depth, wallThickness]);

  return (
    <group position={config.position}>
      {/* Lighting */}
      <ambientLight
        intensity={config.lightPreset.ambient.intensity}
        color={config.lightPreset.ambient.color}
      />
      <directionalLight
        position={config.lightPreset.directional.position}
        intensity={config.lightPreset.directional.intensity}
        color={config.lightPreset.directional.color}
        castShadow
      />

      {/* Floor */}
      <RigidBody type="fixed">
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, depth]} />
          <primitive object={materials.floor} attach="material" />
        </mesh>
      </RigidBody>

      {/* Main walls */}
      {renderWallWithArch(
        new THREE.Vector3(0, height / 2, -depth / 2),
        [0, 0, 0],
        [width, height, wallThickness],
        config.archways?.some((arch) => arch.position[2] === -depth / 2)
      )}
      {renderWallWithArch(
        new THREE.Vector3(0, height / 2, depth / 2),
        [0, 0, 0],
        [width, height, wallThickness],
        config.archways?.some((arch) => arch.position[2] === depth / 2)
      )}
      {renderWallWithArch(
        new THREE.Vector3(-width / 2, height / 2, 0),
        [0, Math.PI / 2, 0],
        [depth, height, wallThickness],
        config.archways?.some((arch) => arch.position[0] === -width / 2)
      )}
      {renderWallWithArch(
        new THREE.Vector3(width / 2, height / 2, 0),
        [0, Math.PI / 2, 0],
        [depth, height, wallThickness],
        config.archways?.some((arch) => arch.position[0] === width / 2)
      )}

      {/* Gallery dividers */}
      {isGallery &&
        galleryDividers.map((divider, index) => (
          <RigidBody key={`divider-${index}`} type="fixed" colliders="cuboid">
            <mesh position={divider.position} rotation={divider.rotation}>
              <boxGeometry args={divider.size} />
              <primitive object={materials.dividers} attach="material" />
            </mesh>
          </RigidBody>
        ))}

      {/* Interactive elements */}
      {config.interactiveElements.map((element) => (
        <InteractiveObject key={element.id} element={element} />
      ))}

      <Preload all />
    </group>
  );
};
