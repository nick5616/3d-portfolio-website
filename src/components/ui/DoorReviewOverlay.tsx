import React, { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { roomConfigs } from "../../configs/rooms";
import { useSceneStore } from "../../stores/sceneStore";
import { playSound } from "../../audio/soundManager";
import { AimedDoor, STANDING_STYLE, standingOf, useDoorReview } from "../../debug/doorReview";

// The door review HUD (localhost only; see debug/doorReview.ts): a card for
// the door you're aiming at, a note box for "needs work", and a running
// tally in the corner.

const QUICK_NOTES = [
    "Too plain",
    "Doesn't fit the room",
    "View is ugly",
    "Frame is ugly",
    "Clipping / placement",
    "Too bright",
    "Too dark",
    "Label hard to read",
];

const ALL_DOORS = Object.values(roomConfigs).flatMap((room) => room.archways.map((a) => `${room.id}/${a.id}`));

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="gem-kbd">{children}</span>;

// Keeps the world's own key and click handlers out of the note box.
const swallow = (event: React.SyntheticEvent) => event.stopPropagation();

const NoteBox: React.FC<{ door: AimedDoor }> = ({ door }) => {
    const existing = useDoorReview((s) => s.doors[door.key]);
    const [note, setNote] = useState(existing?.status === "needs-work" ? existing.note ?? "" : "");
    const field = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        field.current?.focus();
    }, []);
    const close = () => {
        useDoorReview.getState().closeNote();
        useSceneStore.getState().setIsInteracting(false);
    };
    const submit = () => {
        useDoorReview.getState().review(door, "needs-work", note.trim() || undefined);
        playSound("door-locked");
        close();
    };
    const toggle = (tag: string) =>
        setNote((current) => {
            const parts = current.split(/;\s*/).filter(Boolean);
            return (parts.includes(tag) ? parts.filter((p) => p !== tag) : [...parts, tag]).join("; ");
        });
    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-auto bg-black/30"
            onKeyDown={swallow}
            onKeyUp={swallow}
            onClick={swallow}
            onMouseDown={swallow}
        >
            <div className="gem gem--red gem--lg w-[min(92vw,30rem)] p-5 flex flex-col gap-3">
                <div className="gem-label">Needs work</div>
                <div className="gem-display text-xl font-semibold">
                    {door.room} <span className="opacity-60">to</span> {door.target}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {QUICK_NOTES.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            className={`gem-btn ${note.includes(tag) ? "gem-btn--solid" : ""}`}
                            style={{ fontSize: "0.75rem", padding: "0.35em 0.8em" }}
                            onClick={() => toggle(tag)}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
                <textarea
                    ref={field}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submit();
                        } else if (e.key === "Escape") {
                            e.preventDefault();
                            close();
                        }
                    }}
                    rows={4}
                    placeholder="What should change? (optional)"
                    className="w-full rounded-2xl bg-black/35 p-3 text-sm text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/40 resize-none"
                />
                <div className="flex items-center justify-between text-xs text-white/70">
                    <span>
                        <Kbd>Enter</Kbd> save &nbsp; <Kbd>Shift+Enter</Kbd> new line &nbsp; <Kbd>Esc</Kbd> cancel
                    </span>
                    <div className="flex gap-2">
                        <button type="button" className="gem-btn" onClick={close}>
                            Cancel
                        </button>
                        <button type="button" className="gem-btn gem-btn--solid gem--red" onClick={submit}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DoorReviewOverlay: React.FC = () => {
    const { hidden, aimed, noting, doors, saveError } = useDoorReview(
        useShallow((s) => ({ hidden: s.hidden, aimed: s.aimed, noting: s.noting, doors: s.doors, saveError: s.saveError }))
    );
    const [flash, setFlash] = useState<string | null>(null);

    useEffect(() => {
        useDoorReview.getState().load();
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.repeat) return;
            const review = useDoorReview.getState();
            if (event.code === "F8") {
                event.preventDefault();
                review.setHidden(!review.hidden);
                return;
            }
            if (review.hidden || review.noting || useSceneStore.getState().isInteracting) return;
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
            const door = review.aimed;
            if (!door || !["KeyQ", "KeyX", "KeyZ"].includes(event.code)) return;
            // (or the X would be typed into the note box as it opens)
            event.preventDefault();
            if (event.code === "KeyQ") {
                review.review(door, "approved");
                playSound("door-unlock");
                setFlash("Approved");
            } else if (event.code === "KeyX") {
                document.exitPointerLock?.();
                useSceneStore.getState().setIsInteracting(true);
                review.openNote(door);
            } else if (event.code === "KeyZ") {
                review.review(door, null);
                setFlash("Cleared");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        if (!flash) return;
        const timer = setTimeout(() => setFlash(null), 1200);
        return () => clearTimeout(timer);
    }, [flash]);

    const tally = useMemo(() => {
        const counts = { approved: 0, needsWork: 0, reworked: 0 };
        ALL_DOORS.forEach((key) => {
            const entry = doors[key];
            if (!entry) return;
            if (entry.status === "approved") counts.approved++;
            else if (entry.revised) counts.reworked++;
            else counts.needsWork++;
        });
        return counts;
    }, [doors]);

    if (noting) return <NoteBox door={noting} />;
    if (hidden) return null;

    const entry = aimed ? doors[aimed.key] : undefined;
    const standing = aimed ? standingOf(entry, aimed.look) : null;
    const style = standing ? STANDING_STYLE[standing] : null;

    return (
        <>
            {aimed && style && (
                <div className="fixed left-1/2 top-[58%] -translate-x-1/2 z-50 pointer-events-none">
                    <div className={`gem gem--${style.gem} gem--sm px-4 py-3 w-[min(92vw,26rem)] flex flex-col gap-1.5`}>
                        <div className="flex items-center justify-between gap-3">
                            <span className="gem-label">Door review</span>
                            <span className="gem-chip" style={{ color: style.color }}>
                                {flash ?? style.label}
                            </span>
                        </div>
                        <div className="gem-display text-base font-semibold">
                            {aimed.room} <span className="opacity-60">to</span> {aimed.target}
                        </div>
                        {entry?.note && <div className="text-xs text-white/85">Your note: {entry.note}</div>}
                        {entry?.reply && <div className="text-xs" style={{ color: "#a9d4ff" }}>Reworked: {entry.reply}</div>}
                        <div className="text-xs text-white/75 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                            <span>
                                <Kbd>Q</Kbd> approve
                            </span>
                            <span>
                                <Kbd>X</Kbd> needs work
                            </span>
                            <span>
                                <Kbd>Z</Kbd> clear
                            </span>
                            <span>
                                <Kbd>F8</Kbd> hide
                            </span>
                        </div>
                    </div>
                </div>
            )}
            <div className="fixed left-3 bottom-3 z-40 pointer-events-none">
                <div className="gem gem--sm gem--silver px-3 py-1.5 text-[12px] font-semibold flex items-center gap-2">
                    <span className="gem-label">Doors</span>
                    <span style={{ color: STANDING_STYLE.approved.color }}>{tally.approved} approved</span>
                    <span style={{ color: STANDING_STYLE["needs-work"].color }}>{tally.needsWork} need work</span>
                    {tally.reworked > 0 && <span style={{ color: STANDING_STYLE.revised.color }}>{tally.reworked} reworked</span>}
                    <span className="opacity-70">of {ALL_DOORS.length}</span>
                    {saveError && <span style={{ color: STANDING_STYLE.changed.color }}>(saving in this browser only)</span>}
                </div>
            </div>
        </>
    );
};
