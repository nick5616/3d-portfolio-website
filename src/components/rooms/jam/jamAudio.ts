import { getAudioContext, getChannelInput } from "../../../audio/soundManager";

// The jam room's sound: every instrument is synthesized live (no samples to
// download), everything is in C major pentatonic over a four-chord loop, so
// whatever anybody does sounds like music.

export type InstrumentId = "drum" | "snare" | "hat" | "clap" | "bass" | "piano" | "bells" | "synth";

// The four-bar chord loop: C, A minor, F, G. Each chord as MIDI notes.
const PROGRESSION = [
    [48, 52, 55], // C
    [45, 48, 52], // Am
    [41, 45, 48], // F
    [43, 47, 50], // G
];
const PENTATONIC = [0, 2, 4, 7, 9]; // C D E G A

export const chordForBar = (bar: number) => PROGRESSION[((bar % 4) + 4) % 4];
const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// Snap any note to the pentatonic scale (so melodies never clash).
const toScale = (midi: number) => {
    const octave = Math.floor(midi / 12);
    const pc = midi - octave * 12;
    let best = PENTATONIC[0];
    for (const degree of PENTATONIC) if (Math.abs(degree - pc) < Math.abs(best - pc)) best = degree;
    return octave * 12 + best;
};

// --- Engine -----------------------------------------------------------------

let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;

const output = (ctx: AudioContext) => {
    if (bus && bus.context === ctx) return bus;
    const channel = getChannelInput("music");
    if (!channel) return null;
    bus = ctx.createGain();
    bus.gain.value = 0.85;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -14;
    glue.ratio.value = 3;
    glue.attack.value = 0.005;
    glue.release.value = 0.15;
    bus.connect(glue).connect(channel);
    return bus;
};

const noiseBuffer = (ctx: AudioContext) => {
    if (noise && noise.sampleRate === ctx.sampleRate) return noise;
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noise;
};

const envelope = (ctx: AudioContext, time: number, attack: number, decay: number, peak: number) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    return gain;
};

const playNoise = (ctx: AudioContext, out: AudioNode, time: number, duration: number, filter: BiquadFilterNode) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    source.connect(filter);
    filter.connect(out);
    source.start(time, Math.random() * 0.5, duration + 0.05);
};

const voices: Record<string, (ctx: AudioContext, out: AudioNode, time: number, midi: number, level: number) => void> = {
    drum: (ctx, out, time, _midi, level) => {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
        const gain = envelope(ctx, time, 0.002, 0.38, 1.0 * level);
        osc.connect(gain).connect(out);
        osc.start(time);
        osc.stop(time + 0.45);
    },
    snare: (ctx, out, time, _midi, level) => {
        const body = ctx.createOscillator();
        body.type = "triangle";
        body.frequency.setValueAtTime(220, time);
        body.frequency.exponentialRampToValueAtTime(140, time + 0.08);
        body.connect(envelope(ctx, time, 0.001, 0.1, 0.35 * level)).connect(out);
        body.start(time);
        body.stop(time + 0.15);
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 1500;
        const gain = envelope(ctx, time, 0.001, 0.18, 0.5 * level);
        playNoise(ctx, gain, time, 0.2, filter);
        gain.connect(out);
    },
    hat: (ctx, out, time, _midi, level) => {
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 7000;
        const gain = envelope(ctx, time, 0.001, 0.05, 0.28 * level);
        playNoise(ctx, gain, time, 0.06, filter);
        gain.connect(out);
    },
    clap: (ctx, out, time, _midi, level) => {
        // A few quick bursts, like several hands.
        [0, 0.012, 0.024].forEach((offset, i) => {
            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1200;
            filter.Q.value = 0.9;
            const gain = envelope(ctx, time + offset, 0.001, i === 2 ? 0.16 : 0.02, 0.5 * level);
            playNoise(ctx, gain, time + offset, 0.18, filter);
            gain.connect(out);
        });
    },
    bass: (ctx, out, time, midi, level) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midiToHz(midi);
        const sub = ctx.createOscillator();
        sub.type = "sine";
        sub.frequency.value = midiToHz(midi - 12);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.value = 6;
        filter.frequency.setValueAtTime(900, time);
        filter.frequency.exponentialRampToValueAtTime(180, time + 0.25);
        const gain = envelope(ctx, time, 0.005, 0.32, 0.45 * level);
        osc.connect(filter);
        sub.connect(filter);
        filter.connect(gain).connect(out);
        [osc, sub].forEach((o) => {
            o.start(time);
            o.stop(time + 0.4);
        });
    },
    piano: (ctx, out, time, midi, level) => {
        [0, 12].forEach((octave, i) => {
            const osc = ctx.createOscillator();
            osc.type = i === 0 ? "triangle" : "sine";
            osc.frequency.value = midiToHz(midi + octave);
            osc.detune.value = (Math.random() - 0.5) * 6;
            const gain = envelope(ctx, time, 0.004, 0.9, (i === 0 ? 0.28 : 0.1) * level);
            osc.connect(gain).connect(out);
            osc.start(time);
            osc.stop(time + 1);
        });
    },
    bells: (ctx, out, time, midi, level) => {
        // Two-operator FM: a carrier with a bright, inharmonic shimmer.
        const carrier = ctx.createOscillator();
        carrier.frequency.value = midiToHz(midi + 12);
        const modulator = ctx.createOscillator();
        modulator.frequency.value = midiToHz(midi + 12) * 3.5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(midiToHz(midi + 12) * 2, time);
        depth.gain.exponentialRampToValueAtTime(1, time + 1.2);
        modulator.connect(depth).connect(carrier.frequency);
        const gain = envelope(ctx, time, 0.002, 1.4, 0.22 * level);
        carrier.connect(gain).connect(out);
        [carrier, modulator].forEach((o) => {
            o.start(time);
            o.stop(time + 1.5);
        });
    },
    synth: (ctx, out, time, midi, level) => {
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.value = 4;
        filter.frequency.setValueAtTime(3200, time);
        filter.frequency.exponentialRampToValueAtTime(700, time + 0.3);
        const gain = envelope(ctx, time, 0.01, 0.35, 0.16 * level);
        [-8, 8].forEach((detune) => {
            const osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.value = midiToHz(midi + 12);
            osc.detune.value = detune;
            osc.connect(filter);
            osc.start(time);
            osc.stop(time + 0.45);
        });
        filter.connect(gain).connect(out);
    },
    pad: (ctx, out, time, midi, level) => {
        // Soft sustained chord tone for the "chords" loop.
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1400;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.06 * level, time + 0.15);
        gain.gain.setTargetAtTime(0.0001, time + 1.6, 0.4);
        [-7, 7].forEach((detune) => {
            const osc = ctx.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.value = midiToHz(midi + 12);
            osc.detune.value = detune;
            osc.connect(filter);
            osc.start(time);
            osc.stop(time + 3.2);
        });
        filter.connect(gain).connect(out);
    },
};

// What a melodic instrument plays on step `step` of bar `bar`: climbing
// through the chord, so a row of lit cells always sounds like an arpeggio.
const MELODIC: Record<string, number> = { bass: 0, piano: 12, bells: 12, synth: 12 };
export const isMelodic = (id: InstrumentId) => id in MELODIC;
const melodicNote = (id: InstrumentId, bar: number, beatInBar: number) => {
    const chord = chordForBar(bar);
    if (id === "bass") return chord[0] - 12 + (beatInBar % 2 === 1 ? 7 : 0);
    const tones = [...chord, chord[0] + 12];
    return tones[beatInBar % tones.length] + MELODIC[id];
};

export const playInstrument = (id: InstrumentId | "pad", time?: number, midi = 60, level = 1) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const out = output(ctx);
    if (!out) return;
    voices[id](ctx, out, time ?? ctx.currentTime + 0.01, midi, level);
};

// A preview hit, e.g. when you pick an instrument up.
export const previewInstrument = (id: InstrumentId) => playInstrument(id, undefined, isMelodic(id) ? melodicNote(id, 0, 0) : 60);

// --- The loops on the floor pads -------------------------------------------

export type LoopId = "beat" | "bass" | "chords" | "melody" | "sparkle" | "shaker";

// Called for every 16th note. `sixteenth` counts within the bar.
const LOOPS: Record<LoopId, (time: number, bar: number, sixteenth: number, beatsPerBar: number) => void> = {
    beat: (time, _bar, s, bpb) => {
        const beat = s / 4;
        // Kick on the one, and halfway through bars of four beats or more.
        const half = bpb >= 4 ? Math.floor(bpb / 2) : -1;
        if (s % 4 === 0 && (beat === 0 || beat === half)) playInstrument("drum", time);
        if (s === bpb * 4 - 2) playInstrument("drum", time, 60, 0.7);
        if (s % 4 === 0 && beat % 2 === 1) playInstrument("snare", time);
        if (s % 2 === 0) playInstrument("hat", time, 60, s % 4 === 0 ? 0.9 : 0.55);
    },
    bass: (time, bar, s) => {
        const root = chordForBar(bar)[0] - 12;
        const pattern: Record<number, number> = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 12, 14: 7 };
        const step = s % 16;
        if (step in pattern) playInstrument("bass", time, root + pattern[step], 0.9);
    },
    chords: (time, bar, s) => {
        if (s !== 0) return;
        chordForBar(bar).forEach((note) => playInstrument("pad", time, note, 1));
    },
    melody: (time, bar, s) => {
        // A little tune per bar (fixed, so it's recognisable).
        const tunes = [
            { 0: 64, 4: 67, 8: 69, 12: 67 },
            { 0: 69, 6: 67, 8: 64, 12: 62 },
            { 0: 65, 4: 69, 8: 72, 14: 69 },
            { 0: 67, 4: 71, 8: 74, 10: 72, 12: 71 },
        ][bar % 4] as Record<number, number>;
        if (s in tunes) playInstrument("bells", time, toScale(tunes[s]) - 12, 0.8);
    },
    sparkle: (time, bar, s) => {
        if (s % 2 !== 0) return;
        const chord = chordForBar(bar);
        const tones = [chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[1] + 24];
        playInstrument("synth", time, tones[(s / 2) % 4], 0.35);
    },
    shaker: (time, _bar, s, bpb) => {
        playInstrument("hat", time, 60, s % 2 === 1 ? 0.5 : 0.25);
        if (s % 4 === 0 && (s / 4) % 2 === 1 && s / 4 < bpb) playInstrument("clap", time, 60, 0.7);
    },
};

// --- Transport --------------------------------------------------------------

export interface TransportState {
    bpm: number;
    beatsPerBar: number;
    rows: { instrument: InstrumentId | null; cells: boolean[] }[];
    loops: Record<LoopId, boolean>;
}

export interface TickEvent {
    time: number; // AudioContext time the 16th sounds
    bar: number;
    sixteenth: number; // within the bar
    step: number | null; // grid column if this 16th is on a beat
}

// A look-ahead scheduler (the classic Web Audio pattern): a timer wakes up
// often and books every note due in the next 120 ms on the audio clock, so
// timing stays tight even if a frame hitches.
export class JamTransport {
    private timer: number | null = null;
    private nextTime = 0;
    private sixteenth = 0;
    private bar = 0;
    private listeners = new Set<(event: TickEvent) => void>();

    constructor(private getState: () => TransportState) {}

    onTick(listener: (event: TickEvent) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    start() {
        if (this.timer !== null) return;
        this.timer = window.setInterval(() => this.pump(), 25);
    }

    stop() {
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
        this.nextTime = 0;
    }

    private pump() {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (this.nextTime < ctx.currentTime) {
            // (Re)start just ahead of now, at the top of a bar.
            this.nextTime = ctx.currentTime + 0.06;
            this.sixteenth = 0;
        }
        while (this.nextTime < ctx.currentTime + 0.12) {
            const state = this.getState();
            const bpb = state.beatsPerBar;
            const s = this.sixteenth;
            const onBeat = s % 4 === 0;
            const beatInBar = s / 4;
            // The grid is two bars long: step = beat index across both.
            const step = onBeat ? (this.bar % 2) * bpb + beatInBar : null;

            if (step !== null) {
                state.rows.forEach((row) => {
                    if (!row.instrument || !row.cells[step]) return;
                    const midi = isMelodic(row.instrument) ? melodicNote(row.instrument, this.bar, beatInBar) : 60;
                    playInstrument(row.instrument, this.nextTime, midi);
                });
            }
            (Object.keys(state.loops) as LoopId[]).forEach((id) => {
                if (state.loops[id]) LOOPS[id](this.nextTime, this.bar, s, bpb);
            });
            const event: TickEvent = { time: this.nextTime, bar: this.bar, sixteenth: s, step };
            this.listeners.forEach((listener) => listener(event));

            this.nextTime += 60 / state.bpm / 4;
            this.sixteenth++;
            if (this.sixteenth >= bpb * 4) {
                this.sixteenth = 0;
                this.bar = (this.bar + 1) % 4;
            }
        }
    }
}
