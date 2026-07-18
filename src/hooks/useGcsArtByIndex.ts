import { useState, useEffect } from "react";
import { getArtPieceUrl } from "../configs/gcsConfig";
import { ArtPieceMapper } from "../utils/artPieceMapper";

/**
 * Hook for loading art piece metadata and its GCS image URL by index
 * @param artPieceIndex - The index of the art piece to load
 * @param useGcsStorage - Whether to use GCS-hosted images (default: true)
 * @param enabled - Whether image loading should be performed (default: true). When false, only metadata is fetched.
 * @returns Object containing the image URL, loading state, and metadata
 */
export const useGcsArtByIndex = (
    artPieceIndex: number,
    useGcsStorage: boolean = true,
    enabled: boolean = true
) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
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

    // Resolve the image URL only when enabled
    useEffect(() => {
        if (!enabled || !artPieceExists || !artPieceMetadata) {
            setImageUrl("");
            setIsLoading(enabled && artPieceExists);
            return;
        }

        if (!useGcsStorage) {
            setImageUrl("");
            setIsLoading(false);
            return;
        }

        setImageUrl(getArtPieceUrl(artPieceMetadata.fileName));
        setIsLoading(false);
    }, [enabled, artPieceExists, useGcsStorage, artPieceMetadata]);

    return {
        imageUrl,
        isLoading,
        artPieceName,
        artPieceMetadata,
        artPieceExists,
    };
};
