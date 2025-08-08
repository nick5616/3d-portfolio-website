// Azure Storage Configuration
// Update these values with your actual Azure Storage account details

export const azureStorageConfig = {
    // Replace with your actual SAS URL
    sasUrl: "https://portfoliomedia.blob.core.windows.net/?sp=r&st=2025-08-07T09:57:46Z&se=2025-08-07T18:12:46Z&spr=https&sv=2024-11-04&sr=c&sig=q11eogy9glHNhu8yhecgU%2B6yVDdNkamMwPEwbhqA1eA%3D",

    // Container name for art pieces
    containerName: "digital-art",

    // Whether to use Azure Storage (set to false to fallback to local images)
    enabled: true, // Re-enabled for testing

    // Cache settings
    cacheEnabled: true,
    cacheExpiryMs: 30 * 60 * 1000, // 30 minutes

    // Retry settings
    maxRetries: 3,
    retryDelayMs: 1000,

    // Supported image formats
    supportedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
};

// Helper function to check if Azure Storage is properly configured
export const isAzureStorageConfigured = (): boolean => {
    return (
        azureStorageConfig.enabled &&
        azureStorageConfig.sasUrl !==
            "https://<your-storage-account-name>.blob.core.windows.net/?<your-SAS-token>" &&
        azureStorageConfig.sasUrl.includes("blob.core.windows.net")
    );
};

// Helper function to get the container URL
export const getContainerUrl = (): string => {
    const baseUrl = azureStorageConfig.sasUrl.split("?")[0];
    return `${baseUrl}/${azureStorageConfig.containerName}?${
        azureStorageConfig.sasUrl.split("?")[1]
    }`;
};
