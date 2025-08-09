import { useState, useEffect } from "react";
import { azureStorageService } from "../utils/azureStorage";
import { ArtPieceMapper } from "../utils/artPieceMapper";
import { getArtPieceByIndex } from "../configs/artMetadata";

/**
 * Hook for loading art pieces from Azure Storage by index
 * @param artPieceIndex - The index of the art piece to load
 * @returns Object containing the image URL, loading state, error state, and metadata
 */
export const useAzureArtByIndex = (artPieceIndex: number) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [artPieceName, setArtPieceName] = useState<string>("");
    const [artPieceMetadata, setArtPieceMetadata] = useState<any>(null);

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

                console.log(
                    `useAzureArtByIndex [${artPieceIndex}]: Starting to load art piece`
                );

                // Get the art piece metadata for this index
                const pieceMetadata = await ArtPieceMapper.getArtPieceByIndex(
                    artPieceIndex
                );

                if (!pieceMetadata) {
                    setError(`Art piece with index ${artPieceIndex} not found`);
                    setIsLoading(false);
                    return;
                }

                console.log(
                    `useAzureArtByIndex [${artPieceIndex}]: Got metadata:`,
                    pieceMetadata
                );

                setArtPieceMetadata(pieceMetadata);
                setArtPieceName(pieceMetadata.fileName);

                // Get the URL for this art piece from Azure using the fileName
                console.log(
                    `useAzureArtByIndex [${artPieceIndex}]: Fetching URL for ${pieceMetadata.fileName}`
                );
                const url = await azureStorageService.getArtPieceUrl(
                    pieceMetadata.fileName,
                    pieceMetadata.fileName
                );

                console.log(
                    `useAzureArtByIndex [${artPieceIndex}]: Got URL: ${url}`
                );
                setImageUrl(url);
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to load art piece";
                setError(errorMessage);
                setImageUrl("");

                // Log the error for debugging
                console.warn(`Failed to load art piece ${artPieceIndex}:`, err);
            } finally {
                console.log(
                    `useAzureArtByIndex [${artPieceIndex}]: Setting isLoading to false`
                );
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
        artPieceMetadata,
    };
};
