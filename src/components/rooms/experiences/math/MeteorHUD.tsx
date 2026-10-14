import { useEffect, useState } from "react";
import { useMeteorGame } from "./meteorStore";
import "./meteorHud.css";

// The HUD, in the spirit of a 2008 Flash game: glossy candy buttons, chunky
// outlined type, a big answer pod at the bottom, bouncy banners.
export const MeteorHUD: React.FC = () => {
    const phase = useMeteorGame((s) => s.phase);
    const seated = useMeteorGame((s) => s.seated);
    const score = useMeteorGame((s) => s.score);
    const level = useMeteorGame((s) => s.level);
    const shields = useMeteorGame((s) => s.shields);
    const input = useMeteorGame((s) => s.input);
    const best = useMeteorGame((s) => s.best);
    const banner = useMeteorGame((s) => s.banner);
    const feedback = useMeteorGame((s) => s.feedback);

    // Banners/feedback fade on their own
    const [shownBanner, setShownBanner] = useState(banner);
    useEffect(() => {
        setShownBanner(banner);
        if (!banner) return;
        const t = setTimeout(() => setShownBanner(null), 1600);
        return () => clearTimeout(t);
    }, [banner]);
    const [shownFeedback, setShownFeedback] = useState(feedback);
    useEffect(() => {
        setShownFeedback(feedback);
        if (!feedback) return;
        const t = setTimeout(() => setShownFeedback(null), 900);
        return () => clearTimeout(t);
    }, [feedback]);

    useEffect(() => {
        if (!seated) return;
        document.body.classList.add("hud-hidden");
        return () => document.body.classList.remove("hud-hidden");
    }, [seated]);

    if (phase === "off" || !seated) return null;

    return (
        <div className="mm-hud">
            {(phase === "title" || phase === "gameover") && (
                <div className="mm-center">
                    <div className="mm-logo">
                        <span className="mm-logo-top">METEOR</span>
                        <span className="mm-logo-bottom">MULTIPLICATION</span>
                    </div>
                    {phase === "gameover" && (
                        <div className="mm-panel mm-gameover">
                            <div className="mm-big">GAME OVER</div>
                            <div>
                                Score <b>{score.toLocaleString()}</b> · Level <b>{level}</b>
                            </div>
                            <div className="mm-best">
                                {score >= best && score > 0 ? "★ NEW BEST! ★" : `Best: ${best.toLocaleString()}`}
                            </div>
                        </div>
                    )}
                    {phase === "title" && (
                        <div className="mm-panel">
                            Meteors are falling on the city!
                            <br />
                            Type the answer and press <span className="mm-key">ENTER</span> to fire.
                            {best > 0 && <div className="mm-best">Best: {best.toLocaleString()}</div>}
                        </div>
                    )}
                    <div className="mm-button mm-pulse">
                        {phase === "title" ? "PRESS ENTER TO PLAY" : "PRESS ENTER TO PLAY AGAIN"}
                    </div>
                    <div className="mm-hint">Esc to leave the cannon</div>
                </div>
            )}

            {phase === "playing" && (
                <>
                    <div className="mm-score mm-panel">
                        <div className="mm-label">SCORE</div>
                        <div className="mm-number">{score.toLocaleString()}</div>
                    </div>
                    <div className="mm-status mm-panel">
                        <div className="mm-label">LEVEL {level}</div>
                        <div className="mm-shields">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className={`mm-shield ${i < shields ? "on" : ""}`} />
                            ))}
                        </div>
                    </div>
                    <div className="mm-pod">
                        <div className="mm-pod-screen">
                            {input || <span className="mm-placeholder">?</span>}
                            <span className="mm-caret" />
                        </div>
                        <div className="mm-pod-label">TYPE THE ANSWER · ENTER = FIRE!</div>
                    </div>
                </>
            )}

            {shownBanner && (
                <div key={shownBanner.key} className="mm-banner">
                    {shownBanner.text}
                </div>
            )}
            {shownFeedback && (
                <div key={shownFeedback.key} className={`mm-feedback mm-${shownFeedback.kind}`}>
                    {shownFeedback.text}
                </div>
            )}
        </div>
    );
};
