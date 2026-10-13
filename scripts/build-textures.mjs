// Converts the source PBR texture sets in public/images/<Set>_SD/ into the
// compact runtime format the site loads from public/textures/<id>/:
//
//   color.webp   base color (sRGB)
//   normal.webp  normal map (linear)
//   orm.webp     R = ambient occlusion, G = roughness, B = metalness (linear)
//
// three.js reads aoMap from R, roughnessMap from G and metalnessMap from B,
// so one packed texture replaces three. Height maps and the "Material_*"
// preview renders are dropped - neither did anything useful on flat walls.
//
// Usage (sharp is not a project dependency; install it next to the script
// run, e.g. in a temp folder):
//   npm i --no-save sharp && node scripts/build-textures.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const SRC = path.join(ROOT, "public", "images");
const OUT = path.join(ROOT, "public", "textures");

// id -> source folder + file prefix. Size is the output edge length.
const SETS = {
    "tiles-062": { folder: "Tiles_062_SD", prefix: "Tiles_062", size: 1024 },
    "tiles-fluted": { folder: "Tiles_Flutted_001_SD", prefix: "Tiles_Fluted_001", size: 1024 },
    "ceiling-drop": { folder: "Ceiling_Drop_Tiles_001_SD", prefix: "Ceiling_Drop_Tiles_001", size: 1024 },
    "stone-column": { folder: "Stylized_Stone_Column_001_SD", prefix: "Stylized_Stone_Column_001", size: 1024 },
    "marble-white": { folder: "Marble_White_006_SD", prefix: "Marble_White_006", size: 1024 },
    "scifi-panel": { folder: "Sci_fi_Panel_001_SD", prefix: "Sci_fi_Panel_001", size: 1024 },
    "scifi-plate": { folder: "Sci-fi_Metal_Plate_004_SD", prefix: "Sci-fi_Metal_Plate_004", size: 1024 },
    "scifi-walkway": { folder: "Sci-fi_Metal_Walkway_001_SD", prefix: "Sci-fi_Metal_Walkway_001", size: 1024 },
    "concrete-ceiling": { folder: "Concrete_Ceiling_002_SD", prefix: "Concrete_Ceiling_002", size: 1024 },
    "fabric-padded": { folder: "Fabric_Padded_008_SD", prefix: "Fabric_Padded_008", size: 1024 },
    "wood-floor": { folder: "Wood_Floor_014_SD", prefix: "Wood_Floor_014", size: 1024 },
    "wood-coffers": { folder: "Wood_Ceiling_Coffers_001_SD", prefix: "Wood_Ceiling_Coffers_001", size: 1024 },
    "wall-stone": { folder: "Wall_Stone_029_SD", prefix: "Wall_Stone_029", size: 1024 },
    kintsugi: { folder: "Kintsugi_001_SD", prefix: "Kintsugi_001", size: 1024 },
};

const findMap = (dir, prefix, suffix) => {
    for (const ext of [".png", ".jpg", ".jpeg"]) {
        const file = path.join(dir, `${prefix}_${suffix}${ext}`);
        if (fs.existsSync(file)) return file;
    }
    return null;
};

// Single-channel buffer at size x size, or a constant fill if the map is missing.
const channel = async (file, size, fallback) => {
    if (!file) return Buffer.alloc(size * size, fallback);
    return sharp(file)
        .resize(size, size, { fit: "fill" })
        .greyscale()
        .extractChannel(0)
        .raw()
        .toBuffer();
};

for (const [id, { folder, prefix, size }] of Object.entries(SETS)) {
    const dir = path.join(SRC, folder);
    const out = path.join(OUT, id);
    fs.mkdirSync(out, { recursive: true });

    const color = findMap(dir, prefix, "basecolor");
    const normal = findMap(dir, prefix, "normal");
    await sharp(color).resize(size, size).webp({ quality: 82 }).toFile(path.join(out, "color.webp"));
    if (normal) {
        await sharp(normal).resize(size, size).webp({ quality: 90 }).toFile(path.join(out, "normal.webp"));
    }

    const ormSize = size / 2; // AO/roughness/metalness are low-frequency
    const [ao, rough, metal] = await Promise.all([
        channel(findMap(dir, prefix, "ambientOcclusion"), ormSize, 255),
        channel(findMap(dir, prefix, "roughness"), ormSize, 200),
        channel(findMap(dir, prefix, "metallic"), ormSize, 0),
    ]);
    const orm = Buffer.alloc(ormSize * ormSize * 3);
    for (let i = 0; i < ormSize * ormSize; i++) {
        orm[i * 3] = ao[i];
        orm[i * 3 + 1] = rough[i];
        orm[i * 3 + 2] = metal[i];
    }
    await sharp(orm, { raw: { width: ormSize, height: ormSize, channels: 3 } })
        .webp({ quality: 88 })
        .toFile(path.join(out, "orm.webp"));

    const bytes = fs.readdirSync(out).reduce((sum, f) => sum + fs.statSync(path.join(out, f)).size, 0);
    console.log(`${id.padEnd(18)} ${(bytes / 1024).toFixed(0)} KB${normal ? "" : " (no normal map)"}`);
}
