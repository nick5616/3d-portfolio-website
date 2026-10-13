import { Suspense, lazy } from "react";
import type { LoadingEffectType } from "./loading-effects";

// Each loading effect is its own small chunk: only the one actually shown
// gets downloaded.
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
    lazy(() => loader().then((m) => ({ default: m[name] })));

const EFFECTS: Record<LoadingEffectType, React.LazyExoticComponent<React.ComponentType>> = {
    spiral: named(() => import("./loading-effects/SpiralLinesEffect"), "SpiralLinesEffect"),
    mandelbrot: named(() => import("./loading-effects/MandelbrotEffect"), "MandelbrotEffect"),
    dna: named(() => import("./loading-effects/DNAHelixEffect"), "DNAHelixEffect"),
    crystal: named(() => import("./loading-effects/CrystalFormationEffect"), "CrystalFormationEffect"),
    rupee: named(() => import("./loading-effects/RupeeFormationEffect"), "RupeeFormationEffect"),
    math: named(() => import("./loading-effects/MathLoadingEffect"), "MathLoadingEffect"),
    courage: named(() => import("./loading-effects/CourageLoadingEffect"), "CourageLoadingEffect"),
    art: named(() => import("./loading-effects/ArtLoadingEffect"), "ArtLoadingEffect"),
    fitness: named(() => import("./loading-effects/FitnessLoadingEffect"), "FitnessLoadingEffect"),
    forest: named(() => import("./loading-effects/ForestLoadingEffect"), "ForestLoadingEffect"),
};

interface LoadingEffectsRendererProps {
    effectType?: LoadingEffectType;
}

export const LoadingEffectsRenderer = ({
    effectType = "spiral",
}: LoadingEffectsRendererProps) => {
    const Effect = EFFECTS[effectType] ?? EFFECTS.spiral;
    return (
        <Suspense fallback={null}>
            <Effect />
        </Suspense>
    );
};
