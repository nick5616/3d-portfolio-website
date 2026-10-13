// The world's <canvas>. R3F puts <Canvas className> on its wrapper div,
// not on the canvas element, so look inside that wrapper.
export const getMainCanvas = (): HTMLCanvasElement | null =>
    document.querySelector<HTMLCanvasElement>(".main-canvas canvas") ??
    document.querySelector<HTMLCanvasElement>("canvas");

// Ask for pointer lock without throwing. Chrome rejects (as a promise) a
// request made too soon after the user pressed Esc; the next click works.
export const requestWorldPointerLock = () => {
    const canvas = getMainCanvas();
    if (!canvas) return;
    try {
        const result = canvas.requestPointerLock() as unknown as
            | Promise<void>
            | undefined;
        result?.catch?.(() => {});
    } catch {
        // ignore
    }
};
