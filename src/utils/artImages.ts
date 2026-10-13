// URLs for art images at the size they're actually going to be shown.
//
// The originals in the "artandmedia" bucket are full-resolution camera and
// export files (up to ~22 megapixels). On a wall a few meters away nothing
// close to that is visible, so in production every image goes through
// Netlify's Image CDN, which resizes and re-encodes on first request and
// caches the result at the edge. Configured by `[images] remote_images` in
// netlify.toml. The plain Vite dev server has no CDN, so dev falls back to
// the original file and artTextureLoader shrinks it after decoding instead.
// Set VITE_NETLIFY_IMAGES=true when running `netlify dev` to test the CDN path.

const useImageCdn =
    import.meta.env.PROD || import.meta.env.VITE_NETLIFY_IMAGES === "true";

export const hasImageCdn = useImageCdn;

export const resizedImageUrl = (
    originalUrl: string,
    width: number,
    quality = 80
): string => {
    if (!useImageCdn) return originalUrl;
    const params = new URLSearchParams({
        url: originalUrl,
        w: String(width),
        q: String(quality),
        fm: "webp",
    });
    return `/.netlify/images?${params.toString()}`;
};

// Tiny version for an instant blurry preview while the real one loads.
export const ART_PREVIEW_WIDTH = 48;
// What hangs on the walls. Frames are at most ~3 m wide; 2048 px is already
// more than the screen shows from any normal viewing distance.
export const ART_WALL_WIDTH = 2048;
// Inspect view: big enough to zoom into brushwork without shipping a
// 20 MB camera original.
export const ART_INSPECT_WIDTH = 3200;
