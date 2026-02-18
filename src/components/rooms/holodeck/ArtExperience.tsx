import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { InteractiveEasel } from "../../models/InteractiveEasel";

const API_BASE = "https://holodeck-art-api-24500868376.us-central1.run.app";

interface FavoritePiece {
    id: string;
    url: string;
    title: string;
    tags: string[];
    uploadedAt: string;
}

// Separate component so texture loading triggers its own re-render
const WallPiece: React.FC<{
    url: string;
    title: string;
    position: [number, number, number];
}> = ({ url, title, position }) => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
            url,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                setTexture(tex);
            },
            undefined,
            (err) => console.warn("Failed to load texture:", err)
        );
        return () => {
            texture?.dispose();
        };
    }, [url]);

    return (
        <group position={position}>
            <mesh>
                <planeGeometry args={[1.4, 1.0]} />
                {texture ? (
                    <meshBasicMaterial map={texture} toneMapped={false} />
                ) : (
                    <meshBasicMaterial color="#CCCCCC" />
                )}
            </mesh>
            <Text
                position={[0, -0.6, 0]}
                fontSize={0.08}
                color="#333333"
                anchorX="center"
                anchorY="middle"
            >
                {title}
            </Text>
        </group>
    );
};

export const ArtExperience: React.FC = () => {
    const [favorites, setFavorites] = useState<FavoritePiece[]>([]);

    const fetchFavorites = useCallback(() => {
        fetch(`${API_BASE}/api/v1/art/favorites`)
            .then((res) => res.json())
            .then((data: { pieces: FavoritePiece[] }) => {
                setFavorites(data.pieces);
            })
            .catch((err) => {
                console.warn("Could not fetch favorites:", err);
            });
    }, []);

    // Fetch favorites from API on mount
    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const handleSubmit = useCallback(
        (blob: Blob) => {
            const formData = new FormData();
            formData.append("image", blob, `artwork-${Date.now()}.jpg`);

            fetch(`${API_BASE}/api/v1/art`, {
                method: "POST",
                body: formData,
            })
                .then((res) => {
                    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
                    return res.json();
                })
                .then(() => {
                    console.log("Artwork submitted successfully");
                    fetchFavorites();
                })
                .catch((err) => {
                    console.error("Failed to submit artwork:", err);
                });
        },
        [fetchFavorites]
    );

    // Wall display data
    const wallImages = useMemo(() => {
        return favorites.map((f) => ({ url: f.url, title: f.title }));
    }, [favorites]);

    return (
        <group>
            {/* Classroom tile floor */}
            <mesh position={[-0.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#F5F5DC" roughness={0.6} />
            </mesh>

            {/* Tile pattern */}
            {Array.from({ length: 64 }).map((_, i) => {
                const x = (i % 8) - 3.5;
                const z = Math.floor(i / 8) - 3.5;
                return (
                    <mesh
                        key={i}
                        position={[x, 0.11, z]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[0.9, 0.9]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? "#aa3344" : "#4433aa"}
                            roughness={0.7}
                        />
                    </mesh>
                );
            })}

            {/* Colorful walls */}
            {[
                {
                    pos: [-0.5, 2.5, -4] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number],
                    color: "#FFE4B5",
                    width: 8,
                },
                {
                    pos: [-0.5, 2.5, 4] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number],
                    color: "#E0FFFF",
                    width: 8,
                },
                {
                    pos: [-4.5, 2.5, 0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number],
                    color: "#F0FFF0",
                    width: 8,
                },
                {
                    pos: [3.5, 2.5, 0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number],
                    color: "#FFF0F5",
                    width: 8,
                },
            ].map((wall, idx) => (
                <mesh key={idx} position={wall.pos} rotation={wall.rot}>
                    <planeGeometry args={[wall.width, 5]} />
                    <meshStandardMaterial color={wall.color} roughness={0.8} />
                </mesh>
            ))}

            {/* Interactive easel - in center facing forward */}
            <InteractiveEasel
                position={[0, 0, -3]}
                rotation={[0, 0, 0]}
                onSubmit={handleSubmit}
            />

            {/* Cork board for artwork display - on back wall */}
            <group position={[0, 2.5, 3.9]} rotation={[0, Math.PI, 0]}>
                <mesh>
                    <planeGeometry args={[6, 2.5]} />
                    <meshStandardMaterial color="#DEB887" roughness={0.9} />
                </mesh>

                {/* Display favorites, or placeholder squares if none */}
                {wallImages.length === 0
                    ? Array.from({ length: 9 }).map((_, i) => {
                          const x = ((i % 3) - 1) * 1.8;
                          const y = (Math.floor(i / 3) - 1) * 0.7;
                          return (
                              <mesh key={i} position={[x, y, 0.02]}>
                                  <planeGeometry args={[0.5, 0.5]} />
                                  <meshBasicMaterial
                                      color={`hsl(${i * 40}, 70%, 80%)`}
                                      transparent
                                      opacity={0.9}
                                  />
                              </mesh>
                          );
                      })
                    : wallImages.map((img, i) => {
                          const col = i % 3;
                          const row = Math.floor(i / 3);
                          const x = (col - 1) * 1.8;
                          const y = (1 - row) * 0.7;
                          return (
                              <WallPiece
                                  key={img.url}
                                  url={img.url}
                                  title={img.title}
                                  position={[x, y, 0.02]}
                              />
                          );
                      })}
            </group>

            {/* Encouraging text - above cork board */}
            <Text
                position={[0, 4, 3.9]}
                fontSize={0.3}
                color="#FF69B4"
                anchorX="center"
                anchorY="middle"
                rotation={[0, Math.PI, 0]}
            >
                {"Teacher's Favorites"}
            </Text>

            {/* Art supplies scattered around - front area */}
            <group position={[-2, 0, 2]}>
                {/* Paint bottles */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <mesh key={i} position={[i * 0.25, 0.1, 0]}>
                        <cylinderGeometry args={[0.04, 0.04, 0.15]} />
                        <meshStandardMaterial
                            color={`hsl(${i * 60}, 80%, 60%)`}
                        />
                    </mesh>
                ))}
            </group>

            {/* Bright classroom lighting */}
            <pointLight
                position={[0, 4.5, 0]}
                intensity={1.2}
                distance={10}
                color="#FFFAF0"
            />
        </group>
    );
};
