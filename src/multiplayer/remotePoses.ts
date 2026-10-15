import type { Pose } from "./protocol";

// Snapshot interpolation for remote players, in the same spirit as the
// wizard game's EntityInterpolation, but with no server clock to sync to:
// each peer stamps poses with its own clock, and we learn the offset to
// ours from the packets themselves.
//
// A plain mutable map rather than a store: it's written on every packet and
// read every frame, and nothing needs to re-render when it changes.

/** How far in the past remote players are drawn. ~2 packets at 15 Hz. */
const INTERP_DELAY = 120;
const SEND_INTERVAL = 1000 / 15;
/** Farther than this between samples is a teleport: snap, don't glide. */
const SNAP_DISTANCE = 3;
const MAX_SAMPLES = 16;

interface Sample extends Pose {
    /** Sender time unwrapped from 16 bits and mapped onto our clock. */
    at: number;
}

interface Track {
    samples: Sample[];
    lastT: number; // unwrapped sender time of the newest sample
    lastWrapped: number;
    lastArrival: number;
    offset: number; // our clock minus theirs, best estimate
}

const tracks = new Map<number, Track>();

export function recordPose(id: number, pose: Pose) {
    const now = performance.now();
    let track = tracks.get(id);
    // New peer, or a long silence (hidden tab) longer than the 16-bit
    // timestamp can unambiguously span: start the timeline over.
    if (!track || now - track.lastArrival > 30_000) {
        track = { samples: [], lastT: pose.t, lastWrapped: pose.t, lastArrival: now, offset: now - pose.t };
        tracks.set(id, track);
    } else {
        const delta = (pose.t - track.lastWrapped) & 0xffff;
        // Older than what we have (reordered or duplicated via both the
        // direct channel and the relay): the newer one already superseded it.
        if (delta === 0 || delta > 0x8000) return;
        track.lastT += delta;
        track.lastWrapped = pose.t;
        track.lastArrival = now;
    }
    // The least-delayed packet is the best estimate of the clock offset;
    // creep upward slowly so clock drift and route changes are absorbed.
    const observed = now - track.lastT;
    track.offset = observed < track.offset ? observed : track.offset + (observed - track.offset) * 0.02;

    const at = track.lastT + track.offset;
    const prev = track.samples[track.samples.length - 1];
    // Senders go quiet (just a heartbeat) when standing still. Pin the old
    // pose to just before this one so starting to move doesn't come out
    // as a slow glide across the whole idle gap.
    if (prev && at - prev.at > SEND_INTERVAL * 2) {
        track.samples.push({ ...prev, at: at - SEND_INTERVAL });
    }
    track.samples.push({ ...pose, at });
    if (track.samples.length > MAX_SAMPLES) track.samples.splice(0, track.samples.length - MAX_SAMPLES);
}

export interface InterpolatedPose {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    flags: number;
}

/** Writes the pose to draw `id` at right now into `out`; false if none yet. */
export function samplePose(id: number, out: InterpolatedPose): boolean {
    const track = tracks.get(id);
    if (!track || track.samples.length === 0) return false;
    const renderAt = performance.now() - INTERP_DELAY;
    const s = track.samples;

    let i = s.length - 1;
    while (i > 0 && s[i].at > renderAt) i--;
    const a = s[i];
    const b = s[i + 1];
    if (!b || renderAt <= a.at || dist2(a, b) > SNAP_DISTANCE * SNAP_DISTANCE) {
        // Before the first sample, past the newest (packets late or the
        // peer idle), or across a teleport (until it's reached): hold.
        out.x = a.x;
        out.y = a.y;
        out.z = a.z;
        out.yaw = a.yaw;
        out.pitch = a.pitch;
        out.flags = a.flags;
        return true;
    }
    const k = (renderAt - a.at) / (b.at - a.at);
    out.x = a.x + (b.x - a.x) * k;
    out.y = a.y + (b.y - a.y) * k;
    out.z = a.z + (b.z - a.z) * k;
    out.yaw = lerpAngle(a.yaw, b.yaw, k);
    out.pitch = a.pitch + (b.pitch - a.pitch) * k;
    out.flags = k < 0.5 ? a.flags : b.flags;
    return true;
}

export function forgetPose(id: number) {
    tracks.delete(id);
}

export function forgetAllPoses() {
    tracks.clear();
}

function dist2(a: Pose, b: Pose) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

function lerpAngle(a: number, b: number, k: number) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
}
