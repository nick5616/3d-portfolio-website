#!/usr/bin/env node
// Builds a note map for a piano recording: when each note starts and what
// pitch it is. The forest fairy reads it to land on the right key at the
// right moment (the SoundCloud player is cross-origin, so the page can't
// listen to the audio live - this is done once, ahead of time).
//
//   node scripts/analyze-pitch.mjs "<recording>" src/data/songOfTheForestNotes.json
//
// Needs ffmpeg on the PATH. The recording is only read, never changed.
//
// Method: decode to 22.05 kHz mono; short-time FFT (2048 window, 256 hop).
// Onsets are peaks in spectral flux (energy that wasn't there a moment
// ago) over an adaptive threshold. Each onset's pitch is the MIDI note
// whose harmonics hold the most of that *new* energy, so a freshly struck
// note wins over ones still ringing; among close contenders the highest
// wins, since the melody usually rides on top.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
    console.error('usage: node scripts/analyze-pitch.mjs "<recording>" <output.json>');
    process.exit(1);
}

const RATE = 22050;
const N = 2048;
const HOP = 256;
const MIDI_LO = 36; // C2
const MIDI_HI = 96; // C7

const decode = () =>
    new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", ["-v", "error", "-i", input, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"]);
        const chunks = [];
        ff.stdout.on("data", (c) => chunks.push(c));
        ff.stderr.on("data", (d) => process.stderr.write(d));
        ff.on("error", reject);
        ff.on("close", (code) => {
            if (code !== 0) return reject(new Error(`ffmpeg exited with ${code}`));
            const buffer = Buffer.concat(chunks);
            resolve(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
        });
    });

const fft = (re, im) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        const wc = Math.cos(ang);
        const ws = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let rc = 1;
            let rs = 0;
            for (let k = 0; k < len >> 1; k++) {
                const a = i + k;
                const b = a + (len >> 1);
                const ur = re[b] * rc - im[b] * rs;
                const ui = re[b] * rs + im[b] * rc;
                re[b] = re[a] - ur;
                im[b] = im[a] - ui;
                re[a] += ur;
                im[a] += ui;
                const nc = rc * wc - rs * ws;
                rs = rc * ws + rs * wc;
                rc = nc;
            }
        }
    }
};

const pcm = await decode();
const frames = Math.floor((pcm.length - N) / HOP);
const bins = N / 2;
const hann = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));

// Log-magnitude spectra, and the flux spectrum (only increases).
const mags = [];
const flux = new Float32Array(frames);
const rises = [];
const re = new Float32Array(N);
const im = new Float32Array(N);
let previous = new Float32Array(bins);
for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) re[i] = pcm[f * HOP + i] * hann[i];
    im.fill(0);
    fft(re, im);
    const mag = new Float32Array(bins);
    const rise = new Float32Array(bins);
    let sum = 0;
    for (let k = 1; k < bins; k++) {
        mag[k] = Math.log1p(Math.hypot(re[k], im[k]) * 10);
        rise[k] = Math.max(0, mag[k] - previous[k]);
        sum += rise[k];
    }
    flux[f] = sum;
    mags.push(mag);
    rises.push(rise);
    previous = mag;
}

const loudness = (from, to) => {
    let total = 0;
    for (let f = Math.max(0, from); f < Math.min(frames, to); f++) for (let k = 1; k < bins; k++) total += mags[f][k];
    return total;
};

// Onsets: local maxima of flux above a moving median + offset.
const WINDOW = 16;
const onsets = [];
const sorted = (a) => [...a].sort((x, y) => x - y);
for (let f = 2; f < frames - 2; f++) {
    if (!(flux[f] >= flux[f - 1] && flux[f] > flux[f + 1])) continue;
    const local = sorted(flux.subarray(Math.max(0, f - WINDOW), Math.min(frames, f + WINDOW)));
    const median = local[Math.floor(local.length / 2)];
    const threshold = median * 1.25 + 1;
    if (flux[f] < threshold) continue;
    // A note starting makes things louder; a note being cut off doesn't.
    if (loudness(f, f + 3) < loudness(f - 3, f) * 1.02) continue;
    if (onsets.length && f - onsets[onsets.length - 1].frame < Math.round(0.07 * (RATE / HOP))) continue;
    onsets.push({ frame: f, strength: flux[f] });
}

// Pitch at each onset: harmonic sum over the new energy just after it.
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const binOf = (f) => (f * N) / RATE;
const at = (spectrum, f) => {
    const b = binOf(f);
    if (b >= bins - 1 || b < 1) return 0;
    const i = Math.round(b);
    return Math.max(spectrum[i], 0.5 * (spectrum[i - 1] + spectrum[Math.min(bins - 1, i + 1)]));
};
// Energy on the note's harmonics, minus energy *between* them. That
// second term is what stops octave mistakes: an octave too low has empty
// odd harmonics, and an octave too high has the real note's odd
// harmonics sitting between its own.
const salience = (spectrum, midi) => {
    const f0 = hz(midi);
    let total = 0;
    for (let h = 1; h <= 6; h++) {
        const w = 1 / Math.pow(h, 0.7);
        total += at(spectrum, f0 * h) * w - 0.6 * at(spectrum, f0 * (h - 0.5)) * w;
    }
    return total;
};
const peakStrength = Math.max(...onsets.map((o) => o.strength));
const notes = [];
for (const onset of onsets) {
    // New energy over the first ~80 ms of the note.
    const span = new Float32Array(bins);
    for (let f = onset.frame; f < Math.min(frames, onset.frame + 7); f++) {
        for (let k = 0; k < bins; k++) span[k] += rises[f][k] * 0.6 + mags[f][k] * 0.08;
    }
    const scores = [];
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
        scores.push({ midi: m, score: salience(span, m) });
    }
    const best = Math.max(...scores.map((s) => s.score));
    if (best <= 0) continue;
    const melody = scores.filter((s) => s.score >= best * 0.75).reduce((a, b) => (b.midi > a.midi ? b : a));
    notes.push({
        // (The flux peaks a little before the attack reaches the window's
        // middle; +30 ms lines it up with the sound.)
        t: +((onset.frame * HOP + N / 2) / RATE + 0.03).toFixed(3),
        midi: melody.midi,
        v: +Math.min(1, onset.strength / peakStrength).toFixed(2),
    });
}

const midis = notes.map((n) => n.midi).sort((a, b) => a - b);
const pct = (p) => midis[Math.floor(p * (midis.length - 1))];
const result = {
    source: input.split(/[\\/]/).pop(),
    durationMs: Math.round((pcm.length / RATE) * 1000),
    // The range most of the song lives in; the fairy maps it onto its keys.
    range: [pct(0.05), pct(0.95)],
    notes,
};
writeFileSync(output, JSON.stringify(result));
console.log(`${notes.length} notes over ${(pcm.length / RATE).toFixed(1)} s, mostly MIDI ${result.range[0]}-${result.range[1]} -> ${output}`);
