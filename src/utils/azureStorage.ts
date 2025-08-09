import { BlobServiceClient } from "@azure/storage-blob";
import { azureStorageConfig } from "../configs/azureConfig";

// Configuration interface for Azure Storage
interface AzureStorageConfig {
    sasUrl: string;
    containerName: string;
    cacheEnabled: boolean;
    cacheExpiryMs: number;
    maxRetries: number;
    retryDelayMs: number;
    supportedExtensions: string[];
}

// Cache for blob URLs to avoid repeated API calls
const blobUrlCache = new Map<string, string>();

/**
 * Utility class for fetching assets from Azure Blob Storage
 */
export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private containerClient: any;
    private config: AzureStorageConfig;

    constructor(config: AzureStorageConfig) {
        this.config = config;
        this.blobServiceClient = new BlobServiceClient(config.sasUrl);
        // The SAS URL already points to the container, so we use empty string
        this.containerClient = this.blobServiceClient.getContainerClient("");
    }

    /**
     * Get the URL for a specific art piece by name
     * @param artPieceName - The name of the art piece (without extension)
     * @param fileName - The actual file name with extension
     * @returns Promise<string> - The blob URL
     */
    async getArtPieceUrl(
        artPieceName: string,
        fileName?: string
    ): Promise<string> {
        // Check cache first
        if (blobUrlCache.has(artPieceName)) {
            return blobUrlCache.get(artPieceName)!;
        }

        console.log(`Fetching art piece: "${artPieceName}"`);

        try {
            // If fileName is provided, use it directly (it already includes the extension)
            if (fileName) {
                const blobClient = this.containerClient.getBlobClient(fileName);

                try {
                    // Check if blob exists
                    const exists = await blobClient.exists();

                    if (exists) {
                        const url = blobClient.url;
                        blobUrlCache.set(artPieceName, url);
                        console.log(`✓ Found "${artPieceName}" (${fileName})`);
                        return url;
                    }
                } catch (error) {
                    console.warn(`Error checking blob ${fileName}:`, error);

                    // If it's a CORS error, try to construct the URL directly
                    if (
                        error instanceof Error &&
                        error.message &&
                        error.message.includes("CORS")
                    ) {
                        console.log(
                            `CORS detected, using direct URL for ${fileName}`
                        );
                        const directUrl = blobClient.url;
                        blobUrlCache.set(artPieceName, directUrl);
                        return directUrl;
                    }
                }

                // If the exact fileName doesn't exist, throw an error
                throw new Error(
                    `Art piece "${artPieceName}" not found in Azure Storage (tried ${fileName})`
                );
            }

            // Fallback: Try JPG first, then PNG if no fileName provided
            const extensions = [".jpg", ".png"];

            for (const ext of extensions) {
                const blobName = `${artPieceName}${ext}`;
                const blobClient = this.containerClient.getBlobClient(blobName);

                try {
                    // Check if blob exists
                    const exists = await blobClient.exists();

                    if (exists) {
                        const url = blobClient.url;
                        blobUrlCache.set(artPieceName, url);
                        console.log(`✓ Found "${artPieceName}" (${ext})`);
                        return url;
                    }
                } catch (error) {
                    // Log CORS or other errors but continue trying other extensions
                    console.warn(`Error checking blob ${blobName}:`, error);

                    // If it's a CORS error, try to construct the URL directly
                    if (
                        error instanceof Error &&
                        error.message &&
                        error.message.includes("CORS")
                    ) {
                        console.log(
                            `CORS detected, using direct URL for ${blobName}`
                        );
                        const directUrl = blobClient.url;
                        blobUrlCache.set(artPieceName, directUrl);
                        return directUrl;
                    }
                    continue;
                }
            }

            // If no blob found with either extension, throw an error
            throw new Error(
                `Art piece "${artPieceName}" not found in Azure Storage (tried .jpg and .png)`
            );
        } catch (error) {
            console.error(`✗ Failed to fetch "${artPieceName}":`, error);
            throw error;
        }
    }

    /**
     * Get a random art piece from available pieces
     * @returns Promise<string> - The blob URL of a random piece
     */
    async getRandomArtPiece(): Promise<string | null> {
        try {
            const availablePieces = await this.listArtPieces();
            if (availablePieces.length === 0) {
                return null;
            }

            // Get a random piece
            const randomIndex = Math.floor(
                Math.random() * availablePieces.length
            );
            const randomPieceName = availablePieces[randomIndex];

            console.log(`Using random art piece: ${randomPieceName}`);
            return await this.getArtPieceUrl(randomPieceName);
        } catch (error) {
            console.error("Error getting random art piece:", error);
            return null;
        }
    }

    /**
     * List all available art pieces in the container
     * @returns Promise<string[]> - Array of art piece names
     */
    async listArtPieces(): Promise<string[]> {
        try {
            const artPieces: string[] = [];

            for await (const blob of this.containerClient.listBlobsFlat()) {
                // Extract art piece name from blob name (remove extension)
                const name = blob.name.replace(/\.(jpg|jpeg|png|webp)$/i, "");
                if (!artPieces.includes(name)) {
                    artPieces.push(name);
                }
            }

            console.log(`Azure Storage: Found ${artPieces.length} art pieces`);
            return artPieces;
        } catch (error) {
            console.error("Error listing art pieces:", error);
            return [];
        }
    }

    /**
     * Test Azure Storage connectivity
     * @returns Promise<boolean> - Whether the connection is working
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // Try to list blobs to test connection
            const iterator = this.containerClient.listBlobsFlat();
            const firstBlob = await iterator.next();

            return { success: true };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Clear the URL cache
     */
    clearCache(): void {
        blobUrlCache.clear();
    }
}

// Create a default instance using the config file
export const azureStorageService = new AzureStorageService(azureStorageConfig);

// Export the configuration interface for external use
export type { AzureStorageConfig };
