import * as THREE from "three";
import { EnhancedMaterialSystem } from "../../../configs/enhancedMaterials";

// The rotunda's palette: white marble, lapis (fluted stone + kintsugi),
// deep green (tile + coffers) and brass. Every material comes from the
// shared cache; the option sets are unique to this room, so changing `side`
// here never leaks into another room's copy of the same texture.

let cached: ReturnType<typeof build> | null = null;

const build = () => {
    const system = EnhancedMaterialSystem.getInstance();
    const sided = <T extends THREE.Material>(material: T, side: THREE.Side) => {
        material.side = side;
        return material;
    };

    return {
        floor: system.pbr("marble-white", {
            repeat: 9,
            fallbackColor: "#ece6dc",
            tint: "#fbf7f0",
            roughness: 0.38,
            metalness: 0,
            envMapIntensity: 1.25,
            anisotropy: 8,
        }),
        ambulatoryFloor: system.pbr("tiles-fluted", {
            repeat: 7.5,
            fallbackColor: "#6e4a38",
            roughness: 0.8,
            metalness: 0,
            anisotropy: 8,
        }),
        kintsugi: system.pbr("kintsugi", {
            repeat: 5,
            fallbackColor: "#1d2f7a",
            roughness: 0.55,
            metalness: 1,
            envMapIntensity: 1.4,
            anisotropy: 8,
        }),
        poolFloor: system.pbr("kintsugi", {
            repeat: 1.5,
            fallbackColor: "#1d2f7a",
            roughness: 0.4,
            metalness: 1,
            anisotropy: 4,
        }),
        poolTile: sided(
            system.pbr("tiles-062", {
                repeat: [9, 0.3],
                fallbackColor: "#3d6b55",
                metalness: 0,
                roughness: 0.6,
            }),
            THREE.BackSide
        ),
        wallStone: sided(
            system.pbr("wall-stone", {
                repeat: [20, 2.6],
                fallbackColor: "#e9dcc4",
                tint: "#f4e6cc",
                roughness: 0.95,
                metalness: 0,
            }),
            THREE.BackSide
        ),
        wallGreen: sided(
            system.pbr("tiles-062", {
                repeat: [26, 2.4],
                fallbackColor: "#3d6b55",
                metalness: 0,
                roughness: 0.85,
            }),
            THREE.BackSide
        ),
        wallMarble: sided(
            system.pbr("marble-white", {
                repeat: [13, 1.7],
                fallbackColor: "#f1ebe1",
                tint: "#f8efe2",
                roughness: 0.65,
                metalness: 0,
            }),
            THREE.BackSide
        ),
        domeCoffers: sided(
            system.pbr("wood-coffers", {
                repeat: [20, 3],
                fallbackColor: "#2c4a3a",
                roughness: 0.75,
                metalness: 1,
            }),
            THREE.BackSide
        ),
        soffit: sided(
            system.pbr("wood-coffers", {
                repeat: 6.5,
                fallbackColor: "#2c4a3a",
                roughness: 0.8,
                metalness: 1,
            }),
            THREE.DoubleSide
        ),
        balconyFloor: system.pbr("tiles-fluted", {
            repeat: 6.5,
            fallbackColor: "#6e4a38",
            roughness: 0.75,
            metalness: 0,
            anisotropy: 8,
        }),
        columnShaft: system.pbr("stone-column", {
            repeat: [2, 1.25],
            fallbackColor: "#5770b8",
            roughness: 0.7,
            metalness: 0,
        }),
        newel: system.pbr("stone-column", {
            repeat: [2, 6],
            fallbackColor: "#5770b8",
            roughness: 0.7,
            metalness: 0,
        }),
        stairMarble: system.pbr("marble-white", {
            repeat: 0.55,
            fallbackColor: "#efe9df",
            tint: "#fffaf2",
            roughness: 0.42,
            metalness: 0,
            envMapIntensity: 1.2,
        }),
        trim: system.flat("atrium-trim", {
            color: "#efe7d8",
            roughness: 0.5,
            metalness: 0,
            side: THREE.DoubleSide,
        }),
        brass: system.flat("atrium-brass", {
            color: "#c39a55",
            roughness: 0.28,
            metalness: 1,
        }),
        bronze: system.flat("atrium-bronze", {
            color: "#6a5034",
            roughness: 0.42,
            metalness: 0.9,
        }),
        inlay: system.flat("atrium-inlay", {
            color: "#24473a",
            roughness: 0.3,
            metalness: 0,
            side: THREE.DoubleSide,
        }),
        soil: system.flat("atrium-soil", {
            color: "#2a1d14",
            roughness: 1,
            metalness: 0,
        }),
    };
};

export const getAtriumMaterials = () => (cached ??= build());
export type AtriumMaterials = ReturnType<typeof getAtriumMaterials>;
