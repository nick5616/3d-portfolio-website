import { useState, useEffect } from "react";
import { azureStorageService } from "../utils/azureStorage";
import { ArtPieceMapper } from "../utils/artPieceMapper";

/**
 * Hook for loading art pieces from Azure Storage by index
 * @param artPieceIndex - The index of the art piece to load
 * @param useAzureStorage - Whether to use Azure Storage (default: true)
 * @param enabled - Whether image loading should be performed (default: true). When false, only metadata is fetched.
 * @param priority - Priority for loading (higher = more important, default: 0). Used for distance-based prioritization.
 * @returns Object containing the image URL, loading state, error state, and metadata
 */
export const useAzureArtByIndex = (
    artPieceIndex: number,
    useAzureStorage: boolean = true,
    enabled: boolean = true,
    priority: number = 0
) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [artPieceName, setArtPieceName] = useState<string>("");
    const [artPieceMetadata, setArtPieceMetadata] = useState<any>(null);
    const [artPieceExists, setArtPieceExists] = useState<boolean>(false);

    // Load metadata immediately (always) so frames can be displayed
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                if (artPieceIndex < 0) {
                    setArtPieceExists(false);
                    return;
                }

                const pieceMetadata = await ArtPieceMapper.getArtPieceByIndex(
                    artPieceIndex
                );

                if (!pieceMetadata) {
                    setArtPieceMetadata(null);
                    setArtPieceName("");
                    setArtPieceExists(false);
                    return;
                }

                // Set metadata immediately so frame can render
                setArtPieceMetadata(pieceMetadata);
                setArtPieceName(pieceMetadata.fileName);
                setArtPieceExists(true);
            } catch (err) {
                setArtPieceExists(false);
            }
        };

        loadMetadata();
    }, [artPieceIndex]);

    // Load image only when enabled
    useEffect(() => {
        if (!enabled || !artPieceExists) {
            setImageUrl("");
            setIsLoading(false);
            return;
        }

        const loadImage = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // If Azure usage disabled, stop here
                if (!useAzureStorage) {
                    setImageUrl("");
                    setIsLoading(false);
                    return;
                }

                if (!artPieceMetadata) {
                    setIsLoading(false);
                    return;
                }

                // Fetch Azure URL using the loading manager queue with priority
                // This is already async and queued, so it won't block
                const url = await azureStorageService.getArtPieceUrlQueued(
                    artPieceMetadata.fileName,
                    artPieceMetadata.fileName,
                    priority
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

        // Defer to next tick to avoid blocking initial render
        setTimeout(loadImage, 0);
    }, [enabled, artPieceExists, useAzureStorage, priority, artPieceMetadata]);

    return {
        imageUrl,
        isLoading,
        error,
        artPieceName,
        artPieceMetadata,
        artPieceExists,
    };
};
