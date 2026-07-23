import React, { useMemo, useRef } from "react";
import { RoomConfig } from "../../types/scene.types";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GcsArtFrameByIndex } from "../models/GcsArtFrameByIndex";
import { LightSwitch } from "../ui/LightSwitch";
import { useSceneStore } from "../../stores/sceneStore";

interface GalleryAtriumRoomProps {
  config: RoomConfig;
  materials: any;
  wallThickness: number;
  width: number;
  height: number;
  depth: number;
}

// Exactly one "grandiose" piece per side, per the sketch - not a whole arc.
const LEFT_ANGLE_DEG = 45;
const RIGHT_ANGLE_DEG = 315;
const LEFT_INDEX = 0;
const RIGHT_INDEX = 1;

// The gallery wing's circular hub: a solid cylindrical wall (matching the
// precedent set by RelaxationRoom.tsx), two curated "grandiose" pieces
// (one per side), and a glowing glass rod at the center.
export const GalleryAtriumRoom: React.FC<GalleryAtriumRoomProps> = ({
  width,
  height,
  materials,
}) => {
  const radius = width / 2;
  const { galleryWhiteLightMode, toggleGalleryLightMode } = useSceneStore();

  // A ring of flat wall segments approximating the circle. A single
  // CylinderGeometry with a "hull"/"trimesh" collider was tried first, but
  // a hull collider on a solid (capped) cylinder produces a SOLID disc
  // collider, not a hollow tube - it blocks the whole room instead of just
  // the perimeter (the same bug that left RelaxationRoom unreachable).
  // Boxes-with-cuboid-colliders is the pattern every other room already
  // uses, and it's reliably hollow.
  const wallSegments = useMemo(() => {
    const segmentCount = 28;
    const thickness = 0.3;
    const segmentAngle = (Math.PI * 2) / segmentCount;
    // Slightly wider than the exact chord length so adjacent flat
    // segments overlap a hair and leave no gaps at the seams.
    const chordWidth = 2 * radius * Math.sin(segmentAngle / 2) * 1.08;

    return Array.from({ length: segmentCount }, (_, i) => {
      const theta = i * segmentAngle;
      const position: [number, number, number] = [
        Math.cos(theta) * radius,
        height / 2,
        Math.sin(theta) * radius,
      ];
      const rotationY = Math.PI / 2 - theta;
      return {
        id: i,
        position,
        rotationY,
        size: [chordWidth, height, thickness] as [number, number, number],
      };
    });
  }, [radius, height]);

  const featureRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (featureRef.current) {
      featureRef.current.rotation.y += delta * 0.3;
    }
  });

  const arcFrame = (angleDeg: number, index: number) => {
    const theta = (angleDeg * Math.PI) / 180;
    const wallInset = radius - 0.1;
    const position: [number, number, number] = [
      Math.cos(theta) * wallInset,
      2.8,
      Math.sin(theta) * wallInset,
    ];
    // Frame's front face normal is (sin(rotY), 0, cos(rotY)) - this needs
    // to point INWARD (toward the room center), i.e. the opposite of the
    // wall position's own outward radial direction (cos theta, 0, sin
    // theta). The previous "Math.PI/2 - theta" pointed outward instead,
    // so the artwork faced into the wall - all you could see from inside
    // was the plain wood frame box edge-on, looking like a thin brown bar.
    const rotation: [number, number, number] = [0, -Math.PI / 2 - theta, 0];
    return (
      <GcsArtFrameByIndex
        key={`atrium-feature-${index}`}
        position={position}
        rotation={rotation}
        scale={[1.6, 1.6, 1]}
        category="digitalart"
        artPieceIndex={index}
        useGcsStorage={true}
        showPlaque={true}
        proximityRadius={14}
      />
    );
  };

  return (
    <>
      {/* Lighting - GalleryAtriumRoom bypasses BaseRoom (like RelaxationRoom),
                so it must provide its own lights rather than reading config.lightPreset. */}
      <ambientLight
        intensity={galleryWhiteLightMode ? 0.6 : 0.3}
        color="#fff5e6"
      />
      <pointLight
        position={[0, height * 0.85, 0]}
        intensity={1.2}
        distance={radius * 2.5}
        color="#fff5e6"
        decay={1.2}
      />
      {/* Dramatic spot on the central rotating feature */}
      <spotLight
        position={[0, height - 0.5, 0]}
        target-position={[0, 3, 0]}
        intensity={3}
        distance={radius * 1.5}
        angle={Math.PI / 6}
        penumbra={0.4}
        color={galleryWhiteLightMode ? "#ffffff" : "#ffe9c7"}
        castShadow
      />
      {/* Accent rim lights around the wall */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * radius * 0.85;
        const z = Math.sin(angle) * radius * 0.85;
        return (
          <pointLight
            key={i}
            position={[x, height * 0.55, z]}
            intensity={0.4}
            distance={radius}
            color="#ffe9c7"
            decay={2}
          />
        );
      })}

      {/* Circular wall, built as a ring of flat segments with real cuboid colliders */}
      {wallSegments.map((segment) => (
        <RigidBody key={segment.id} type="fixed" colliders="cuboid">
          <mesh
            position={segment.position}
            rotation={[0, segment.rotationY, 0]}
          >
            <boxGeometry args={segment.size} />
            <primitive object={materials.walls} attach="material" />
          </mesh>
        </RigidBody>
      ))}

      {/* Flat drop ceiling */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48]} />
        <primitive object={materials.ceiling} attach="material" />
      </mesh>

      {/* Floor collision (flat box, matching RelaxationRoom's approach).
                Top face sits exactly at y=0, so the visual floor below is
                nudged up a hair to avoid z-fighting with it. */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[radius * 2.2, 0.2, radius * 2.2]} />
          <primitive object={materials.floor} attach="material" />
        </mesh>
      </RigidBody>

      {/* Visual floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48]} />
        <primitive object={materials.floor} attach="material" />
      </mesh>

      {/* Two curated "grandiose" pieces, one per side */}
      {arcFrame(LEFT_ANGLE_DEG, LEFT_INDEX)}
      {arcFrame(RIGHT_ANGLE_DEG, RIGHT_INDEX)}

      {/* Central feature: a glowing glass rod instead of a painting */}
      {/* <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[1.2, 1.4, 1.8, 32]} />
          <meshStandardMaterial
            color="#2c2c2c"
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      </RigidBody> */}
      <group ref={featureRef} position={[0, 0.8, 0]}>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 12, 24]} />
          <meshPhysicalMaterial
            color="#bfe8ff"
            emissive="#8fd8ff"
            emissiveIntensity={galleryWhiteLightMode ? 1.4 : 2.2}
            transmission={0.9}
            thickness={0.4}
            roughness={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
        <pointLight
          position={[0, 1.6, 0]}
          intensity={2}
          distance={radius * 1.2}
          color="#8fd8ff"
          decay={1.5}
        />
      </group>

      {/* Light switch for the whole wing */}
      <LightSwitch
        position={[radius - 0.05, 1.75, radius * 0.3]}
        rotation={[0, Math.PI, 0]}
        onToggle={toggleGalleryLightMode}
        isWhiteLight={galleryWhiteLightMode}
      />
    </>
  );
};
