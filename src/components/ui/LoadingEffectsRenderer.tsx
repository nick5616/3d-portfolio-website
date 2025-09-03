import {
    SpiralLinesEffect,
    MandelbrotEffect,
    DNAHelixEffect,
    CrystalFormationEffect,
    MathLoadingEffect,
    CourageLoadingEffect,
    ArtLoadingEffect,
    FitnessLoadingEffect,
    ForestLoadingEffect,
    LoadingEffectType,
} from "./loading-effects";

interface LoadingEffectsRendererProps {
    effectType?: LoadingEffectType;
}

export const LoadingEffectsRenderer = ({
    effectType = "spiral",
}: LoadingEffectsRendererProps) => {
    const renderEffect = () => {
        switch (effectType) {
            case "spiral":
                return <SpiralLinesEffect />;
            case "mandelbrot":
                return <MandelbrotEffect />;
            case "dna":
                return <DNAHelixEffect />;
            case "crystal":
                return <CrystalFormationEffect />;
            case "math":
                return <MathLoadingEffect />;
            case "courage":
                return <CourageLoadingEffect />;
            case "art":
                return <ArtLoadingEffect />;
            case "fitness":
                return <FitnessLoadingEffect />;
            case "forest":
                return <ForestLoadingEffect />;
            default:
                return <SpiralLinesEffect />;
        }
    };

    return <>{renderEffect()}</>;
};
