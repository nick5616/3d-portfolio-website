import { selfId } from "trystero";
import { connectSharedRoom, type JsonValue } from "../../../multiplayer/sharedRoom";
import type { Player } from "./connectFour";
import type { ChipDesignId } from "./chipDesigns";
import type { BotId, SideLook } from "./opponents";

// Everyone at the cosmic table can see everyone else's game (see
// multiplayer/sharedRoom.ts). Each visitor owns one part, their table: who
// they are, who they're playing and the game so far as a list of columns,
// which is all it takes to rebuild the board. Watching someone is just
// drawing their part on your own board. Playing someone is two tables that
// point at each other with the same game key; whoever's turn it is adds a
// column to theirs, and the other side plays it.
//
// Challenges go on a side channel: invite, accept, cancel.

export interface TableState {
    character: number; // the host's traveler (index into CHARACTERS)
    look: number; // and their color
    design: ChipDesignId; // their chips
    opponent: { kind: "bot"; bot: BotId } | { kind: "peer"; peer: string; character: number; look: number };
    opponentChips: SideLook;
    key: string; // changes every game
    first: Player; // 1: the host went first
    moves: number[];
    result: 0 | 1 | 2 | null; // from the host's side
}

export type ChallengeMessage = { kind: "invite" | "accept" | "cancel"; game: string };

export interface CosmicSyncHandlers {
    onTable: (peer: string, table: TableState) => void;
    onLeave: (peer: string) => void;
    onChallenge: (peer: string, message: ChallengeMessage) => void;
}

export interface CosmicSync {
    selfId: string;
    publish: (table: TableState) => void;
    challenge: (peer: string, message: ChallengeMessage) => void;
    leave: () => void;
}

const PREFIX = "t:";

export const connectCosmic = (initial: TableState, handlers: CosmicSyncHandlers): CosmicSync => {
    let mine = initial;
    const room = connectSharedRoom("cosmic-connect-four", {
        snapshot: () => ({ [PREFIX + selfId]: mine as unknown as JsonValue }),
        apply: (parts) => {
            Object.entries(parts).forEach(([key, value]) => {
                if (!key.startsWith(PREFIX)) return;
                const peer = key.slice(PREFIX.length);
                if (peer !== selfId && value) handlers.onTable(peer, value as unknown as TableState);
            });
        },
        onPeerLeave: handlers.onLeave,
    });
    const send = room.channel<ChallengeMessage>("c4-challenge", (message, from) => handlers.onChallenge(from, message));
    return {
        selfId,
        publish: (table) => {
            mine = table;
            room.publish({ [PREFIX + selfId]: table as unknown as JsonValue });
        },
        challenge: (peer, message) => send(message, peer),
        leave: room.leave,
    };
};
