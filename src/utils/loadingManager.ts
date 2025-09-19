/**
 * Loading Manager for Art Pieces
 *
 * This manager queues art piece loading requests and processes them one at a time
 * to prevent blocking the main thread and ensure smooth UI interactions.
 */

interface LoadingRequest {
    id: string;
    artPieceName: string;
    fileName?: string;
    resolve: (url: string) => void;
    reject: (error: Error) => void;
    priority: number; // Higher numbers = higher priority
}

interface LoadingState {
    isLoading: boolean;
    queueLength: number;
    currentRequest: string | null;
}

class LoadingManager {
    private queue: LoadingRequest[] = [];
    private isProcessing = false;
    private currentRequest: LoadingRequest | null = null;
    private subscribers: Set<(state: LoadingState) => void> = new Set();
    private azureStorageService: any = null;

    constructor() {
        // Start processing queue immediately
        this.processQueue();
    }

    /**
     * Set the Azure storage service instance
     */
    setAzureStorageService(service: any) {
        this.azureStorageService = service;
    }

    /**
     * Subscribe to loading state changes
     */
    subscribe(callback: (state: LoadingState) => void): () => void {
        this.subscribers.add(callback);

        // Immediately call with current state
        callback(this.getState());

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Get current loading state
     */
    private getState(): LoadingState {
        return {
            isLoading: this.isProcessing,
            queueLength: this.queue.length,
            currentRequest: this.currentRequest?.id || null,
        };
    }

    /**
     * Notify subscribers of state changes
     */
    private notifySubscribers() {
        const state = this.getState();
        this.subscribers.forEach((callback) => callback(state));
    }

    /**
     * Add a loading request to the queue
     */
    async loadArtPiece(
        artPieceName: string,
        fileName?: string,
        priority: number = 0
    ): Promise<string> {
        const id = `${artPieceName}-${Date.now()}-${Math.random()}`;

        return new Promise<string>((resolve, reject) => {
            const request: LoadingRequest = {
                id,
                artPieceName,
                fileName,
                resolve,
                reject,
                priority,
            };

            // Insert request in priority order (higher priority first)
            const insertIndex = this.queue.findIndex(
                (req) => req.priority < priority
            );
            if (insertIndex === -1) {
                this.queue.push(request);
            } else {
                this.queue.splice(insertIndex, 0, request);
            }

            this.notifySubscribers();
        });
    }

    /**
     * Process the loading queue
     */
    private async processQueue() {
        while (true) {
            if (this.queue.length === 0) {
                this.isProcessing = false;
                this.currentRequest = null;
                this.notifySubscribers();

                // Wait a bit before checking again
                await new Promise((resolve) => setTimeout(resolve, 100));
                continue;
            }

            this.isProcessing = true;
            const request = this.queue.shift()!;
            this.currentRequest = request;
            this.notifySubscribers();

            try {
                const url = await this.loadSingleArtPiece(request);
                request.resolve(url);
            } catch (error) {
                request.reject(
                    error instanceof Error ? error : new Error(String(error))
                );
            }

            // Small delay between requests to allow other work
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }

    /**
     * Load a single art piece
     */
    private async loadSingleArtPiece(request: LoadingRequest): Promise<string> {
        if (!this.azureStorageService) {
            throw new Error("Azure storage service not initialized");
        }

        return await this.azureStorageService.getArtPieceUrl(
            request.artPieceName,
            request.fileName
        );
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            currentRequest: this.currentRequest?.id || null,
            subscriberCount: this.subscribers.size,
        };
    }

    /**
     * Clear the queue (useful for cleanup)
     */
    clearQueue() {
        // Reject all pending requests
        this.queue.forEach((request) => {
            request.reject(new Error("Loading queue cleared"));
        });
        this.queue = [];
        this.notifySubscribers();
    }
}

// Create a singleton instance
export const loadingManager = new LoadingManager();

// Export types for external use
export type { LoadingRequest, LoadingState };
