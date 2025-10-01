import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { LoadingEffectsRenderer } from "./LoadingEffectsRenderer";
import { LoadingEffectType } from "./loading-effects";
import { useSceneStore } from "../../stores/sceneStore";

// Map holodeck experiences to loading effects
const EXPERIENCE_TO_EFFECT_MAP: Record<string, LoadingEffectType> = {
    computer: "courage",
    fitness: "fitness",
    art: "art",
    math: "math",
    forest: "forest",
    off: "spiral", // Changed from crystal to spiral for debugging
};

/**
 * HolodeckLoadingScreen - Handles loading transitions between holodeck experiences
 * This is completely separate from the initial app loading (EnhancedLoadingScreen)
 * Shows experience-specific themed loading effects during holodeck transitions
 */
export const HolodeckLoadingScreen: React.FC = () => {
    const { holodeckLoading, holodeckLoadingExperience, setHolodeckLoading } =
        useSceneStore();
    const [fadeOut, setFadeOut] = useState(false);
    const [visible, setVisible] = useState(false);

    // Handle holodeck loading state changes
    useEffect(() => {
        if (holodeckLoading) {
            console.log(
                `🎬 Showing holodeck loading screen for: ${holodeckLoadingExperience}`
            );
            setVisible(true);
            setFadeOut(false);
        } else if (visible) {
            console.log(`🎬 Hiding holodeck loading screen`);
            // Start fade out when loading completes
            setFadeOut(true);
            // Remove from DOM after fade completes
            const timer = setTimeout(() => {
                setVisible(false);
                console.log(`🎬 Holodeck loading screen hidden`);
                // Clear the experience after the screen is fully hidden
                setHolodeckLoading(false, null);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [holodeckLoading, visible, setHolodeckLoading]);

    // Prevent scrolling while holodeck is loading (but don't interfere with body scroll during initial app load)
    useEffect(() => {
        if (visible && !fadeOut) {
            // Only prevent scrolling if we're actually showing the holodeck loading screen
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";

            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [visible, fadeOut]);

    if (!visible) return null;

    // Get the appropriate effect for the loading experience
    const effectType = holodeckLoadingExperience
        ? EXPERIENCE_TO_EFFECT_MAP[holodeckLoadingExperience] || "mandelbrot" // Changed fallback from crystal to mandelbrot
        : "dna"; // Changed fallback from crystal to dna

    console.log(
        `🎨 Holodeck effect type: ${effectType} for experience: ${holodeckLoadingExperience}`
    );

    // Get display name for the experience
    const getExperienceName = (experience: string | null) => {
        switch (experience) {
            case "computer":
                return "Courage Experience";
            case "fitness":
                return "Fitness Experience";
            case "art":
                return "Art Experience";
            case "math":
                return "Math Experience";
            case "forest":
                return "Forest Experience";
            case "off":
                return "Holodeck";
            default:
                return "Experience";
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[60] transition-opacity duration-1000 ${
                fadeOut ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "#000" }}
        >
            {/* Experience-specific loading effects canvas */}
            <div className="absolute inset-0">
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    style={{ background: "black" }}
                >
                    <LoadingEffectsRenderer effectType={effectType} />
                </Canvas>
            </div>

            {/* Holodeck experience loading text overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                <div className="max-w-md w-full px-4">
                    <div className="text-center">
                        <div className="text-white text-xl font-light mb-4">
                            Loading{" "}
                            {getExperienceName(holodeckLoadingExperience)}
                        </div>
                        <div className="flex justify-center space-x-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <div
                                className="w-2 h-2 bg-white rounded-full animate-pulse"
                                style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-white rounded-full animate-pulse"
                                style={{ animationDelay: "0.4s" }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
