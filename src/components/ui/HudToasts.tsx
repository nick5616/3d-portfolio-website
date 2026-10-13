import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, useAchievementStore } from "../../stores/achievementStore";
import { useSceneStore } from "../../stores/sceneStore";
import { onMusicStart } from "../../audio/soundManager";
import { SOUNDS, SoundDef } from "../../audio/soundManifest";

interface Banner {
    key: number;
    kind: "achievement" | "music";
    title: string;
    detail: string;
}

// Short subtitles under a room's name when you walk in.
const REGION_SUBTITLES: Record<string, string> = {
    atrium: "The heart of it all",
    gallery: "Art Gallery",
    projects: "Software Lab",
    about: "Holodeck",
    achievements: "Hall of Achievements",
    "gallery-hall-sketches": "Ideas start here",
};

// Breath of the Wild-style announcements:
//  - region reveal: the room's name fades in at the top when you enter
//  - "item get" banner for achievements
//  - a quiet "now playing" line for titled music
export const HudToasts: React.FC = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [region, setRegion] = useState<{ key: number; name: string; subtitle?: string } | null>(null);
    const nextKey = useRef(0);
    const room = useSceneStore((s) => s.currentRoom);
    const transitioning = useSceneStore((s) => s.roomTransitionLoading);

    const push = (banner: Omit<Banner, "key">) => {
        const key = nextKey.current++;
        setBanners((current) => [...current.slice(-1), { ...banner, key }]);
        setTimeout(
            () => setBanners((current) => current.filter((b) => b.key !== key)),
            banner.kind === "achievement" ? 4200 : 3600
        );
    };

    // Region reveal once the transition screen has cleared.
    const lastRoom = useRef<string | null>(null);
    useEffect(() => {
        if (!room || transitioning || room.id === lastRoom.current) return;
        lastRoom.current = room.id;
        const key = nextKey.current++;
        const subtitle = REGION_SUBTITLES[room.id];
        setRegion({ key, name: room.name, subtitle: subtitle !== room.name ? subtitle : undefined });
        const timer = setTimeout(() => setRegion((r) => (r?.key === key ? null : r)), 3400);
        return () => clearTimeout(timer);
    }, [room, transitioning]);

    useEffect(
        () =>
            useAchievementStore.subscribe((state, previous) => {
                Object.keys(state.unlocked)
                    .filter((id) => !previous.unlocked[id])
                    .forEach((id) => {
                        const def = ACHIEVEMENTS.find((a) => a.id === id);
                        // Discovering a room already gets the region reveal.
                        if (def && !id.startsWith("room-")) {
                            push({ kind: "achievement", title: def.title, detail: def.description });
                        }
                    });
            }),
        []
    );

    useEffect(
        () =>
            onMusicStart((id) => {
                const title = (SOUNDS[id] as SoundDef).title;
                if (title) push({ kind: "music", title, detail: "Bird Dog" });
            }),
        []
    );

    return (
        <>
            {region && (
                <div key={region.key} className="fixed inset-x-0 top-[12vh] z-[45] flex flex-col items-center pointer-events-none botw-region">
                    <div className="botw-title text-4xl md:text-5xl">{region.name}</div>
                    <div className="botw-rule w-72" />
                    {region.subtitle && (
                        <div className="gem-label text-sm">{region.subtitle}</div>
                    )}
                </div>
            )}

            <div className="fixed inset-x-0 bottom-[16vh] z-[60] flex flex-col items-center gap-2 pointer-events-none">
                {banners.map((banner) =>
                    banner.kind === "achievement" ? (
                        <div key={banner.key} className="botw-banner hud-toast min-w-[340px]">
                            <div className="gem-label" style={{ color: "var(--sheikah)" }}>
                                Achievement unlocked
                            </div>
                            <div className="botw-title text-2xl mt-0.5">{banner.title}</div>
                            <div className="text-sm text-[color:var(--gem-ink-dim)] mt-0.5">{banner.detail}</div>
                        </div>
                    ) : (
                        <div key={banner.key} className="hud-toast text-sm" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
                            <span style={{ color: "var(--sheikah)" }}>♪</span>{" "}
                            <span className="gem-display italic">{banner.title}</span>
                            <span className="text-[color:var(--gem-ink-dim)]"> · {banner.detail}</span>
                        </div>
                    )
                )}
            </div>
        </>
    );
};
