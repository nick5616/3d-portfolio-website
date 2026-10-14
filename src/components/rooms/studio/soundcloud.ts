import { create } from "zustand";
import { getSoundSettings, subscribeSoundSettings } from "../../../audio/soundManager";

// Bird Dog's tracks, played through SoundCloud's embeddable widget (a hidden
// iframe driven by its JavaScript API). The widget's audio can't be
// analysed from here (it's another origin), so the studio's visuals follow
// each track's published waveform instead - see studioSignal.ts.

export const SOUNDCLOUD_PROFILE = "https://soundcloud.com/shoutout-that-little-bear";
// A piano piece Bird Dog performed ("Childyllic"); in the forest it's
// called the Song of the Forest.
export const CHILDYLLIC = "https://soundcloud.com/shoutout-that-little-bear/childyllic";

export interface Track {
    index: number; // position in the widget's list
    id: number;
    title: string;
    artwork: string | null;
    duration: number; // ms
    waveformUrl: string | null;
    permalink: string;
}

interface StudioMusicState {
    status: "idle" | "loading" | "ready" | "error";
    tracks: Track[];
    current: number | null;
    playing: boolean;
    position: number; // ms, as last reported
    positionAt: number; // performance.now() of that report
}

export const useStudioMusic = create<StudioMusicState>(() => ({
    status: "idle",
    tracks: [],
    current: null,
    playing: false,
    position: 0,
    positionAt: 0,
}));

// Where the song is right now, extrapolated between the widget's reports.
export const currentPositionMs = () => {
    const s = useStudioMusic.getState();
    if (!s.playing) return s.position;
    return s.position + (performance.now() - s.positionAt);
};

// --- The widget ---------------------------------------------------------------

interface SoundCloudSound {
    id: number;
    title?: string;
    artwork_url?: string | null;
    duration?: number;
    waveform_url?: string | null;
    permalink_url?: string;
    user?: { avatar_url?: string };
}
interface Widget {
    bind: (event: string, callback: (data?: { currentPosition?: number }) => void) => void;
    getSounds: (callback: (sounds: SoundCloudSound[]) => void) => void;
    getCurrentSoundIndex: (callback: (index: number) => void) => void;
    skip: (index: number) => void;
    play: () => void;
    pause: () => void;
    toggle: () => void;
    next: () => void;
    prev: () => void;
    setVolume: (volume: number) => void;
}
interface SCGlobal {
    Widget: ((iframe: HTMLIFrameElement) => Widget) & {
        Events: Record<"READY" | "PLAY" | "PAUSE" | "FINISH" | "PLAY_PROGRESS" | "ERROR", string>;
    };
}

let scriptPromise: Promise<SCGlobal> | null = null;
const loadApi = () => {
    const existing = (window as unknown as { SC?: SCGlobal }).SC;
    if (existing) return Promise.resolve(existing);
    scriptPromise ??= new Promise<SCGlobal>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://w.soundcloud.com/player/api.js";
        script.async = true;
        script.onload = () => resolve((window as unknown as { SC: SCGlobal }).SC);
        script.onerror = () => {
            scriptPromise = null;
            reject(new Error("SoundCloud widget API failed to load"));
        };
        document.head.appendChild(script);
    });
    return scriptPromise;
};

let iframe: HTMLIFrameElement | null = null;
let widget: Widget | null = null;
let unsubscribeVolume: (() => void) | null = null;
let refreshTimer: number | null = null;
let session = 0; // bumped on close, so a slow open can tell it's stale

const applyVolume = () => {
    if (!widget) return;
    const { muted, volumes } = getSoundSettings();
    widget.setVolume(muted ? 0 : Math.round(volumes.master * volumes.music * 100));
};

const artworkFor = (sound: SoundCloudSound) => {
    const url = sound.artwork_url || sound.user?.avatar_url || null;
    return url ? url.replace("-large.", "-t300x300.") : null;
};

const refreshTracks = () => {
    widget?.getSounds((sounds) => {
        // The widget fills in long lists lazily; keep the ones it has loaded.
        const tracks: Track[] = sounds
            .map((sound, index) => ({ sound, index }))
            .filter(({ sound }) => sound.title)
            .map(({ sound, index }) => ({
                index,
                id: sound.id,
                title: sound.title!,
                artwork: artworkFor(sound),
                duration: sound.duration ?? 0,
                waveformUrl: sound.waveform_url ?? null,
                permalink: sound.permalink_url ?? SOUNDCLOUD_PROFILE,
            }));
        useStudioMusic.setState({ tracks, status: tracks.length ? "ready" : "loading" });
    });
};

// Mount the hidden player (once per visit to a room that plays music). By
// default it loads the whole profile; pass a track URL to load just that.
export const openStudioMusic = async (onReady?: () => void, source: string = SOUNDCLOUD_PROFILE) => {
    if (iframe) return;
    const mine = ++session;
    useStudioMusic.setState({ status: "loading" });
    let SC: SCGlobal;
    try {
        SC = await loadApi();
    } catch {
        if (mine === session) useStudioMusic.setState({ status: "error" });
        return;
    }
    if (mine !== session || iframe) return; // left the studio while loading
    iframe = document.createElement("iframe");
    iframe.allow = "autoplay";
    iframe.title = "Bird Dog on SoundCloud";
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(source)}&auto_play=false&visual=false&show_comments=false&hide_related=true`;
    Object.assign(iframe.style, {
        position: "fixed",
        width: "1px",
        height: "1px",
        left: "-10px",
        bottom: "0",
        opacity: "0",
        pointerEvents: "none",
        border: "0",
    });
    document.body.appendChild(iframe);
    widget = SC.Widget(iframe);
    const events = SC.Widget.Events;
    widget.bind(events.READY, () => {
        applyVolume();
        refreshTracks();
        // Long lists arrive a page at a time.
        refreshTimer = window.setInterval(refreshTracks, 4000);
        onReady?.();
    });
    widget.bind(events.PLAY, () => {
        widget?.getCurrentSoundIndex((index) => useStudioMusic.setState({ current: index }));
        useStudioMusic.setState({ playing: true, positionAt: performance.now() });
    });
    widget.bind(events.PAUSE, () =>
        useStudioMusic.setState({ playing: false, position: currentPositionMs(), positionAt: performance.now() })
    );
    widget.bind(events.FINISH, () => useStudioMusic.setState({ playing: false }));
    widget.bind(events.PLAY_PROGRESS, (data) => {
        if (data?.currentPosition !== undefined) {
            useStudioMusic.setState({ position: data.currentPosition, positionAt: performance.now() });
        }
    });
    widget.bind(events.ERROR, () => useStudioMusic.setState({ status: "error" }));
    unsubscribeVolume = subscribeSoundSettings(applyVolume);
};

// Leaving the studio stops the music and removes the player.
export const closeStudioMusic = () => {
    session++;
    widget?.pause();
    widget = null;
    iframe?.remove();
    iframe = null;
    unsubscribeVolume?.();
    unsubscribeVolume = null;
    if (refreshTimer !== null) window.clearInterval(refreshTimer);
    refreshTimer = null;
    useStudioMusic.setState({ playing: false, current: null, position: 0 });
};

export const playTrack = (index: number) => {
    if (!widget) return;
    useStudioMusic.setState({ current: index, position: 0, positionAt: performance.now() });
    widget.skip(index);
    widget.play();
};
export const togglePlayback = () => {
    const { current, tracks } = useStudioMusic.getState();
    if (current === null) {
        if (tracks.length) playTrack(tracks[0].index);
        return;
    }
    widget?.toggle();
};
export const nextTrack = () => {
    const { current, tracks } = useStudioMusic.getState();
    if (!tracks.length) return;
    const at = tracks.findIndex((t) => t.index === current);
    playTrack(tracks[(at + 1) % tracks.length].index);
};
export const previousTrack = () => {
    const { current, tracks } = useStudioMusic.getState();
    if (!tracks.length) return;
    const at = tracks.findIndex((t) => t.index === current);
    playTrack(tracks[(at - 1 + tracks.length) % tracks.length].index);
};
