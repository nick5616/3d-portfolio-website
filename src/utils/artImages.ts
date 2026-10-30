// URLs for art images at the size they're actually going to be shown.
//
// Canon publishes every piece pre-sized (WebP at 320, 800, 1600, 2048 and
// 3200 px, never upscaled) plus a tiny placeholder, all listed in the
// art-room view. So instead of resizing on request (the old Netlify Image
// CDN path), this picks the smallest published size at least as wide as
// asked for. Pieces register their sizes when their hall loads
// (configs/artMetadata.ts); any other URL is returned as is.
import type { CanonImage } from "../data/canon";

const sizesByUrl = new Map<string, CanonImage>();

export const registerArtSizes = (image: CanonImage) => {
    sizesByUrl.set(image.url, image);
};

// Every art image has sizes now, in dev as in production.
export const hasImageSizes = true;

export const resizedImageUrl = (
    originalUrl: string,
    width: number,
    _quality?: number
): string => {
    const image = sizesByUrl.get(originalUrl);
    if (!image) return originalUrl;
    if (width <= ART_PREVIEW_WIDTH && image.lqip) return image.lqip;
    const fit = image.srcset.find((s) => s.width >= width);
    return (fit ?? image.srcset[image.srcset.length - 1] ?? image).url;
};

// Tiny version for an instant blurry preview while the real one loads.
export const ART_PREVIEW_WIDTH = 48;
// What hangs on the walls. Frames are at most ~3 m wide; 2048 px is already
// more than the screen shows from any normal viewing distance.
export const ART_WALL_WIDTH = 2048;
// Inspect view: big enough to zoom into brushwork without shipping a
// 20 MB camera original.
export const ART_INSPECT_WIDTH = 3200;
