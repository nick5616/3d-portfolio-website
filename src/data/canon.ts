// Content comes from Canon (github.com/nick5616/content-pipeline): one view
// per surface, published to the public bucket. A view is flat and final -
// copy resolved, images already sized, order applied - so the site only
// reads what it needs. The types below mirror the view schemas there
// (schema/surfaces/<surface>/view.schema.json), version 1.

export const CANON_BASE: string =
    (import.meta.env.VITE_CANON_BASE as string | undefined) ??
    "https://storage.googleapis.com/canon-public";

export interface CanonImage {
    url: string; // the largest size
    width: number;
    height: number;
    srcset: { url: string; width: number }[]; // smallest first, WebP
    lqip: string | null; // tiny blurred placeholder, as a data: URI
    alt: string | null;
}

export interface CanonDate {
    value: string; // ISO partial: 2024, 2024-12 or 2024-12-03
    label: string | null;
    display: string; // what to show ("Circa 2022", "Dec 2024")
    sortKey: number;
}

interface CanonEntry {
    id: string;
    slug: string;
    title: string;
    summary: string;
    order: number | null;
}

export interface ArtRoomView {
    view: "holodeck-art-room";
    viewVersion: 1;
    entries: (CanonEntry & {
        pieces: {
            id: string;
            slug: string;
            title: string | null; // null unless the hall shows plaques
            description: string | null;
            date: CanonDate | null;
            image: CanonImage;
        }[];
    })[];
}

export interface DjRoomView {
    view: "holodeck-dj-room";
    viewVersion: 1;
    artist: string;
    tracks: {
        id: string;
        slug: string;
        title: string;
        artist: string;
        audio: string; // URL
        analysis: string; // URL: { fps, bands, waveform }
        duration: number;
        bpm: number;
        firstBeat: number;
        start: number;
        key: string;
        camelot: string;
    }[];
}

const views = new Map<string, Promise<unknown>>();

// Fetches a surface's view once per page load. A failed fetch is retried on
// the next call.
export const loadView = <T extends { view: string; viewVersion: number }>(
    surface: T["view"]
): Promise<T> => {
    let promise = views.get(surface) as Promise<T> | undefined;
    if (!promise) {
        promise = (async () => {
            const response = await fetch(`${CANON_BASE}/views/${surface}.json`, { cache: "no-cache" });
            if (!response.ok) throw new Error(`Canon view ${surface}: ${response.status}`);
            const view = (await response.json()) as T;
            if (view.view !== surface || view.viewVersion !== 1) {
                throw new Error(`Canon view ${surface}: expected version 1, got ${view.view} v${view.viewVersion}`);
            }
            return view;
        })();
        promise.catch(() => views.delete(surface));
        views.set(surface, promise);
    }
    return promise;
};
