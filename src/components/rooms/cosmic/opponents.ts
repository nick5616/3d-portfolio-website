import type { ChooseOptions } from "./connectFour";
import type { ChipDesignId } from "./chipDesigns";
import { CHARACTERS } from "../../../multiplayer/characters";
import { LINES } from "./nothingLines";

// Who will play you at the table, easiest first. Each is unlocked by
// beating the one before it; the Void, last, plays as hard as it can.

export type BotId = "pibble" | "willow" | "king" | "void";
// What a side's chips look like: a stone from the altar, or the Void's light.
export type SideLook = ChipDesignId | "void";

export const LADDER: BotId[] = ["pibble", "willow", "king", "void"];

export interface BotLines {
    greet: string[];
    opens: string[];
    afterYourMove: string[];
    afterTheirMove: string[];
    spared: string[];
    youWin: string[];
    theyWin: string[];
    draw: string[];
    again: string[];
    columnFull: string[];
    notYourTurn: string[];
}

export interface OpponentDef {
    id: BotId;
    name: string;
    difficulty: "Easy" | "Medium" | "Hard" | "Insane";
    style: ChooseOptions;
    // Chip looks in order of preference; the first one you aren't playing.
    chips: SideLook[];
    // The traveler it's drawn as across the table (the Void has no body).
    body?: { character: number; color: number };
    lines: BotLines;
    // The pop-up line when you beat it, and what that unlocked.
    beaten?: { line: string; unlocks: string };
}

const characterIndex = (name: string) => Math.max(0, CHARACTERS.findIndex((c) => c.name === name));

export const OPPONENTS: Record<BotId, OpponentDef> = {
    pibble: {
        id: "pibble",
        name: "Pibble",
        difficulty: "Easy",
        // Sees one move ahead, most of the time.
        style: { maxDepth: 2, timeBudgetMs: 80, mercy: 0.35, whim: 0.55, closeMargin: 400, blunder: 0.3 },
        chips: ["rupee", "obsidian"],
        body: { character: characterIndex("Pip"), color: 0xffb347 },
        lines: {
            greet: ["Hi!! Hi. I'm Pibble. Do you wanna play? You wanna play.", "Ooh, a game! I love games! I love this one!"],
            opens: ["Me first! Me first!", "Can I go? I'm going."],
            afterYourMove: ["Ooh!", "Wait, why there?", "Hmm hmm hmm.", "Okay okay okay.", "Nice!!"],
            afterTheirMove: ["Boop.", "There! I think.", "Is that good? That's good.", "Eeee."],
            spared: ["Oh! I could've won? Oops. You go.", "Wait, was that one mine? Nah, you have it."],
            youWin: ["You did it!! Again again again!", "Whoa. You're really good. Or I'm really me."],
            theyWin: ["I WON? I won! Did you let me?", "Four!! Is that four? That's four!"],
            draw: ["Nobody won! That means everybody won!"],
            again: ["Again? Again!", "One more! One more!"],
            columnFull: ["That one's all full! Like me after lunch."],
            notYourTurn: ["Wait, wait, it's my turn!"],
        },
        beaten: { line: "Pibble is impressed. Pibble is always impressed, but still.", unlocks: "Willow will play you now" },
    },
    willow: {
        id: "willow",
        name: "Willow",
        difficulty: "Medium",
        style: { maxDepth: 4, timeBudgetMs: 220, mercy: 0.15, whim: 0.35, closeMargin: 60, blunder: 0.07 },
        chips: ["moonstone", "sapphire"],
        body: { character: characterIndex("Wisp"), color: 0x9be8b0 },
        lines: {
            greet: ["Oh, hello. I'm Willow. I drift by here sometimes.", "A game? Mm. Gently, then."],
            opens: ["I'll start, if that's all right.", "Let me go first. Softly."],
            afterYourMove: ["Mm.", "Oh, I see.", "That's a pretty one.", "Hm, clever.", "Careful..."],
            afterTheirMove: ["There.", "Just here, I think.", "A little light.", "Mm-hm."],
            spared: ["I could have... no. Not like that.", "Let's not end it yet."],
            youWin: ["Oh, well played. Truly.", "You saw further than me. That's lovely."],
            theyWin: ["Oh! Four. I'm sorry. Not very sorry.", "The light lined up for me, that time."],
            draw: ["A full board. Peaceful."],
            again: ["Another? I'd like that.", "Once more?"],
            columnFull: ["That one's full, I'm afraid."],
            notYourTurn: ["Wait for me, please."],
        },
        beaten: { line: "Willow's light flickers, approving.", unlocks: "The Fairy King will play you now" },
    },
    king: {
        id: "king",
        name: "The Fairy King",
        difficulty: "Hard",
        style: { maxDepth: 6, timeBudgetMs: 450, mercy: 0.06, whim: 0.12 },
        chips: ["sapphire", "bismuth"],
        body: { character: characterIndex("Fairy King"), color: 0xb8c8ff },
        lines: {
            greet: ["You stand before the Fairy King. You may sit.", "A commoner wishes to play. How rare. How brave."],
            opens: ["The crown moves first.", "We begin. We, being I."],
            afterYourMove: ["Bold, for a commoner.", "Hm. Acceptable.", "We noticed that.", "Is that all?", "Interesting. Pray continue."],
            afterTheirMove: ["As it is decreed.", "There. By royal right.", "Observe.", "Your move, subject."],
            spared: ["We grant you clemency. Once.", "We could end this. We choose not to. Be grateful."],
            youWin: ["...Impossible. We demand a rematch.", "You have bested the crown. We shall not speak of it."],
            theyWin: ["Naturally.", "Kneel. Or play again. Either."],
            draw: ["A stalemate. The court will call it a victory."],
            again: ["Again. We insist.", "Another game. By royal command."],
            columnFull: ["That column is full. Even for you."],
            notYourTurn: ["You will wait for the King."],
        },
        beaten: {
            line: "You feel as though you might win against Connect Four, itself",
            unlocks: "The Void will play you now",
        },
    },
    void: {
        id: "void",
        name: "The Void",
        difficulty: "Insane",
        // As deep as it can see in the time it has, no whims, and only
        // the rarest mercy.
        style: { maxDepth: 42, timeBudgetMs: 1400, mercy: 0.03, whim: 0 },
        chips: ["void"],
        lines: {
            greet: LINES.greet,
            opens: LINES.opens,
            afterYourMove: LINES.afterYourMove,
            afterTheirMove: LINES.afterTheirMove,
            spared: LINES.spared,
            youWin: LINES.youWin,
            theyWin: LINES.theyWin,
            draw: LINES.draw,
            again: LINES.again,
            columnFull: LINES.columnFull,
            notYourTurn: LINES.notYourTurn,
        },
    },
};

export const nextOnLadder = (bot: BotId): BotId | null => LADDER[LADDER.indexOf(bot) + 1] ?? null;
export const previousOnLadder = (bot: BotId): BotId | null => LADDER[LADDER.indexOf(bot) - 1] ?? null;

export const isUnlocked = (bot: BotId, beaten: Partial<Record<BotId, boolean>>) => {
    const before = previousOnLadder(bot);
    return !before || Boolean(beaten[before]);
};

// The opponent's chips, never the same stone as yours.
export const botChips = (bot: BotId, yours: ChipDesignId): SideLook =>
    OPPONENTS[bot].chips.find((c) => c !== yours) ?? "void";
