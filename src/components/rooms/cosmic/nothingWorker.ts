// Nothing thinks off the main thread so the void keeps swirling while it
// does.
import { chooseMove, Board, ChooseOptions, Player } from "./connectFour";

interface ThinkRequest {
    id: number;
    board: Board;
    who: Player;
    opts: ChooseOptions;
}

self.onmessage = (event: MessageEvent<ThinkRequest>) => {
    const { id, board, who, opts } = event.data;
    const choice = chooseMove(board, who, opts);
    (self as unknown as Worker).postMessage({ id, choice });
};
