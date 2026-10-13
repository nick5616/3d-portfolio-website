import * as THREE from "three";

// Loads art images into GPU textures without stalling the frame.
//
// - Decoding happens off the main thread: the image is fetched as a blob
//   and turned into an ImageBitmap with createImageBitmap(), which browsers
//   decode on a background thread (useLoader/TextureLoader decoded on the
//   main thread, freezing the scene for a moment per painting).
// - Anything larger than `maxSize` is shrunk during that decode, so a
//   22-megapixel original can never land on the GPU at full size (dev
//   only - production already gets CDN-resized files, see artImages.ts).
// - At most MAX_CONCURRENT images are in flight. When a slot frees up, the
//   waiting request with the lowest priority value (the frame closest to
//   the camera) goes next.
// - Textures are reference counted. When nothing uses one anymore it stays
//   in a small LRU (so walking back into a room is instant) and is disposed
//   of when it falls out, so GPU memory stays bounded.

const MAX_CONCURRENT = 3;
const LRU_LIMIT = 40;

interface Entry {
    promise: Promise<THREE.Texture>;
    texture: THREE.Texture | null;
    refs: number;
    lastReleased: number;
}

interface Pending {
    run: () => Promise<void>;
    priority: () => number;
}

const cache = new Map<string, Entry>();
const queue: Pending[] = [];
let active = 0;

const pump = () => {
    while (active < MAX_CONCURRENT && queue.length > 0) {
        // Re-evaluate priorities at dequeue time: the player may have walked
        // across the room since these were queued.
        let best = 0;
        let bestPriority = queue[0].priority();
        for (let i = 1; i < queue.length; i++) {
            const priority = queue[i].priority();
            if (priority < bestPriority) {
                best = i;
                bestPriority = priority;
            }
        }
        const [next] = queue.splice(best, 1);
        active++;
        next.run().finally(() => {
            active--;
            pump();
        });
    }
};

const decode = async (url: string, maxSize: number): Promise<THREE.Texture> => {
    if (typeof createImageBitmap !== "function") {
        // Very old browsers: plain (main-thread) decode.
        const texture = await new THREE.TextureLoader().loadAsync(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    const blob = await response.blob();

    let bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
    });
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest > maxSize) {
        const scale = maxSize / longest;
        try {
            const resized = await createImageBitmap(bitmap, {
                resizeWidth: Math.round(bitmap.width * scale),
                resizeHeight: Math.round(bitmap.height * scale),
                resizeQuality: "high",
                premultiplyAlpha: "none",
                colorSpaceConversion: "none",
            });
            bitmap.close();
            bitmap = resized;
        } catch {
            // resize options unsupported - keep the full-size bitmap
        }
    }

    const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
    // ImageBitmaps can't be flipped at upload time (WebGL ignores
    // UNPACK_FLIP_Y for them), so flip through the UV transform instead.
    texture.flipY = false;
    texture.repeat.set(1, -1);
    texture.offset.set(0, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
};

const evict = () => {
    const idle = [...cache.entries()]
        .filter(([, entry]) => entry.refs === 0 && entry.texture)
        .sort((a, b) => a[1].lastReleased - b[1].lastReleased);
    while (idle.length > LRU_LIMIT) {
        const [url, entry] = idle.shift()!;
        disposeTexture(entry.texture!);
        cache.delete(url);
    }
};

const disposeTexture = (texture: THREE.Texture) => {
    const image = texture.image as { close?: () => void } | undefined;
    texture.dispose();
    image?.close?.();
};

export interface ArtTextureRequest {
    promise: Promise<THREE.Texture>;
    release: () => void;
}

// Request a texture. Call release() when you stop using it (on unmount).
export const requestArtTexture = (
    url: string,
    options: { maxSize?: number; priority?: () => number } = {}
): ArtTextureRequest => {
    const { maxSize = 2048, priority = () => 0 } = options;
    let entry = cache.get(url);

    if (!entry) {
        let resolve!: (texture: THREE.Texture) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<THREE.Texture>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const created: Entry = {
            promise,
            texture: null,
            refs: 0,
            lastReleased: 0,
        };
        entry = created;
        cache.set(url, created);
        queue.push({
            priority,
            run: () =>
                decode(url, maxSize).then(
                    (texture) => {
                        created.texture = texture;
                        resolve(texture);
                    },
                    (error) => {
                        cache.delete(url);
                        reject(error);
                    }
                ),
        });
        pump();
    }

    entry.refs++;
    let released = false;
    const held = entry;
    return {
        promise: held.promise,
        release: () => {
            if (released) return;
            released = true;
            held.refs--;
            if (held.refs <= 0) {
                held.lastReleased = performance.now();
                evict();
            }
        },
    };
};
