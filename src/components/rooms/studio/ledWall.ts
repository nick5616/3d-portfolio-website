import * as THREE from "three";
import { Signal } from "./studioSignal";

// The LED wall behind the decks: Bird Dog's song-visualizer, ported. Same
// palettes, same trail background, and its waveform, bars, radial and helix
// modes, drawn onto a canvas that becomes the wall's texture.
// (github.com/nick5616/song-visualizer)

export const PALETTES: Record<string, string[]> = {
    cyber: ["#00ffaa", "#00ccff", "#ff2d6e", "#ff77aa"],
    sunset: ["#ff6ec7", "#ffb347", "#ff8c00", "#e040fb"],
    neon: ["#ff00ff", "#00ffff", "#ffff00", "#ff0080"],
    galaxy: ["#6a0dad", "#1a1aff", "#00bfff", "#cc88ff"],
    vaporwave: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff"],
    plasma: ["#9b5de5", "#f15bb5", "#fee440", "#00bbf9"],
    synthwave: ["#ff2975", "#f222ff", "#8c1eff", "#00ffdd"],
    gold: ["#ffd700", "#ffaa00", "#ff8c00", "#ffe066"],
};
export const PALETTE_NAMES = Object.keys(PALETTES);

export type WallMode = "waveform" | "bars" | "radial" | "helix";
export const WALL_MODES: WallMode[] = ["radial", "bars", "waveform", "helix"];

const W = 1024;
const H = 512;
const hex = (v: number) => Math.floor(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");

export class LedWall {
    readonly canvas = document.createElement("canvas");
    readonly texture: THREE.CanvasTexture;
    private ctx: CanvasRenderingContext2D;
    private t = 0;

    constructor() {
        this.canvas.width = W;
        this.canvas.height = H;
        this.ctx = this.canvas.getContext("2d")!;
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, W, H);
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
    }

    draw(mode: WallMode, palette: string[], b: Signal) {
        const ctx = this.ctx;
        this.t += 1;
        // "trail" background, as in the original
        ctx.fillStyle = `rgba(0,0,0,${0.16 + (1 - b.total) * 0.1})`;
        ctx.fillRect(0, 0, W, H);
        if (b.drop > 0.5) {
            ctx.fillStyle = palette[0] + hex(b.drop * 0.15);
            ctx.fillRect(0, 0, W, H);
        }
        switch (mode) {
            case "waveform":
                this.waveform(palette, b);
                break;
            case "bars":
                this.bars(palette, b);
                break;
            case "radial":
                this.radial(palette, b);
                break;
            case "helix":
                this.helix(palette, b);
                break;
        }
        this.texture.needsUpdate = true;
    }

    private waveform(p: string[], b: Signal) {
        const ctx = this.ctx;
        const offsets = [0, 20 + b.mid * 90, -(20 + b.high * 70)];
        for (let c = 0; c < 3; c++) {
            ctx.save();
            ctx.shadowBlur = 24;
            ctx.shadowColor = p[c];
            ctx.strokeStyle = p[c] + (c === 0 ? "ff" : "99");
            ctx.lineWidth = c === 0 ? 4 : 2;
            ctx.beginPath();
            for (let x = 0; x < W; x += 2) {
                const i = Math.floor((x / W) * 128);
                const amp = (b.spectrum[i] / 255) * H * 0.35;
                const y =
                    H / 2 +
                    offsets[c] +
                    Math.sin(x * 0.01 + this.t * 0.04 + c * 1.2) * amp +
                    Math.sin(x * 0.007 + this.t * 0.03 + c) * amp * 0.5;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    private bars(p: string[], b: Signal) {
        const ctx = this.ctx;
        const count = 48;
        const barW = W / count;
        for (let i = 0; i < count; i++) {
            const val = b.spectrum[Math.floor((i / count) * 128)] / 255;
            const barH = val * H * 0.8;
            const color = p[i % p.length];
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.fillStyle = color + "cc";
            ctx.fillRect(i * barW + 2, H / 2 - barH / 2, barW - 4, barH);
            if (barH > 4) {
                ctx.fillStyle = "#ffffff44";
                ctx.fillRect(i * barW + 2, H / 2 - barH / 2 - 4, barW - 4, 4);
                ctx.fillRect(i * barW + 2, H / 2 + barH / 2, barW - 4, 4);
            }
            ctx.restore();
        }
    }

    private radial(p: string[], b: Signal) {
        const ctx = this.ctx;
        const cx = W / 2;
        const cy = H / 2;
        const count = 120;
        const innerR = 70 + b.bass * 60;
        const maxLen = H * 0.36;
        const rot = this.t * 0.004;
        for (let i = 0; i < count; i++) {
            const val = b.spectrum[Math.floor((i / count) * 128)] / 255;
            const angle = (i / count) * Math.PI * 2 + rot - Math.PI / 2;
            const color = p[i % p.length];
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = color;
            ctx.strokeStyle = color + hex(0.4 + val * 0.6);
            ctx.lineWidth = Math.max(2, ((2 * Math.PI * innerR) / count) * 0.6);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * (innerR + val * maxLen), cy + Math.sin(angle) * (innerR + val * maxLen));
            ctx.stroke();
            ctx.restore();
        }
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
        grad.addColorStop(0, p[0] + hex(b.bass * 0.35));
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();
    }

    // The original helix runs top to bottom; the wall is wide, so it runs
    // left to right here.
    private helix(p: string[], b: Signal) {
        const ctx = this.ctx;
        const cy = H / 2;
        const amp = H * 0.32 * (0.6 + b.bass * 0.4 + b.mid * 0.2);
        const turns = 4;
        const steps = 300;
        for (let strand = 0; strand < 2; strand++) {
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = p[strand];
            ctx.strokeStyle = p[strand] + "dd";
            ctx.lineWidth = 2 + b.bass * 4 + b.mid * 2;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const frac = i / steps;
                const theta = frac * Math.PI * 2 * turns + this.t * 0.025 + strand * Math.PI;
                const mod = 0.7 + (b.spectrum[Math.floor(frac * 127)] / 255) * 0.6;
                const y = cy + Math.cos(theta) * amp * mod;
                if (i === 0) ctx.moveTo(frac * W, y);
                else ctx.lineTo(frac * W, y);
            }
            ctx.stroke();
            ctx.restore();
        }
        const rungs = turns * 14;
        for (let i = 0; i < rungs; i++) {
            const frac = i / rungs;
            const theta = frac * Math.PI * 2 * turns + this.t * 0.025;
            const val = b.spectrum[Math.floor(frac * 127)] / 255;
            const mod = 0.7 + val * 0.6;
            ctx.save();
            ctx.globalAlpha = 0.2 + val * 0.8;
            ctx.strokeStyle = p[(i + 1) % p.length];
            ctx.lineWidth = 1 + val * 3;
            ctx.beginPath();
            ctx.moveTo(frac * W, cy + Math.cos(theta) * amp * mod);
            ctx.lineTo(frac * W, cy + Math.cos(theta + Math.PI) * amp * mod);
            ctx.stroke();
            ctx.restore();
        }
    }

    dispose() {
        this.texture.dispose();
    }
}
