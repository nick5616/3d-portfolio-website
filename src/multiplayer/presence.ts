import { useMultiplayerStore } from "./connection";
import { MP_SPLIT } from "./roomLink";

// Production needs VITE_MULTIPLAYER_URL (e.g. wss://world-xyz.a.run.app);
// without it the world is simply single-player. In dev it defaults to the
// local server from multiplayer-server/.
export const MULTIPLAYER_URL: string | undefined =
    import.meta.env.VITE_MULTIPLAYER_URL ||
    (import.meta.env.DEV ? `ws://${location.hostname}:8787` : undefined);

/** The presence server's name for a world room (`?mp=` splits it in dev, as it does the shared rooms). */
export const presenceRoomKey = (roomId: string) => (MP_SPLIT ? `${roomId}--${MP_SPLIT}` : roomId);

/**
 * How many others the presence server says are in the room, as soon as it
 * says - or null if it can't say in time (no server, still connecting).
 */
export const presenceCount = (roomId: string, timeoutMs: number): Promise<number | null> => {
    if (!MULTIPLAYER_URL) return Promise.resolve(null);
    const key = presenceRoomKey(roomId);
    const read = () => {
        const s = useMultiplayerStore.getState();
        return s.status === "online" && s.room === key ? Object.keys(s.peers).length : null;
    };
    const now = read();
    if (now !== null) return Promise.resolve(now);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            unsubscribe();
            resolve(null);
        }, timeoutMs);
        const unsubscribe = useMultiplayerStore.subscribe(() => {
            const count = read();
            if (count === null) return;
            clearTimeout(timer);
            unsubscribe();
            resolve(count);
        });
    });
};

/** How many are in a room right now, by the server's census (0 if it doesn't take one). */
export const useRoomHeadcount = (roomId: string) =>
    useMultiplayerStore((s) => s.census[presenceRoomKey(roomId)] ?? 0);

/** Everyone in the world right now, us included (0 if the server doesn't say). */
export const useWorldHeadcount = () =>
    useMultiplayerStore((s) =>
        Object.entries(s.census).reduce(
            (sum, [key, n]) => sum + (MP_SPLIT ? (key.endsWith(`--${MP_SPLIT}`) ? n : 0) : key.includes("--") ? 0 : n),
            0
        )
    );
