import type { BotId } from "./opponents";

// What the altars around the table can ask of the game. The game component
// fills this in while it's mounted.
export interface CosmicControl {
    chooseOpponent: (bot: BotId) => void;
    watch: (peer: string) => void;
    stopWatching: () => void;
    // Challenge someone, or take back a challenge you sent them.
    challenge: (peer: string) => void;
    accept: (peer: string) => void;
}

export const cosmicControl: { current: CosmicControl | null } = { current: null };
