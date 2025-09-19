import { useState, useEffect } from "react";
import { azureStorageService } from "../utils/azureStorage";

/**
 * Hook for loading art pieces from Azure Storage
 * @param artPieceName - The name of the art piece to load
 * @returns Object containing the image URL, loading state, and error state
 */
export const useAzureArt = (artPieceName: string) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadArtPiece = async () => {
            if (!artPieceName) {
                setError("No art piece name provided");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                const url = await azureStorageService.getArtPieceUrlQueued(
                    artPieceName,
                    undefined,
                    0 // Default priority
                );
                setImageUrl(url);
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to load art piece";
                setError(errorMessage);

                // If Azure Storage is disabled, don't set a placeholder URL
                // The component will use the fallback URL instead
                if (errorMessage === "Azure Storage is disabled") {
                    console.log(
                        `useAzureArt: Azure Storage disabled for "${artPieceName}" - no image displayed`
                    );
                    setImageUrl("");
                } else {
                    console.log(
                        `useAzureArt: Error loading "${artPieceName}" - ${errorMessage} - no image displayed`
                    );
                    setImageUrl("");
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadArtPiece();
    }, [artPieceName]);

    return {
        imageUrl,
        isLoading,
        error,
    };
};
