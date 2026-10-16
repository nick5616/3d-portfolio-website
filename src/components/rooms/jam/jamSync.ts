import { getAudioContext } from "../../../audio/soundManager";
import { Parts, connectSharedRoom } from "../../../multiplayer/sharedRoom";
import { InstrumentId, JamTransport, LoopId } from "./jamAudio";
import { MAX_STEPS, ROWS, useJamStore } from "./jamStore";

// The Jam Room is shared: everyone in it plays the same song, in time (see
// multiplayer/sharedRoom.ts). The song is split into small parts - each
// cell of the wall, each row's shelf, the tempo, the beats in a bar, each
// floor loop - so two people working on different bits never trip over
// each other, and a change sends just the part it touched.
//
// Keeping time: the visitor who's been here longest is the timekeeper. They
// tell each newcomer where the song is, and tell everyone again after the
// tempo or the bar length changes (a change reaches each of us a moment
// apart, so the beat would slip).

type JamSnapshot = ReturnType<typeof useJamStore.getState>;
type Clock = { ahead: number; bar: number; sixteenth: number };

const cellKey = (row: number, step: number) => `cell:${row}:${step}`;

const partsOf = (s: JamSnapshot): Parts => {
    const parts: Parts = { bpm: s.bpm, bpb: s.beatsPerBar };
    s.rows.forEach((row, r) => {
        parts[`shelf:${r}`] = row.instrument;
        row.cells.forEach((on, step) => (parts[cellKey(r, step)] = on));
    });
    (Object.keys(s.loops) as LoopId[]).forEach((id) => (parts[`loop:${id}`] = s.loops[id]));
    return parts;
};

const changedParts = (now: JamSnapshot, before: JamSnapshot): Parts => {
    const a = partsOf(now);
    const b = partsOf(before);
    const changed: Parts = {};
    Object.keys(a).forEach((key) => {
        if (a[key] !== b[key]) changed[key] = a[key];
    });
    return changed;
};

export const connectJam = (transport: JamTransport, onPeers: (count: number) => void) => {
    let applying = false;
    let sendClock: (clock: Clock, target?: string) => void = () => {};

    const clockNow = (): Clock | null => {
        const ctx = getAudioContext();
        if (!ctx) return null;
        const { time, bar, sixteenth } = transport.position();
        if (time <= 0) return null;
        return { ahead: (time - ctx.currentTime) * 1000, bar, sixteenth };
    };
    const tellTime = (target?: string) => {
        if (!room.isLeader()) return;
        const clock = clockNow();
        if (clock) sendClock(clock, target);
    };

    const room = connectSharedRoom("jam-room", {
        snapshot: () => partsOf(useJamStore.getState()),
        apply: (parts) => {
            const s = useJamStore.getState();
            let { bpm, beatsPerBar } = s;
            const rows = s.rows.map((row) => ({ ...row, cells: [...row.cells] }));
            const loops = { ...s.loops };
            Object.entries(parts).forEach(([key, value]) => {
                const [kind, a, b] = key.split(":");
                if (kind === "bpm" && typeof value === "number") bpm = value;
                else if (kind === "bpb" && typeof value === "number") beatsPerBar = value;
                else if (kind === "shelf" && Number(a) < ROWS) rows[Number(a)].instrument = value as InstrumentId | null;
                else if (kind === "cell" && Number(a) < ROWS && Number(b) < MAX_STEPS) rows[Number(a)].cells[Number(b)] = value === true;
                else if (kind === "loop" && a in loops) loops[a as LoopId] = value === true;
            });
            applying = true;
            useJamStore.setState({ bpm, beatsPerBar, rows, loops });
            applying = false;
            if ("bpm" in parts || "bpb" in parts) window.setTimeout(() => tellTime(), 300);
        },
        onPeers,
        onPeerJoin: (peerId) => tellTime(peerId),
    });

    sendClock = room.channel<Clock>("clock", async (clock, from) => {
        const ctx = getAudioContext();
        if (!ctx) return;
        // The 16th was `ahead` ms off when they sent it; allow for the trip.
        const arrived = ctx.currentTime;
        const rtt = await room.ping(from).catch(() => 0);
        transport.align(arrived + (clock.ahead - rtt / 2) / 1000, clock.bar, clock.sixteenth);
    });

    // Every change made here - wherever in the room it came from - goes out.
    const unsubscribe = useJamStore.subscribe((now, before) => {
        if (applying) return;
        const changed = changedParts(now, before);
        if (!Object.keys(changed).length) return;
        room.publish(changed);
        if ("bpm" in changed || "bpb" in changed) window.setTimeout(() => tellTime(), 300);
    });

    return () => {
        unsubscribe();
        room.leave();
    };
};
