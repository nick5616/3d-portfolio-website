// Draws the templates for painting a door frame (docs/door-frames.md):
// transparent PNGs at 400 px per metre with the doorway's opening tinted
// magenta. Paint the frame around it; keep the opening clear.
//
//   node scripts/make-door-frame-templates.mjs
import fs from "fs";
import path from "path";
import zlib from "zlib";

const PX_PER_M = 400;
const OUT = path.resolve("docs/door-frames");

// Opening: width x height (threshold to the top of the arch). Canvas:
// the frame image's full size; its bottom edge sits on the threshold.
const TEMPLATES = [
    { name: "template-upstairs", opening: [1.9, 3.25], canvas: [3.6, 4.8] }, // atrium upper floors
    { name: "template-ground", opening: [3, 4], canvas: [5, 5.6] }, // atrium ground floor, gallery, halls
    { name: "template-room", opening: [1.6, 2.8], canvas: [3.2, 4.2] }, // jam room, studio, marble machine
];

const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
};
const png = (width, height, rgba) => {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
    const rows = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
};

fs.mkdirSync(OUT, { recursive: true });
for (const { name, opening, canvas } of TEMPLATES) {
    const width = Math.round(canvas[0] * PX_PER_M);
    const height = Math.round(canvas[1] * PX_PER_M);
    const rgba = Buffer.alloc(width * height * 4);
    const half = opening[0] / 2;
    const jamb = opening[1] - half;
    const line = 2.5 / PX_PER_M;
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            // metres, origin at the threshold's centre, y up
            const x = (px + 0.5) / PX_PER_M - canvas[0] / 2;
            const y = canvas[1] - (py + 0.5) / PX_PER_M;
            // signed distance to the opening's edge (negative inside)
            const d = y > jamb ? Math.hypot(x, y - jamb) - half : Math.max(Math.abs(x) - half, -y);
            const i = (py * width + px) * 4;
            if (Math.abs(d) < line) rgba.set([255, 0, 200, 255], i); // the edge
            else if (d < 0) rgba.set([255, 0, 200, 70], i); // keep clear
            else if (py >= height - 2) rgba.set([0, 200, 255, 255], i); // the floor line
        }
    }
    fs.writeFileSync(path.join(OUT, `${name}.png`), png(width, height, rgba));
    console.log(`${name}.png  ${width}x${height}  opening ${opening[0]} x ${opening[1]} m, image ${canvas[0]} x ${canvas[1]} m`);
}
