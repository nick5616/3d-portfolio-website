import { SOUNDS, SoundChannel, SoundDef, SoundId } from "./soundManifest";

// Small Web Audio mixer: master -> {music, ambience, sfx, ui} channels.
// The AudioContext is created on the first user gesture (browsers block
// audio before one). Buffers are fetched + decoded on first use and cached;
// ids whose files don't exist yet are remembered and skipped quietly.

const SETTINGS_KEY = "sound-settings";

interface SoundSettings {
    muted: boolean;
    volumes: Record<SoundChannel | "master", number>;
}

const DEFAULT_SETTINGS: SoundSettings = {
    muted: false,
    volumes: { master: 0.8, music: 0.6, ambience: 0.7, sfx: 0.8, ui: 0.6 },
};

const loadSettings = (): SoundSettings => {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
        if (saved && typeof saved === "object") {
            return {
                muted: Boolean(saved.muted),
                volumes: { ...DEFAULT_SETTINGS.volumes, ...saved.volumes },
            };
        }
    } catch {
        // ignore
    }
    return structuredClone(DEFAULT_SETTINGS);
};

let settings = loadSettings();
let context: AudioContext | null = null;
let master: GainNode | null = null;
const channels = new Map<SoundChannel, GainNode>();
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const missing = new Set<string>();
const listeners = new Set<() => void>();

const extension = (() => {
    if (typeof Audio === "undefined") return "m4a";
    const probe = new Audio();
    return probe.canPlayType('audio/webm; codecs="opus"') ? "webm" : "m4a";
})();

const ensureContext = (): AudioContext | null => {
    if (context) return context;
    const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.connect(context.destination);
    (["music", "ambience", "sfx", "ui"] as SoundChannel[]).forEach((name) => {
        const gain = context!.createGain();
        gain.connect(master!);
        channels.set(name, gain);
    });
    applyVolumes();
    return context;
};

const applyVolumes = () => {
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(
        settings.muted ? 0 : settings.volumes.master,
        now,
        0.05
    );
    channels.forEach((gain, name) =>
        gain.gain.setTargetAtTime(settings.volumes[name], now, 0.05)
    );
};

// Unlock audio on the first interaction anywhere.
if (typeof window !== "undefined") {
    const unlock = () => {
        const ctx = ensureContext();
        if (!ctx) return;
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        ctx.resume()
            .then(() => {
                // A soundscape requested before the unlock starts now.
                if (pendingSoundscape) {
                    const { music, ambience } = pendingSoundscape;
                    pendingSoundscape = null;
                    setSoundscape(music, ambience);
                }
            })
            .catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
}

const loadBuffer = (file: string): Promise<AudioBuffer | null> => {
    if (missing.has(file)) return Promise.resolve(null);
    let promise = buffers.get(file);
    if (!promise) {
        promise = fetch(`/audio/${file}.${extension}`)
            .then((response) => {
                if (!response.ok) throw new Error(String(response.status));
                return response.arrayBuffer();
            })
            .then((data) => ensureContext()!.decodeAudioData(data))
            .catch(() => {
                missing.add(file);
                return null;
            });
        buffers.set(file, promise);
    }
    return promise;
};

const fileFor = (id: SoundId) => {
    const def = SOUNDS[id] as SoundDef;
    if (!def.variants) return id;
    return `${id}-${1 + Math.floor(Math.random() * def.variants)}`;
};

export const playSound = (
    id: SoundId,
    // pan: -1 (left) to 1 (right), for sounds placed in the world (another
    // visitor's footsteps).
    options: { volume?: number; rate?: number; pan?: number } = {}
) => {
    const ctx = context;
    if (!ctx || ctx.state !== "running" || settings.muted) return;
    const def = SOUNDS[id] as SoundDef;
    loadBuffer(fileFor(id)).then((buffer) => {
        if (!buffer || !context) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value =
            options.rate ?? 0.96 + Math.random() * 0.08;
        const gain = context.createGain();
        gain.gain.value = (def.volume ?? 1) * (options.volume ?? 1);
        if (options.pan && context.createStereoPanner) {
            const panner = context.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, options.pan));
            source.connect(gain).connect(panner).connect(channels.get(def.channel)!);
        } else {
            source.connect(gain).connect(channels.get(def.channel)!);
        }
        source.start();
    });
};

// For rooms that make their own sound (the jam room's synths, the studio).
// Their audio goes through a channel, so the mute toggle and the volume
// settings still apply. Null until the first user gesture unlocks audio.
export const getAudioContext = (): AudioContext | null =>
    context && context.state === "running" ? context : null;
export const getChannelInput = (channel: SoundChannel): GainNode | null =>
    getAudioContext() ? channels.get(channel) ?? null : null;

// Looping beds -----------------------------------------------------------

interface Bed {
    id: SoundId;
    source: AudioBufferSourceNode;
    gain: GainNode;
}
const beds: Partial<Record<"music" | "ambience", Bed>> = {};
let pendingSoundscape: { music?: SoundId; ambience?: SoundId } | null = null;
const FADE = 1.8; // seconds

const crossfade = (slot: "music" | "ambience", id: SoundId | undefined) => {
    const ctx = context!;
    const current = beds[slot];
    if (current?.id === id) return;
    if (current) {
        current.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 4);
        current.source.stop(ctx.currentTime + FADE * 2);
        delete beds[slot];
    }
    if (!id) return;
    const def = SOUNDS[id] as SoundDef;
    loadBuffer(id).then((buffer) => {
        if (!buffer || !context) return;
        // Another room may have been entered while this was loading.
        if (beds[slot] || desired[slot] !== id) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        if (def.loopStart !== undefined) source.loopStart = def.loopStart;
        if (def.loopEnd !== undefined) source.loopEnd = def.loopEnd;
        const gain = context.createGain();
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(def.volume ?? 1, context.currentTime, FADE / 4);
        source.connect(gain).connect(channels.get(slot)!);
        source.start();
        beds[slot] = { id, source, gain };
        if (slot === "music") {
            musicListeners.forEach((listener) => listener(id));
        }
    });
};

const desired: Partial<Record<"music" | "ambience", SoundId>> = {};

export const setSoundscape = (music?: SoundId, ambience?: SoundId) => {
    desired.music = music;
    desired.ambience = ambience;
    if (!context || context.state !== "running") {
        pendingSoundscape = { music, ambience };
        return;
    }
    crossfade("music", music);
    crossfade("ambience", ambience);
};

// Fires when a music bed actually starts playing (file present, unlocked).
const musicListeners = new Set<(id: SoundId) => void>();
export const onMusicStart = (listener: (id: SoundId) => void) => {
    musicListeners.add(listener);
    return () => {
        musicListeners.delete(listener);
    };
};

// Settings ---------------------------------------------------------------

export const getSoundSettings = () => settings;

export const updateSoundSettings = (patch: Partial<SoundSettings>) => {
    settings = {
        muted: patch.muted ?? settings.muted,
        volumes: { ...settings.volumes, ...patch.volumes },
    };
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
    applyVolumes();
    listeners.forEach((listener) => listener());
};

export const subscribeSoundSettings = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
