import { useEffect } from "react";
import { useSketchbookStore } from "./sketchbookStore";
import { useArtInspectStore } from "../../stores/artInspectStore";
import { detectIsMobile } from "../../utils/deviceDetection";

// Overlay while reading the sketchbook: where you are in the book and how
// to move through it. Lives outside the game HUD layer, which it hides.
export const SketchbookHUD: React.FC = () => {
    const reading = useSketchbookStore((s) => s.reading);
    const spread = useSketchbookStore((s) => s.spread);
    const leaves = useSketchbookStore((s) => s.leaves);
    const images = useSketchbookStore((s) => s.images);
    const title = useSketchbookStore((s) => s.title);
    const mirrored = useSketchbookStore((s) => s.mirrored);
    const inspecting = useArtInspectStore((s) => Boolean(s.inspecting));
    const isMobile = detectIsMobile();

    useEffect(() => {
        if (!reading) return;
        document.body.classList.add("hud-hidden");
        return () => document.body.classList.remove("hud-hidden");
    }, [reading]);

    if (!reading || inspecting) return null;
    const controls = useSketchbookStore.getState().controls;
    // The arrow buttons follow the page; a mirrored book turns forward
    // to the right.
    const goLeft = () => (mirrored ? controls?.next() : controls?.prev());
    const goRight = () => (mirrored ? controls?.prev() : controls?.next());

    // spread = leaves turned. 0: closed; 1: inside cover + first sketch;
    // n: sketches 2n-3 and 2n-2 (1-based), clipped to what exists.
    let where: string;
    if (spread === 0) where = "Cover";
    else if (spread >= leaves) where = "Back cover";
    else {
        const right = 2 * (spread - 1) + 1;
        const left = right - 1;
        where =
            left < 1
                ? `Page 1 of ${images}`
                : `Pages ${left}–${Math.min(right, images)} of ${images}`;
    }

    return (
        <div
            className="fixed inset-x-0 bottom-5 z-[70] flex justify-center pointer-events-none"
            style={{ color: "var(--gem-ink)" }}
        >
            <div className="gem gem--gold flex items-center gap-3 px-3 py-2 pointer-events-auto">
                <button
                    className="gem-btn !px-3"
                    onClick={goLeft}
                    aria-label={mirrored ? "Next page" : "Previous page"}
                >
                    <span className="gem-glint" />‹
                </button>
                <div className="text-center min-w-[150px]">
                    <div className="gem-label">{title}</div>
                    <div className="gem-display text-base tabular-nums">
                        {where}
                    </div>
                </div>
                <button
                    className="gem-btn !px-3"
                    onClick={goRight}
                    aria-label={mirrored ? "Previous page" : "Next page"}
                >
                    <span className="gem-glint" />›
                </button>
                <div className="hidden md:block w-px self-stretch bg-white/15" />
                <div className="hidden md:flex flex-col text-[11px] leading-5 text-[color:var(--gem-ink-dim)]">
                    <span>
                        <span className="gem-kbd">←</span>{" "}
                        <span className="gem-kbd">→</span> turn · drag a corner
                    </span>
                    <span>double-click a page to enlarge</span>
                </div>
                <button
                    className="gem-btn"
                    onClick={() => controls?.exit()}
                >
                    <span className="gem-glint" />
                    {isMobile ? "Done" : (<>Step away <span className="gem-kbd">E</span></>)}
                </button>
            </div>
        </div>
    );
};
