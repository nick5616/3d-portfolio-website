import { ArtCategoryId, artCategories, gcsStorageConfig } from "./gcsConfig";

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
    private?: string;
}

interface GcsObject {
    name: string;
    metadata?: GcsObjectMetadata;
}

// Extensions three.js's TextureLoader (and browsers generally) can't decode.
const UNSUPPORTED_EXTENSIONS = [".heic", ".heif"];

const hasSupportedExtension = (fileName: string): boolean => {
    const lower = fileName.toLowerCase();
    return !UNSUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

// Art piece metadata (name, description, date, display order) is stored as
// custom metadata on each GCS object rather than hardcoded here, so it can
// be edited independently of a deploy (e.g. `gsutil setmeta -h ...`).
//
// Cached per category since each folder in the "artandmedia" bucket is
// fetched/listed independently.
const cachedArtPiecesByCategory = new Map<ArtCategoryId, Promise<ArtPiece[]>>();

const fetchArtPieces = async (
    category: ArtCategoryId
): Promise<ArtPiece[]> => {
    const { baseUrl, bucketName } = gcsStorageConfig;
    const { folder, requiresTitle } = artCategories[category];
    const url = `${baseUrl}/storage/v1/b/${bucketName}/o?prefix=${folder}/&fields=items(name,metadata)`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch art metadata: ${response.status}`);
    }

    const data: { items?: GcsObject[] } = await response.json();
    const items = data.items || [];

    return items
        .filter((item) => {
            // Never surface anything explicitly flagged private, regardless
            // of category.
            if (item.metadata?.private === "true") return false;

            const fileName = item.name.slice(folder.length + 1);
            // Skip the bare folder placeholder object and any non-image /
            // unsupported file.
            if (!fileName || !hasSupportedExtension(fileName)) return false;

            // Only "digitalart" requires curated `art-name` metadata; the
            // other (uncurated) categories include every remaining image.
            if (requiresTitle && !item.metadata?.["art-name"]) return false;

            return true;
        })
        .map((item) => {
            const fileName = item.name.slice(folder.length + 1);
            return {
                order: Number(item.metadata?.["art-order"] ?? 0),
                piece: {
                    name: item.metadata?.["art-name"] || fileName,
                    description: item.metadata?.["art-description"] || "",
                    date: item.metadata?.["art-date"] || "",
                    fileName,
                } satisfies ArtPiece,
            };
        })
        .sort((a, b) => a.order - b.order)
        .map(({ piece }) => piece);
};

export const getAllArtPieces = (
    category: ArtCategoryId
): Promise<ArtPiece[]> => {
    if (!cachedArtPiecesByCategory.has(category)) {
        cachedArtPiecesByCategory.set(category, fetchArtPieces(category));
    }
    return cachedArtPiecesByCategory.get(category)!;
};

export const getArtPieceByIndex = async (
    category: ArtCategoryId,
    index: number
): Promise<ArtPiece | undefined> => {
    const pieces = await getAllArtPieces(category);
    return pieces[index];
};

export const getArtPieceByName = async (
    category: ArtCategoryId,
    fileName: string
): Promise<ArtPiece | undefined> => {
    const pieces = await getAllArtPieces(category);
    return pieces.find((piece) => piece.fileName === fileName);
};
