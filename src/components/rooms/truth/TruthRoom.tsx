import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoomEnvironmentReady } from "../../core/RoomEnvironmentReady";
import { useAimTargets } from "../../core/useAimTargets";
import { GemPrompt } from "../../ui/GemPrompt";
import { ArtPiece, getAllArtPieces } from "../../../configs/artMetadata";
import { artTargets, useArtInspectStore } from "../../../stores/artInspectStore";
import { useSceneStore } from "../../../stores/sceneStore";
import { useAchievementStore } from "../../../stores/achievementStore";
import { requestArtTexture } from "../../../utils/artTextureLoader";
import { resizedImageUrl } from "../../../utils/artImages";
import { playSound } from "../../../audio/soundManager";
import {
    EYE_CENTER,
    EYE_RADIUS,
    PATH_N,
    Tendril,
    buildTendrilMesh,
    buildTendrils,
    createEyeMaterial,
    createGenieMaterial,
    setMap,
    tendrilPoint,
} from "./truthShaders";
import { TruthTunnel } from "./TruthTunnel";
import "./truth.css";

// Notes App Art: the deepest room in the gallery, and nothing like the
// others. A white void, a black eye hanging in it, and ink lines radiating
// from the eye like the sketch it was drawn from. The drawings pour out of
// the eye along those lines and get sucked back in, genie-style. Look into
// the eye and it pulls you through, past everything at once.

const HALF = 8; // walkable half-size (the room config is 16 x 16)
const CARD_MAX = 1.15; // a card's longest side, metres
const IMAGE_SIZE = 1024;
const MAX_CARDS = 9; // never crowd them

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type CardState = "waiting" | "out" | "rest" | "in";

interface Card {
    id: string;
    tendril: Tendril;
    t: number; // where on its tendril it hangs
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    proxy: THREE.Mesh; // flat stand-in the crosshair raycast can hit
    proxyRef: { current: THREE.Object3D | null };
    state: CardState;
    clock: number;
    restFor: number;
    piece: number;
    loading: boolean;
    release: (() => void) | null;
    size: THREE.Vector2;
}

// ------------------------------------------------------------ the void
const useWhiteVoid = () => {
    const { scene } = useThree();
    const fog = useMemo(() => new THREE.Fog("#ffffff", 12, 45), []);
    useEffect(() => {
        const previous = scene.fog;
        scene.fog = fog;
        return () => {
            if (scene.fog === fog) scene.fog = previous;
        };
    }, [scene, fog]);
    useFrame(() => {
        // SceneManager sets its own fog on mount; keep ours while we're here.
        if (scene.fog !== fog) scene.fog = fog;
    });
};

// A soft grey pool under the eye: the only hint that there's a floor.
const floorShadow = () => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0,0,0,0.16)");
    gradient.addColorStop(0.35, "rgba(0,0,0,0.06)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

export const TruthRoom: React.FC = () => {
    useWhiteVoid();
    const { camera } = useThree();
    const aim = useAimTargets();
    const [pieces, setPieces] = useState<ArtPiece[]>([]);
    const [diving, setDiving] = useState(false);
    const [phase, setPhase] = useState<"idle" | "pull" | "tunnel" | "return">("idle");
    const phaseRef = useRef<typeof phase>("idle");
    const stage = useRef<THREE.Group>(null);
    const sky = useRef<THREE.Mesh>(null);

    useEffect(() => {
        getAllArtPieces("notesappart").then(setPieces).catch(() => setPieces([]));
    }, []);

    const tendrils = useMemo(() => buildTendrils(13), []);
    const tendrilMesh = useMemo(() => buildTendrilMesh(tendrils), [tendrils]);
    const eyeMaterial = useMemo(createEyeMaterial, []);
    const shadow = useMemo(floorShadow, []);
    const eye = useRef<THREE.Mesh | null>(null);

    // --------------------------------------------------------- the cards
    // One card per tendril (fewer if there are fewer drawings), each hung
    // at a reachable spot along it.
    const cards = useMemo<Card[]>(() => {
        if (!pieces.length) return [];
        // Prefer tendrils whose hanging spot is at a height you can reach.
        const ranked = tendrils
            .map((tendril, i) => {
                const t = 0.38 + ((i * 0.37) % 0.3);
                const y = tendrilPoint(tendril, t, 0).y;
                return { tendril, t, i, reach: Math.abs(y - 2) };
            })
            .sort((a, b) => a.reach - b.reach)
            .slice(0, Math.min(pieces.length, MAX_CARDS));
        return ranked.map(({ tendril, t, i }, k) => {
            const material = createGenieMaterial();
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 20, 20), material);
            mesh.frustumCulled = false;
            mesh.visible = false;
            mesh.raycast = () => undefined;
            const proxy = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
            );
            return {
                id: `truth-card-${i}`,
                tendril,
                t,
                mesh,
                material,
                proxy,
                proxyRef: { current: proxy },
                state: "waiting" as CardState,
                clock: -0.6 - k * 0.55, // stagger the first pours
                restFor: 0,
                piece: k,
                loading: false,
                release: null,
                size: new THREE.Vector2(1, 1),
            };
        });
    }, [pieces, tendrils]);
    const nextPiece = useRef(0);
    useEffect(() => {
        nextPiece.current = cards.length;
    }, [cards]);

    useEffect(() => {
        cards.forEach((card) => {
            artTargets.set(card.id, { object: card.proxyRef, category: "notesappart", index: card.piece });
        });
        return () => {
            cards.forEach((card) => {
                artTargets.delete(card.id);
                card.release?.();
                card.mesh.geometry.dispose();
                card.material.dispose();
                card.proxy.geometry.dispose();
                (card.proxy.material as THREE.Material).dispose();
            });
            const { aimed, setAimed } = useArtInspectStore.getState();
            if (aimed?.id.startsWith("truth-card-")) setAimed(null);
        };
    }, [cards]);

    useEffect(
        () => () => {
            tendrilMesh.geometry.dispose();
            (tendrilMesh.material as THREE.Material).dispose();
            eyeMaterial.dispose();
            shadow.dispose();
        },
        [tendrilMesh, eyeMaterial, shadow]
    );

    const loadInto = (card: Card) => {
        if (card.loading || !pieces.length) return;
        card.loading = true;
        const index = card.piece;
        const request = requestArtTexture(resizedImageUrl(pieces[index].url, IMAGE_SIZE), {
            maxSize: IMAGE_SIZE,
        });
        request.promise.then(
            (texture) => {
                card.loading = false;
                card.release?.();
                card.release = request.release;
                setMap(card.material, texture);
                const image = texture.image as { width: number; height: number };
                const aspect = image.width / Math.max(image.height, 1);
                card.size.set(
                    aspect >= 1 ? CARD_MAX : CARD_MAX * aspect,
                    aspect >= 1 ? CARD_MAX / aspect : CARD_MAX
                );
                card.material.uniforms.uSize.value.copy(card.size);
                const target = artTargets.get(card.id);
                if (target) target.index = index;
                card.state = "out";
                card.clock = 0;
                card.mesh.visible = true;
            },
            () => {
                request.release();
                card.loading = false;
                card.piece = (card.piece + 1) % pieces.length;
                card.clock = -1;
            }
        );
    };

    // ------------------------------------------------------ the dive
    const saved = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion; fov: number } | null>(null);
    const dive = useRef({ t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), toQ: new THREE.Quaternion() });
    const setPhaseBoth = (next: typeof phase) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const startDive = () => {
        if (phaseRef.current !== "idle" || useArtInspectStore.getState().inspecting) return;
        const scene = useSceneStore.getState();
        scene.setIsInteracting(true);
        scene.setCameraOverride(true);
        const perspective = camera as THREE.PerspectiveCamera;
        saved.current = {
            position: camera.position.clone(),
            quaternion: camera.quaternion.clone(),
            fov: perspective.fov,
        };
        dive.current.t = 0;
        dive.current.from.copy(camera.position);
        dive.current.fromQ.copy(camera.quaternion);
        const look = new THREE.Matrix4().lookAt(camera.position, EYE_CENTER, new THREE.Vector3(0, 1, 0));
        dive.current.toQ.setFromRotationMatrix(look);
        setPhaseBoth("pull");
        playSound("door-enter");
    };

    const finishDive = () => {
        if (phaseRef.current === "idle" || phaseRef.current === "return") return;
        setPhaseBoth("return");
        dive.current.t = 0;
    };

    // Escape / E / Q let you out early.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (phaseRef.current !== "tunnel") return;
            if (["Escape", "KeyE", "KeyQ"].includes(event.code) && !event.repeat) {
                event.preventDefault();
                event.stopPropagation();
                finishDive();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hide the HUD while you're in there.
    useEffect(() => {
        if (phase === "idle") return;
        document.body.classList.add("hud-hidden");
        return () => document.body.classList.remove("hud-hidden");
    }, [phase]);

    // Leaving mid-dive must hand the camera back.
    useEffect(
        () => () => {
            const scene = useSceneStore.getState();
            if (phaseRef.current !== "idle") {
                scene.setCameraOverride(false);
                scene.setIsInteracting(false);
                const perspective = camera as THREE.PerspectiveCamera;
                if (saved.current) {
                    perspective.fov = saved.current.fov;
                    perspective.updateProjectionMatrix();
                }
            }
        },
        [camera]
    );

    // ---------------------------------------------------------- frame
    const scratch = useMemo(
        () => ({
            center: new THREE.Vector3(),
            normal: new THREE.Vector3(),
            right: new THREE.Vector3(),
            up: new THREE.Vector3(),
            lead: new THREE.Vector3(),
            side: new THREE.Vector3(),
            toEye: new THREE.Vector3(),
            point: new THREE.Vector3(),
            basis: new THREE.Matrix4(),
            worldUp: new THREE.Vector3(0, 1, 0),
        }),
        []
    );

    useFrame(({ clock }, rawDelta) => {
        const delta = Math.min(rawDelta, 1 / 20);
        const time = clock.elapsedTime;
        (tendrilMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
        eyeMaterial.uniforms.uTime.value = time;
        sky.current?.position.copy(camera.position);

        // The eye always faces you, like a drawn circle would.
        if (eye.current) eye.current.quaternion.copy(camera.quaternion);
        const wantOpen = aim.hovered === "eye" || phaseRef.current !== "idle" ? 1 : 0;
        eyeMaterial.uniforms.uOpen.value += (wantOpen - eyeMaterial.uniforms.uOpen.value) * Math.min(1, delta * 3);

        // --- the dive
        const perspective = camera as THREE.PerspectiveCamera;
        const d = dive.current;
        if (phaseRef.current === "pull") {
            d.t = Math.min(1, d.t + delta / 1.6);
            const e = ease(d.t);
            // Drawn in toward the eye; the view widens as you fall in.
            camera.position.lerpVectors(d.from, EYE_CENTER, e * 0.97);
            camera.quaternion.slerpQuaternions(d.fromQ, d.toQ, Math.min(1, e * 1.6));
            perspective.fov = THREE.MathUtils.lerp(saved.current!.fov, 115, e);
            perspective.updateProjectionMatrix();
            if (d.t >= 1) {
                setPhaseBoth("tunnel");
                setDiving(true);
                perspective.fov = 88;
                perspective.updateProjectionMatrix();
            }
        } else if (phaseRef.current === "return") {
            d.t = Math.min(1, d.t + delta / 1.1);
            if (d.t > 0.35 && diving) setDiving(false);
            if (d.t >= 1 && saved.current) {
                camera.position.copy(saved.current.position);
                camera.quaternion.copy(saved.current.quaternion);
                perspective.fov = saved.current.fov;
                perspective.updateProjectionMatrix();
                const scene = useSceneStore.getState();
                scene.setCameraOverride(false);
                scene.setIsInteracting(false);
                useAchievementStore.getState().unlock("truth-seen");
                setPhaseBoth("idle");
            } else if (d.t > 0.35 && saved.current) {
                // Back where you stood, before the white fades.
                camera.position.copy(saved.current.position);
                camera.quaternion.copy(saved.current.quaternion);
                perspective.fov = saved.current.fov;
                perspective.updateProjectionMatrix();
            }
        }

        // --- the cards
        const { inspecting, aimed } = useArtInspectStore.getState();
        if (inspecting || !pieces.length) return;
        const s = scratch;
        cards.forEach((card) => {
            card.clock += delta;
            if (card.state === "waiting") {
                if (card.clock >= 0) loadInto(card);
                card.proxy.scale.setScalar(0.0001);
                return;
            }

            let g = 0;
            if (card.state === "out") {
                const k = Math.min(1, card.clock / 1.8);
                g = 1 - ease(k);
                if (k >= 1) {
                    card.state = "rest";
                    card.clock = 0;
                    card.restFor = 7 + Math.random() * 7;
                }
            } else if (card.state === "rest") {
                // Not while someone is looking right at it.
                if (aimed?.id === card.id) card.clock = Math.min(card.clock, card.restFor - 1);
                if (card.clock > card.restFor) {
                    card.state = "in";
                    card.clock = 0;
                }
            } else if (card.state === "in") {
                const k = Math.min(1, card.clock / 1.4);
                g = ease(k);
                if (k >= 1) {
                    card.state = "waiting";
                    card.mesh.visible = false;
                    card.clock = -(0.4 + Math.random() * 1.6);
                    card.piece = nextPiece.current % pieces.length;
                    nextPiece.current++;
                    return;
                }
            }

            // Where it hangs, bobbing a little, turned to face you.
            tendrilPoint(card.tendril, card.t, time, s.center);
            s.center.y += Math.sin(time * 0.8 + card.t * 20) * 0.06;
            // Tendrils that run along the floor still hold their card up.
            s.center.y = Math.max(s.center.y, card.size.y / 2 + 0.2);
            s.normal.subVectors(camera.position, s.center).normalize();
            s.right.crossVectors(s.worldUp, s.normal).normalize();
            s.up.crossVectors(s.normal, s.right);

            // The funnel heads for the eye within the card's own plane.
            s.toEye.subVectors(EYE_CENTER, s.center);
            s.lead.copy(s.toEye).addScaledVector(s.normal, -s.toEye.dot(s.normal));
            if (s.lead.lengthSq() < 1e-6) s.lead.copy(s.up).negate();
            s.lead.normalize();
            s.side.crossVectors(s.normal, s.lead).normalize();

            const u = card.material.uniforms;
            u.uG.value = g;
            u.uTime.value = time;
            u.uCenter.value.copy(s.center);
            u.uRight.value.copy(s.right);
            u.uUp.value.copy(s.up);
            u.uNormal.value.copy(s.normal);
            u.uLead.value.copy(s.lead);
            u.uSide.value.copy(s.side);

            // The path: from the card's leading edge back down its tendril
            // into the middle of the eye.
            if (g > 0) {
                const halfExtent =
                    Math.abs(s.right.dot(s.lead)) * card.size.x * 0.5 +
                    Math.abs(s.up.dot(s.lead)) * card.size.y * 0.5;
                const path = u.uPath.value as THREE.Vector3[];
                const lengths = u.uPathS.value as number[];
                path[0].copy(s.center).addScaledVector(s.lead, halfExtent);
                const tEdge = Math.max(0, card.t - halfExtent / card.tendril.length);
                for (let j = 1; j < PATH_N - 1; j++) {
                    const t = tEdge * (1 - (j - 1) / (PATH_N - 3));
                    tendrilPoint(card.tendril, t, time, path[j]);
                }
                path[PATH_N - 1].copy(EYE_CENTER);
                lengths[0] = 0;
                for (let j = 1; j < PATH_N; j++) {
                    lengths[j] = lengths[j - 1] + path[j].distanceTo(path[j - 1]);
                }
                u.uPathLen.value = lengths[PATH_N - 1];
            }

            // Only a card at rest can be aimed at and opened.
            if (card.state === "rest") {
                s.basis.makeBasis(s.right, s.up, s.normal);
                card.proxy.position.copy(s.center);
                card.proxy.quaternion.setFromRotationMatrix(s.basis);
                card.proxy.scale.set(card.size.x, card.size.y, 1);
            } else {
                card.proxy.scale.setScalar(0.0001);
            }
        });
    });

    const pulling = phase !== "idle";

    return (
        <>
            <RoomEnvironmentReady />

            {/* White, in every direction */}
            <mesh ref={sky} renderOrder={-10} frustumCulled={false} raycast={() => null}>
                <sphereGeometry args={[40, 24, 12]} />
                <meshBasicMaterial color="#ffffff" side={THREE.BackSide} fog={false} toneMapped={false} depthWrite={false} />
            </mesh>

            {/* An unseen floor and walls: the void has edges, you just
                can't see them. */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[HALF + 1, 0.1, HALF + 1]} position={[0, -0.1, 0]} />
                <CuboidCollider args={[HALF, 4, 0.2]} position={[0, 4, -HALF - 0.2]} />
                <CuboidCollider args={[HALF, 4, 0.2]} position={[0, 4, HALF + 0.2]} />
                <CuboidCollider args={[0.2, 4, HALF]} position={[-HALF - 0.2, 4, 0]} />
                <CuboidCollider args={[0.2, 4, HALF]} position={[HALF + 0.2, 4, 0]} />
            </RigidBody>

            <group ref={stage} visible={!diving}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[EYE_CENTER.x, 0.01, EYE_CENTER.z]} raycast={() => null}>
                    <planeGeometry args={[14, 14]} />
                    <meshBasicMaterial map={shadow} transparent depthWrite={false} fog={false} toneMapped={false} />
                </mesh>

                <primitive object={tendrilMesh} />

                <mesh
                    ref={(object: THREE.Mesh | null) => {
                        eye.current = object;
                        aim.bind("eye", {
                            reach: pulling ? 0 : 7,
                            prompt: () => <GemPrompt accent="silver" action="Look into the eye" />,
                            use: startDive,
                        })(object);
                    }}
                    position={EYE_CENTER}
                    material={eyeMaterial}
                >
                    <planeGeometry args={[EYE_RADIUS * 2.15, EYE_RADIUS * 2.15]} />
                </mesh>

                {cards.map((card) => (
                    <React.Fragment key={card.id}>
                        <primitive object={card.mesh} />
                        <primitive object={card.proxy} />
                    </React.Fragment>
                ))}
            </group>

            {diving && <TruthTunnel pieces={pieces} onEnd={finishDive} returning={phase === "return"} />}

            {!pulling && <aim.Prompt />}

            {pulling && (
                <Html fullscreen zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
                    <div className={`truth-overlay truth-overlay--${phase}`}>
                        <div className="truth-flash" />
                        <div className="truth-words">
                            <span>I am what you call Nothing.</span>
                            <span>Or the world. Or the truth.</span>
                            <span>And I am also you.</span>
                        </div>
                        {phase === "tunnel" && (
                            <div className="truth-hint">
                                {"ontouchstart" in window ? "" : "Esc to look away"}
                            </div>
                        )}
                    </div>
                </Html>
            )}

        </>
    );
};
