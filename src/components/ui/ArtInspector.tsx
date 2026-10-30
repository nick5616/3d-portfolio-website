import { requestWorldPointerLock } from "../../utils/mainCanvas";
import { useCallback, useEffect, useRef, useState } from "react";
import { useArtInspectStore } from "../../stores/artInspectStore";
import { useSceneStore } from "../../stores/sceneStore";
import { useAchievementStore } from "../../stores/achievementStore";
import { ArtPiece, getAllArtPieces } from "../../configs/artMetadata";
import { ArtCategoryId } from "../../configs/gcsConfig";
import {
    ART_INSPECT_WIDTH,
    ART_WALL_WIDTH,
    hasImageSizes,
    resizedImageUrl,
} from "../../utils/artImages";
import { playSound } from "../../audio/soundManager";

const CATEGORY_NAMES: Record<ArtCategoryId, string> = {
    digitalart: "Digital Art",
    paintings: "Paintings",
    sketches: "Sketches",
    lefthanded: "Left-Handed",
    miscellaneous: "Miscellaneous",
    notesappart: "Notes App Art",
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

interface View {
    zoom: number;
    x: number;
    y: number;
}
const RESET: View = { zoom: 1, x: 0, y: 0 };

// Full-screen look at a single piece: the wall shows a 2048px version, this
// loads a sharper one (or the original in dev) to zoom into brushwork.
// Arrow keys move through the rest of the room's collection.
export const ArtInspector: React.FC = () => {
    const inspecting = useArtInspectStore((s) => s.inspecting);
    const { closeInspect, setInspectIndex } = useArtInspectStore.getState();
    const [pieces, setPieces] = useState<ArtPiece[]>([]);
    const [view, setView] = useState<View>(RESET);
    const [sharpLoaded, setSharpLoaded] = useState(false);
    const [infoOpen, setInfoOpen] = useState(true);
    const stageRef = useRef<HTMLDivElement>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
    const closedWithKey = useRef(false);

    const category = inspecting?.category;
    const index = inspecting?.index ?? 0;
    const piece = pieces[index];

    useEffect(() => {
        if (!category) return;
        getAllArtPieces(category).then(setPieces).catch(() => setPieces([]));
    }, [category]);

    // Take the keyboard + cursor away from the game while open.
    useEffect(() => {
        if (!inspecting) return;
        const scene = useSceneStore.getState();
        // Restore whatever was true before (the sketchbook reader keeps
        // isInteracting on while you inspect one of its pages).
        const wasInteracting = scene.isInteracting;
        scene.setIsInteracting(true);
        document.body.classList.add("hud-hidden");
        if (document.pointerLockElement) document.exitPointerLock();
        useAchievementStore.getState().unlock("art-inspector");
        playSound("ui-inspect-open");
        closedWithKey.current = false;
        return () => {
            useSceneStore.getState().setIsInteracting(wasInteracting);
            if (!wasInteracting) document.body.classList.remove("hud-hidden");
            playSound("ui-inspect-close");
            // A key press counts as a user gesture, so we can hand the
            // mouse straight back to the game. (Escape doesn't count.)
            if (closedWithKey.current && !wasInteracting) {
                requestWorldPointerLock();
            }
        };
    }, [Boolean(inspecting)]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setView(RESET);
        setSharpLoaded(false);
    }, [category, index]);

    const go = useCallback(
        (delta: number) => {
            if (pieces.length === 0) return;
            setInspectIndex((index + delta + pieces.length) % pieces.length);
            playSound("ui-page");
        },
        [index, pieces.length, setInspectIndex]
    );

    const zoomAt = useCallback(
        (factor: number, clientX?: number, clientY?: number) => {
            setView((current) => {
                const zoom = Math.min(
                    MAX_ZOOM,
                    Math.max(MIN_ZOOM, current.zoom * factor)
                );
                if (zoom === MIN_ZOOM) return RESET;
                const rect = stageRef.current?.getBoundingClientRect();
                if (!rect || clientX === undefined || clientY === undefined) {
                    return { ...current, zoom };
                }
                // Keep the point under the cursor fixed while zooming.
                const px = clientX - rect.left - rect.width / 2;
                const py = clientY - rect.top - rect.height / 2;
                const ratio = zoom / current.zoom;
                return {
                    zoom,
                    x: px - (px - current.x) * ratio,
                    y: py - (py - current.y) * ratio,
                };
            });
        },
        []
    );

    useEffect(() => {
        if (!inspecting) return;
        const onKey = (event: KeyboardEvent) => {
            switch (event.code) {
                case "Escape":
                    closeInspect();
                    break;
                case "KeyE":
                case "KeyQ":
                    if (event.repeat) return;
                    closedWithKey.current = true;
                    closeInspect();
                    break;
                case "ArrowRight":
                case "KeyD":
                    go(1);
                    break;
                case "ArrowLeft":
                case "KeyA":
                    go(-1);
                    break;
                case "Equal":
                case "NumpadAdd":
                    zoomAt(1.4);
                    break;
                case "Minus":
                case "NumpadSubtract":
                    zoomAt(1 / 1.4);
                    break;
                case "Digit0":
                    setView(RESET);
                    break;
                case "KeyI":
                    setInfoOpen((open) => !open);
                    break;
                default:
                    return;
            }
            event.preventDefault();
            event.stopPropagation();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [inspecting, closeInspect, go, zoomAt]);

    // Preload neighbors so arrowing through the room feels instant.
    useEffect(() => {
        if (pieces.length < 2) return;
        [index + 1, index - 1].forEach((i) => {
            const neighbor = pieces[(i + pieces.length) % pieces.length];
            const image = new Image();
            image.decoding = "async";
            image.src = resizedImageUrl(neighbor.url, ART_WALL_WIDTH, 82);
        });
    }, [index, pieces]);

    if (!inspecting) return null;

    const wallSrc = piece ? resizedImageUrl(piece.url, ART_WALL_WIDTH, 82) : "";
    const sharpSrc = piece
        ? hasImageSizes
            ? resizedImageUrl(piece.url, ART_INSPECT_WIDTH, 90)
            : piece.url
        : "";

    const onPointerDown = (event: React.PointerEvent) => {
        (event.target as Element).setPointerCapture?.(event.pointerId);
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinchStart.current = {
                distance: Math.hypot(a.x - b.x, a.y - b.y),
                zoom: view.zoom,
            };
        }
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const previous = pointers.current.get(event.pointerId);
        if (!previous) return;
        const next = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, next);
        if (pointers.current.size === 2 && pinchStart.current) {
            const [a, b] = [...pointers.current.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            const zoom = Math.min(
                MAX_ZOOM,
                Math.max(
                    MIN_ZOOM,
                    (pinchStart.current.zoom * distance) /
                        pinchStart.current.distance
                )
            );
            setView((current) =>
                zoom === MIN_ZOOM ? RESET : { ...current, zoom }
            );
        } else if (view.zoom > 1) {
            setView((current) => ({
                ...current,
                x: current.x + next.x - previous.x,
                y: current.y + next.y - previous.y,
            }));
        }
    };
    const onPointerUp = (event: React.PointerEvent) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinchStart.current = null;
    };

    const title = piece?.titled ? piece.name : "Untitled";
    const categoryName = category ? CATEGORY_NAMES[category] : "";

    return (
        <div
            className="fixed inset-0 z-[80] pointer-events-auto select-none"
            style={{
                background:
                    "radial-gradient(120% 90% at 50% 40%, rgba(22,20,30,0.82), rgba(4,4,8,0.95))",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                fontFamily: "var(--gem-font)",
                color: "#f6f3ff",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Inspecting ${title}`}
        >
            <div
                ref={stageRef}
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{
                    cursor: view.zoom > 1 ? "grab" : "zoom-in",
                    touchAction: "none",
                }}
                onWheel={(event) =>
                    zoomAt(
                        event.deltaY < 0 ? 1.15 : 1 / 1.15,
                        event.clientX,
                        event.clientY
                    )
                }
                onDoubleClick={(event) =>
                    view.zoom > 1
                        ? setView(RESET)
                        : zoomAt(2.5, event.clientX, event.clientY)
                }
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                {piece && (
                    <div
                        style={{
                            position: "relative",
                            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                            transition: pointers.current.size
                                ? "none"
                                : "transform 120ms ease-out",
                            willChange: "transform",
                        }}
                    >
                        {/* Wall-size version is already in the HTTP cache,
                            so it appears instantly; the sharp one fades in
                            over it once decoded. */}
                        <img
                            key={wallSrc}
                            src={wallSrc}
                            alt={title}
                            decoding="async"
                            draggable={false}
                            style={{
                                display: "block",
                                maxWidth: "88vw",
                                maxHeight: "82vh",
                                objectFit: "contain",
                                boxShadow:
                                    "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
                            }}
                        />
                        <img
                            key={sharpSrc}
                            src={sharpSrc}
                            alt=""
                            aria-hidden
                            decoding="async"
                            draggable={false}
                            onLoad={() => setSharpLoaded(true)}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                opacity: sharpLoaded ? 1 : 0,
                                transition: "opacity 300ms ease",
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Top bar */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 pointer-events-none">
                <div className="gem gem--sm px-4 py-2 pointer-events-auto">
                    <div className="gem-label">{categoryName}</div>
                    <div className="text-sm font-semibold tabular-nums">
                        {pieces.length ? `${index + 1} / ${pieces.length}` : "…"}
                    </div>
                </div>
                <button
                    className="gem-btn pointer-events-auto"
                    onClick={() => closeInspect()}
                    aria-label="Close"
                >
                    <span className="gem-glint" />
                    Close <span className="gem-kbd">E</span>
                </button>
            </div>

            {/* Prev / next */}
            {pieces.length > 1 && (
                <>
                    <button
                        className="gem-btn absolute left-4 top-1/2 -translate-y-1/2 !p-3"
                        onClick={() => go(-1)}
                        aria-label="Previous piece"
                    >
                        <span className="gem-glint" />‹
                    </button>
                    <button
                        className="gem-btn absolute right-4 top-1/2 -translate-y-1/2 !p-3"
                        onClick={() => go(1)}
                        aria-label="Next piece"
                    >
                        <span className="gem-glint" />›
                    </button>
                </>
            )}

            {/* Info card */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(640px,calc(100vw-32px))] flex flex-col items-center gap-2 pointer-events-none">
                {infoOpen && piece && (
                    <div className="gem gem--gold px-5 py-3 w-full pointer-events-auto">
                        <div className="flex items-baseline justify-between gap-4">
                            <h2 className="gem-display text-xl md:text-2xl leading-tight">
                                {title}
                            </h2>
                            {piece.date && (
                                <span className="text-xs text-[color:var(--gem-ink-dim)] whitespace-nowrap">
                                    {piece.date}
                                </span>
                            )}
                        </div>
                        {piece.description && (
                            <p className="mt-1 text-sm leading-relaxed text-[color:var(--gem-ink-dim)]">
                                {piece.description}
                            </p>
                        )}
                    </div>
                )}
                <div className="hidden md:flex gap-3 text-[11px] text-[color:var(--gem-ink-faint)]">
                    <span>
                        <span className="gem-kbd">←</span>{" "}
                        <span className="gem-kbd">→</span> browse
                    </span>
                    <span>scroll / double-click to zoom</span>
                    <span>drag to pan</span>
                    <span>
                        <span className="gem-kbd">I</span> info
                    </span>
                </div>
            </div>
        </div>
    );
};
