import React from "react";
import { RoomConfig } from "../../types/scene.types";

interface AtriumRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

export const AtriumRoom: React.FC<AtriumRoomProps> = ({ width, height }) => {
    return (
        <>
            <group>
                {/* Central ambient light - reduced intensity */}
                <pointLight
                    position={[0, height * 0.9, 0]}
                    intensity={0.4}
                    distance={25}
                    color="#FFFF99"
                    decay={1.5}
                />

                {/* Subtle ceiling spotlight for wood coffers */}
                <spotLight
                    position={[0, height * 0.6, 0]}
                    target-position={[0, height, 0]}
                    intensity={0.6}
                    distance={15}
                    angle={Math.PI / 3}
                    penumbra={0.3}
                    color="#FFF8DC" // Warm white to enhance wood tones
                />

                {/* Reduced rim lighting */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = 10;
                    return (
                        <pointLight
                            key={i}
                            position={[
                                Math.cos(angle) * radius,
                                height * 0.8,
                                Math.sin(angle) * radius,
                            ]}
                            intensity={0.2}
                            distance={15}
                            color="#FFF8DC"
                            decay={1.8}
                        />
                    );
                })}

                {/* Central ceiling lighting - reduced intensity */}
                <pointLight
                    position={[0, height * 0.85, 0]}
                    intensity={8}
                    distance={0}
                    color="#FFFFaa"
                    decay={0.4}
                />

                {/* Wall washing lights to make walls shine */}
                {Array.from({ length: 4 }, (_, i) => {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = width * 0.4;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    return (
                        <spotLight
                            key={`wall-wash-${i}`}
                            position={[x * 0.7, height * 0.8, z * 0.7]}
                            target-position={[x, height * 0.5, z]}
                            intensity={1.2}
                            distance={20}
                            angle={Math.PI / 4}
                            penumbra={0.4}
                            color="#FFFFFF"
                        />
                    );
                })}
            </group>
        </>
    );
};
