// Art piece metadata configuration
// Maps art piece names (from Azure blob names) to metadata objects

export interface ArtPieceMetadata {
    name: string; // Display name of the art piece
    date?: string; // Date created (e.g., "2024", "March 2024", "2024-03-15")
    description?: string; // Optional description
    medium?: string; // Optional medium (e.g., "Digital Art", "Watercolor", "Pencil Sketch")
}

// Metadata map - add entries here for art pieces you want to display with plaques
export const artPieceMetadata: Record<string, ArtPieceMetadata> = {
    sprites: {
        name: "Sprite Collection",
        date: "July 30, 2025",
        description: "Some sprites in their natural habitat",
        medium: "Digital Art",
    },
    "marvin-martian": {
        name: "Marvin the Martian",
        date: "December 20, 2024",
        description: "A digital painting inspired by classic cartoons",
        medium: "Digital Art",
    },
    "animal-sketches": {
        name: "Animal Sketches",
        date: "",
        description: "Some animal sketches",
        medium: "Digital Art",
    },
};

/**
 * Get metadata for an art piece by name
 * @param artPieceName - The name of the art piece (from Azure blob name)
 * @returns ArtPieceMetadata or null if not found
 */
export const getArtPieceMetadata = (
    artPieceName: string
): ArtPieceMetadata | null => {
    return artPieceMetadata[artPieceName] || null;
};

/**
 * Format art piece name for display (capitalize and format)
 * @param artPieceName - The raw art piece name
 * @returns Formatted display name
 */
export const formatArtPieceName = (artPieceName: string): string => {
    // Convert kebab-case or snake_case to Title Case
    return artPieceName
        .replace(/[-_]/g, " ")
        .replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
};

/**
 * Get display information for an art piece
 * @param artPieceName - The name of the art piece
 * @returns Object with display information
 */
export const getArtPieceDisplayInfo = (
    artPieceName: string
): {
    name: string;
    date?: string;
    description?: string;
    medium?: string;
} => {
    const metadata = getArtPieceMetadata(artPieceName);

    if (metadata) {
        return metadata;
    }

    // Fallback to formatted name only
    return {
        name: formatArtPieceName(artPieceName),
        date: "",
    };
};
