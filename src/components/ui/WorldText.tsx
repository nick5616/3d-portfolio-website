import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

// Renders flat, camera-agnostic text labels in the 3D world by baking them
// to a canvas texture on a plane, instead of drei's <Text> (troika-three-text).
//
// Why: troika builds its glyph geometry as an InstancedBufferGeometry and
// leaves `geometry.instanceCount` at three.js's own documented default of
// Infinity until its async glyph layout finishes. The classic WebGLRenderer
// derives a real count from the instanced attributes when it sees Infinity,
// but WebGPURenderer's unified backend (both real WebGPU and its own
// internal WebGL2 fallback) passes that Infinity straight into
// GPURenderPassEncoder.drawIndexed(), which throws and can black out the
// whole frame. That's a three.js upstream gap, not fixable from app code.

// Fixed raster resolution per line of text, independent of world-space
// fontSize - supersampled at a constant pixel size so small in-world labels
// (fontSize ~0.02-0.05) still rasterize crisp glyphs instead of a mushy
// 5-10px-tall canvas font, then get downsampled onto their (much smaller)
// world-space plane via mipmapping.
const RASTER_FONT_PX = 96;
const LINE_HEIGHT_FACTOR = 1.2;
const FONT_FAMILY =
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

type AnchorX = "left" | "center" | "right";
type AnchorY = "top" | "middle" | "bottom";

export interface WorldTextProps extends Omit<ThreeElements["mesh"], "children"> {
    children: React.ReactNode;
    fontSize?: number;
    color?: string;
    anchorX?: AnchorX;
    anchorY?: AnchorY;
    maxWidth?: number;
    textAlign?: "left" | "center" | "right";
    outlineWidth?: number;
    outlineColor?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    overflowWrap?: "normal" | "break-word";
}

// Measure-only canvas context, reused across renders/instances.
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d")!;

function breakLongWord(word: string, maxWidthPx: number): string[] {
    const parts: string[] = [];
    let current = "";
    for (const ch of word) {
        const test = current + ch;
        if (current && measureCtx.measureText(test).width > maxWidthPx) {
            parts.push(current);
            current = ch;
        } else {
            current = test;
        }
    }
    parts.push(current);
    return parts;
}

function wrapText(text: string, maxWidthPx: number | undefined): string[] {
    const paragraphs = text.split("\n");
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
        if (paragraph === "") {
            lines.push("");
            continue;
        }
        if (!maxWidthPx) {
            lines.push(paragraph);
            continue;
        }

        const words = paragraph.split(" ");
        let current = "";
        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (measureCtx.measureText(test).width <= maxWidthPx) {
                current = test;
                continue;
            }
            if (current) lines.push(current);
            if (measureCtx.measureText(word).width > maxWidthPx) {
                const broken = breakLongWord(word, maxWidthPx);
                lines.push(...broken.slice(0, -1));
                current = broken[broken.length - 1] ?? "";
            } else {
                current = word;
            }
        }
        lines.push(current);
    }

    return lines;
}

export const WorldText: React.FC<WorldTextProps> = ({
    children,
    fontSize = 1,
    color = "#ffffff",
    anchorX = "center",
    anchorY = "middle",
    maxWidth,
    textAlign = "left",
    outlineWidth = 0,
    outlineColor = "#000000",
    fontWeight = "normal",
    fontStyle = "normal",
    ...meshProps
}) => {
    const text = useMemo(
        () => (Array.isArray(children) ? children.join("") : String(children ?? "")),
        [children]
    );

    const { texture, geometry } = useMemo(() => {
        const unitsPerPx = Math.max(fontSize, 0.001) / RASTER_FONT_PX;
        const fontPx = RASTER_FONT_PX;
        const lineHeightPx = fontPx * LINE_HEIGHT_FACTOR;
        const font = `${fontStyle === "italic" ? "italic " : ""}${
            fontWeight === "bold" ? "bold " : ""
        }${fontPx}px ${FONT_FAMILY}`;
        const outlinePx = outlineWidth / unitsPerPx;
        const maxWidthPx = maxWidth ? maxWidth / unitsPerPx : undefined;

        measureCtx.font = font;
        const lines = wrapText(text, maxWidthPx);
        const contentWidthPx = Math.max(
            ...lines.map((l) => measureCtx.measureText(l).width),
            1
        );

        const canvasWidth = Math.ceil(contentWidthPx + outlinePx * 2);
        const canvasHeight = Math.ceil(
            lineHeightPx * lines.length + outlinePx * 2
        );

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.font = font;
        ctx.textBaseline = "alphabetic";
        ctx.lineJoin = "round";

        let drawX: number;
        if (textAlign === "center") {
            ctx.textAlign = "center";
            drawX = canvasWidth / 2;
        } else if (textAlign === "right") {
            ctx.textAlign = "right";
            drawX = canvasWidth - outlinePx;
        } else {
            ctx.textAlign = "left";
            drawX = outlinePx;
        }

        lines.forEach((line, i) => {
            const drawY = outlinePx + (i + 1) * lineHeightPx - fontPx * 0.2;
            if (outlineWidth > 0) {
                ctx.strokeStyle = outlineColor;
                ctx.lineWidth = outlinePx * 2;
                ctx.strokeText(line, drawX, drawY);
            }
            ctx.fillStyle = color;
            ctx.fillText(line, drawX, drawY);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 8;

        const planeWidth = canvasWidth * unitsPerPx;
        const planeHeight = canvasHeight * unitsPerPx;

        let offsetX = 0;
        if (anchorX === "left") offsetX = planeWidth / 2;
        else if (anchorX === "right") offsetX = -planeWidth / 2;

        let offsetY = 0;
        if (anchorY === "top") offsetY = -planeHeight / 2;
        else if (anchorY === "bottom") offsetY = planeHeight / 2;

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        geometry.translate(offsetX, offsetY, 0);

        return { texture, geometry };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        text,
        fontSize,
        color,
        anchorX,
        anchorY,
        maxWidth,
        textAlign,
        outlineWidth,
        outlineColor,
        fontWeight,
        fontStyle,
    ]);

    useEffect(() => {
        return () => {
            texture.dispose();
            geometry.dispose();
        };
    }, [texture, geometry]);

    // Keyed on the same inputs as the geometry/texture above so any change
    // that rebuilds them (e.g. a typewriter effect updating text every
    // keystroke) fully remounts this mesh instead of reassigning `geometry`
    // on an already-mounted one. WebGPU has a known bug where swapping a
    // mesh's geometry in place corrupts renderer state (see the note in
    // GcsArtFrameByIndex.tsx for the same fix applied there).
    const meshKey = `${text}|${fontSize}|${color}|${anchorX}|${anchorY}|${maxWidth}|${textAlign}|${outlineWidth}|${outlineColor}|${fontWeight}|${fontStyle}`;

    return (
        <mesh key={meshKey} geometry={geometry} {...meshProps}>
            <meshBasicMaterial
                map={texture}
                transparent
                side={THREE.DoubleSide}
                alphaTest={0.01}
            />
        </mesh>
    );
};
