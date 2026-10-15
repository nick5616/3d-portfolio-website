import * as THREE from "three";
import { WORLD_ONLY } from "../../utils/site";

// Canvas compositing for the sketchbook's pages and covers.

export const PAGE_PX_W = 720;
export const PAGE_PX_H = 960; // page aspect 3:4

const PAPER = "#f1e9d8";
const INK = "#3b3127";

let grain: HTMLCanvasElement | null = null;
const paperGrain = () => {
    if (grain) return grain;
    grain = document.createElement("canvas");
    grain.width = grain.height = 256;
    const context = grain.getContext("2d")!;
    const image = context.createImageData(256, 256);
    for (let i = 0; i < image.data.length; i += 4) {
        const v = 128 + (Math.random() - 0.5) * 60;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
        image.data[i + 3] = 18;
    }
    context.putImageData(image, 0, 0);
    return grain;
};

const newCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_PX_W;
    canvas.height = PAGE_PX_H;
    return canvas;
};

// spineOnLeft: true for the front of a leaf (a right-hand page), false
// for the back (a left-hand page). Used for the gutter shadow + page number.
const paper = (context: CanvasRenderingContext2D, spineOnLeft: boolean) => {
    context.fillStyle = PAPER;
    context.fillRect(0, 0, PAGE_PX_W, PAGE_PX_H);
    context.fillStyle = context.createPattern(paperGrain(), "repeat")!;
    context.fillRect(0, 0, PAGE_PX_W, PAGE_PX_H);
    // Gutter: paper curving down into the binding.
    const gutter = context.createLinearGradient(
        spineOnLeft ? 0 : PAGE_PX_W,
        0,
        spineOnLeft ? 90 : PAGE_PX_W - 90,
        0
    );
    gutter.addColorStop(0, "rgba(60,40,20,0.28)");
    gutter.addColorStop(1, "rgba(60,40,20,0)");
    context.fillStyle = gutter;
    context.fillRect(0, 0, PAGE_PX_W, PAGE_PX_H);
    // Slightly darker, worn outer edge.
    const edge = context.createLinearGradient(
        spineOnLeft ? PAGE_PX_W : 0,
        0,
        spineOnLeft ? PAGE_PX_W - 30 : 30,
        0
    );
    edge.addColorStop(0, "rgba(120,90,50,0.12)");
    edge.addColorStop(1, "rgba(120,90,50,0)");
    context.fillStyle = edge;
    context.fillRect(0, 0, PAGE_PX_W, PAGE_PX_H);
};

const pageNumber = (
    context: CanvasRenderingContext2D,
    n: number,
    spineOnLeft: boolean
) => {
    context.fillStyle = "rgba(59,49,39,0.55)";
    context.font = "italic 22px Fraunces, Georgia, serif";
    context.textAlign = spineOnLeft ? "right" : "left";
    context.fillText(
        String(n),
        spineOnLeft ? PAGE_PX_W - 44 : 44,
        PAGE_PX_H - 34
    );
};

const toTexture = (canvas: HTMLCanvasElement, mirror: boolean) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    if (mirror) {
        // The back face is seen through the plane, so flip it to read right.
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;
        texture.offset.x = 1;
    }
    return texture;
};

export const sketchPage = (
    image: ImageBitmap | null,
    pageNo: number,
    spineOnLeft: boolean
) => {
    const canvas = newCanvas();
    const context = canvas.getContext("2d")!;
    paper(context, spineOnLeft);
    if (image) {
        const margin = 56;
        const boxW = PAGE_PX_W - margin * 2;
        const boxH = PAGE_PX_H - margin * 2 - 30;
        const scale = Math.min(boxW / image.width, boxH / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        // Multiply: the sketch's own white paper drops out and the pencil
        // sits on this page's paper, like it was drawn here.
        context.globalCompositeOperation = "multiply";
        context.drawImage(
            image,
            (PAGE_PX_W - w) / 2 + (spineOnLeft ? 10 : -10),
            margin + (boxH - h) / 2,
            w,
            h
        );
        context.globalCompositeOperation = "source-over";
    }
    pageNumber(context, pageNo, spineOnLeft);
    return toTexture(canvas, !spineOnLeft);
};

export const blankPage = (spineOnLeft: boolean, text?: string) => {
    const canvas = newCanvas();
    const context = canvas.getContext("2d")!;
    paper(context, spineOnLeft);
    if (text) {
        context.fillStyle = INK;
        context.font = "italic 44px Fraunces, Georgia, serif";
        context.textAlign = "center";
        context.fillText(text, PAGE_PX_W / 2, PAGE_PX_H / 2);
    }
    return toTexture(canvas, !spineOnLeft);
};

const leather = (context: CanvasRenderingContext2D) => {
    const base = context.createLinearGradient(0, 0, PAGE_PX_W, PAGE_PX_H);
    base.addColorStop(0, "#21402f");
    base.addColorStop(1, "#16291f");
    context.fillStyle = base;
    context.fillRect(0, 0, PAGE_PX_W, PAGE_PX_H);
    // Grain
    for (let i = 0; i < 2600; i++) {
        context.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        context.fillRect(
            Math.random() * PAGE_PX_W,
            Math.random() * PAGE_PX_H,
            1 + Math.random() * 3,
            1 + Math.random() * 2
        );
    }
};

const goldFoil = (context: CanvasRenderingContext2D) => {
    const foil = context.createLinearGradient(0, 0, PAGE_PX_W, PAGE_PX_H);
    foil.addColorStop(0, "#f6dc8f");
    foil.addColorStop(0.45, "#c49a3c");
    foil.addColorStop(0.55, "#ffe7a3");
    foil.addColorStop(1, "#a97e2a");
    return foil;
};

export const frontCover = () => {
    const canvas = newCanvas();
    const context = canvas.getContext("2d")!;
    leather(context);
    const foil = goldFoil(context);
    context.strokeStyle = foil;
    context.lineWidth = 3;
    context.strokeRect(40, 40, PAGE_PX_W - 80, PAGE_PX_H - 80);
    context.lineWidth = 1;
    context.strokeRect(52, 52, PAGE_PX_W - 104, PAGE_PX_H - 104);
    // A small rupee-shaped emblem
    const cx = PAGE_PX_W / 2;
    const cy = PAGE_PX_H * 0.36;
    context.beginPath();
    context.moveTo(cx, cy - 70);
    context.lineTo(cx + 34, cy - 34);
    context.lineTo(cx + 34, cy + 34);
    context.lineTo(cx, cy + 70);
    context.lineTo(cx - 34, cy + 34);
    context.lineTo(cx - 34, cy - 34);
    context.closePath();
    context.fillStyle = foil;
    context.fill();
    context.fillStyle = foil;
    context.textAlign = "center";
    context.font = "italic 600 92px Fraunces, Georgia, serif";
    context.fillText("Sketches", cx, PAGE_PX_H * 0.62);
    context.font = "500 22px Manrope, system-ui, sans-serif";
    context.fillText("N  ·  B", cx, PAGE_PX_H * 0.69);
    return toTexture(canvas, false);
};

export const insideCover = () => {
    const canvas = newCanvas();
    const context = canvas.getContext("2d")!;
    // Marbled-ish endpaper: soft overlapping ellipses
    context.fillStyle = "#2c4a3a";
    context.fillRect(0, 0, PAGE_PX_W, PAGE_PX_H);
    for (let i = 0; i < 160; i++) {
        context.fillStyle = `rgba(${200 + Math.random() * 55},${180 + Math.random() * 50},${120 + Math.random() * 60},${0.05 + Math.random() * 0.08})`;
        context.beginPath();
        context.ellipse(
            Math.random() * PAGE_PX_W,
            Math.random() * PAGE_PX_H,
            20 + Math.random() * 120,
            6 + Math.random() * 30,
            Math.random() * Math.PI,
            0,
            Math.PI * 2
        );
        context.fill();
    }
    // Bookplate
    const w = 420;
    const h = 280;
    const x = (PAGE_PX_W - w) / 2;
    const y = PAGE_PX_H * 0.36;
    context.fillStyle = PAPER;
    context.fillRect(x, y, w, h);
    context.strokeStyle = "#8a6a2c";
    context.lineWidth = 2;
    context.strokeRect(x + 12, y + 12, w - 24, h - 24);
    context.fillStyle = INK;
    context.textAlign = "center";
    context.font = "italic 30px Fraunces, Georgia, serif";
    context.fillText("Ex Libris", PAGE_PX_W / 2, y + 78);
    if (!WORLD_ONLY) {
        context.font = "600 34px Fraunces, Georgia, serif";
        context.fillText("Nicole Belovoskey", PAGE_PX_W / 2, y + 150);
    }
    context.font = "500 18px Manrope, system-ui, sans-serif";
    context.fillStyle = "rgba(59,49,39,0.7)";
    context.fillText("ideas start here", PAGE_PX_W / 2, y + 205);
    return toTexture(canvas, true);
};

export const fontsReady = () =>
    Promise.race([
        Promise.all([
            document.fonts?.load("italic 600 92px Fraunces"),
            document.fonts?.load("500 22px Manrope"),
        ]),
        new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).catch(() => undefined);
