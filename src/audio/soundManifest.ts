// Every sound the site knows how to play. Files live in public/audio/ as
// <id>.webm (Opus) and/or <id>.m4a (AAC); whichever the browser supports is
// used. A sound with no file yet is silently skipped, so these can be
// produced and dropped in one at a time. Full brief for each: docs/SOUND_DESIGN.md
//
// Channels: music + ambience loop and crossfade per room; sfx and ui are
// one-shots. `variants` = how many numbered takes exist (id-1 ... id-N),
// picked at random so repeated sounds don't machine-gun.

export type SoundChannel = "music" | "ambience" | "sfx" | "ui";

export interface SoundDef {
    channel: SoundChannel;
    loop?: boolean;
    volume?: number; // 0..1 relative to its channel
    // Music only: shown as "now playing" when the track starts.
    title?: string;
    variants?: number;
    // Optional loop points (seconds) if an encoder leaves padding at the ends.
    loopStart?: number;
    loopEnd?: number;
}

export const SOUNDS = {
    // Music (looping beds, one per space)
    "music-landing": { channel: "music", loop: true, volume: 0.7 },
    "music-atrium": { channel: "music", loop: true, volume: 0.6 },
    "music-gallery": { channel: "music", loop: true, volume: 0.5 },
    "music-sketchbook": { channel: "music", loop: true, volume: 0.5 },
    "music-projects": { channel: "music", loop: true, volume: 0.55 },
    "music-achievements": { channel: "music", loop: true, volume: 0.55 },
    "music-holodeck": { channel: "music", loop: true, volume: 0.5 },
    "music-forest": { channel: "music", loop: true, volume: 0.5 },
    "music-math": { channel: "music", loop: true, volume: 0.55 },

    // Ambience (room tone under the music)
    "amb-atrium": { channel: "ambience", loop: true, volume: 0.6 },
    "amb-gallery": { channel: "ambience", loop: true, volume: 0.5 },
    "amb-sketchbook": { channel: "ambience", loop: true, volume: 0.55 },
    "amb-projects": { channel: "ambience", loop: true, volume: 0.55 },
    "amb-achievements": { channel: "ambience", loop: true, volume: 0.5 },
    "amb-holodeck": { channel: "ambience", loop: true, volume: 0.5 },
    "amb-forest": { channel: "ambience", loop: true, volume: 0.65 },

    // Movement
    "footstep-stone": { channel: "sfx", variants: 4, volume: 0.35 },
    "footstep-marble": { channel: "sfx", variants: 4, volume: 0.35 },
    "footstep-metal": { channel: "sfx", variants: 4, volume: 0.35 },
    "footstep-wood": { channel: "sfx", variants: 4, volume: 0.35 },
    "footstep-soft": { channel: "sfx", variants: 4, volume: 0.3 },
    jump: { channel: "sfx", volume: 0.4 },
    land: { channel: "sfx", volume: 0.45 },

    // World interactions
    "door-enter": { channel: "sfx", volume: 0.7 },
    "door-locked": { channel: "sfx", volume: 0.7 },
    "door-unlock": { channel: "sfx", volume: 0.8 },
    "rupee-spend": { channel: "sfx", volume: 0.8 },
    "rupee-collect-small": { channel: "sfx", volume: 0.7 },
    "rupee-collect-big": { channel: "sfx", volume: 0.8 },
    "rupee-collect-bad": { channel: "sfx", volume: 0.7 },
    "achievement-unlock": { channel: "sfx", volume: 0.8 },
    "book-open": { channel: "sfx", volume: 0.7 },
    "book-close": { channel: "sfx", volume: 0.7 },
    "book-page-turn": { channel: "sfx", variants: 3, volume: 0.6 },
    "project-focus": { channel: "sfx", volume: 0.4 },
    "project-open": { channel: "sfx", volume: 0.7 },
    "lab-toggle-on": { channel: "sfx", volume: 0.7 },
    "lab-toggle-off": { channel: "sfx", volume: 0.65 },
    "lab-swing": { channel: "sfx", volume: 0.6 },
    "math-fire": { channel: "sfx", volume: 0.6 },
    "math-explode": { channel: "sfx", volume: 0.75 },
    "math-impact": { channel: "sfx", volume: 0.85 },
    "math-wrong": { channel: "sfx", volume: 0.55 },
    "math-levelup": { channel: "sfx", volume: 0.7 },
    "math-gameover": { channel: "sfx", volume: 0.8 },
    "light-switch": { channel: "sfx", volume: 0.7 },

    // Interface
    "ui-hover": { channel: "ui", volume: 0.35 },
    "ui-select": { channel: "ui", volume: 0.6 },
    "ui-back": { channel: "ui", volume: 0.5 },
    "ui-inspect-open": { channel: "ui", volume: 0.5 },
    "ui-inspect-close": { channel: "ui", volume: 0.45 },
    "ui-page": { channel: "ui", volume: 0.4 },
} satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;

// Which music + ambience bed plays in each room.
export const ROOM_SOUNDSCAPES: Record<
    string,
    { music?: SoundId; ambience?: SoundId; footsteps: SoundId }
> = {
    atrium: { music: "music-atrium", ambience: "amb-atrium", footsteps: "footstep-stone" },
    gallery: { music: "music-gallery", ambience: "amb-gallery", footsteps: "footstep-marble" },
    "gallery-hall": { music: "music-gallery", ambience: "amb-gallery", footsteps: "footstep-marble" },
    "gallery-sketchbook": { music: "music-sketchbook", ambience: "amb-sketchbook", footsteps: "footstep-marble" },
    projects: { music: "music-projects", ambience: "amb-projects", footsteps: "footstep-metal" },
    achievements: { music: "music-achievements", ambience: "amb-achievements", footsteps: "footstep-wood" },
    about: { music: "music-holodeck", ambience: "amb-holodeck", footsteps: "footstep-soft" },
};
