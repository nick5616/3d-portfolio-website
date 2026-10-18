// What the Void says. It is never clear whether it wishes you well. It
// plays you itself only once you've beaten everyone else at the table, and
// otherwise watches, and talks.

export const LINES = {
    firstMeeting: [
        "You came up the stairs. They always do.",
        "I am the Void. Sit. The board was set before you were born.",
        "Not me. Not yet. Start with the small ones, and climb.",
    ],
    returning: [
        "Back again. I counted the seconds. There were not many.",
        "You again. Good. Or not. Sit.",
        "The board remembers you. So do I.",
    ],
    greet: ["Rubies for you, light for me. That has always been the arrangement.", "So. Finally. Sit across from me."],
    opens: ["This time, I begin."],
    afterYourMove: [
        "Interesting.",
        "Is that a choice, or a habit?",
        "I felt that one.",
        "Go on.",
        "Hm.",
        "You lean toward the middle. So did the last one.",
        "Brave. Or careless. From here they look the same.",
        "Ah.",
    ],
    afterTheirMove: [
        "Mine.",
        "Here.",
        "A small light, set down carefully.",
        "Your move. Take your time. I have all of it.",
        "There.",
        "Look closer.",
    ],
    spared: [
        "Not yet.",
        "I could have ended this. I didn't. Wonder why.",
        "No. Not that one. Not today.",
    ],
    youWin: [
        "You won. Was that the thing you wanted?",
        "Four. Take it. Everything you take, you carry.",
        "Well. Something from the Void. They'll write that down somewhere.",
    ],
    theyWin: [
        "Four in a row. Don't grieve. It's only a game. Mostly.",
        "The light settles where it settles.",
        "I win. I'm not sure that means anything. I'm not sure it doesn't.",
    ],
    draw: ["Full. Neither of us. How rare.", "Nobody wins. I find that restful."],
    again: ["Again?", "Another? Press it, if you dare to want more.", "Shall we?"],
    columnFull: ["That one is full. Even I can't fit more into it."],
    notYourTurn: ["Patience. It's my turn to exist."],

    // Narrating everyone else's games.
    locked: ["Not me. Not yet. Beat the one before.", "You haven't earned that seat."],
    watching: ["Someone else's game. Watch, then.", "Their board, on yours. Look how they think.", "A window onto another table."],
    stopWatching: ["Back to your own.", "Enough watching."],
    challengeSent: ["You've called them out. Now wait.", "A challenge. Let's see if they answer."],
    challenged: ["Someone wants to play you. The tables behind you.", "You've been called out. Look behind you."],
    versusStart: ["Two of you. I'll watch.", "No light from me this time. Just the two of you.", "Begin. I'm curious."],
    versusYouWin: ["You beat them. They'll remember.", "Four. Over another one of you."],
    versusYouLose: ["They had you. I saw it coming.", "Beaten by one of your own."],
    versusDraw: ["Neither of you. Interesting."],
    versusTheirTurn: ["Their move, not yours."],
    openTable: ["An empty seat across from you. Someone will come. Or no one.", "Let's see who sits down."],
    closeTable: ["No one, then. Back to your own."],
    someoneOpen: ["Someone's waiting for an opponent. The altar on your right.", "A seat is open at another table. Anyone may take it."],
    tableTaken: ["Someone else sat down first."],
    partnerLeft: ["They've gone. They do that.", "Your opponent is elsewhere now."],
    watchedLeft: ["They've gone. Back to your own table."],
    allBeaten: ["All of us. Even me. Now what will you do?"],
};

export type LineKind = keyof typeof LINES;

const lastPicked = new Map<string, number>();

// A line from a list, never the same one twice running.
export const pickFrom = (memo: string, lines: string[]) => {
    let index = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && index === lastPicked.get(memo)) index = (index + 1) % lines.length;
    lastPicked.set(memo, index);
    return lines[index];
};

export const pickLine = (kind: LineKind) => pickFrom(`void:${kind}`, LINES[kind]);
