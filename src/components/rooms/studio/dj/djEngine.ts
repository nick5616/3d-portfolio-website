import { getAudioContext, getChannelInput } from "../../../../audio/soundManager";
import { loadTrackAudio } from "./crate";
import { DECK_PROCESSOR, loadDeckProcessor } from "./deckWorklet";
import {
    BEAT_FRACTIONS,
    BeatFxType,
    Channel,
    ColorFxType,
    DECKS,
    DeckId,
    DjShared,
    beatPhase,
    isRolling,
    liveBpm,
    now,
    positionAt,
    rateOf,
    useDj,
    useDjLocal,
} from "./djStore";

// The sound of the booth, built from the shared state (djStore.ts). Every
// visitor runs one of these, so everyone hears the mix from their own
// speakers. It follows a DJM layout:
//
//   deck -> TRIM -> 3-band isolator -> SOUND COLOR FX -> channel fader
//        -> crossfader -> [BEAT FX] -> MASTER -> limiter -> the music channel
//
// with each channel's pre-fader signal also feeding its meter and, if you
// press its CUE, your headphones (a second output device, where the browser
// can pick one).

const dB = (db: number) => Math.pow(10, db / 20);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const SMOOTH = 0.012; // s, for knob moves

const noiseBuffer = (ctx: BaseAudioContext, seconds: number) => {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
};
// A room's tail: stereo noise dying away.
const impulse = (ctx: BaseAudioContext, seconds: number, decay: number) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
};
const crushCurve = (bits: number) => {
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(4096);
    for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
};

const set = (param: AudioParam, value: number, ctx: BaseAudioContext, time = SMOOTH) => param.setTargetAtTime(value, ctx.currentTime, time);

// --- One mixer channel ---------------------------------------------------------------

class Strip {
    readonly input: GainNode; // TRIM
    readonly output: GainNode; // after the crossfader
    readonly meter: AnalyserNode;
    readonly cue: GainNode; // to the headphones
    private bands: GainNode[] = [];
    private shaper: WaveShaperNode;
    private lp: BiquadFilterNode;
    private hp: BiquadFilterNode;
    private send: GainNode;
    private space: ConvolverNode;
    private spaceIn: GainNode;
    private echo: DelayNode;
    private echoIn: GainNode;
    private echoFeedback: GainNode;
    private returnLp: BiquadFilterNode;
    private returnHp: BiquadFilterNode;
    private noise: GainNode;
    private fader: GainNode;
    private bits = 0;

    constructor(private ctx: AudioContext, noise: AudioNode, spaceIr: AudioBuffer) {
        const c = ctx;
        this.input = c.createGain();
        // Isolator: Linkwitz-Riley crossovers at 250 Hz and 3 kHz, so all
        // three at unity sum back to the original, and each can be killed.
        const sum = c.createGain();
        const filter = (type: BiquadFilterType, frequency: number) => {
            const f = c.createBiquadFilter();
            f.type = type;
            f.frequency.value = frequency;
            f.Q.value = Math.SQRT1_2;
            return f;
        };
        const chain = (...nodes: AudioNode[]) => nodes.reduce((a, b) => (a.connect(b), b));
        const low = c.createGain();
        const mid = c.createGain();
        const high = c.createGain();
        chain(this.input, filter("lowpass", 250), filter("lowpass", 250), low, sum);
        chain(this.input, filter("highpass", 250), filter("highpass", 250), filter("lowpass", 3000), filter("lowpass", 3000), mid, sum);
        chain(this.input, filter("highpass", 3000), filter("highpass", 3000), high, sum);
        this.bands = [low, mid, high];

        // SOUND COLOR FX: a crusher and a filter pair in line, and a send to
        // a space (reverb) and a dub echo whose return is filtered too.
        this.shaper = c.createWaveShaper();
        this.lp = filter("lowpass", 22000);
        this.hp = filter("highpass", 10);
        const colored = c.createGain();
        chain(sum, this.shaper, this.lp, this.hp, colored);
        this.noise = c.createGain();
        this.noise.gain.value = 0;
        noise.connect(this.noise).connect(this.lp);

        this.send = c.createGain();
        this.send.gain.value = 0;
        sum.connect(this.send);
        this.spaceIn = c.createGain();
        this.space = c.createConvolver();
        this.space.buffer = spaceIr;
        this.echoIn = c.createGain();
        this.echo = c.createDelay(4);
        this.echoFeedback = c.createGain();
        const echoTone = filter("bandpass", 1200);
        echoTone.Q.value = 0.5;
        this.returnLp = filter("lowpass", 22000);
        this.returnHp = filter("highpass", 10);
        this.send.connect(this.spaceIn).connect(this.space).connect(this.returnLp);
        this.send.connect(this.echoIn).connect(this.echo).connect(echoTone).connect(this.echoFeedback).connect(this.echo);
        this.echo.connect(this.returnLp);
        chain(this.returnLp, this.returnHp, colored);

        this.meter = c.createAnalyser();
        this.meter.fftSize = 512;
        colored.connect(this.meter);
        this.cue = c.createGain();
        this.cue.gain.value = 0;
        colored.connect(this.cue);
        this.fader = c.createGain();
        this.output = c.createGain();
        colored.connect(this.fader).connect(this.output);
    }

    update(ch: Channel, colorFx: ColorFxType, xfGain: number, beat: number) {
        const ctx = this.ctx;
        set(this.input.gain, ch.trim >= 0 ? dB(9 * ch.trim) : Math.pow(1 + ch.trim, 2), ctx);
        [ch.low, ch.mid, ch.hi].forEach((v, i) => set(this.bands[i].gain, v >= 0 ? dB(6 * v) : v <= -0.97 ? 0 : dB(26 * v), ctx));
        set(this.fader.gain, ch.fader <= 0.001 ? 0 : Math.pow(ch.fader, 1.6), ctx);
        set(this.output.gain, xfGain, ctx);

        // The color knob: centre is off; left and right do different things
        // per effect, as on a DJM.
        const c = ch.color;
        const amount = Math.abs(c) < 0.02 ? 0 : Math.abs(c);
        let lp = 22000;
        let hp = 10;
        let q = Math.SQRT1_2;
        let send = 0;
        let returnLp = 22000;
        let returnHp = 10;
        let noise = 0;
        let bits = 0;
        let space = 0;
        let echo = 0;
        switch (colorFx) {
            case "filter":
                if (c < 0) lp = 20000 * Math.pow(0.004, amount);
                if (c > 0) hp = 20 * Math.pow(350, amount);
                q = 0.9 + amount * 2.5;
                break;
            case "sweep": {
                // A resonant band that narrows as it moves away from centre.
                const centre = 1000 * Math.pow(10, c);
                const width = 1 + 30 * (1 - amount);
                if (amount) {
                    lp = Math.min(20000, centre * width);
                    hp = Math.max(10, centre / width);
                    q = 1 + amount * 3;
                }
                break;
            }
            case "space":
                send = amount;
                space = 1;
                if (c < 0) returnLp = 20000 * Math.pow(0.03, amount);
                if (c > 0) returnHp = 20 * Math.pow(60, amount);
                break;
            case "dubecho":
                send = amount;
                echo = 1;
                if (c < 0) returnLp = 20000 * Math.pow(0.05, amount);
                if (c > 0) returnHp = 20 * Math.pow(40, amount);
                break;
            case "noise":
                noise = amount * 0.15;
                if (c < 0) lp = 20000 * Math.pow(0.02, amount);
                if (c > 0) hp = 20 * Math.pow(150, amount);
                break;
            case "crush":
                bits = amount ? Math.round(14 - amount * 11) : 0;
                if (c < 0) lp = 20000 * Math.pow(0.15, amount);
                if (c > 0) hp = 20 * Math.pow(30, amount);
                break;
        }
        set(this.lp.frequency, lp, ctx, 0.03);
        set(this.hp.frequency, hp, ctx, 0.03);
        set(this.lp.Q, colorFx === "filter" || colorFx === "sweep" ? q : Math.SQRT1_2, ctx);
        set(this.hp.Q, colorFx === "filter" || colorFx === "sweep" ? q : Math.SQRT1_2, ctx);
        set(this.noise.gain, noise, ctx);
        set(this.send.gain, send, ctx, 0.03);
        set(this.spaceIn.gain, space, ctx);
        set(this.echoIn.gain, echo, ctx);
        set(this.echo.delayTime, clamp(beat * 0.75, 0.05, 3.9), ctx, 0.05);
        set(this.echoFeedback.gain, 0.62, ctx);
        set(this.returnLp.frequency, returnLp, ctx, 0.03);
        set(this.returnHp.frequency, returnHp, ctx, 0.03);
        if (bits !== this.bits) {
            this.bits = bits;
            this.shaper.curve = bits ? crushCurve(bits) : null;
        }
    }

    private samples: Float32Array | null = null;
    level() {
        const data = (this.samples ??= new Float32Array(this.meter.fftSize));
        this.meter.getFloatTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
        return peak;
    }
}

// --- BEAT FX -----------------------------------------------------------------------------

interface Effect {
    input: AudioNode;
    output: AudioNode;
    // `tails`: keeps ringing after it's switched off. `inline`: replaces the
    // dry signal rather than adding to it.
    tails: boolean;
    inline: boolean;
    update: (beat: number, fraction: number, depth: number) => void;
    // Effects that run on a schedule from the moment they're switched on
    // (ROLL), and own the dry signal while they do.
    engage?: (on: boolean, beat: number, fraction: number, depth: number) => void;
}

class BeatFx {
    readonly input: GainNode;
    readonly output: GainNode;
    private dry: GainNode;
    private send: GainNode;
    private wet: GainNode;
    private effects: Record<BeatFxType, Effect>;
    private active: BeatFxType | null = null;
    private on = false;
    private lfos: OscillatorNode[] = [];
    readonly transGate: GainNode;

    constructor(private ctx: AudioContext, reverbIr: AudioBuffer) {
        const c = ctx;
        this.input = c.createGain();
        this.output = c.createGain();
        this.dry = c.createGain();
        this.send = c.createGain();
        this.wet = c.createGain();
        this.send.gain.value = 0;
        this.wet.gain.value = 0;
        this.input.connect(this.dry).connect(this.output);
        this.input.connect(this.send);
        this.wet.connect(this.output);

        const lfo = (target: AudioParam, amount: number) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            gain.gain.value = amount;
            osc.connect(gain).connect(target);
            osc.start();
            this.lfos.push(osc);
            return osc;
        };
        const delayEffect = (feedback: number, tone: number, pingPong = false): Effect => {
            const input = c.createGain();
            const output = c.createGain();
            if (!pingPong) {
                const delay = c.createDelay(16);
                const fb = c.createGain();
                const filter = c.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.value = tone;
                fb.gain.value = feedback;
                input.connect(delay).connect(filter).connect(fb).connect(delay);
                filter.connect(output);
                return {
                    input,
                    output,
                    tails: true,
                    inline: false,
                    update: (beat, fraction) => set(delay.delayTime, clamp(beat * fraction, 0.01, 15.9), c, 0.04),
                };
            }
            const merger = c.createChannelMerger(2);
            const left = c.createDelay(16);
            const right = c.createDelay(16);
            const fbLeft = c.createGain();
            const fbRight = c.createGain();
            fbLeft.gain.value = fbRight.gain.value = feedback;
            const mono = c.createGain();
            mono.channelCount = 1;
            mono.channelCountMode = "explicit";
            input.connect(mono).connect(left);
            left.connect(fbLeft).connect(right);
            right.connect(fbRight).connect(left);
            left.connect(merger, 0, 0);
            right.connect(merger, 0, 1);
            merger.connect(output);
            return {
                input,
                output,
                tails: true,
                inline: false,
                update: (beat, fraction) => {
                    set(left.delayTime, clamp(beat * fraction, 0.01, 15.9), c, 0.04);
                    set(right.delayTime, clamp(beat * fraction, 0.01, 15.9), c, 0.04);
                },
            };
        };
        const spiral = (): Effect => {
            // An echo that climbs: feedback through a rising band-pass.
            const effect = delayEffect(0.78, 9000);
            const band = c.createBiquadFilter();
            band.type = "highpass";
            band.frequency.value = 200;
            lfo(band.detune, 1800).frequency.value = 0.15;
            const output = c.createGain();
            effect.output.connect(band).connect(output);
            return { ...effect, output };
        };
        const reverb = (): Effect => {
            const input = c.createGain();
            const conv = c.createConvolver();
            conv.buffer = reverbIr;
            const output = c.createGain();
            output.gain.value = 1.4;
            input.connect(conv).connect(output);
            return { input, output, tails: true, inline: false, update: () => {} };
        };
        const trans = (): Effect => {
            const input = c.createGain();
            const output = c.createGain();
            input.connect(this.transGate).connect(output);
            return { input, output, tails: false, inline: true, update: () => {} };
        };
        this.transGate = c.createGain();
        const sweepFilter = (): Effect => {
            const input = c.createGain();
            const filter = c.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1000;
            filter.Q.value = 2.5;
            const osc = lfo(filter.detune, 2400);
            const output = c.createGain();
            output.gain.value = 1.6;
            input.connect(filter).connect(output);
            return {
                input,
                output,
                tails: false,
                inline: true,
                update: (beat, fraction) => set(osc.frequency, 1 / Math.max(0.1, beat * fraction * 4), c, 0.05),
            };
        };
        const flanger = (): Effect => {
            const input = c.createGain();
            const delay = c.createDelay(0.05);
            delay.delayTime.value = 0.004;
            const fb = c.createGain();
            fb.gain.value = 0.6;
            const osc = lfo(delay.delayTime, 0.0032);
            const output = c.createGain();
            input.connect(delay).connect(fb).connect(delay);
            delay.connect(output);
            return {
                input,
                output,
                tails: false,
                inline: false,
                update: (beat, fraction) => set(osc.frequency, 1 / Math.max(0.1, beat * fraction * 4), c, 0.05),
            };
        };
        const phaser = (): Effect => {
            const input = c.createGain();
            const output = c.createGain();
            const osc = c.createOscillator();
            osc.start();
            this.lfos.push(osc);
            const amount = c.createGain();
            amount.gain.value = 2000;
            osc.connect(amount);
            let node: AudioNode = input;
            for (let i = 0; i < 6; i++) {
                const ap = c.createBiquadFilter();
                ap.type = "allpass";
                ap.frequency.value = 700;
                ap.Q.value = 0.6;
                amount.connect(ap.detune);
                node.connect(ap);
                node = ap;
            }
            node.connect(output);
            return {
                input,
                output,
                tails: false,
                inline: false,
                update: (beat, fraction) => set(osc.frequency, 1 / Math.max(0.1, beat * fraction * 4), c, 0.05),
            };
        };
        const roll = (): Effect => {
            // Catch a slice as it's switched on, then repeat it.
            const input = c.createGain();
            const gate = c.createGain();
            const delay = c.createDelay(16);
            const fb = c.createGain();
            const output = c.createGain();
            gate.gain.value = 0;
            fb.gain.value = 0;
            output.gain.value = 0;
            input.connect(gate).connect(delay).connect(fb).connect(delay);
            delay.connect(output);
            return {
                input,
                output,
                tails: false,
                inline: true,
                update: () => {},
                engage: (on, beat, fraction, depth) => {
                    const t = c.currentTime;
                    const length = clamp(beat * fraction, 0.02, 15.9);
                    [gate.gain, fb.gain, output.gain, this.dry.gain].forEach((p) => p.cancelScheduledValues(t));
                    if (on) {
                        delay.delayTime.setValueAtTime(length, t);
                        gate.gain.setValueAtTime(1, t);
                        gate.gain.setValueAtTime(0, t + length);
                        fb.gain.setValueAtTime(0, t);
                        fb.gain.setValueAtTime(1, t + length);
                        output.gain.setValueAtTime(0, t);
                        output.gain.setValueAtTime(1, t + length);
                        // Hear the slice live while it's being caught, then
                        // the repeats take over.
                        this.dry.gain.setValueAtTime(1, t);
                        this.dry.gain.setValueAtTime(1 - depth, t + length);
                    } else {
                        gate.gain.setValueAtTime(0, t);
                        fb.gain.setValueAtTime(0, t);
                        output.gain.setTargetAtTime(0, t, 0.01);
                        this.dry.gain.setTargetAtTime(1, t, 0.005);
                    }
                },
            };
        };

        this.effects = {
            delay: delayEffect(0.3, 12000),
            echo: delayEffect(0.55, 5000),
            pingpong: delayEffect(0.5, 9000, true),
            spiral: spiral(),
            reverb: reverb(),
            trans: trans(),
            filter: sweepFilter(),
            flanger: flanger(),
            phaser: phaser(),
            roll: roll(),
        };
    }

    update(fx: DjShared["fx"], beat: number) {
        const ctx = this.ctx;
        const fraction = BEAT_FRACTIONS[clamp(fx.beat, 0, BEAT_FRACTIONS.length - 1)];
        if (this.active !== fx.type) {
            if (this.active) {
                const old = this.effects[this.active];
                this.send.disconnect();
                old.output.disconnect(this.wet);
                if (this.on) old.engage?.(false, beat, fraction, fx.depth);
            }
            this.active = fx.type;
            const next = this.effects[fx.type];
            this.send.connect(next.input);
            next.output.connect(this.wet);
            this.on = false; // re-engage below with the new effect
        }
        const effect = this.effects[fx.type];
        effect.update(beat, fraction, fx.depth);
        const wasOn = this.on;
        this.on = fx.on;
        if (fx.on !== wasOn) effect.engage?.(fx.on, beat, fraction, fx.depth);
        if (effect.engage) {
            set(this.send.gain, 1, ctx);
            set(this.wet.gain, fx.on ? fx.depth : 0, ctx);
            return;
        }
        if (effect.inline) {
            set(this.send.gain, 1, ctx);
            set(this.wet.gain, fx.on ? fx.depth : 0, ctx);
            set(this.dry.gain, fx.on ? 1 - fx.depth : 1, ctx);
        } else {
            set(this.send.gain, fx.on ? 1 : 0, ctx);
            set(this.dry.gain, 1, ctx);
            // Echoes and reverb ring out after you let go.
            set(this.wet.gain, fx.on || effect.tails ? fx.depth : 0, ctx, fx.on ? SMOOTH : 0.4);
        }
    }

    dispose() {
        this.lfos.forEach((o) => o.stop());
    }
}

// --- Headphones ----------------------------------------------------------------------

type SinkAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
export const canPickOutput = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

class Phones {
    readonly cueSum: GainNode;
    readonly masterIn: GainNode;
    private level: GainNode;
    private destination: MediaStreamAudioDestinationNode;
    private element: SinkAudio;
    private sink: string | null = null;

    constructor(private ctx: AudioContext) {
        this.cueSum = ctx.createGain();
        this.masterIn = ctx.createGain();
        this.level = ctx.createGain();
        this.destination = ctx.createMediaStreamDestination();
        this.cueSum.connect(this.level);
        this.masterIn.connect(this.level);
        this.level.connect(this.destination);
        this.element = new Audio() as SinkAudio;
        this.element.srcObject = this.destination.stream;
    }

    update(mix: number, level: number, sink: string | null) {
        set(this.cueSum.gain, Math.cos((mix * Math.PI) / 2), this.ctx);
        set(this.masterIn.gain, Math.sin((mix * Math.PI) / 2), this.ctx);
        set(this.level.gain, sink ? level * level : 0, this.ctx);
        if (sink !== this.sink) {
            this.sink = sink;
            if (sink && this.element.setSinkId) {
                this.element
                    .setSinkId(sink)
                    .then(() => this.element.play())
                    .catch(() => useDjLocal.setState({ phonesSink: null, notice: "Couldn't use that output for headphones" }));
            } else this.element.pause();
        }
    }

    dispose() {
        this.element.pause();
        this.element.srcObject = null;
    }
}

// --- The engine --------------------------------------------------------------------------

// The studio's running engine, for the console's meters.
export const engineRef: { current: DjEngine | null } = { current: null };

interface DeckVoice {
    node: AudioWorkletNode;
    track: string | null;
}

export class DjEngine {
    readonly analyser: AnalyserNode; // the master, for the room's visuals
    private voices = {} as Record<DeckId, DeckVoice>;
    private strips = {} as Record<DeckId, Strip>;
    private masterSum: GainNode;
    private masterGain: GainNode;
    private meters: AnalyserNode[];
    private fx: BeatFx;
    private fxRoute: DeckId | "master" | null = null;
    private phones: Phones;
    private noise: AudioBufferSourceNode;
    private out: GainNode;
    private unsubscribe: (() => void)[] = [];
    private timer: number;
    private nextGate = 0;
    private disposed = false;

    static async create(): Promise<DjEngine | null> {
        const ctx = getAudioContext();
        const out = getChannelInput("music");
        if (!ctx || !out || !ctx.audioWorklet) return null;
        await loadDeckProcessor(ctx);
        return new DjEngine(ctx, out);
    }

    private constructor(private ctx: AudioContext, destination: AudioNode) {
        const c = ctx;
        this.out = c.createGain();
        this.out.connect(destination);
        this.noise = c.createBufferSource();
        this.noise.buffer = noiseBuffer(c, 2);
        this.noise.loop = true;
        this.noise.start();
        const spaceIr = impulse(c, 2.4, 3);
        this.masterSum = c.createGain();
        this.fx = new BeatFx(c, impulse(c, 3.5, 2.2));
        this.phones = new Phones(c);
        this.masterGain = c.createGain();
        const limiter = c.createDynamicsCompressor();
        limiter.threshold.value = -2;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.12;
        this.masterGain.connect(limiter).connect(this.out);
        limiter.connect(this.phones.masterIn);
        this.analyser = c.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.55;
        limiter.connect(this.analyser);
        const split = c.createChannelSplitter(2);
        limiter.connect(split);
        this.meters = [0, 1].map((i) => {
            const a = c.createAnalyser();
            a.fftSize = 512;
            split.connect(a, i);
            return a;
        });

        for (const id of DECKS) {
            const node = new AudioWorkletNode(c, DECK_PROCESSOR, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
            const strip = new Strip(c, this.noise, spaceIr);
            node.connect(strip.input);
            strip.cue.connect(this.phones.cueSum);
            this.voices[id] = { node, track: null };
            this.strips[id] = strip;
        }
        this.route("master");

        this.apply(useDj.getState(), null);
        this.unsubscribe.push(useDj.subscribe((s, before) => this.apply(s, before)));
        this.unsubscribe.push(useDjLocal.subscribe(() => this.applyLocal()));
        this.applyLocal();
        // Re-tell the decks where they are now and then (the audio clock and
        // the page clock drift apart slowly), and keep TRANS on the beat.
        this.timer = window.setInterval(() => {
            const s = useDj.getState();
            DECKS.forEach((id) => this.sendDeck(s, id));
            this.scheduleGate(s);
        }, 250);
    }

    // Context time of the sample you'll hear at page time `ms`.
    private contextTimeAt(ms: number) {
        const ctx = this.ctx;
        const stamp = ctx.getOutputTimestamp?.();
        if (stamp && stamp.performanceTime && stamp.contextTime !== undefined) {
            return stamp.contextTime + (ms - (performance.timeOrigin + stamp.performanceTime)) / 1000;
        }
        const latency = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0;
        return ctx.currentTime - latency + (ms - now()) / 1000;
    }

    private route(target: DeckId | "master") {
        if (this.fxRoute === target) return;
        this.fxRoute = target;
        DECKS.forEach((id) => this.strips[id].output.disconnect());
        this.masterSum.disconnect();
        this.fx.output.disconnect();
        DECKS.forEach((id) => {
            this.strips[id].output.connect(id === target ? this.fx.input : this.masterSum);
        });
        if (target === "master") {
            this.masterSum.connect(this.fx.input);
            this.fx.output.connect(this.masterGain);
        } else {
            this.fx.output.connect(this.masterSum);
            this.masterSum.connect(this.masterGain);
        }
    }

    // The master's beat, for the effects.
    private beat(s: DjShared) {
        const m = s.master;
        const bpm = m ? liveBpm(s, m) : 0;
        return bpm > 20 ? 60 / bpm : 0.5;
    }

    private xfGains(s: DjShared): Record<"A" | "B", number> {
        const u = (clamp(s.xfader, -1, 1) + 1) / 2;
        if (s.xcurve === 0) return { A: Math.cos((u * Math.PI) / 2), B: Math.sin((u * Math.PI) / 2) };
        if (s.xcurve === 2) return { A: clamp((1 - u) * 30, 0, 1), B: clamp(u * 30, 0, 1) };
        return { A: clamp((1 - u) * 2, 0, 1), B: clamp(u * 2, 0, 1) };
    }

    private sendDeck(s: DjShared, id: DeckId) {
        const deck = s.decks[id];
        const voice = this.voices[id];
        if (deck.track !== voice.track) {
            voice.track = deck.track;
            voice.node.port.postMessage({ type: "clear" });
            const wanted = deck.track;
            if (wanted) {
                loadTrackAudio(wanted, this.ctx).then((buffer) => {
                    if (!buffer || this.disposed || voice.track !== wanted) return;
                    const l = buffer.getChannelData(0).slice();
                    const r = (buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)).slice();
                    voice.node.port.postMessage({ type: "buffer", l, r, rate: buffer.sampleRate }, [l.buffer, r.buffer]);
                    this.sendDeck(useDj.getState(), id);
                });
            }
        }
        const t = now();
        const loop = deck.loop;
        voice.node.port.postMessage({
            type: "state",
            pos: positionAt(s, id, t),
            ctxTime: this.contextTimeAt(t),
            rate: rateOf(s, id),
            playing: isRolling(s, id, t),
            loopIn: loop?.in ?? 0,
            loopOut: loop?.out ?? -1,
            loopOn: Boolean(loop?.on && loop.out > loop.in),
            keylock: deck.keylock,
            scratch: deck.scratch ? deck.scratch.pos : null,
        });
    }

    private apply(s: DjShared, before: DjShared | null) {
        const beat = this.beat(s);
        const xf = this.xfGains(s);
        for (const id of DECKS) {
            if (!before || s.decks !== before.decks || s.master !== before.master) this.sendDeck(s, id);
            const ch = s.ch[id];
            this.strips[id].update(ch, s.colorFx, ch.xf === "THRU" ? 1 : xf[ch.xf], beat);
        }
        set(this.masterGain.gain, Math.pow(s.level / 0.8, 2), this.ctx);
        this.route(s.fx.ch);
        this.fx.update(s.fx, beat);
        if (!before || s.fx.on !== before.fx.on || s.fx.type !== before.fx.type || s.fx.beat !== before.fx.beat || s.master !== before.master) {
            this.scheduleGate(s, true);
        }
    }

    private applyLocal() {
        const l = useDjLocal.getState();
        DECKS.forEach((id) => set(this.strips[id].cue.gain, l.phonesCue[id] ? 1 : 0, this.ctx));
        this.phones.update(l.phonesMix, l.phonesLevel, l.phonesSink);
    }

    // TRANS cuts the sound on the master's beat grid, so schedule its gate
    // a little ahead, lined up with where the master deck's beats fall.
    private scheduleGate(s: DjShared, reset = false) {
        const gate = this.fx.transGate.gain;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        if (reset) {
            gate.cancelScheduledValues(t);
            gate.setValueAtTime(1, t);
            this.nextGate = 0;
        }
        if (!(s.fx.on && s.fx.type === "trans")) return;
        const beat = this.beat(s);
        const period = Math.max(0.03, beat * BEAT_FRACTIONS[s.fx.beat]);
        const m = s.master;
        // Where the next period starts, in context time.
        const nowMs = now();
        const heardAt = this.contextTimeAt(nowMs);
        const phase = m && s.decks[m].track ? (beatPhase(s, m, positionAt(s, m, nowMs)) * beat) % period : heardAt % period;
        let start = Math.max(this.nextGate, heardAt + (period - phase));
        const low = 1 - s.fx.depth;
        while (start < t + 0.6) {
            if (start > t) {
                gate.setValueAtTime(1, start);
                gate.setValueAtTime(low, start + period * 0.5);
            }
            start += period;
        }
        this.nextGate = start;
    }

    // Peak levels, 0..1, for the meters: channel A, B, master L, R.
    private meterData = new Float32Array(512);
    levels() {
        const peak = (a: AnalyserNode) => {
            const data = this.meterData;
            a.getFloatTimeDomainData(data);
            let p = 0;
            for (let i = 0; i < data.length; i++) p = Math.max(p, Math.abs(data[i]));
            return p;
        };
        return { a: this.strips.a.level(), b: this.strips.b.level(), l: peak(this.meters[0]), r: peak(this.meters[1]) };
    }

    dispose() {
        this.disposed = true;
        window.clearInterval(this.timer);
        this.unsubscribe.forEach((u) => u());
        const t = this.ctx.currentTime;
        this.out.gain.setTargetAtTime(0, t, 0.03);
        window.setTimeout(() => {
            DECKS.forEach((id) => {
                this.voices[id].node.port.postMessage({ type: "clear" });
                this.voices[id].node.disconnect();
            });
            this.noise.stop();
            this.fx.dispose();
            this.phones.dispose();
            this.out.disconnect();
        }, 150);
    }
}
