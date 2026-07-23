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
    folder: string;
    // Only "digitalart" has curated `art-name` metadata on its GCS objects.
    // Every other category is a raw camera dump, so pieces are included
    // without requiring a title, and plaques are skipped for them.
    requiresTitle: boolean;
}

export const artCategories: Record<ArtCategoryId, ArtCategoryConfig> = {
    digitalart: { folder: "digitalart", requiresTitle: true },
    paintings: { folder: "paintings", requiresTitle: false },
    sketches: { folder: "sketches", requiresTitle: false },
    lefthanded: { folder: "lefthanded", requiresTitle: false },
    miscellaneous: { folder: "miscellaneous", requiresTitle: false },
    notesappart: { folder: "notesappart", requiresTitle: false },
};

export const getArtPieceUrl = (
    category: ArtCategoryId,
    fileName: string
): string => {
    const { baseUrl, bucketName } = gcsStorageConfig;
    const { folder } = artCategories[category];
    return `${baseUrl}/${bucketName}/${folder}/${fileName}`;
};
