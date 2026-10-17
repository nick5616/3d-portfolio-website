import { Board, ChooseOptions, MoveChoice, Player, chooseMove } from "./connectFour";

// Every opponent at the table thinks in the same worker; how well is in
// its style (see OPPONENTS in opponents.ts).

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

// No worker: think on this thread, more briefly.
const thinkHere = (board: Board, who: Player, style: ChooseOptions) =>
    chooseMove(board, who, { ...style, timeBudgetMs: Math.min(style.timeBudgetMs, 120) });

export const thinkFor = (board: Board, who: Player, style: ChooseOptions): Promise<MoveChoice> => {
    const w = getWorker();
    if (!w) return Promise.resolve(thinkHere(board, who, style));
    const id = nextId++;
    return new Promise((resolve) => {
        // If the worker dies mid-thought, fall back rather than hang.
        const timeout = setTimeout(() => {
            if (!pending.has(id)) return;
            pending.delete(id);
            resolve(thinkHere(board, who, style));
        }, style.timeBudgetMs + 3500);
        pending.set(id, (choice) => {
            clearTimeout(timeout);
            resolve(choice);
        });
        w.postMessage({ id, board, who, opts: style });
    });
};
