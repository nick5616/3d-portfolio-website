// Google Cloud Storage configuration for art pieces.
// Bucket is publicly readable with CORS enabled for the site's origins.

export const gcsStorageConfig = {
    baseUrl: "https://storage.googleapis.com",
    bucketName: "artandmedia",
};

export type ArtCategoryId =
    | "digitalart"
    | "paintings"
    | "sketches"
    | "lefthanded"
    | "miscellaneous"
    | "notesappart";

interface ArtCategoryConfig {
    // The hall's slug in Canon's holodeck-art-room view (the old bucket
    // folder name). Which pieces it shows, and which get plaques, is set in
    // Canon.
    folder: string;
}

export const artCategories: Record<ArtCategoryId, ArtCategoryConfig> = {
    digitalart: { folder: "digitalart" },
    paintings: { folder: "paintings" },
    sketches: { folder: "sketches" },
    lefthanded: { folder: "lefthanded" },
    miscellaneous: { folder: "miscellaneous" },
    notesappart: { folder: "notesappart" },
};

export const getArtPieceUrl = (
    category: ArtCategoryId,
    fileName: string
): string => {
    const { baseUrl, bucketName } = gcsStorageConfig;
    const { folder } = artCategories[category];
    return `${baseUrl}/${bucketName}/${folder}/${fileName}`;
};
