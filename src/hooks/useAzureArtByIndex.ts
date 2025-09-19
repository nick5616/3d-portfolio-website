import { useState, useEffect } from "react";
import { azureStorageService } from "../utils/azureStorage";
import { ArtPieceMapper } from "../utils/artPieceMapper";

/**
 * Hook for loading art pieces from Azure Storage by index
 * @param artPieceIndex - The index of the art piece to load
 * @param useAzureStorage - Whether to use Azure Storage (default: true)
 * @param enabled - Whether network loading should be performed (default: true). When false, only metadata is fetched.
 * @returns Object containing the image URL, loading state, error state, and metadata
 */
export const useAzureArtByIndex = (
    artPieceIndex: number,
    useAzureStorage: boolean = true,
    enabled: boolean = true
) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [artPieceName, setArtPieceName] = useState<string>("");
    const [artPieceMetadata, setArtPieceMetadata] = useState<any>(null);
    const [artPieceExists, setArtPieceExists] = useState<boolean>(false);

    useEffect(() => {
        const loadArtPiece = async () => {
            // Always start with metadata so we can compute local fallbacks and labels
            try {
                setIsLoading(true);
                setError(null);

                if (artPieceIndex < 0) {
                    setError("Invalid art piece index");
                    setIsLoading(false);
                    return;
                }

                const pieceMetadata = await ArtPieceMapper.getArtPieceByIndex(
                    artPieceIndex
                );

                if (!pieceMetadata) {
                    // Keep a graceful state for empty frames
                    setArtPieceMetadata(null);
                    setArtPieceName("");
                    setImageUrl("");
                    setArtPieceExists(false);
                    setIsLoading(false);
                    return;
                }

                setArtPieceMetadata(pieceMetadata);
                setArtPieceName(pieceMetadata.fileName);
                setArtPieceExists(true);

                // If not enabled for network loading or Azure usage disabled, stop here
                if (!enabled || !useAzureStorage) {
                    setImageUrl("");
                    setIsLoading(false);
                    return;
                }

                // Fetch Azure URL using the loading manager queue
                const url = await azureStorageService.getArtPieceUrlQueued(
                    pieceMetadata.fileName,
                    pieceMetadata.fileName,
                    0 // Default priority
                );
                setImageUrl(url);
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to load art piece";
                setError(errorMessage);
                setImageUrl("");
            } finally {
                setIsLoading(false);
            }
        };

        loadArtPiece();
    }, [artPieceIndex, useAzureStorage, enabled]);

    return {
        imageUrl,
        isLoading,
        error,
        artPieceName,
        artPieceMetadata,
        artPieceExists,
    };
};
