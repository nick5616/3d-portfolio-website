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
// Challenges go on a side channel: invite, accept, cancel. Whatever the
// opponent at a table says goes out on another, so everyone watching that
// game hears the same Pibble (or Willow, or King, or Void) as its player.

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
    // They're watching someone else (and this is their game, set aside).
    watching: boolean;
    // Their seat is open to anyone: join by accepting this game.
    open: string | null;
}

// Joining an open table is an "accept" of its game; a host who's already
// been taken answers a late joiner with "cancel".
export type ChallengeMessage = { kind: "invite" | "accept" | "cancel"; game: string };
// A line said at someone's table, so everyone watching it hears it too.
export type SpokenLine = { text: string; by: "void" | "seat" };

export interface CosmicSyncHandlers {
    onTable: (peer: string, table: TableState) => void;
    onLeave: (peer: string) => void;
    onChallenge: (peer: string, message: ChallengeMessage) => void;
    onSay: (peer: string, line: SpokenLine) => void;
}

export interface CosmicSync {
    selfId: string;
    publish: (table: TableState) => void;
    challenge: (peer: string, message: ChallengeMessage) => void;
    say: (line: SpokenLine) => void;
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
    const speak = room.channel<SpokenLine>("c4-say", (line, from) => handlers.onSay(from, line));
    return {
        selfId,
        publish: (table) => {
            mine = table;
            room.publish({ [PREFIX + selfId]: table as unknown as JsonValue });
        },
        challenge: (peer, message) => send(message, peer),
        say: (line) => speak(line),
        leave: room.leave,
    };
};
