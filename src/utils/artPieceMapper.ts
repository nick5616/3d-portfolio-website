import { getAllArtPieces, ArtPiece } from "../configs/artMetadata";
import { ArtCategoryId } from "../configs/gcsConfig";

// Cache for the mapping to avoid repeated lookups, keyed per category
const artPieceMappingByCategory = new Map<ArtCategoryId, ArtPiece[]>();

/**
 * Maps art piece indices to available art pieces from the metadata, per
 * category (digitalart, paintings, sketches, ...). This allows the frontend
 * to use indices (0, 1, 2, etc.) within a category while having rich metadata.
 */
export class ArtPieceMapper {
    /**
     * Get the art piece object for a given index within a category
     */
    static async getArtPieceByIndex(
        category: ArtCategoryId,
        index: number
    ): Promise<ArtPiece | undefined> {
        try {
            const mapping = await this.getArtPieceMapping(category);

            if (index >= 0 && index < mapping.length) {
                return mapping[index];
            }

            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Get the mapping of indices to art piece objects for a category
     */
    static async getArtPieceMapping(
        category: ArtCategoryId
    ): Promise<ArtPiece[]> {
        const cached = artPieceMappingByCategory.get(category);
        if (cached) {
            return cached;
        }

        const mapping = await getAllArtPieces(category);
        artPieceMappingByCategory.set(category, mapping);
        return mapping;
    }

    /**
     * Clear the cached mapping for a category, or every category if none is given
     */
    static clearCache(category?: ArtCategoryId): void {
        if (category) {
            artPieceMappingByCategory.delete(category);
        } else {
            artPieceMappingByCategory.clear();
        }
    }

    /**
     * Get the total number of available art pieces in a category
     */
    static async getArtPieceCount(category: ArtCategoryId): Promise<number> {
        const mapping = await this.getArtPieceMapping(category);
        return mapping.length;
    }
}
