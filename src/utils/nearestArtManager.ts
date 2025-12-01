/**
 * Nearest Art Manager
 * 
 * Tracks all art pieces and their distances from the camera.
 * Only allows the nearest art piece to load at a time.
 */

interface ArtPieceRegistration {
    id: string;
    distance: number;
    isNear: boolean;
}

class NearestArtManager {
    private registrations: Map<string, ArtPieceRegistration> = new Map();
    private currentNearestId: string | null = null;
    private subscribers: Set<(nearestId: string | null) => void> = new Set();

    /**
     * Register or update an art piece's distance
     */
    register(id: string, distance: number, isNear: boolean) {
        this.registrations.set(id, { id, distance, isNear });
        this.updateNearest();
    }

    /**
     * Unregister an art piece
     */
    unregister(id: string) {
        this.registrations.delete(id);
        if (this.currentNearestId === id) {
            this.currentNearestId = null;
        }
        this.updateNearest();
    }

    /**
     * Check if an art piece should be allowed to load
     */
    shouldLoad(id: string): boolean {
        return this.currentNearestId === id;
    }

    /**
     * Get the current nearest art piece ID
     */
    getNearestId(): string | null {
        return this.currentNearestId;
    }

    /**
     * Update which art piece is nearest
     */
    private updateNearest() {
        // Find the nearest art piece that is also "near" (within proximity)
        let nearest: ArtPieceRegistration | null = null;
        let minDistance = Infinity;

        for (const registration of this.registrations.values()) {
            if (registration.isNear && registration.distance < minDistance) {
                minDistance = registration.distance;
                nearest = registration;
            }
        }

        const newNearestId = nearest?.id || null;

        if (newNearestId !== this.currentNearestId) {
            this.currentNearestId = newNearestId;
            this.notifySubscribers();
        }
    }

    /**
     * Subscribe to changes in the nearest art piece
     */
    subscribe(callback: (nearestId: string | null) => void): () => void {
        this.subscribers.add(callback);
        // Immediately call with current state
        callback(this.currentNearestId);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Notify all subscribers
     */
    private notifySubscribers() {
        this.subscribers.forEach((callback) => callback(this.currentNearestId));
    }

    /**
     * Clear all registrations
     */
    clear() {
        this.registrations.clear();
        this.currentNearestId = null;
        this.notifySubscribers();
    }
}

// Create a singleton instance
export const nearestArtManager = new NearestArtManager();

