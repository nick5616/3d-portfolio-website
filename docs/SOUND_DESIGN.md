# Sound design brief

Everything the site can play, what each sound is for, and how long it should be. The site is already wired for every sound listed here: it plays a file as soon as one exists in `public/audio/` and silently skips any that don't yet. So these can be made and dropped in one at a time, in any order.

Each music track has a **Title** slot. Name them whatever you like. Titles show up in-world as a small "now playing" card (♪ *Title*, Bird Dog) when a room's music starts.

---

## How to deliver

| | |
|---|---|
| **File names** | Exactly the ID in the tables, e.g. `music-atrium.webm`. Sounds with variants are numbered: `footstep-marble-1` … `footstep-marble-4`. |
| **Folder** | `public/audio/` |
| **Formats** | Two files per sound: `<id>.webm` (Opus) and `<id>.m4a` (AAC). Each browser picks the one it can play. If you only make one, make `.webm`; Safari 17+ plays it, older Safari needs `.m4a`. |
| **Bitrates** | Music: Opus 128 kbps stereo / AAC 160 kbps. Ambience: Opus 80 kbps stereo. SFX + UI: Opus 96 kbps mono (stereo only if the stereo field matters). |
| **Masters** | 48 kHz / 24-bit WAV, before encoding. |
| **Loudness** | Music ≈ −18 LUFS integrated (it sits under exploring, not on top of it). Ambience ≈ −26 LUFS. SFX + UI peaks ≤ −3 dBFS. Per-sound and per-channel volume can be trimmed in code (`src/audio/soundManifest.ts`), so aim for consistency, not exact numbers. |
| **Total budget** | Under ~6 MB for everything. Music loads only when you enter its room, so per-track size matters more than the total. |

### Loops

- Use bar-exact lengths at your tempo. For example, 2:00 at 120 BPM is exactly 60 bars.
- In Ableton, **Render as Loop** wraps reverb and delay tails back onto the start. Use it for every music and ambience loop, so the seam is inaudible.
- Encoders can add a few milliseconds of padding at the start of a file. If you hear a click or gap at the loop point, tell me the exact loop start and end in seconds. The manifest has `loopStart` and `loopEnd` fields for exactly that.

```sh
ffmpeg -i music-atrium.wav -c:a libopus -b:a 128k music-atrium.webm
ffmpeg -i music-atrium.wav -c:a aac -b:a 160k -movflags +faststart music-atrium.m4a
```

### Variants

Footsteps and page turns are picked at random from numbered takes. Every play also gets a ±4% pitch wobble, so 3–4 takes per sound is plenty. Keep variants at matched loudness.

---

## Music: looping beds, one per space

Crossfades over about 2 seconds when you walk between rooms.

| ID | Length | Space | Brief | Title |
|---|---|---|---|---|
| `music-landing` | **1:00** loop | Choose-your-adventure page | Anticipation at a threshold: four doors, all unopened. Warm and curious, slightly mysterious. Starts after the visitor's first click or keypress (browser rule), so it has to work from a cold open. Sparse keys over a soft pad, maybe a gentle pulse. | |
| `music-atrium` | **2:00** loop | Atrium (the hub) | The original brief for this room: *"greek pillars, fascinating and inspiring rays of light, a major ethereal vibe… lush deep greens of plant life, intense blue of pristine water, light shining through."* Airy, reverent, hopeful. Harp or plucks, wide pads, maybe water-like textures. The main theme; people pass through here most. | |
| `music-gallery` | **2:00** loop | Gallery rotunda + every art hall | Museum hush. Very sparse, lots of silence between phrases, nothing rhythmic that pulls focus from the art. Solo piano, cello or soft mallets. Mix it about 3 dB quieter than the other tracks. | |
| `music-sketchbook` | **1:00** loop | Sketchbook rotunda | Intimate and handmade. You just paid to get in and found one book under a beam of light. Felt piano, music-box or celesta, maybe a little pencil and paper texture. Warm, private, a little magical. | |
| `music-projects` | **2:00** loop | Software lab | Futuristic and focused, a place to scan through work quickly. Arpeggiated analog synths, clean pulse, ~100–115 BPM, forward motion without being busy. | |
| `music-achievements` | **1:00** loop | Hall of Achievements | Trophy room in a wood-and-stone hall. Proud but relaxed; a quiet nod to Zelda fanfares without quoting them. Warm brass or synth-brass pads, a small heroic motif. | |
| `music-forest` | — | The Forest | **Not needed any more.** The forest plays the Song of the Forest (Bird Dog's *Childyllic*, from SoundCloud) at the fairy's keyboard instead. Skip this one. | |
| `music-math` | **1:00** loop | Meteor Math (moon outpost) | Pure 2008 Flash-game energy: bouncy synth lead, bright square/saw arps, a driving beat around 130 BPM. Fun, not stressful; it has to survive being looped through a whole run. | |
| `music-sky-course` | **2:00** loop | Sky Course | A timed parkour run over islands above the clouds. Bright, bouncy and quick (~125–135 BPM): breezy synths or plucks, a driving but light beat. It should make you want to sprint. | |
| `music-shop` | **1:00** loop | Rupee Shop | A cosy little shop kept by an owl. Warm, a bit cheeky, a nod to classic RPG shop themes without quoting them: marimba, pizzicato, a lazy swing. | |
| `music-observatory` | **2:00** loop | Observatory (rooftop, night) | Looking up at constellations made of my projects. Wide, still and wondering: soft pads, a slow celesta or piano line, lots of air. | |
| `music-marble` | **1:00** loop | Marble Machine | A workshop of ramps and bells. Light and tinkery, quiet enough that the marbles' own notes (C pentatonic) sit on top. Keep it sparse and in C. | |
| `music-art` | **1:00** loop | Art Studio (classroom) | A sunny art class. Gentle, playful, a little lo-fi: acoustic guitar or ukulele, brushed drums. | |
| `music-cosmic` | **2:00** loop | Cosmic Connect Four | A board game in deep space against Nothing, a vast eyeless god-thing whose morality is unknown. Trippy and vast but patient, because people sit and think here. Detuned choir pads, slow shimmering arps, sub swells, the odd reversed bell. Uneasy and beautiful at once: never menacing, never comforting. | |

## Ambience: room tone under the music

| ID | Length | Brief |
|---|---|---|
| `amb-atrium` | **1:00** loop | Light fountain/water trickle, faint distant birds, a breath of wind high up. Open, bright air. |
| `amb-gallery` | **1:00** loop | Quiet museum: soft HVAC hush, a very distant footstep or two echoing, almost nothing. |
| `amb-sketchbook` | **0:30** loop | Wind brushing across the open oculus high above, a faint airy shimmer (light in dust). Maybe one distant pigeon wing-flutter in the loop. |
| `amb-projects` | **0:30** loop | Server-room hum, faint electrical buzz, occasional soft data blips (subtle, not sci-fi beeps). |
| `amb-achievements` | **0:30** loop | Warm room tone of a wood-paneled hall, faint fireplace crackle. |
| `amb-forest` | **1:00** loop | Leaves in a breeze, distant birdsong, a creek far off, occasional wood creak. Should still read at night (add a few crickets/frogs in the loop). |
| `amb-farmhouse` | **0:30** loop | Courage's farmhouse: wind across empty prairie, a creaky house settling, a far-off cricket or two. Lonely and a bit eerie. |
| `amb-sky` | **0:30** loop | High wind above the clouds, gentle and constant, the odd bird far below. |
| `amb-observatory` | **0:30** loop | Night on a rooftop: a soft breeze, distant city hum far below, crickets. |
| `amb-studio` | **0:30** loop | Bird Dog's studio between songs: the faint hum of gear, almost silent. Very quiet (the music is the point). |
| `amb-cosmic` | **1:00** loop | The void: a very low cosmic drone, faint radio-static shimmer, distant whale-like tones, the rare far-off creak of something enormous moving. |

## Movement

Footsteps play every ~1.9 m walked, chosen by the floor surface of the room you're in.

| ID | Takes | Length (each) | Brief |
|---|---|---|---|
| `footstep-stone` | 4 | 0.2–0.4 s | Soft-soled shoe on stone tile (atrium). |
| `footstep-marble` | 4 | 0.2–0.4 s | Polished marble, a touch of room reverb (gallery, sketchbook rotunda). |
| `footstep-metal` | 4 | 0.2–0.4 s | Light step on metal deck plating (software lab). |
| `footstep-wood` | 4 | 0.2–0.4 s | Wooden floor, slightly hollow (achievements hall). |
| `footstep-soft` | 4 | 0.2–0.3 s | Soft floors: the jam room mat, the forest floor, the art classroom. |
| `jump` | 1 | 0.3 s | Small exertion/whoosh; keep it non-vocal. |
| `land` | 1 | 0.3 s | Soft thud, surface-neutral. |

## World interactions

| ID | Length | When | Brief |
|---|---|---|---|
| `door-enter` | 1.0–1.4 s | Walking through any door | A soft whoosh into a latch, the transition between rooms. |
| `door-locked` | 0.6 s | Pressing E at the sketchbook door without 5 rupees | A rattle plus a low "not yet" chime. |
| `door-unlock` | 1.2–1.8 s | Paying the toll | A small "puzzle solved" moment: key turn, then a rising chime. Plays right after `rupee-spend`. |
| `rupee-spend` | 0.6–0.9 s | Paying 5 rupees | Coins counting down, quick and satisfying. |
| `rupee-collect-small` | 0.3–0.5 s | Green / blue rupee | Bright ting. Your own take on the classic, not a copy. |
| `rupee-collect-big` | 0.6–0.8 s | Red, purple, silver, orange | Same family, bigger and sparklier. |
| `rupee-collect-bad` | 0.5–0.7 s | Black rupee (−20) | A sour, comic downward bend. |
| `achievement-unlock` | 1.5–2.5 s | Any achievement unlocked | Short fanfare/sparkle; ties into the achievements-hall motif if you like. |
| `book-open` | 0.8–1.2 s | Sketchbook cover opens | Leather creak, stiff board flop. |
| `book-close` | 0.6–1.0 s | Turning back to the cover | Heavier soft thump. |
| `book-page-turn` | 0.4–0.6 s, **3 takes** | Every page turn | Thick drawing paper (heavier than printer paper), a quick flutter. |
| `project-focus` | 0.15–0.3 s | Aiming at a project in the lab | Tiny holographic blip. Fires often, so keep it subtle. |
| `project-open` | 0.6–0.9 s | Opening a project's live viewer | Panel power-up, quick and bright. |
| `lab-toggle-on` | 0.2–0.35 s | Lighting a tech-family button on the lab console | Chunky console button plus a bright "power on" zap as the lamp lights. |
| `lab-toggle-off` | 0.2–0.3 s | Switching a family off | Same button, with a falling "power down" tick. |
| `lab-swing` | 0.8–1.2 s | Helixes swinging around the ring to hide or reappear | Heavy, fast mechanical slide with a slight overshoot and settle. Think racks of gear gliding into place. |
| `math-fire` | 0.2–0.3 s | Firing the turret | Classic "pew": a bright laser zap. |
| `math-explode` | 0.6–0.9 s | A meteor destroyed | Satisfying crunchy rock burst with a sparkle tail. Your reward sound, so make it feel great. |
| `math-impact` | 0.8–1.2 s | A meteor hits the city shield | Heavy boom plus a shield "crackle", with a little low-end rumble. |
| `math-wrong` | 0.25 s | Answer matches no meteor | Comic "bonk"/buzzer, short and friendly. |
| `math-levelup` | 1.0–1.5 s | Level up / game start | Rising arpeggio jingle. |
| `math-gameover` | 1.5–2.5 s | Last shield gone | A sad descending jingle, more cheeky than tragic. |
| `light-switch` | 0.2 s | Gallery light switch | Chunky switch click. |
| `lift-rise` | 1.5–2.5 s | The fairy lift lifting off from a floor | A rising swirl of air with fairy chimes woven in, like being picked up by a breeze. |
| `lift-chime` | 0.5–0.8 s | The lift arriving at a floor (also the Sky Course start/checkpoints) | One soft, bright chime. |
| `fairy-catch` | 0.6–1 s | Catching a Royal Fairy in the forest (E) | A cupped-hands "whff" and a quick sparkle of glass chimes, rising. |
| `fairy-catch-regal` | 1.5–2.5 s | Catching the Fairy Queen or Fairy King | The same idea, grander: a shimmering harp/celesta flourish ending on a bright major chord. |
| `c4-drop` | 0.2–0.3 s | Letting go of your chip over a column | A small glassy release; the clacks that follow carry the weight. |
| `c4-chip-clack` | 0.1–0.25 s, **4 takes** | Your gem chip hitting the slot floor or the chip below (fires on every bounce; volume follows impact speed) | Hard gemstone on gemstone: crisp, bright, a little ring. Should sound good stacked 3–4 times in quick succession as it bounces. |
| `c4-chip-clack-gold` | 0.1–0.25 s, **3 takes** | Nothing's chip landing | Same impact, but it's made of light: a struck crystal bowl tick with a soft shimmer tail. |
| `c4-nothing-chip` | 0.6–0.9 s | Nothing's chip forming under its hand | A rising golden swell that resolves into a bell. |
| `c4-chip-select` | 0.3–0.5 s | Taking a chip from the altar | A gem lifting off a stand: soft chime plus a shimmer. |
| `c4-win` | 2–3 s | You beat Nothing | Triumphant but uncanny, like the universe is impressed and not entirely pleased. |
| `c4-lose` | 2–3 s | Nothing wins | Vast, calm and final: a low choir chord settling. Not a sad trombone. |
| `c4-draw` | 1.5–2 s | Board full, nobody wins | An unresolved suspended chord left hanging. |
| `c4-reclaim` | 1.2–1.6 s | Nothing draws every chip back out of the board | Many little chimes swirling upward into a whoosh. |

## Interface

| ID | Length | When | Brief |
|---|---|---|---|
| `ui-hover` | 0.05–0.1 s | Hovering a choice on the landing page | Barely there: a glassy tick. Fires a lot. |
| `ui-select` | 0.2–0.3 s | Choosing an adventure / confirming | A gem "clink". |
| `ui-back` | 0.15–0.25 s | Closing / going back | Reverse of `ui-select`, softer. |
| `ui-inspect-open` | 0.3–0.5 s | Opening a painting full-screen | Soft rising shimmer, like leaning in. |
| `ui-inspect-close` | 0.25–0.4 s | Closing it | Matching falling shimmer. |
| `ui-page` | 0.1–0.2 s | Arrowing between paintings | Light paper/glass flick. |

---

## Wiring reference

- **Manifest:** `src/audio/soundManifest.ts`. Every ID, channel and default volume, plus which room plays which music, ambience and footsteps. Add a `title` to a music entry to show it in the "now playing" card.
- **Mixer:** `src/audio/soundManager.ts`. Master, music, ambience, sfx and ui channels; the sound on/off toggle is saved per visitor.
- **Adding a new sound:** add an entry to `SOUNDS`, drop the files in `public/audio/`, call `playSound("your-id")` where it should fire.
