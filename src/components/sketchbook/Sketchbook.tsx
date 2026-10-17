import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ArtPiece, getAllArtPieces } from "../../configs/artMetadata";
import { resizedImageUrl } from "../../utils/artImages";
import { useSceneStore } from "../../stores/sceneStore";
import { useArtInspectStore } from "../../stores/artInspectStore";
import { useAchievementStore } from "../../stores/achievementStore";
import { playSound } from "../../audio/soundManager";
import { detectIsMobile } from "../../utils/deviceDetection";
import { useSketchbookStore } from "./sketchbookStore";
import { GemPrompt } from "../ui/GemPrompt";
import { isWorldUnfocused } from "../../utils/worldFocus";
import { ArtCategoryId } from "../../configs/gcsConfig";
import {
    BookStyle,
    blankPage,
    fontsReady,
    frontCover,
    insideCover,
    sketchPage,
} from "./pageArt";

// ---------------------------------------------------------------------------
// Book geometry. Book-local frame: the spine runs along Z, pages open along
// X (right-hand pages point +X, turned pages point -X), Y is up out of the
// lectern. A leaf "turns" by rotating its angle θ about the spine from 0
// (lying on the right) to π (lying on the left).
// ---------------------------------------------------------------------------
const PAGE_W = 0.4;
const PAGE_H = 0.53;
const LEAF_T = 0.0032; // paper thickness
const SEGMENTS = 18; // columns across the page, for bending
const BACK_BOARD = 0.008; // thickness of the back cover board

// Physics (per leaf, angle space)
const GRAVITY = 15; // rad/s^2: pulls a lifted page toward the side it leans to
const AIR = 2.0; // damping
const BOUNCE = 0.16; // restitution when a page lands
const TURN_SPEED = 7.2; // rad/s kick from a key press / click

const READ_DISTANCE = 3.2;
const AUTO_OPEN_DISTANCE = 3.4;
const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const makeLeafGeometry = (width: number, height: number) => {
    const geometry = new THREE.PlaneGeometry(width, height, SEGMENTS, 1);
    geometry.rotateX(-Math.PI / 2); // normal +Y, page top toward -Z
    geometry.translate(width / 2, 0, 0); // hinge at x = 0
    return geometry;
};

const loadBitmap = async (url: string): Promise<ImageBitmap | null> => {
    try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) return null;
        const bitmap = await createImageBitmap(await response.blob());
        const longest = Math.max(bitmap.width, bitmap.height);
        if (longest <= 1100) return bitmap;
        const scale = 1100 / longest;
        try {
            const resized = await createImageBitmap(bitmap, {
                resizeWidth: Math.round(bitmap.width * scale),
                resizeHeight: Math.round(bitmap.height * scale),
                resizeQuality: "high",
            });
            bitmap.close();
            return resized;
        } catch {
            return bitmap;
        }
    } catch {
        return null;
    }
};

interface LeafRender {
    geometry: THREE.PlaneGeometry;
    front: THREE.MeshStandardMaterial;
    back: THREE.MeshStandardMaterial;
    baseZ: Float32Array; // each vertex's z (along the spine)
    column: Uint8Array; // each vertex's column index
    flex: number; // 1 = paper, ~0 = stiff board
    width: number;
    loaded: boolean;
}

// A mirrored book is the same book drawn with scale.x = -1: spine on the
// right, pages turning left to right. All the physics and pointer maths
// stay in book-local space, so only the textures (flipped back to read
// correctly) and the arrow keys need to know.
export const Sketchbook: React.FC<{
    position: [number, number, number];
    rotation: [number, number, number];
    category: ArtCategoryId;
    style: BookStyle;
    mirrored?: boolean;
    finishAchievement?: string;
}> = ({ position, rotation, category, style, mirrored = false, finishAchievement }) => {
    const camera = useThree((state) => state.camera);
    const gl = useThree((state) => state.gl);
    const groupRef = useRef<THREE.Group>(null);
    const hitRef = useRef<THREE.Mesh>(null);
    const [pieces, setPieces] = useState<ArtPiece[]>([]);
    const reading = useSketchbookStore((s) => s.reading);
    const aimed = useSketchbookStore((s) => s.aimed);
    const isMobile = useMemo(() => detectIsMobile(), []);

    useEffect(() => {
        getAllArtPieces(category).then(setPieces).catch(() => setPieces([]));
    }, [category]);

    // Leaf 0 is the front cover; every following leaf carries two sketches.
    const leafCount = pieces.length ? 1 + Math.ceil(pieces.length / 2) : 0;

    const paperMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#efe6d2",
                roughness: 0.95,
            }),
        []
    );

    const leaves = useMemo<LeafRender[]>(() => {
        return Array.from({ length: leafCount }, (_, i) => {
            const isCover = i === 0;
            const width = isCover ? PAGE_W + 0.012 : PAGE_W;
            const geometry = makeLeafGeometry(
                width,
                isCover ? PAGE_H + 0.016 : PAGE_H
            );
            const positions = geometry.attributes.position;
            const baseZ = new Float32Array(positions.count);
            const column = new Uint8Array(positions.count);
            for (let v = 0; v < positions.count; v++) {
                baseZ[v] = positions.getZ(v);
                column[v] = Math.round(
                    (positions.getX(v) / width) * SEGMENTS
                );
            }
            const make = () =>
                new THREE.MeshStandardMaterial({
                    // Paper-colored until the page's artwork arrives.
                    color: isCover ? style.leather[1] : "#efe6d2",
                    roughness: isCover ? 0.6 : 0.93,
                    side: THREE.FrontSide,
                });
            const front = make();
            const back = make();
            back.side = THREE.BackSide;
            front.map = null;
            back.map = null;
            return {
                geometry,
                front,
                back,
                baseZ,
                column,
                flex: isCover ? 0.06 : 1,
                width,
                loaded: false,
            };
        });
    }, [leafCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(
        () => () => {
            leaves.forEach((leaf) => {
                leaf.geometry.dispose();
                leaf.front.map?.dispose();
                leaf.back.map?.dispose();
                leaf.front.dispose();
                leaf.back.dispose();
            });
        },
        [leaves]
    );

    // Physics state
    const theta = useRef(new Float32Array(0));
    const omega = useRef(new Float32Array(0));
    const dirty = useRef<boolean[]>([]);
    useEffect(() => {
        theta.current = new Float32Array(leafCount);
        omega.current = new Float32Array(leafCount);
        dirty.current = Array(leafCount).fill(true);
    }, [leafCount]);

    const spreadOf = () => {
        let s = 0;
        theta.current.forEach((t) => {
            if (t > Math.PI / 2) s++;
        });
        return s;
    };

    // ---------------------------------------------------------------- textures
    const imageFor = (leaf: number, side: "front" | "back") => {
        if (leaf === 0) return null;
        if (pieces.length === 0) return null;
        // Every side of every page carries a sketch; with an odd count the
        // last page's back wraps around to the first one.
        const index = 2 * (leaf - 1) + (side === "back" ? 1 : 0);
        return index % pieces.length;
    };

    const loadLeaf = async (i: number) => {
        const leaf = leaves[i];
        if (!leaf || leaf.loaded) return;
        leaf.loaded = true;
        if (i === 0) {
            await fontsReady();
            leaf.front.map = frontCover(style, mirrored);
            leaf.back.map = insideCover(style, mirrored);
        } else {
            const sides = await Promise.all(
                (["front", "back"] as const).map(async (side) => {
                    // In a mirrored book the front of a leaf has its spine
                    // on the right; compositing it that way and letting the
                    // texture flip undo the mirror lands everything right.
                    const spineOnLeft = (side === "front") !== mirrored;
                    const index = imageFor(i, side);
                    if (index === null) return blankPage(spineOnLeft);
                    const bitmap = await loadBitmap(
                        resizedImageUrl(pieces[index].url, 1100, 80)
                    );
                    const texture = sketchPage(bitmap, index + 1, spineOnLeft);
                    bitmap?.close();
                    return texture;
                })
            );
            if (!leaf.loaded) {
                sides.forEach((texture) => texture.dispose());
                return; // unloaded while we were working
            }
            [leaf.front.map, leaf.back.map] = sides;
        }
        leaf.front.color.set("#ffffff");
        leaf.back.color.set("#ffffff");
        leaf.front.needsUpdate = true;
        leaf.back.needsUpdate = true;
    };

    const unloadLeaf = (i: number) => {
        const leaf = leaves[i];
        if (!leaf?.loaded || i === 0) return;
        leaf.loaded = false;
        leaf.front.map?.dispose();
        leaf.back.map?.dispose();
        leaf.front.map = null;
        leaf.back.map = null;
        leaf.front.color.set("#efe6d2");
        leaf.back.color.set("#efe6d2");
        leaf.front.needsUpdate = true;
        leaf.back.needsUpdate = true;
    };

    // Keep textures for a few spreads around the open one; free the rest.
    const lastLodSpread = useRef(-99);
    const updateTextures = (spread: number) => {
        if (spread === lastLodSpread.current) return;
        lastLodSpread.current = spread;
        leaves.forEach((_, i) => {
            if (i >= spread - 2 && i <= spread + 3) loadLeaf(i);
            else if (i < spread - 5 || i > spread + 6) unloadLeaf(i);
        });
    };

    // --------------------------------------------------------------- controls
    const next = () => {
        const t = theta.current;
        for (let i = 0; i < t.length; i++) {
            if (t[i] < Math.PI / 2 && omega.current[i] < 1) {
                omega.current[i] = TURN_SPEED;
                dirty.current[i] = true;
                playSound(i === 0 ? "book-open" : "book-page-turn");
                return;
            }
        }
    };
    const prev = () => {
        const t = theta.current;
        for (let i = t.length - 1; i >= 0; i--) {
            if (t[i] > Math.PI / 2 && omega.current[i] > -1) {
                omega.current[i] = -TURN_SPEED;
                dirty.current[i] = true;
                playSound(i === 0 ? "book-close" : "book-page-turn");
                return;
            }
        }
    };

    // ------------------------------------------------------------ reading mode
    const tween = useRef<{
        from: THREE.Vector3;
        fromQ: THREE.Quaternion;
        to: THREE.Vector3;
        toQ: THREE.Quaternion;
        t: number;
        leaving: boolean;
    } | null>(null);
    const saved = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion } | null>(null);
    const exitedWithKey = useRef(false);

    const readingPose = () => {
        const group = groupRef.current!;
        group.updateWorldMatrix(true, false);
        const center = new THREE.Vector3(0, 0.05, 0).applyMatrix4(group.matrixWorld);
        const up = new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld);
        const towardReader = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
        const position = center
            .clone()
            .addScaledVector(up, 0.66)
            .addScaledVector(towardReader, 0.3);
        const look = new THREE.Matrix4().lookAt(position, center, new THREE.Vector3(0, 1, 0));
        return { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(look) };
    };

    const enterReading = () => {
        if (useSketchbookStore.getState().reading || !groupRef.current) return;
        const scene = useSceneStore.getState();
        scene.setIsInteracting(true);
        scene.setCameraOverride(true);
        if (document.pointerLockElement) document.exitPointerLock();
        saved.current = {
            position: camera.position.clone(),
            quaternion: camera.quaternion.clone(),
        };
        const pose = readingPose();
        tween.current = {
            from: camera.position.clone(),
            fromQ: camera.quaternion.clone(),
            to: pose.position,
            toQ: pose.quaternion,
            t: 0,
            leaving: false,
        };
        useSketchbookStore.getState().set({ reading: true, aimed: false });
        // Opening the book is the first thing you'd do anyway.
        if (spreadOf() === 0) setTimeout(next, 450);
    };

    const exitReading = (withKey = false) => {
        if (!useSketchbookStore.getState().reading || !saved.current) return;
        exitedWithKey.current = withKey;
        tween.current = {
            from: camera.position.clone(),
            fromQ: camera.quaternion.clone(),
            to: saved.current.position,
            toQ: saved.current.quaternion,
            t: 0,
            leaving: true,
        };
        useSketchbookStore.getState().set({ reading: false });
    };

    useEffect(() => {
        useSketchbookStore.getState().set({
            controls: { next, prev, exit: () => exitReading(false) },
        });
        return () => useSketchbookStore.getState().set({ controls: null });
    });

    useEffect(() => {
        useSketchbookStore.getState().set({
            leaves: leafCount,
            images: pieces.length,
            title: style.title,
            mirrored,
        });
    }, [leafCount, pieces.length, style.title, mirrored]);

    // Keyboard
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            // One action per keypress, even if a stale copy of this listener
            // survived a hot reload.
            const marked = event as KeyboardEvent & { __sketchbookHandled?: boolean };
            if (marked.__sketchbookHandled) return;
            marked.__sketchbookHandled = true;
            // The art inspector (opened from a page) owns the keyboard.
            if (useArtInspectStore.getState().inspecting) return;
            const { reading, aimed } = useSketchbookStore.getState();
            if (!reading) {
                if (event.code === "KeyE" && aimed && !event.repeat) {
                    event.stopPropagation();
                    enterReading();
                }
                return;
            }
            // Arrows follow the page: a mirrored book turns forward to the
            // right, so "next" is the left arrow there.
            const forward = mirrored ? ["ArrowLeft", "KeyA"] : ["ArrowRight", "KeyD"];
            const back = mirrored ? ["ArrowRight", "KeyD"] : ["ArrowLeft", "KeyA"];
            switch (event.code) {
                case forward[0]:
                case forward[1]:
                case "Space":
                    next();
                    break;
                case back[0]:
                case back[1]:
                    prev();
                    break;
                case "KeyE":
                case "KeyQ":
                    if (!event.repeat) exitReading(true);
                    break;
                case "Escape":
                    exitReading(false);
                    break;
                default:
                    return;
            }
            event.preventDefault();
            event.stopPropagation();
        };
        const onTap = () => {
            if (isMobile && useSketchbookStore.getState().aimed) enterReading();
        };
        window.addEventListener("keydown", onKey, true);
        window.addEventListener("click", onTap);
        window.addEventListener("virtualtap", onTap);
        return () => {
            window.removeEventListener("keydown", onKey, true);
            window.removeEventListener("click", onTap);
            window.removeEventListener("virtualtap", onTap);
        };
    });

    // Leaving the room mid-read must hand the camera back.
    useEffect(
        () => () => {
            const scene = useSceneStore.getState();
            if (useSketchbookStore.getState().reading || scene.cameraOverride) {
                scene.setCameraOverride(false);
                scene.setIsInteracting(false);
            }
            useSketchbookStore.getState().set({ reading: false, aimed: false });
        },
        []
    );

    // ------------------------------------------------------------- dragging
    const drag = useRef<{
        leaf: number;
        startX: number;
        startY: number;
        startTime: number;
        side: "left" | "right";
        targetTheta: number;
        moved: boolean;
    } | null>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const pointerNdc = useRef(new THREE.Vector2());
    const bookPlane = useRef(new THREE.Plane());

    // Pointer -> book-local X (where along the open spread the pointer is).
    const pointerLocalX = (clientX: number, clientY: number) => {
        const group = groupRef.current;
        if (!group) return null;
        const rect = gl.domElement.getBoundingClientRect();
        pointerNdc.current.set(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.current.setFromCamera(pointerNdc.current, camera);
        const normal = new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld);
        const origin = new THREE.Vector3(0, 0.03, 0).applyMatrix4(group.matrixWorld);
        bookPlane.current.setFromNormalAndCoplanarPoint(normal, origin);
        const hit = new THREE.Vector3();
        if (!raycaster.current.ray.intersectPlane(bookPlane.current, hit)) return null;
        return group.worldToLocal(hit).x;
    };

    useEffect(() => {
        if (!reading) return;
        const element = gl.domElement;
        const onDown = (event: PointerEvent) => {
            if (useArtInspectStore.getState().inspecting) return;
            const x = pointerLocalX(event.clientX, event.clientY);
            if (x === null || Math.abs(x) > PAGE_W * 1.05) return;
            const t = theta.current;
            let leaf = -1;
            if (x >= 0) {
                for (let i = 0; i < t.length; i++) if (t[i] < Math.PI / 2) { leaf = i; break; }
            } else {
                for (let i = t.length - 1; i >= 0; i--) if (t[i] > Math.PI / 2) { leaf = i; break; }
            }
            if (leaf < 0) return;
            drag.current = {
                leaf,
                startX: event.clientX,
                startY: event.clientY,
                startTime: performance.now(),
                side: x >= 0 ? "right" : "left",
                targetTheta: t[leaf],
                moved: false,
            };
            element.setPointerCapture?.(event.pointerId);
        };
        const onMove = (event: PointerEvent) => {
            const current = drag.current;
            if (!current) return;
            if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6) {
                current.moved = true;
            }
            if (!current.moved) return;
            const x = pointerLocalX(event.clientX, event.clientY);
            if (x === null) return;
            current.targetTheta = Math.acos(THREE.MathUtils.clamp(x / PAGE_W, -1, 1));
        };
        const onUp = () => {
            const current = drag.current;
            drag.current = null;
            if (!current) return;
            if (!current.moved && performance.now() - current.startTime < 350) {
                if (current.side === "right") next();
                else prev();
            } else if (Math.abs(omega.current[current.leaf]) > 2) {
                playSound("book-page-turn");
            }
        };
        const onDoubleClick = (event: MouseEvent) => {
            const x = pointerLocalX(event.clientX, event.clientY);
            if (x === null || Math.abs(x) > PAGE_W) return;
            const spread = spreadOf();
            const index =
                x >= 0 ? imageFor(spread, "front") : imageFor(spread - 1, "back");
            if (index !== null) {
                useArtInspectStore.getState().openInspect(category, index);
            }
        };
        element.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        element.addEventListener("dblclick", onDoubleClick);
        return () => {
            element.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            element.removeEventListener("dblclick", onDoubleClick);
        };
    }, [reading, gl, camera, leaves]); // eslint-disable-line react-hooks/exhaustive-deps

    // ---------------------------------------------------------- per frame
    const columnX = useMemo(() => new Float32Array(SEGMENTS + 1), []);
    const columnY = useMemo(() => new Float32Array(SEGMENTS + 1), []);
    const leafMeshes = useRef<(THREE.Group | null)[]>([]);
    const aimFrame = useRef(0);
    const finishedOnce = useRef(false);
    const autoOpened = useRef(false);
    const bookWorld = useMemo(() => new THREE.Vector3(), []);
    const rightBlock = useRef<THREE.Mesh>(null);
    const leftBlock = useRef<THREE.Mesh>(null);
    const spine = useRef<THREE.Group>(null);

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 1 / 30);
        const store = useSketchbookStore.getState();

        // Camera tween in/out of the reading pose
        const tw = tween.current;
        if (tw) {
            tw.t = Math.min(1, tw.t + delta / 0.85);
            const e = easeInOut(tw.t);
            camera.position.lerpVectors(tw.from, tw.to, e);
            camera.quaternion.slerpQuaternions(tw.fromQ, tw.toQ, e);
            if (tw.t >= 1) {
                tween.current = null;
                if (tw.leaving) {
                    const scene = useSceneStore.getState();
                    scene.setCameraOverride(false);
                    scene.setIsInteracting(false);
                    if (exitedWithKey.current) {
                        gl.domElement.requestPointerLock?.();
                    }
                }
            }
        }

        // The book starts closed and swings open by itself the first time
        // you walk up to it.
        if (!autoOpened.current && groupRef.current && theta.current.length > 0) {
            groupRef.current.getWorldPosition(bookWorld);
            if (camera.position.distanceTo(bookWorld) < AUTO_OPEN_DISTANCE) {
                autoOpened.current = true;
                if (spreadOf() === 0) setTimeout(next, 250);
            }
        }

        // Aim check (when walking around, not reading)
        if (!store.reading && !tw && hitRef.current && aimFrame.current++ % 3 === 0) {
            raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
            raycaster.current.far = READ_DISTANCE;
            const isAimed =
                raycaster.current.intersectObject(hitRef.current, false).length > 0 &&
                !isWorldUnfocused();
            if (isAimed !== store.aimed) store.set({ aimed: isAimed });
        }

        // Physics
        const t = theta.current;
        const w = omega.current;
        const n = t.length;
        const dragging = drag.current?.moved ? drag.current : null;
        for (let i = 0; i < n; i++) {
            const before = t[i];
            if (dragging && dragging.leaf === i) {
                const next = before + (dragging.targetTheta - before) * Math.min(1, delta * 16);
                w[i] = (next - before) / Math.max(delta, 1e-4);
                t[i] = next;
            } else if (w[i] !== 0 || (t[i] > 0.0005 && t[i] < Math.PI - 0.0005)) {
                // Gravity tips the page toward whichever side it leans to.
                const alpha = -GRAVITY * Math.cos(t[i]) - AIR * w[i];
                w[i] += alpha * delta;
                t[i] += w[i] * delta;
                if (t[i] <= 0) {
                    t[i] = 0;
                    w[i] = Math.abs(w[i]) > 0.6 ? -w[i] * BOUNCE : 0;
                } else if (t[i] >= Math.PI) {
                    t[i] = Math.PI;
                    w[i] = Math.abs(w[i]) > 0.6 ? -w[i] * BOUNCE : 0;
                }
            }
            // Pages can't pass through each other: an earlier leaf is
            // always at least as far turned as a later one.
            if (i > 0 && t[i] > t[i - 1]) {
                t[i - 1] = t[i];
                w[i - 1] = Math.max(w[i - 1], w[i]);
                dirty.current[i - 1] = true;
            }
            if (t[i] !== before || w[i] !== 0) dirty.current[i] = true;
        }

        // Deform the leaves that moved
        const turnedCount = spreadOf();
        for (let i = 0; i < n; i++) {
            if (!dirty.current[i]) continue;
            dirty.current[i] = false;
            const leaf = leaves[i];
            const group = leafMeshes.current[i];
            if (!leaf || !group) continue;
            const angle = t[i];
            // Air drag bends the page against its motion; its own weight
            // makes the free edge droop while it's lifted.
            const bend =
                (THREE.MathUtils.clamp(-w[i] * 0.075, -0.7, 0.7) -
                    0.55 * Math.cos(angle) * Math.sin(angle)) *
                leaf.flex;
            const ds = leaf.width / SEGMENTS;
            let x = 0;
            let y = 0;
            columnX[0] = 0;
            columnY[0] = 0;
            for (let k = 1; k <= SEGMENTS; k++) {
                const a = angle + bend * Math.pow(k / SEGMENTS, 1.6);
                x += Math.cos(a) * ds;
                y += Math.sin(a) * ds;
                columnX[k] = x;
                columnY[k] = Math.max(y, -0.002);
            }
            const positions = leaf.geometry.attributes.position as THREE.BufferAttribute;
            for (let v = 0; v < positions.count; v++) {
                const k = leaf.column[v];
                positions.setXYZ(v, columnX[k], columnY[k], leaf.baseZ[v]);
            }
            positions.needsUpdate = true;
            leaf.geometry.computeVertexNormals();
            leaf.geometry.computeBoundingSphere();
            // Resting height: the stack it lies on (cover on top on the
            // right, most recently turned on top on the left).
            const restRight = BACK_BOARD + (n - i) * LEAF_T;
            const restLeft = 0.003 + i * LEAF_T;
            const blend = THREE.MathUtils.smoothstep(angle, 0, Math.PI);
            group.position.y = THREE.MathUtils.lerp(restRight, restLeft, blend);
        }

        if (store.spread !== turnedCount) {
            store.set({ spread: turnedCount });
            if (turnedCount === n && n > 0 && !finishedOnce.current) {
                finishedOnce.current = true;
                if (finishAchievement) {
                    useAchievementStore.getState().unlock(finishAchievement);
                }
            }
        }
        if (leaves.length) updateTextures(turnedCount);

        // Page edges: each side's block fills the space *under* the top
        // page on that side and stops just short of it. (Matching the top
        // page's height exactly made the two surfaces z-fight, and a block
        // one page too tall hid the top page's art entirely.)
        let topRight = -1; // lowest-index unturned paper leaf = the visible right page
        let topLeft = -1; // highest-index turned paper leaf = the visible left page
        for (let i = 1; i < n; i++) {
            if (t[i] > Math.PI / 2) topLeft = i;
            else if (topRight < 0) topRight = i;
        }
        const restRightOf = (i: number) => BACK_BOARD + (n - i) * LEAF_T;
        const restLeftOf = (i: number) => 0.003 + i * LEAF_T;
        if (rightBlock.current) {
            const top = topRight > 0 ? restRightOf(topRight) - LEAF_T * 0.6 : BACK_BOARD;
            const h = top - BACK_BOARD;
            rightBlock.current.visible = h > 0.0008;
            rightBlock.current.scale.y = Math.max(h, 0.0005);
            rightBlock.current.position.y = BACK_BOARD + h / 2;
        }
        if (leftBlock.current) {
            const bottom = restLeftOf(0) + LEAF_T * 0.6; // just above the cover
            const top = topLeft > 0 ? restLeftOf(topLeft) - LEAF_T * 0.6 : bottom;
            const h = top - bottom;
            leftBlock.current.visible = h > 0.0008;
            leftBlock.current.scale.y = Math.max(h, 0.0005);
            leftBlock.current.position.y = bottom + h / 2;
        }
        // The spine is a full rounded edge while the book is shut and
        // flexes flat into the binding as the cover opens.
        if (spine.current && n > 0) {
            const open = THREE.MathUtils.clamp(t[0] / (Math.PI / 2), 0, 1);
            spine.current.scale.x = 1 - open * 0.85;
        }
    });

    const bookThickness = BACK_BOARD + leafCount * LEAF_T + 0.004;

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={[mirrored ? -1 : 1, 1, 1]}
        >
            {/* Back board: the only fixed board. The front cover is leaf 0,
                which swings over to the left when the book opens. */}
            <mesh position={[PAGE_W / 2 + 0.006, BACK_BOARD / 2, 0]}>
                <boxGeometry args={[PAGE_W + 0.014, BACK_BOARD, PAGE_H + 0.018]} />
                <meshStandardMaterial color={style.board} roughness={0.6} />
            </mesh>
            {/* Spine: a rounded leather edge as thick as the whole book,
                with two gold bands */}
            <group ref={spine} position={[0, bookThickness / 2, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[bookThickness / 2, bookThickness / 2, PAGE_H + 0.018, 18, 1, true, Math.PI, Math.PI]} />
                    <meshStandardMaterial color={style.board} roughness={0.55} side={THREE.DoubleSide} />
                </mesh>
                {[-0.2, 0.2].map((z) => (
                    <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[bookThickness / 2 + 0.0015, bookThickness / 2 + 0.0015, 0.012, 18, 1, true, Math.PI, Math.PI]} />
                        <meshStandardMaterial color="#c49a3c" roughness={0.35} metalness={1} side={THREE.DoubleSide} />
                    </mesh>
                ))}
            </group>
            {/* Page edges: one block per side, sized to the paper on it */}
            <mesh ref={rightBlock} position={[PAGE_W / 2, BACK_BOARD, 0]} scale={[PAGE_W - 0.004, 0.001, PAGE_H - 0.004]}>
                <boxGeometry args={[1, 1, 1]} />
                <primitive object={paperMaterial} attach="material" />
            </mesh>
            <mesh ref={leftBlock} position={[-PAGE_W / 2, 0.004, 0]} scale={[PAGE_W - 0.004, 0.001, PAGE_H - 0.004]} visible={false}>
                <boxGeometry args={[1, 1, 1]} />
                <primitive object={paperMaterial} attach="material" />
            </mesh>

            {leaves.map((leaf, i) => (
                <group
                    key={i}
                    ref={(group) => {
                        leafMeshes.current[i] = group;
                    }}
                >
                    <mesh geometry={leaf.geometry} material={leaf.front} />
                    <mesh geometry={leaf.geometry} material={leaf.back} />
                </group>
            ))}

            {/* Invisible hit area over the open spread */}
            <mesh ref={hitRef} position={[0, 0.06, 0]} visible={false}>
                <boxGeometry args={[PAGE_W * 2.1, 0.12, PAGE_H * 1.05]} />
            </mesh>

            {aimed && !reading && (
                <Html position={[0, 0.25, PAGE_H / 2 + 0.1]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                    <GemPrompt
                        accent="gold"
                        keyLabel={isMobile ? null : "E"}
                        action={isMobile ? `Tap to read ${style.title}` : `Read ${style.title}`}
                    />
                </Html>
            )}
        </group>
    );
};
