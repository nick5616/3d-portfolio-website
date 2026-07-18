// Google Cloud Storage configuration for art pieces.
// Bucket is publicly readable with CORS enabled for the site's origins.

export const gcsStorageConfig = {
    baseUrl: "https://storage.googleapis.com",
    bucketName: "artandmedia",
    folder: "digitalart",
};

export const getArtPieceUrl = (fileName: string): string => {
    const { baseUrl, bucketName, folder } = gcsStorageConfig;
    return `${baseUrl}/${bucketName}/${folder}/${fileName}`;
};
