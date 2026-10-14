import { Board, ChooseOptions, MoveChoice, Player, chooseMove } from "./connectFour";

// How Nothing plays: a solid six-ply search (beatable with care), a small
// habit of playing on a whim, and an occasional refusal to take a win it
// has already seen.
export const NOTHING_STYLE: ChooseOptions = {
    maxDepth: 6,
    timeBudgetMs: 450,
    mercy: 0.22,
    whim: 0.12,
};

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 0;
const pending = new Map<number, (choice: MoveChoice) => void>();

const getWorker = () => {
    if (worker || workerBroken) return worker;
    try {
        worker = new Worker(new URL("./nothingWorker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent<{ id: number; choice: MoveChoice }>) => {
            pending.get(event.data.id)?.(event.data.choice);
            pending.delete(event.data.id);
        };
        worker.onerror = () => {
            workerBroken = true;
            worker?.terminate();
            worker = null;
        };
    } catch {
        workerBroken = true;
    }
    return worker;
};

export const thinkFor = (board: Board, who: Player): Promise<MoveChoice> => {
    const w = getWorker();
    if (!w) {
        // No workers: think on this thread, more briefly.
        return Promise.resolve(chooseMove(board, who, { ...NOTHING_STYLE, timeBudgetMs: 120 }));
    }
    const id = nextId++;
    return new Promise((resolve) => {
        // If the worker dies mid-thought, fall back rather than hang.
        const timeout = setTimeout(() => {
            if (!pending.has(id)) return;
            pending.delete(id);
            resolve(chooseMove(board, who, { ...NOTHING_STYLE, timeBudgetMs: 120 }));
        }, 4000);
        pending.set(id, (choice) => {
            clearTimeout(timeout);
            resolve(choice);
        });
        w.postMessage({ id, board, who, opts: NOTHING_STYLE });
    });
};
