/**
 * Simple test to verify the loading manager works correctly
 * This can be run in the browser console for manual testing
 */

import { loadingManager } from "../loadingManager";

export const testLoadingManager = async () => {
    console.log("🧪 Testing Loading Manager...");

    // Subscribe to state changes
    const unsubscribe = loadingManager.subscribe((state) => {
        console.log("📊 Loading State:", state);
    });

    try {
        // Test 1: Load a single art piece
        console.log("Test 1: Loading single art piece...");
        const url1 = await loadingManager.loadArtPiece(
            "test-art-1",
            "test-art-1.jpg",
            1
        );
        console.log("✅ Single load completed:", url1);

        // Test 2: Load multiple art pieces with different priorities
        console.log("Test 2: Loading multiple art pieces...");
        const promises = [
            loadingManager.loadArtPiece("test-art-2", "test-art-2.jpg", 0),
            loadingManager.loadArtPiece("test-art-3", "test-art-3.jpg", 2), // Higher priority
            loadingManager.loadArtPiece("test-art-4", "test-art-4.jpg", 1),
        ];

        const results = await Promise.all(promises);
        console.log("✅ Multiple loads completed:", results);

        // Test 3: Check queue stats
        const stats = loadingManager.getStats();
        console.log("📈 Queue Stats:", stats);

        console.log("🎉 All tests passed!");
    } catch (error) {
        console.error("❌ Test failed:", error);
    } finally {
        unsubscribe();
    }
};

// Make it available globally for console testing
if (typeof window !== "undefined") {
    (window as any).testLoadingManager = testLoadingManager;
}
