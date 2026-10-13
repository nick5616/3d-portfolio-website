import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "./projectStore";
import { CATEGORY_COLORS, LAB_PROJECTS, embedUrl, familyOf } from "./projectDna";
import { formatDate, hostOf } from "../../data/portfolio";
import { useSceneStore } from "../../stores/sceneStore";
import { useAchievementStore } from "../../stores/achievementStore";
import { playSound } from "../../audio/soundManager";
import { requestWorldPointerLock } from "../../utils/mainCanvas";

// Opened from the software lab: the project's live site (one iframe, only
// while open), what it is, why it exists, its stack and links.
// Arrows move through projects in ring order; E / Esc close.
export const ProjectViewer: React.FC = () => {
    const openId = useProjectStore((s) => s.openId);
    const project = useMemo(
        () => LAB_PROJECTS.find((p) => p.id === openId) ?? null,
        [openId]
    );
    const [frameLoaded, setFrameLoaded] = useState(false);
    const closedWithKey = useRef(false);

    useEffect(() => setFrameLoaded(false), [openId]);

    useEffect(() => {
        if (!openId) return;
        const scene = useSceneStore.getState();
        scene.setIsInteracting(true);
        document.body.classList.add("hud-hidden");
        if (document.pointerLockElement) document.exitPointerLock();
        playSound("project-open");
        useAchievementStore.getState().unlock("project-opened");
        closedWithKey.current = false;
        return () => {
            useSceneStore.getState().setIsInteracting(false);
            document.body.classList.remove("hud-hidden");
            playSound("ui-back");
            if (closedWithKey.current) requestWorldPointerLock();
        };
    }, [Boolean(openId)]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!openId) return;
        const move = (delta: number) => {
            const index = LAB_PROJECTS.findIndex((p) => p.id === openId);
            const next = LAB_PROJECTS[(index + delta + LAB_PROJECTS.length) % LAB_PROJECTS.length];
            useProjectStore.getState().open(next.id);
            playSound("ui-page");
        };
        const onKey = (event: KeyboardEvent) => {
            switch (event.code) {
                case "Escape":
                    useProjectStore.getState().close();
                    break;
                case "KeyE":
                    if (event.repeat) return;
                    closedWithKey.current = true;
                    useProjectStore.getState().close();
                    break;
                case "ArrowRight":
                    move(1);
                    break;
                case "ArrowLeft":
                    move(-1);
                    break;
                default:
                    return;
            }
            event.preventDefault();
            event.stopPropagation();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [openId]);

    if (!project) return null;

    const embed = embedUrl(project);
    const mobileScreens =
        project.preview && typeof project.preview === "object"
            ? project.preview.mobileScreens
            : null;
    const accent = CATEGORY_COLORS[project.category] ?? "#dce6f2";

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-8"
            style={{
                background: "radial-gradient(120% 90% at 50% 40%, rgba(8,10,24,0.55), rgba(2,3,8,0.85))",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "var(--gem-ink)",
            }}
            onClick={() => useProjectStore.getState().close()}
            role="dialog"
            aria-modal="true"
            aria-label={project.title}
        >
            <div
                className="gem gem--lg gem--blue w-full max-w-[1180px] h-full max-h-[760px] p-4 md:p-6 grid gap-5 md:grid-cols-[1fr_340px]"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Preview */}
                <div className="gem-shape relative min-h-[240px] bg-black/40">
                    {mobileScreens ? (
                        <div className="absolute inset-0 flex items-center justify-center gap-4 p-4">
                            {mobileScreens.map((src) => (
                                <iframe
                                    key={src}
                                    src={src}
                                    title={project.title}
                                    className="h-full max-h-[640px] aspect-[9/19.5] rounded-[28px] bg-white"
                                    style={{ boxShadow: "0 0 0 6px rgba(255,255,255,0.12), 0 20px 40px rgba(0,0,0,0.5)" }}
                                    onLoad={() => setFrameLoaded(true)}
                                />
                            ))}
                        </div>
                    ) : embed ? (
                        <>
                            {project.thumbnail && !frameLoaded && (
                                <img
                                    src={project.thumbnail}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                                />
                            )}
                            <iframe
                                key={embed}
                                src={embed}
                                title={project.title}
                                className="absolute inset-0 w-full h-full bg-white"
                                style={{ opacity: frameLoaded ? 1 : 0, transition: "opacity 300ms ease" }}
                                onLoad={() => setFrameLoaded(true)}
                                allow="autoplay; fullscreen; microphone; camera; midi"
                            />
                            {!frameLoaded && (
                                <div className="absolute inset-0 grid place-items-center">
                                    <div className="gem gem--sm px-4 py-2 text-sm">Loading {hostOf(embed)}…</div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 grid place-items-center p-6 text-center">
                            {project.thumbnail ? (
                                <img src={project.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <div>
                                    <div className="gem-display text-3xl">{project.title}</div>
                                    <p className="mt-2 text-sm text-[color:var(--gem-ink-dim)]">
                                        This one lives outside the browser frame. Open it below.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex flex-col min-h-0 overflow-y-auto pr-2 pt-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="gem-label" style={{ color: accent }}>
                            {project.category}
                            {project.date ? ` · ${formatDate(project.date)}` : ""}
                        </div>
                        <button
                            className="gem-btn !py-1 !px-3 !text-xs shrink-0"
                            onClick={() => useProjectStore.getState().close()}
                        >
                            <span className="gem-glint" />
                            Close <span className="gem-kbd">E</span>
                        </button>
                    </div>
                    <h2 className="gem-display text-3xl leading-tight mt-1">{project.title}</h2>
                    <p className="mt-3 text-[15px] leading-relaxed">{project.description}</p>
                    {project.why && (
                        <>
                            <div className="gem-label mt-5 mb-1">Why I made it</div>
                            <p className="text-sm leading-relaxed text-[color:var(--gem-ink-dim)]">{project.why}</p>
                        </>
                    )}
                    {project.tech.length > 0 && (
                        <>
                            <div className="gem-label mt-5 mb-2">Stack</div>
                            <div className="flex flex-wrap gap-1.5">
                                {project.tech.map((tech) => (
                                    <span
                                        key={tech}
                                        className="gem-chip"
                                        style={{ "--gem-accent": familyOf(tech).color } as React.CSSProperties}
                                    >
                                        <span
                                            className="inline-block w-2 h-2 rotate-45"
                                            style={{ background: familyOf(tech).color }}
                                        />
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                    <div className="mt-auto pt-5 flex flex-wrap gap-2">
                        {project.url && (
                            <a className="gem-btn gem-btn--solid gem--green" href={project.url} target="_blank" rel="noreferrer">
                                <span className="gem-glint" />
                                Open {hostOf(project.url)} ↗
                            </a>
                        )}
                        {project.source && project.source !== project.url && (
                            <a className="gem-btn" href={project.source} target="_blank" rel="noreferrer">
                                <span className="gem-glint" />
                                Source ↗
                            </a>
                        )}
                    </div>
                    <div className="mt-3 text-[11px] text-[color:var(--gem-ink-faint)]">
                        <span className="gem-kbd">←</span> <span className="gem-kbd">→</span> next project
                    </div>
                </div>
            </div>
        </div>
    );
};
