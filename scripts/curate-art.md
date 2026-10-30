# Curating the gallery halls

The halls' pieces, and everything said about them, live in Canon (github.com/nick5616/content-pipeline). The art room reads Canon's `holodeck-art-room` view at runtime, so a change shows up as soon as it's published; no deploy needed.

| In Canon | Shown as |
|---|---|
| The piece's `title` | Plaque and inspect-view title, **only in halls whose pieces are placed `titled`** (Digital Art). |
| The piece's `summary` | Plaque and inspect-view description. |
| The piece's `date` | Shown next to the title. A date you wrote (`Circa 2023`) wins; otherwise the photo's capture date. |
| The collection's `members` | Which pieces hang in the hall, in order. |
| `visibility` | Only `public` pieces reach the view. Drafts never leave Canon's private bucket. |
| The collection's title and summary (art-room copy) | The wall text at the hall's entrance. |

## Naming a piece

```sh
canon item set space title="Space" summary="Gouache on toned paper." date.value=2024
canon item set space visibility=public
canon plan            # review, then:
canon apply <plan id>
```

`canon view holodeck-art-room --drafts` previews the hall before anything is published.

## Private pieces

A draft is never copied to the public bucket, so there's nothing to download: unlike the old `private` metadata on `artandmedia`, keeping a piece a draft really keeps it private.
