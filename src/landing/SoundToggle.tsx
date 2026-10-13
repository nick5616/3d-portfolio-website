import { useSyncExternalStore } from "react";
import {
    getSoundSettings,
    subscribeSoundSettings,
    updateSoundSettings,
} from "../audio/soundManager";

// A small gem chip that mutes/unmutes the whole site.
export const SoundToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
    const muted = useSyncExternalStore(
        subscribeSoundSettings,
        () => getSoundSettings().muted
    );
    return (
        <button
            type="button"
            className={`gem-chip gem--purple ${className}`}
            style={{ cursor: "pointer", border: 0, pointerEvents: "auto" }}
            onClick={() => updateSoundSettings({ muted: !muted })}
            aria-pressed={!muted}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
        >
            <span aria-hidden>{muted ? "♪̸" : "♪"}</span>
            {muted ? "Sound off" : "Sound on"}
        </button>
    );
};
