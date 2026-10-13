# Curating the gallery halls

Each piece's title, description, date and order live as custom metadata on its object in the `artandmedia` bucket. Changing them doesn't need a deploy.

| Metadata key | Shown as |
|---|---|
| `art-name` | Plaque title and inspect-view title. **A piece gets a plaque only once this is set, in any hall.** |
| `art-description` | Plaque and inspect-view description. |
| `art-date` | Shown next to the title, free text (e.g. `Circa 2023`). |
| `art-order` | Position in the hall, lowest first. |
| `private` | `true` hides the piece from the site. **It does not make the file private** (see below). |

The wall text at each hall's entrance comes from the art collection entries in nickel-tools' `content.ts` (`artOverride`). To change it, edit it there and run `node scripts/sync-portfolio-content.mjs`.

## Naming a piece

```sh
gsutil setmeta \
  -h "x-goog-meta-art-name:Lion Sun" \
  -h "x-goog-meta-art-description:Gouache on toned paper." \
  -h "x-goog-meta-art-date:2024" \
  -h "x-goog-meta-art-order:3" \
  gs://artandmedia/paintings/IMG_1234.jpg
```

List what's in a hall, with any metadata already set:

```sh
gsutil ls -L gs://artandmedia/paintings/ | grep -E "gs://|art-"
```

Photos of physical work look much better on the wall after a quick crop and straighten, and a white-balance fix so the paper reads white. Re-upload under the same name to keep its metadata.

## Private pieces: this needs a real fix

`private: true` only stops the site from showing a piece. The bucket is publicly readable, so the file is still listed by the public JSON API and downloadable by anyone who has its URL. To make something actually private, move it out of the public bucket:

```sh
gsutil mv gs://artandmedia/sketches/<file> gs://<a-private-bucket>/sketches/<file>
```

Alternatively, turn off public listing and serve only an explicit allow-list. But moving the few private files is the simplest fix.
