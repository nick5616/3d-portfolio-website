// Azure Storage Configuration
// Update these values with your actual Azure Storage account details

export const azureStorageConfig = {
    // Replace with your actual SAS URL (currently disabled due to expired token)
    sasUrl: "https://portfoliomedia.blob.core.windows.net/digital-art?sp=r&st=2025-08-12T06:10:46Z&se=2028-08-01T14:25:46Z&spr=https&sv=2024-11-04&sr=c&sig=udpOam4i8owLuei7HjOZDZRCq4Hi0TKHX8teUC3GuZc%3D", // Disabled - SAS token has expired

    // Container name for art pieces
    containerName: "digital-art",

    // Cache settings
    cacheEnabled: true,
    cacheExpiryMs: 30 * 60 * 1000, // 30 minutes

    // Retry settings
    maxRetries: 3,
    retryDelayMs: 1000,

    // Supported image formats
    supportedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
};

// Helper function to get the container URL
export const getContainerUrl = (): string => {
    const baseUrl = azureStorageConfig.sasUrl.split("?")[0];
    return `${baseUrl}/${azureStorageConfig.containerName}?${
        azureStorageConfig.sasUrl.split("?")[1]
    }`;
};
