// Connect Four rules and Nothing's search. Pure functions, no three.js, so
// the worker (nothingWorker.ts) can import this file on its own.

export const COLS = 7;
export const ROWS = 6;
export type Cell = 0 | 1 | 2; // empty, you, Nothing
export type Player = 1 | 2;
export type Board = Cell[][]; // board[col][row], row 0 at the bottom
export type CellRef = [number, number]; // [col, row]

export const emptyBoard = (): Board =>
    Array.from({ length: COLS }, () => Array<Cell>(ROWS).fill(0));

export const cloneBoard = (board: Board): Board => board.map((col) => col.slice());

export const landingRow = (board: Board, col: number) => {
    const row = board[col].indexOf(0);
    return row; // -1 when the column is full
};

export const isFull = (board: Board) => board.every((col) => col[ROWS - 1] !== 0);

const DIRECTIONS: CellRef[] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
];

// The four (or more) in a row through (col, row), if any.
export const findWin = (board: Board, col: number, row: number): CellRef[] | null => {
    const who = board[col][row];
    if (!who) return null;
    for (const [dc, dr] of DIRECTIONS) {
        const line: CellRef[] = [[col, row]];
        for (const sign of [1, -1]) {
            let c = col + dc * sign;
            let r = row + dr * sign;
            while (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === who) {
                line.push([c, r]);
                c += dc * sign;
                r += dr * sign;
            }
        }
        if (line.length >= 4) {
            return line.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        }
    }
    return null;
};

// --- Search ---------------------------------------------------------------

// Every window of four cells on the board, for the evaluation.
const WINDOWS: CellRef[][] = (() => {
    const windows: CellRef[][] = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            for (const [dc, dr] of DIRECTIONS) {
                const endC = c + dc * 3;
                const endR = r + dr * 3;
                if (endC < 0 || endC >= COLS || endR < 0 || endR >= ROWS) continue;
                windows.push([0, 1, 2, 3].map((k) => [c + dc * k, r + dr * k] as CellRef));
            }
        }
    }
    return windows;
})();

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN = 1_000_000;

const evaluate = (board: Board, who: Player) => {
    const them = (3 - who) as Player;
    let score = 0;
    for (const window of WINDOWS) {
        let mine = 0;
        let theirs = 0;
        for (const [c, r] of window) {
            const cell = board[c][r];
            if (cell === who) mine++;
            else if (cell === them) theirs++;
        }
        if (mine && theirs) continue;
        if (mine === 3) score += 60;
        else if (mine === 2) score += 6;
        else if (theirs === 3) score -= 70;
        else if (theirs === 2) score -= 6;
    }
    for (let r = 0; r < ROWS; r++) {
        if (board[3][r] === who) score += 4;
        else if (board[3][r] === them) score -= 4;
    }
    return score;
};

interface SearchContext {
    deadline: number;
    nodes: number;
    aborted: boolean;
}

const negamax = (
    board: Board,
    heights: number[],
    who: Player,
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
    ctx: SearchContext
): number => {
    if ((++ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline) {
        ctx.aborted = true;
    }
    if (ctx.aborted) return 0;
    if (heights.every((h) => h >= ROWS)) return 0;
    if (depth === 0) return evaluate(board, who);

    let best = -Infinity;
    for (const c of ORDER) {
        const r = heights[c];
        if (r >= ROWS) continue;
        board[c][r] = who;
        heights[c]++;
        const score = findWin(board, c, r)
            ? WIN - ply
            : -negamax(board, heights, (3 - who) as Player, depth - 1, -beta, -alpha, ply + 1, ctx);
        heights[c]--;
        board[c][r] = 0;
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
};

export interface MoveChoice {
    col: number;
    // Nothing could have won on this move and chose not to.
    sparedYou: boolean;
}

export interface ChooseOptions {
    maxDepth: number;
    timeBudgetMs: number;
    // Chance of passing up an immediate win. Its reasons are its own.
    mercy: number;
    // Chance of picking among near-equal moves rather than the very best.
    whim: number;
    // How far below the best a move can score and still count as near-equal.
    closeMargin?: number;
    // Chance of just playing any column at all, good or not.
    blunder?: number;
    random?: () => number;
}

// Root scores for each legal column via iterative deepening, keeping the
// deepest depth that finished inside the time budget. A player with no
// whims only needs the best column, so the root is searched with a window
// too (the other columns' scores are then upper bounds, not exact), best
// column from the last depth first.
const scoreColumns = (board: Board, who: Player, opts: ChooseOptions) => {
    const work = cloneBoard(board);
    const heights = work.map((col) => {
        const row = col.indexOf(0);
        return row === -1 ? ROWS : row;
    });
    const ctx: SearchContext = {
        deadline: performance.now() + opts.timeBudgetMs,
        nodes: 0,
        aborted: false,
    };
    // (Mercy only needs some move that isn't a win, so a bound will do.)
    const exact = opts.whim > 0;
    let order = ORDER;
    let finished: Map<number, number> | null = null;
    for (let depth = 1; depth <= opts.maxDepth; depth++) {
        const scores = new Map<number, number>();
        let alpha = -Infinity;
        for (const c of order) {
            const r = heights[c];
            if (r >= ROWS) continue;
            work[c][r] = who;
            heights[c]++;
            const score = findWin(work, c, r)
                ? WIN
                : -negamax(work, heights, (3 - who) as Player, depth - 1, -Infinity, exact ? Infinity : -alpha, 1, ctx);
            heights[c]--;
            work[c][r] = 0;
            scores.set(c, score);
            if (score > alpha) alpha = score;
        }
        if (ctx.aborted) break;
        finished = scores;
        // A forced result needs no deeper look.
        if (Math.abs(alpha) >= WIN / 2) break;
        order = [...order].sort((a, b) => (scores.get(b) ?? -Infinity) - (scores.get(a) ?? -Infinity));
    }
    return finished;
};

export const chooseMove = (board: Board, who: Player, opts: ChooseOptions): MoveChoice => {
    const random = opts.random ?? Math.random;
    const legal = ORDER.filter((c) => board[c][ROWS - 1] === 0);
    const scores = scoreColumns(board, who, opts) ?? new Map(legal.map((c) => [c, 0]));
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);

    const winning = ranked.filter(([, s]) => s >= WIN);
    if (winning.length) {
        const alternatives = ranked.filter(([, s]) => s < WIN && s > -WIN / 2);
        if (alternatives.length && random() < opts.mercy) {
            return { col: alternatives[0][0], sparedYou: true };
        }
        return { col: winning[0][0], sparedYou: false };
    }

    if (opts.blunder && random() < opts.blunder) {
        return { col: legal[Math.floor(random() * legal.length)], sparedYou: false };
    }

    const [bestCol, bestScore] = ranked[0];
    if (random() < opts.whim && bestScore > -WIN / 2) {
        // Any move close to the best that doesn't hand over the game.
        const margin = opts.closeMargin ?? 25;
        const close = ranked.filter(([, s]) => s >= bestScore - margin && s > -WIN / 2);
        return { col: close[Math.floor(random() * close.length)][0], sparedYou: false };
    }
    return { col: bestCol, sparedYou: false };
};
