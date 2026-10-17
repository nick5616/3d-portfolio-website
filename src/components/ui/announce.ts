// A line across the middle of the screen, for moments that deserve one
// (HudToasts draws it).

export interface Announcement {
    line: string;
    detail?: string;
}

const listeners = new Set<(a: Announcement) => void>();

export const announce = (announcement: Announcement) => listeners.forEach((l) => l(announcement));

export const onAnnounce = (listener: (a: Announcement) => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
