# Painting a door frame

Any portal door can wear a frame you paint yourself instead of a built one. The portal still does the rest: the moving view through the opening, the burning rim, the light it throws into the room. The frame gets two effects of its own: a band of light that slides across it now and then, and a glow in the portal's colour wherever the paint fades out at its edges (soft, semi-transparent edges glow; hard edges don't).

## 1. Start from a template

Templates are in `docs/door-frames/`. Each is a transparent PNG at 400 px per metre with the doorway's opening tinted magenta:

| Template | Opening (w x h) | Image (w x h) | For |
| --- | --- | --- | --- |
| `template-upstairs.png` | 1.9 x 3.25 m | 3.6 x 4.8 m | The atrium's upper-floor doors (the forest, the observatory, ...) |
| `template-ground.png` | 3 x 4 m | 5 x 5.6 m | The atrium's ground floor, the gallery hub and halls, Projects, Achievements, the Rupee Shop |
| `template-room.png` | 1.6 x 2.8 m | 3.2 x 4.2 m | The Jam Room, Bird Dog Studio, Marble Machine |

Need another size? Edit `TEMPLATES` in `scripts/make-door-frame-templates.mjs` and run `node scripts/make-door-frame-templates.mjs`.

## 2. Paint

- Paint the frame on a layer above the template, anywhere outside the magenta. The opening has to stay fully transparent, because that's where the portal shows through.
- The image's bottom edge sits on the floor, centred on the doorway. Anything you paint there stands on the threshold.
- Leave some edges soft (feathered, semi-transparent) wherever you want the portal's light to glow through.
- Hide the template layer and export a PNG with transparency, at the same size.

## 3. Put it in

1. Save it under `public/doors/`, e.g. `public/doors/forest.png`.
2. In `src/configs/rooms.ts`, give the archway the frame, with the image's size in metres:
   ```ts
   frame: imageFrame("/doors/forest.png", [3.6, 4.8]),
   ```
   (`imageFrame` is exported from `src/configs/portalLooks.ts`.) The atrium's upstairs doors are made by `upstairsDoor(...)`; pass the frame as its last argument instead.
3. For a door on the atrium's upper floors, also set `ownFrame: true` on its entry in `OPEN_DOORS` (`src/components/rooms/atrium/atriumLayout.ts`), so the rotunda doesn't build its marble surround behind your frame.

Or just drop the PNG in `public/doors/` and ask Claude to wire it up.
