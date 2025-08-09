import {
    getAllArtPieces,
    getArtPieceByIndex,
    ArtPiece,
} from "../configs/artMetadata";

// Cache for the mapping to avoid repeated lookups
let artPieceMapping: ArtPiece[] | null = null;

/**
 * Maps art piece indices to available art pieces from the metadata
 * This allows the frontend to use indices (0, 1, 2, etc.) while having rich metadata
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
                return mapping[index].fileName;
            }

            // If index is out of bounds, return a random piece
            const randomIndex = Math.floor(Math.random() * mapping.length);
            return mapping[randomIndex].fileName;
        } catch (error) {
            // Fallback to a default piece name
            return "marvin-martian.jpg";
        }
    }

    /**
     * Get the art piece object for a given index
     * @param index - The art piece index (0, 1, 2, etc.)
     * @returns Promise<ArtPiece | undefined> - The art piece object
     */
    static async getArtPieceByIndex(
        index: number
    ): Promise<ArtPiece | undefined> {
        try {
            const mapping = await this.getArtPieceMapping();

            if (index >= 0 && index < mapping.length) {
                return mapping[index];
            }

            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Get the mapping of indices to art piece objects
     * @returns Promise<ArtPiece[]> - Array of art piece objects indexed by position
     */
    static async getArtPieceMapping(): Promise<ArtPiece[]> {
        // Return cached mapping if available
        if (artPieceMapping) {
            return artPieceMapping;
        }

        // Create new mapping from metadata
        artPieceMapping = getAllArtPieces();
        return artPieceMapping;
    }

    /**
     * Get art piece names as a simple array
     * @returns Promise<string[]> - Array of art piece names
     */
    static async getArtPieceNames(): Promise<string[]> {
        const mapping = await this.getArtPieceMapping();
        return mapping.map((piece) => piece.fileName);
    }

    /**
     * Clear the cached mapping (useful for testing or when metadata changes)
     */
    static clearCache(): void {
        artPieceMapping = null;
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
