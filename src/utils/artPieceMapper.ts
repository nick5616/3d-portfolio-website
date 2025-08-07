import { azureStorageService } from "./azureStorage";

// Cache for the mapping to avoid repeated API calls
let artPieceMapping: string[] | null = null;
let mappingPromise: Promise<string[]> | null = null;

/**
 * Maps art piece indices to available Azure blob names
 * This allows the frontend to use indices (0, 1, 2, etc.) while Azure has different names
 */
export class ArtPieceMapper {
    /**
     * Get the art piece name for a given index
     * @param index - The art piece index (0, 1, 2, etc.)
     * @returns Promise<string> - The art piece name to use
     */
    static async getArtPieceName(index: number): Promise<string> {
        try {
            const mapping = await this.getArtPieceMapping();

            if (index >= 0 && index < mapping.length) {
                return mapping[index];
            }

            // If index is out of bounds, return a random piece
            const randomIndex = Math.floor(Math.random() * mapping.length);
            console.log(
                `Index ${index} out of bounds, using random piece at index ${randomIndex}`
            );
            return mapping[randomIndex];
        } catch (error) {
            console.error(
                `Error getting art piece name for index ${index}:`,
                error
            );
            // Fallback to a default piece name
            return "sprites"; // Use the piece you have in Azure
        }
    }

    /**
     * Get the mapping of indices to art piece names
     * @returns Promise<string[]> - Array of art piece names indexed by position
     */
    static async getArtPieceMapping(): Promise<string[]> {
        // Return cached mapping if available
        if (artPieceMapping) {
            return artPieceMapping;
        }

        // If a mapping request is already in progress, wait for it
        if (mappingPromise) {
            return mappingPromise;
        }

        // Create new mapping request
        mappingPromise = this.createArtPieceMapping();
        try {
            artPieceMapping = await mappingPromise;
            return artPieceMapping;
        } finally {
            mappingPromise = null;
        }
    }

    /**
     * Create the art piece mapping by fetching available pieces from Azure
     * @returns Promise<string[]> - Array of art piece names
     */
    private static async createArtPieceMapping(): Promise<string[]> {
        try {
            const availablePieces = await azureStorageService.listArtPieces();

            if (availablePieces.length === 0) {
                console.warn("No art pieces found in Azure Storage");
                return ["sprites"]; // Fallback to the piece you have
            }

            console.log(
                `Found ${availablePieces.length} art pieces in Azure Storage:`,
                availablePieces
            );

            // Sort pieces alphabetically for consistent ordering
            const sortedPieces = availablePieces.sort();

            return sortedPieces;
        } catch (error) {
            console.error("Error creating art piece mapping:", error);
            return ["sprites"]; // Fallback to the piece you have
        }
    }

    /**
     * Clear the cached mapping (useful for testing or when Azure content changes)
     */
    static clearCache(): void {
        artPieceMapping = null;
        mappingPromise = null;
    }

    /**
     * Get the total number of available art pieces
     * @returns Promise<number> - Number of available pieces
     */
    static async getArtPieceCount(): Promise<number> {
        const mapping = await this.getArtPieceMapping();
        return mapping.length;
    }
}
