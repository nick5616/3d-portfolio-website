import { useState, useEffect } from "react";
import { azureStorageService } from "../utils/azureStorage";
import { ArtPieceMapper } from "../utils/artPieceMapper";

/**
 * Hook for loading art pieces from Azure Storage by index
 * @param artPieceIndex - The index of the art piece to load
 * @returns Object containing the image URL, loading state, and error state
 */
export const useAzureArtByIndex = (artPieceIndex: number) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [artPieceName, setArtPieceName] = useState<string>("");

    useEffect(() => {
        const loadArtPiece = async () => {
            if (artPieceIndex < 0) {
                setError("Invalid art piece index");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Get the art piece name for this index
                const pieceName = await ArtPieceMapper.getArtPieceName(
                    artPieceIndex
                );
                setArtPieceName(pieceName);

                console.log(
                    `Loading art piece index ${artPieceIndex} -> "${pieceName}"`
                );

                // Get the URL for this art piece
                const url = await azureStorageService.getArtPieceUrl(pieceName);
                setImageUrl(url);
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to load art piece";
                setError(errorMessage);

                // If Azure Storage is disabled, don't set a placeholder URL
                if (errorMessage === "Azure Storage is disabled") {
                    console.log(
                        `useAzureArtByIndex: Azure Storage disabled for index ${artPieceIndex}`
                    );
                    setImageUrl("");
                } else {
                    console.log(
                        `useAzureArtByIndex: Error loading index ${artPieceIndex} - ${errorMessage}`
                    );
                    setImageUrl("/images/art/placeholder.jpg");
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadArtPiece();
    }, [artPieceIndex]);

    return {
        imageUrl,
        isLoading,
        error,
        artPieceName,
    };
};
