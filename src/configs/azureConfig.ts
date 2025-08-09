// Azure Storage Configuration
// Update these values with your actual Azure Storage account details

export const azureStorageConfig = {
    // Replace with your actual SAS URL
    sasUrl: "https://portfoliomedia.blob.core.windows.net/digital-art?sp=r&st=2025-08-08T17:32:54Z&se=2025-08-09T01:47:54Z&spr=https&sv=2024-11-04&sr=c&sig=%2F4%2BjNIJ1EDFGUnhdEYNSp3TmcwD4dOW5BuHcA%2B3b7Do%3D",

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
