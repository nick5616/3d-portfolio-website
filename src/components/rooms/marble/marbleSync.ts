import { connectSharedRoom, type Parts } from "../../../multiplayer/sharedRoom";
import { COLS, PieceKind, ROWS, cellKey, useMarbleStore } from "./marbleStore";

// The marble wall is shared, like the Jam Room (see multiplayer/sharedRoom.ts):
// one board for everyone in the room - each pegboard hole is its own part,
// so two people building at once don't undo each other - and every marble
// anyone drops falls on everyone's board, from the same spot with the same
// nudge, playing the same tune. Someone walking in gets the board as it is
// (the longest-present visitor's, if they disagree).

type Layout = Record<string, PieceKind>;
export type Drop = { x: number; vx: number };

const PART = "cell:";

const partsOf = (layout: Layout): Parts => {
    const parts: Parts = {};
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) parts[PART + cellKey(col, row)] = layout[cellKey(col, row)] ?? null;
    }
    return parts;
};

export const connectMarbles = (onDrop: (drop: Drop) => void) => {
    let applying = false;
    const room = connectSharedRoom(
        "marble-machine",
        {
            snapshot: () => partsOf(useMarbleStore.getState().layout),
            apply: (parts) => {
                const layout = { ...useMarbleStore.getState().layout };
                Object.entries(parts).forEach(([key, value]) => {
                    if (!key.startsWith(PART)) return;
                    const cell = key.slice(PART.length);
                    if (typeof value === "string") layout[cell] = value as PieceKind;
                    else delete layout[cell];
                });
                applying = true;
                useMarbleStore.setState({ layout });
                applying = false;
            },
        },
        "mm"
    );
    const sendDrop = room.channel<Drop>("drop", (drop) => {
        if (typeof drop?.x === "number" && typeof drop.vx === "number") onDrop(drop);
    });

    // Every change made here goes out: a piece placed, picked up, the reset.
    const unsubscribe = useMarbleStore.subscribe((now, before) => {
        if (applying || now.layout === before.layout) return;
        const a = partsOf(now.layout);
        const b = partsOf(before.layout);
        const changed: Parts = {};
        Object.keys(a).forEach((key) => {
            if (a[key] !== b[key]) changed[key] = a[key];
        });
        if (Object.keys(changed).length) room.publish(changed);
    });

    return {
        drop: (drop: Drop) => sendDrop(drop),
        leave: () => {
            unsubscribe();
            room.leave();
        },
    };
};
