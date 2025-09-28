import React, { useMemo } from "react";
import { Cylinder } from "@react-three/drei";
import { getEnhancedRoomMaterials } from "../../configs/enhancedMaterials";

export const GreekPillar: React.FC<{
    position: [number, number, number];
    scale?: [number, number, number];
}> = ({ position, scale = [1, 1, 1] }) => {
    // Get the stone column PBR material for the pillars - memoized for performance
    const stoneColumnMaterial = useMemo(() => {
        return (
            getEnhancedRoomMaterials("atrium").enhanced?.stoneColumn ||
            getEnhancedRoomMaterials("atrium").walls
        );
    }, []);

    return (
        <group position={position} scale={scale}>
            {/* Single solid cylinder pillar */}
            <Cylinder args={[0.5, 0.5, 4, 16]} position={[0, 2, 0]}>
                <primitive object={stoneColumnMaterial} attach="material" />
            </Cylinder>
        </group>
    );
};
