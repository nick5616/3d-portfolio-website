import { create } from "zustand";
import { DjRoomView, loadView } from "../../../../data/canon";

// The records the decks play: Bird Dog's tracks, from Canon's
// holodeck-dj-room view (src/data/canon.ts), with the beat grid and
// three-band waveform Canon computes (djgrid, a port of
// scripts/build-dj-crate.mjs). Every visitor uses the same pre-computed
// grid, so their decks agree on where the beats are. Audio and analysis
// are absolute URLs in the public bucket.

export interface CrateTrack {
    id: string;
    title: string;
    artist: string;
    audio: string; // URL
    analysis: string; // URL
    duration: number; // s
    bpm: number;
    firstBeat: number; // s, a downbeat at or after the first sound
    start: number; // s, where the sound starts (the auto-cue point)
    key: string;
    camelot: string;
}

export interface Waveform {
    fps: number; // columns per second of audio
    // low / mid / high peaks, 0..255, interleaved per column
    data: Uint8Array;
    columns: number;
}

interface CrateState {
    status: "idle" | "loading" | "ready" | "error";
    tracks: CrateTrack[];
}

export const useCrate = create<CrateState>(() => ({ status: "idle", tracks: [] }));

const byId = new Map<string, CrateTrack>();
export const trackMeta = (id: string | null) => (id ? byId.get(id) ?? null : null);

let cratePromise: Promise<CrateTrack[] | null> | null = null;
export const loadCrate = () => {
    cratePromise ??= (async () => {
        useCrate.setState({ status: "loading" });
        try {
            const view = await loadView<DjRoomView>("holodeck-dj-room");
            // Track ids stay the slugs the crate always used.
            const tracks: CrateTrack[] = view.tracks
                .map(({ slug, id: _id, ...t }) => ({ ...t, id: slug }))
                .filter((t) => t.id && t.audio && t.bpm > 0);
            if (!tracks.length) throw new Error("empty crate");
            tracks.forEach((t) => byId.set(t.id, t));
            useCrate.setState({ status: "ready", tracks });
            return tracks;
        } catch {
            cratePromise = null; // try again on the next visit
            useCrate.setState({ status: "error" });
            return null;
        }
    })();
    return cratePromise;
};

// Decoded audio, a few at a time (a 4-minute track is ~85 MB as floats).
const KEEP = 4;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
export const loadTrackAudio = (id: string, context: BaseAudioContext) => {
    const meta = byId.get(id);
    if (!meta) return Promise.resolve(null);
    let promise = buffers.get(id);
    if (promise) {
        buffers.delete(id); // most recent last
        buffers.set(id, promise);
        return promise;
    }
    promise = fetch(meta.audio)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => context.decodeAudioData(data))
        .catch(() => {
            buffers.delete(id);
            return null;
        });
    buffers.set(id, promise);
    while (buffers.size > KEEP) buffers.delete(buffers.keys().next().value!);
    return promise;
};

const waveforms = new Map<string, Promise<Waveform | null>>();
export const loadWaveform = (id: string) => {
    const meta = byId.get(id);
    if (!meta) return Promise.resolve(null);
    let promise = waveforms.get(id);
    if (!promise) {
        promise = fetch(meta.analysis)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((json: { fps: number; waveform: string }) => {
                const bytes = Uint8Array.from(atob(json.waveform), (c) => c.charCodeAt(0));
                return { fps: json.fps, data: bytes, columns: Math.floor(bytes.length / 3) };
            })
            .catch(() => {
                waveforms.delete(id);
                return null;
            });
        waveforms.set(id, promise);
    }
    return promise;
};

// Synchronous access once loaded, for drawing every frame.
const readyWaveforms = new Map<string, Waveform>();
export const waveformNow = (id: string | null): Waveform | null => {
    if (!id) return null;
    const ready = readyWaveforms.get(id);
    if (ready) return ready;
    loadWaveform(id).then((w) => w && readyWaveforms.set(id, w));
    return null;
};
