import { useShallow } from "zustand/react/shallow";
import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useSceneStore } from "../../stores/sceneStore";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import {
    getSoundSettings,
    subscribeSoundSettings,
    updateSoundSettings,
} from "../../audio/soundManager";

const Toggle: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({
    label,
    on,
    onClick,
}) => (
    <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between py-1.5 text-[13px]"
        aria-pressed={on}
    >
        <span>{label}</span>
        <span
            className={`gem-chip ${on ? "gem--green" : "gem--silver"} !px-0 w-9 h-5 justify-start`}
            style={{ opacity: on ? 1 : 0.55 }}
        >
            <span
                className="block w-3 h-3 rotate-45 bg-white transition-transform duration-200"
                style={{ transform: `translateX(${on ? 18 : 4}px) rotate(45deg)` }}
            />
        </span>
    </button>
);

const Slider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
    <label className="flex items-center justify-between gap-3 py-1 text-[13px]">
        <span className="w-14 shrink-0">{label}</span>
        <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="gem-range flex-1"
        />
    </label>
);

// The settings themselves: quality, sound, overlays, flight. Used inside the
// pause card on desktop, and behind the gear button on mobile (touch has no
// pause screen).
export const SettingsPanel: React.FC = () => {
    const {
        performance,
        minimap,
        flyMode,
        setPerformanceQuality,
        toggleStats,
        togglePerformanceMonitoring,
        toggleMinimap,
        toggleFlyMode,
    } = useSceneStore(
        useShallow((s) => ({
            performance: s.performance,
            minimap: s.minimap,
            flyMode: s.flyMode,
            setPerformanceQuality: s.setPerformanceQuality,
            toggleStats: s.toggleStats,
            togglePerformanceMonitoring: s.togglePerformanceMonitoring,
            toggleMinimap: s.toggleMinimap,
            toggleFlyMode: s.toggleFlyMode,
        }))
    );
    const sound = useSyncExternalStore(subscribeSoundSettings, getSoundSettings);
    return (
        <div className="text-left">
                    <div className="gem-label mb-2">Quality</div>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
                {(["low", "medium", "high"] as const).map((quality) => (
                    <button
                        key={quality}
                        onClick={() => setPerformanceQuality(quality)}
                        className={`gem-btn !text-xs !py-1.5 !px-2 ${
                            performance.quality === quality
                                ? "gem-btn--solid gem--green"
                                : ""
                        }`}
                    >
                        {quality[0].toUpperCase() + quality.slice(1)}
                    </button>
                ))}
            </div>

            <div className="gem-label mb-1">Sound</div>
            <Toggle
                label="Sound"
                on={!sound.muted}
                onClick={() => updateSoundSettings({ muted: !sound.muted })}
            />
            {!sound.muted && (
                <>
                    <Slider
                        label="Music"
                        value={sound.volumes.music}
                        onChange={(music) =>
                            updateSoundSettings({ volumes: { ...sound.volumes, music } })
                        }
                    />
                    <Slider
                        label="Effects"
                        value={sound.volumes.sfx}
                        onChange={(sfx) =>
                            updateSoundSettings({ volumes: { ...sound.volumes, sfx } })
                        }
                    />
                </>
            )}

            <div className="gem-label mt-4 mb-1">Display</div>
            <Toggle label="Minimap" on={minimap.visible} onClick={toggleMinimap} />
            <Toggle label="FPS meter" on={performance.monitoring} onClick={togglePerformanceMonitoring} />
            <Toggle label="Debug info" on={performance.showStats} onClick={toggleStats} />
            <Toggle label="Flight" on={flyMode} onClick={toggleFlyMode} />

            <p className="mt-3 text-[11px] text-[color:var(--gem-ink-faint)]">
                Lower quality renders fewer pixels. Resolution also
                adjusts itself if frames drop.
            </p>
        </div>
    );
};

// Mobile only: a gear button that opens the settings panel.
export const PerformanceControls: React.FC = () => {
    const setIsInteracting = useSceneStore((s) => s.setIsInteracting);
    const { isMobile } = useDeviceDetection();

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !buttonRef.current?.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        setIsInteracting(isOpen);
    }, [isOpen, setIsInteracting]);

    return (
        <div
            className={`absolute z-50 pointer-events-auto ${
                isMobile ? "bottom-2 right-2" : "bottom-4 left-4"
            }`}
        >
            <button
                ref={buttonRef}
                onClick={(event) => {
                    event.stopPropagation();
                    if (document.pointerLockElement) document.exitPointerLock();
                    setIsOpen((open) => !open);
                }}
                className="gem-btn !p-0 w-11 h-11"
                aria-label="Settings"
                aria-expanded={isOpen}
            >
                <span className="gem-glint" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    onClick={(event) => event.stopPropagation()}
                    className={`gem gem--purple absolute bottom-14 ${
                        isMobile ? "right-0" : "left-0"
                    } w-64 p-4`}
                >
                    <SettingsPanel />
                </div>
            )}
        </div>
    );
};
