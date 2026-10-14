// The one in-world "press a key" prompt. Breath of the Wild style: a round
// glowing button glyph and the action as bright text straight on the scene
// (on a soft shadow pool for legibility), no box. Every interactable -
// doors, art, the sketchbook, jam room and shop, the Courage computer, the
// light switch, the software lab - uses this so they all read the same.
export const GemPrompt: React.FC<{
    action: React.ReactNode;
    keyLabel?: string | null; // null hides the glyph (e.g. touch, locked)
    accent?: "green" | "blue" | "red" | "purple" | "gold" | "silver";
    center?: boolean; // translate(-50%) for anchors at the prompt's middle
}> = ({ action, keyLabel = "E", accent = "green", center = false }) => (
    <div
        className={`botw-prompt ${
            accent === "gold" ? "botw-prompt--gold" : accent === "red" ? "botw-prompt--red" : ""
        }`}
        style={{
            pointerEvents: "none",
            userSelect: "none",
            transform: center ? "translate(-50%, 0)" : undefined,
        }}
    >
        {keyLabel && <span className="gem-kbd">{keyLabel}</span>}
        {action}
    </div>
);
