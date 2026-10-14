import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./landing.css";
import { PROFILE, PROJECTS } from "../data/portfolio";
import { playSound, setSoundscape } from "../audio/soundManager";
import { SoundToggle } from "./SoundToggle";

// Warm the 3D world's code while someone is deciding, so clicking the
// first card doesn't wait on a multi-megabyte download.
export const prefetchWorld = () => import("../WorldApp");

interface Adventure {
    key: string;
    index: string;
    title: string;
    desc: string;
    time: string;
    accent: "green" | "blue" | "purple" | "silver";
    href: string;
    internal: boolean;
    preview: React.ReactNode;
}

const LAST_CHOICE_KEY = "landing-last-adventure";

const RupeeSvg = () => (
    <svg className="pv-world__rupee" viewBox="0 0 22 40" aria-hidden>
        <defs>
            <linearGradient id="rupee-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d9ffe9" />
                <stop offset="0.5" stopColor="#3ee58f" />
                <stop offset="1" stopColor="#0d7a43" />
            </linearGradient>
        </defs>
        <polygon points="11,0 22,10 22,30 11,40 0,30 0,10" fill="url(#rupee-g)" />
        <polygon points="11,6 17,12 17,28 11,34 5,28 5,12" fill="rgba(255,255,255,0.28)" />
    </svg>
);

const ADVENTURES: Adventure[] = [
    {
        key: "world",
        index: "01",
        title: "Walk through it",
        desc: "A 3D world: an art museum, a software lab, games, music rooms, rupees to collect and a few secrets.",
        time: "Explore · 10+ min",
        accent: "green",
        href: "/atrium",
        internal: true,
        preview: (
            <div className="pv-world" aria-hidden>
                <div className="pv-world__ceiling" />
                <div className="pv-world__floor" />
                <div className="pv-world__arch" />
                <RupeeSvg />
                <div className="pv-world__vignette" />
            </div>
        ),
    },
    {
        key: "os",
        index: "02",
        title: "Boot up my OS",
        desc: "Every little web thing I make, living as apps on a desktop. Swipeable on your phone.",
        time: "Click around · 5 min",
        accent: "blue",
        href: "https://nickeltools.dev/desktop",
        internal: false,
        preview: (
            <div className="pv-os" aria-hidden>
                <div className="pv-os__window pv-os__window--a">
                    <i />
                    <i />
                    <i />
                </div>
                <div className="pv-os__window pv-os__window--b">
                    <i />
                    <i />
                </div>
                <div className="pv-os__dock">
                    <b style={{ "--c1": "#ffd56b", "--c2": "#ff8a3d" } as React.CSSProperties} />
                    <b style={{ "--c1": "#7af0c2", "--c2": "#1fb57a" } as React.CSSProperties} />
                    <b style={{ "--c1": "#9db4ff", "--c2": "#4c62ff" } as React.CSSProperties} />
                    <b style={{ "--c1": "#ff9dd2", "--c2": "#e3488f" } as React.CSSProperties} />
                    <b style={{ "--c1": "#e5e7f2", "--c2": "#9aa1bd" } as React.CSSProperties} />
                </div>
                <div className="pv-os__cursor" />
            </div>
        ),
    },
    {
        key: "portfolio",
        index: "03",
        title: "The full tour",
        desc: "Every project with live previews, filters by stack, and the why behind each one.",
        time: "Read · 3 min",
        accent: "purple",
        href: "https://software.nicolebelovoskey.com",
        internal: false,
        preview: (
            <div className="pv-pf" aria-hidden>
                <div className="pv-pf__blob pv-pf__blob--a" />
                <div className="pv-pf__blob pv-pf__blob--b" />
                <div className="pv-pf__feed">
                    {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className="pv-pf__card" />
                    ))}
                </div>
            </div>
        ),
    },
    {
        key: "basic",
        index: "04",
        title: "Basic",
        desc: "Black and white. Experience, education and every project on one page. Loads instantly.",
        time: "Skim · 30 sec",
        accent: "silver",
        href: "/basic",
        internal: true,
        preview: (
            <div className="pv-basic" aria-hidden>
                <h4>
                    Nicole Belovoskey<span className="caret" />
                </h4>
                <p>Software engineer</p>
                <hr />
                <p>
                    <b>Experience.</b> Microsoft, DoorDash, early-stage startups.
                </p>
                <p>
                    <b>Education.</b> Texas A&amp;M, B.S. Computer Science.
                </p>
                <hr />
                <p>
                    <b>Projects.</b> {PROJECTS.length}, newest first.
                </p>
                <p>CHAOS · Wizard Wars · Plasma Sphere · The Circle · …</p>
            </div>
        ),
    },
];

export const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [lastChoice] = useState(() => {
        try {
            return localStorage.getItem(LAST_CHOICE_KEY);
        } catch {
            return null;
        }
    });
    const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const hovered = useRef<string | null>(null);

    useEffect(() => {
        document.title = `${PROFILE.name} · Choose your adventure`;
        setSoundscape("music-landing");
        // Most visitors pick the world; start fetching it once the page is idle.
        const idle = (window as any).requestIdleCallback as
            | ((cb: () => void) => number)
            | undefined;
        const handle = idle ? idle(() => prefetchWorld()) : window.setTimeout(prefetchWorld, 2500);
        return () => {
            if (!idle) clearTimeout(handle);
            setSoundscape(undefined, undefined);
        };
    }, []);

    const choose = (adventure: Adventure, event?: React.MouseEvent) => {
        try {
            localStorage.setItem(LAST_CHOICE_KEY, adventure.key);
        } catch {
            // ignore
        }
        playSound("ui-select");
        if (adventure.internal) {
            // Modified clicks (new tab etc.) fall through to the real link.
            if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) return;
            event?.preventDefault();
            navigate(adventure.href);
        }
    };

    // 1-4 jump straight in; arrow keys move between cards.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const number = Number(event.key);
            if (number >= 1 && number <= ADVENTURES.length) {
                cardRefs.current[number - 1]?.click();
                return;
            }
            const focused = cardRefs.current.findIndex((card) => card === document.activeElement);
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                cardRefs.current[(focused + 1) % ADVENTURES.length]?.focus();
                event.preventDefault();
            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                cardRefs.current[(focused - 1 + ADVENTURES.length) % ADVENTURES.length]?.focus();
                event.preventDefault();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const onHover = (adventure: Adventure) => {
        if (hovered.current === adventure.key) return;
        hovered.current = adventure.key;
        playSound("ui-hover");
        if (adventure.key === "world") prefetchWorld();
    };

    return (
        <main className="landing">
            <div className="landing__sky" />
            <div className="landing__aurora" />
            <div className="landing__grain" />

            <div className="landing__inner">
                <header className="landing__header landing-rise">
                    <div className="landing__eyebrow">Choose your adventure</div>
                    <h1 className="landing__name">
                        Nicole <em>Belovoskey</em>
                    </h1>
                    <div className="botw-rule" />
                    <p className="landing__tagline">
                        Software engineer and artist. Four ways in. Pick one.
                    </p>
                </header>

                <nav className="landing__grid" aria-label="Ways to explore">
                    {ADVENTURES.map((adventure, i) => (
                        <a
                            key={adventure.key}
                            ref={(el) => {
                                cardRefs.current[i] = el;
                            }}
                            href={adventure.href}
                            className={`adv gem gem--${adventure.accent} gem-hoverable landing-rise`}
                            style={{ animationDelay: `${180 + i * 110}ms` }}
                            onClick={(event) => choose(adventure, event)}
                            onMouseEnter={() => onHover(adventure)}
                            onFocus={() => onHover(adventure)}
                            onMouseLeave={() => (hovered.current = null)}
                            aria-keyshortcuts={String(i + 1)}
                        >
                            <span className="gem-glint" />
                            {lastChoice === adventure.key && (
                                <span className="adv__badge gem-chip gem--gold">Last time</span>
                            )}
                            <div className="adv__preview gem-shape">{adventure.preview}</div>
                            <div className="adv__body">
                                <span className="adv__index">{adventure.index}</span>
                                <h2 className="adv__title">{adventure.title}</h2>
                                <p className="adv__desc">{adventure.desc}</p>
                                <div className="adv__meta">
                                    <span>{adventure.time}</span>
                                    <span className="adv__go">
                                        {adventure.internal ? "Enter" : "Open"} <span aria-hidden>→</span>
                                    </span>
                                </div>
                            </div>
                        </a>
                    ))}
                </nav>

                <footer className="landing__footer landing-rise" style={{ animationDelay: "700ms" }}>
                    <div className="landing__links">
                        <a href={PROFILE.links.github}>GitHub</a>
                        <a href={PROFILE.links.linkedin}>LinkedIn</a>
                        <a href={`mailto:${PROFILE.links.email}`}>{PROFILE.links.email}</a>
                    </div>
                    <div className="landing__hint">
                        <span className="gem-kbd">1</span>–<span className="gem-kbd">4</span> to jump in
                    </div>
                    <SoundToggle />
                </footer>
            </div>
        </main>
    );
};

export default Landing;
