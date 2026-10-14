import { Track, currentPositionMs, useStudioMusic } from "./soundcloud";

// What the studio's visuals dance to. SoundCloud's player lives in another
// origin, so its audio can't be analysed directly; instead each track's
// published waveform (the loudness shape you see on SoundCloud) is fetched
// once, and the playback position is read out of it every frame. Builds,
// drops and breakdowns land exactly where they are in the song; the finer
// shimmer on top is generated. The output has the same shape as Bird Dog's
// song-visualizer: bass / low / mid / high / total bands and a smoothed
// 128-bin spectrum.

export interface Signal {
    bass: number;
    low: number;
    mid: number;
    high: number;
    total: number;
    drop: number; // 0..1 flash on a sudden jump in loudness
    spectrum: Float32Array; // 128 bins, 0..255
    playing: boolean;
}

interface Analysis {
    samples: Float32Array; // loudness 0..1
    onsets: Float32Array; // 0..1, sharp rises
}

const analyses = new Map<string, Promise<Analysis | null>>();

const analyse = (raw: number[]): Analysis => {
    const max = Math.max(1, ...raw);
    const samples = Float32Array.from(raw, (v) => v / max);
    const onsets = new Float32Array(samples.length);
    let peak = 1e-6;
    for (let i = 0; i < samples.length; i++) {
        let mean = 0;
        let n = 0;
        for (let k = Math.max(0, i - 12); k < i; k++) {
            mean += samples[k];
            n++;
        }
        mean = n ? mean / n : samples[i];
        onsets[i] = Math.max(0, samples[i] - mean);
        peak = Math.max(peak, onsets[i]);
    }
    for (let i = 0; i < onsets.length; i++) onsets[i] = Math.min(1, onsets[i] / (peak * 0.6));
    return { samples, onsets };
};

export const loadAnalysis = (track: Track) => {
    if (!track.waveformUrl) return Promise.resolve(null);
    const url = track.waveformUrl.replace(/\.png(\?.*)?$/, ".json");
    let promise = analyses.get(url);
    if (!promise) {
        promise = fetch(url)
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { samples?: number[] } | null) => (data?.samples?.length ? analyse(data.samples) : null))
            .catch(() => null);
        analyses.set(url, promise);
    }
    return promise;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const noise = (x: number) => Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.1 + 1.3) * 0.3 + Math.sin(x * 7.3 + 2.1) * 0.2;

export class StudioSignal {
    readonly value: Signal = {
        bass: 0,
        low: 0,
        mid: 0,
        high: 0,
        total: 0,
        drop: 0,
        spectrum: new Float32Array(128),
        playing: false,
    };
    private analysis: Analysis | null = null;
    private analysisFor: number | null = null;
    private lastOnsetIndex = -1;
    private time = 0;

    update(delta: number) {
        this.time += delta;
        const music = useStudioMusic.getState();
        const track = music.tracks.find((t) => t.index === music.current) ?? null;
        if (track && this.analysisFor !== track.id) {
            this.analysisFor = track.id;
            this.analysis = null;
            this.lastOnsetIndex = -1;
            const id = track.id;
            loadAnalysis(track).then((a) => {
                if (this.analysisFor === id) this.analysis = a;
            });
        }

        const v = this.value;
        v.playing = music.playing;
        const t = this.time;
        let level: number;
        let drop = 0;
        if (music.playing && track && this.analysis && track.duration > 0) {
            const { samples, onsets } = this.analysis;
            const at = Math.max(0, Math.min(1, currentPositionMs() / track.duration)) * (samples.length - 1);
            const i = Math.floor(at);
            const f = at - i;
            level = lerp(samples[i], samples[Math.min(i + 1, samples.length - 1)], f);
            if (i !== this.lastOnsetIndex) {
                // Any big rise we've just passed (a frame can skip several).
                for (let k = Math.max(this.lastOnsetIndex + 1, i - 3); k <= i; k++) drop = Math.max(drop, onsets[k]);
                this.lastOnsetIndex = i;
            }
        } else if (music.playing) {
            // Waveform not here (yet): a steady 120 BPM pulse at medium energy.
            const beat = (t * 2) % 1;
            level = 0.55 + Math.pow(1 - beat, 4) * 0.35;
        } else {
            level = 0.06 + Math.sin(t * 0.7) * 0.03; // idle breathing
        }

        // Shape bands from the loudness: low end follows it closely, the top
        // end flickers more the louder it gets.
        const smooth = (current: number, target: number, rate: number) => lerp(current, target, Math.min(1, delta * rate));
        v.bass = smooth(v.bass, Math.pow(level, 1.2) * (0.85 + 0.15 * noise(t * 4)), 14);
        v.low = smooth(v.low, level * (0.7 + 0.3 * noise(t * 2.3 + 4)), 10);
        v.mid = smooth(v.mid, level * (0.55 + 0.45 * Math.abs(noise(t * 3.7 + 9))), 10);
        v.high = smooth(v.high, level * level * (0.4 + 0.6 * Math.abs(noise(t * 9.1 + 2))), 16);
        v.total = (v.bass + v.low + v.mid + v.high) / 4;
        v.drop = drop > 0.55 ? Math.max(v.drop, drop) : Math.max(0, v.drop - delta * 2.2);

        for (let k = 0; k < 128; k++) {
            const band = k < 8 ? v.bass : k < 24 ? v.low : k < 64 ? v.mid : v.high;
            const tilt = 1 - (k / 128) * 0.45;
            const shimmer = 0.7 + 0.3 * noise(k * 0.37 + t * 5);
            v.spectrum[k] = lerp(v.spectrum[k], Math.min(255, band * tilt * shimmer * 300), Math.min(1, delta * 18));
        }
        return v;
    }
}
