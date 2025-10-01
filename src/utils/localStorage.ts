// Local storage utilities for persisting performance settings
export interface PerformanceSettings {
    showStats: boolean;
    monitoring: boolean;
    quality: "low" | "medium" | "high";
}

const STORAGE_KEY = "portfolio-performance-settings";

/**
 * Get default performance settings values
 */
export const getDefaultPerformanceSettings = (): PerformanceSettings => ({
    showStats: false,
    monitoring: true,
    quality: "high",
});

/**
 * Load performance settings from localStorage with fallback to defaults
 */
export const loadPerformanceSettings = (): PerformanceSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return getDefaultPerformanceSettings();
        }

        const parsed = JSON.parse(stored);

        // Merge with defaults to handle missing properties in stored data
        const defaults = getDefaultPerformanceSettings();
        return {
            showStats: parsed.showStats ?? defaults.showStats,
            monitoring: parsed.monitoring ?? defaults.monitoring,
            quality: parsed.quality || defaults.quality,
        };
    } catch (error) {
        console.warn(
            "Failed to load performance settings from localStorage:",
            error
        );
        return getDefaultPerformanceSettings();
    }
};

/**
 * Save performance settings to localStorage
 */
export const savePerformanceSettings = (
    settings: PerformanceSettings
): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn(
            "Failed to save performance settings to localStorage:",
            error
        );
    }
};

/**
 * Clear all stored performance settings
 */
export const clearPerformanceSettings = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn(
            "Failed to clear performance settings from localStorage:",
            error
        );
    }
};
