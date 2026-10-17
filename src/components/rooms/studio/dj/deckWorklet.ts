// The sound of one CDJ, as an AudioWorklet. It's told where the deck should
// be ("at context time T it's at P, moving at speed R", plus any loop) and
// keeps its own playhead there: small drift is pulled in by easing the
// speed, big jumps (a cue, a hot cue, a needle drop) crossfade over a few ms.
// With a hand on the platter it chases the hand's position instead, which is
// what makes a scratch sound like one. MASTER TEMPO (key lock) plays
// overlapping grains at the original pitch, spaced out at the new tempo
// (WSOLA: each grain starts where it best continues the last).

export const DECK_PROCESSOR = "dj-deck";

const source = /* js */ `
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const GRAIN = 2048;
const HOP = GRAIN / 2;
const WINDOW = new Float32Array(GRAIN);
for (let i = 0; i < GRAIN; i++) WINDOW[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / GRAIN);
const XFADE = 384;

class DjDeck extends AudioWorkletProcessor {
    constructor() {
        super();
        this.l = null;
        this.r = null;
        this.rate = 44100; // the buffer's sample rate
        this.p = 0; // playhead, seconds
        this.v = 0; // speed, 1 = normal
        this.motion = 0; // output gain that follows speed (a stopped record is silent)
        this.st = { pos: 0, ctxTime: 0, rate: 1, playing: false, loopIn: 0, loopOut: -1, loopOn: false, keylock: false, scratch: null };
        this.old = null; // the playhead we're fading away from after a jump
        this.grains = [];
        this.sinceGrain = HOP;
        this.port.onmessage = (event) => {
            const m = event.data;
            if (m.type === "buffer") {
                this.l = m.l;
                this.r = m.r;
                this.rate = m.rate;
                this.grains = [];
                this.old = null;
            } else if (m.type === "clear") {
                this.l = this.r = null;
            } else if (m.type === "state") {
                this.st = m;
            }
        };
    }

    // Cubic (Hermite) read at a time in seconds; silence outside the track.
    read(buffer, t) {
        const x = t * this.rate;
        const i = Math.floor(x);
        if (i < 1 || i + 2 >= buffer.length) return 0;
        const f = x - i;
        const y0 = buffer[i - 1], y1 = buffer[i], y2 = buffer[i + 1], y3 = buffer[i + 2];
        const c1 = 0.5 * (y2 - y0);
        const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
        return ((c3 * f + c2) * f + c1) * f + y1;
    }

    loopLength() {
        const s = this.st;
        return s.loopOn && s.loopOut > s.loopIn ? s.loopOut - s.loopIn : 0;
    }

    jump(to) {
        if (this.l && Math.abs(this.v) > 0.01) this.old = { p: this.p, n: 0 };
        this.p = to;
    }

    // Where the deck should be at context time t.
    target(t) {
        const s = this.st;
        let p = s.pos + (t - s.ctxTime) * s.rate;
        const length = this.loopLength();
        if (length > 0) {
            if (s.rate > 0 && s.pos <= s.loopOut + 1e-3 && p > s.loopOut) p = s.loopIn + ((p - s.loopIn) % length);
            else if (s.rate < 0 && s.pos >= s.loopIn - 1e-3 && p < s.loopIn) p = s.loopOut - ((s.loopOut - p) % length);
        }
        return Math.max(0, p);
    }

    // Start a grain near the playhead that best continues the previous one.
    spawnGrain() {
        let start = this.p;
        const last = this.grains[this.grains.length - 1];
        if (last && this.l) {
            const natural = last.pos + HOP / sampleRate;
            const range = 0.006;
            const step = 2 / this.rate;
            const span = 256;
            let best = -Infinity;
            for (let c = this.p - range; c <= this.p + range; c += step) {
                let xy = 0;
                let yy = 1e-9;
                for (let k = 0; k < span; k += 4) {
                    const t = k / this.rate;
                    const a = this.read(this.l, natural + t) + this.read(this.r, natural + t);
                    const b = this.read(this.l, c + t) + this.read(this.r, c + t);
                    xy += a * b;
                    yy += b * b;
                }
                const score = xy / Math.sqrt(yy);
                if (score > best) {
                    best = score;
                    start = c;
                }
            }
        }
        this.grains.push({ pos: start, i: 0 });
        if (this.grains.length > 2) this.grains.shift();
    }

    process(_inputs, outputs) {
        const out = outputs[0];
        const L = out[0];
        const R = out[1] || out[0];
        const n = L.length;
        if (!this.l) {
            L.fill(0);
            if (R !== L) R.fill(0);
            return true;
        }
        const s = this.st;
        const dt = 1 / sampleRate;

        // How fast to go this block.
        if (s.scratch !== null) {
            const error = s.scratch - this.p;
            if (Math.abs(error) > 2) this.jump(s.scratch);
            const want = clamp(error * 28, -12, 12);
            this.v += (want - this.v) * 0.22;
        } else if (s.playing) {
            const goal = this.target(currentTime);
            let error = goal - this.p;
            const length = this.loopLength();
            if (length > 0 && Math.abs(error) > length / 2) error -= Math.sign(error) * length * Math.round(Math.abs(error) / length);
            if (Math.abs(error) > 0.04) {
                this.jump(goal);
                error = 0;
            }
            const want = s.rate + clamp(error * 2, -0.03, 0.03);
            this.v += (want - this.v) * 0.35;
        } else {
            this.v += (0 - this.v) * 0.35;
            if (Math.abs(this.v) < 0.02 && Math.abs(s.pos - this.p) > 0.001) {
                this.p = s.pos;
                this.grains = [];
            }
        }

        const stretch = s.keylock && s.scratch === null && this.v > 0.25;
        // Grains crossfade on their own; the jump fade is for plain playback.
        if (stretch) this.old = null;
        else this.grains = [];
        const length = this.loopLength();

        for (let i = 0; i < n; i++) {
            const speed = this.v;
            this.motion += (clamp(Math.abs(speed) * 8, 0, 1) - this.motion) * 0.01;
            let l = 0;
            let r = 0;
            if (stretch) {
                if (this.sinceGrain >= HOP) {
                    this.sinceGrain = 0;
                    this.spawnGrain();
                }
                this.sinceGrain++;
                for (const g of this.grains) {
                    if (g.i >= GRAIN) continue;
                    const w = WINDOW[g.i];
                    const t = g.pos + g.i * dt;
                    l += this.read(this.l, t) * w;
                    r += this.read(this.r, t) * w;
                    g.i++;
                }
            } else {
                l = this.read(this.l, this.p);
                r = this.read(this.r, this.p);
                if (this.old) {
                    const g = this.old.n / XFADE;
                    l = l * g + this.read(this.l, this.old.p) * (1 - g);
                    r = r * g + this.read(this.r, this.old.p) * (1 - g);
                    this.old.p += speed * dt;
                    if (++this.old.n >= XFADE) this.old = null;
                }
            }
            L[i] = l * this.motion;
            R[i] = r * this.motion;

            const before = this.p;
            this.p += speed * dt;
            // Loops wrap here, to the sample.
            if (length > 0 && s.scratch === null) {
                if (speed > 0 && before < s.loopOut && this.p >= s.loopOut) this.jump(this.p - length);
                else if (speed < 0 && before > s.loopIn && this.p <= s.loopIn) this.jump(this.p + length);
            }
            if (this.p < 0) this.p = 0;
        }
        return true;
    }
}
registerProcessor("${DECK_PROCESSOR}", DjDeck);
`;

const modules = new WeakMap<BaseAudioContext, Promise<void>>();
export const loadDeckProcessor = (context: BaseAudioContext) => {
    let promise = modules.get(context);
    if (!promise) {
        const url = URL.createObjectURL(new Blob([source], { type: "application/javascript" }));
        promise = context.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
        modules.set(context, promise);
    }
    return promise;
};
