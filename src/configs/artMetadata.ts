import { gcsStorageConfig } from "./gcsConfig";

export interface ArtPiece {
    name: string;
    description: string;
    date: string;
    fileName: string; // File name in GCS storage (e.g., "marvin-martian.jpg")
}

interface GcsObjectMetadata {
    "art-name"?: string;
    "art-description"?: string;
    "art-date"?: string;
    "art-order"?: string;
}

interface GcsObject {
    name: string;
    metadata?: GcsObjectMetadata;
}

// Art piece metadata (name, description, date, display order) is stored as
// custom metadata on each GCS object rather than hardcoded here, so it can
// be edited independently of a deploy (e.g. `gsutil setmeta -h ...`).
let cachedArtPieces: Promise<ArtPiece[]> | null = null;

const fetchArtPieces = async (): Promise<ArtPiece[]> => {
    const { baseUrl, bucketName, folder } = gcsStorageConfig;
    const url = `${baseUrl}/storage/v1/b/${bucketName}/o?prefix=${folder}/&fields=items(name,metadata)`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch art metadata: ${response.status}`);
    }

    const data: { items?: GcsObject[] } = await response.json();
    const items = data.items || [];

    return items
        .filter((item) => item.metadata?.["art-name"])
        .map((item) => ({
            order: Number(item.metadata?.["art-order"] ?? 0),
            piece: {
                name: item.metadata!["art-name"]!,
                description: item.metadata!["art-description"] || "",
                date: item.metadata!["art-date"] || "",
                fileName: item.name.slice(folder.length + 1),
            } satisfies ArtPiece,
        }))
        .sort((a, b) => a.order - b.order)
        .map(({ piece }) => piece);
};

export const getAllArtPieces = (): Promise<ArtPiece[]> => {
    if (!cachedArtPieces) {
        cachedArtPieces = fetchArtPieces();
    }
    return cachedArtPieces;
};

export const getArtPieceByIndex = async (
    index: number
): Promise<ArtPiece | undefined> => {
    const pieces = await getAllArtPieces();
    return pieces[index];
};

export const getArtPieceByName = async (
    fileName: string
): Promise<ArtPiece | undefined> => {
    const pieces = await getAllArtPieces();
    return pieces.find((piece) => piece.fileName === fileName);
};
