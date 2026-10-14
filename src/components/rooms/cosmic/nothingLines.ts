// What Nothing says. It is never clear whether it wishes you well.

export const LINES = {
    firstMeeting: [
        "You came up the stairs. They always do.",
        "I am Nothing. Sit. The board was set before you were born.",
        "Rubies for you, light for me. That has always been the arrangement.",
    ],
    returning: [
        "Back again. I counted the seconds. There were not many.",
        "You again. Good. Or not. Sit.",
        "The board remembers you. So do I.",
    ],
    yourTurnOpening: ["You first. You always go first. That's the only kindness I'm sure of."],
    nothingOpens: ["This time, I begin."],
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
    afterNothingMove: [
        "Mine.",
        "Here.",
        "A small light, set down carefully.",
        "Your move. Take your time. I have all of it.",
        "There.",
        "Look closer.",
    ],
    thinking: ["…", "Let me see.", "Mm."],
    spared: [
        "Not yet.",
        "I could have ended this. I didn't. Wonder why.",
        "No. Not that one. Not today.",
    ],
    youWin: [
        "You won. Was that the thing you wanted?",
        "Four. Take it. Everything you take, you carry.",
        "Well. Something from Nothing. They'll write that down somewhere.",
    ],
    nothingWins: [
        "Four in a row. Don't grieve. It's only a game. Mostly.",
        "The light settles where it settles.",
        "I win. I'm not sure that means anything. I'm not sure it doesn't.",
    ],
    draw: ["Full. Neither of us. How rare.", "Nobody wins. I find that restful."],
    again: ["Again?", "Another? Press it, if you dare to want more.", "Shall we?"],
    columnFull: ["That one is full. Even I can't fit more into it."],
    notYourTurn: ["Patience. It's my turn to exist."],
};

const lastPicked = new Map<string, number>();

export const pickLine = (kind: keyof typeof LINES) => {
    const lines = LINES[kind];
    let index = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && index === lastPicked.get(kind)) index = (index + 1) % lines.length;
    lastPicked.set(kind, index);
    return lines[index];
};
