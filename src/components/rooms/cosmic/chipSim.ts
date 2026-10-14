import { Player } from "./connectFour";
import { CHIP_RADIUS, HOLD_Y, SLOT_PLAY, colX, rowY } from "./cosmicLayout";

// The chips' physics. Each column is a narrow slot, so a chip only really
// moves up and down, shuffles a few millimetres side to side, spins in its
// own plane and rocks between the front and back panels. Simulating
// exactly that (rather than handing 42 discs to the general-purpose
// physics engine) runs at a fixed 240 Hz whatever the frame rate or
// quality setting, never tunnels or jitters, and can't ever disagree with
// the rules about which row a chip ends up in.

const GRAVITY = 9.81;
const STEP = 1 / 240;
const MAX_STEPS = 24; // at most 0.1 s of catch-up after a hitch
const BOUNCE_FLOOR = 0.38;
const BOUNCE_CHIP = 0.32;
const REST_SPEED = 0.3; // slower impacts than this don't bounce
const MAX_TILT = 0.05; // radians of rocking room between the panels
const RECLAIM_TIME = 1.15;

export type ChipPhase = "held" | "falling" | "resting" | "reclaim" | "gone";

export interface Chip {
    id: number;
    owner: Player;
    col: number;
    row: number; // where the rules say it lands
    // Board-local, relative to the column centre for x.
    x: number;
    y: number;
    z: number; // only reclaimed chips leave the board's plane
    vx: number;
    vy: number;
    spin: number; // about Z, in the board's plane
    spinVel: number;
    tilt: number; // about Y, rocking between the panels
    tiltVel: number;
    phase: ChipPhase;
    holdTime: number;
    appear: number; // 0..1, materialising
    restTime: number;
    settled: boolean;
    winning: boolean;
    reclaimDelay: number;
    reclaimT: number;
    reclaimFrom: [number, number, number];
    scale: number;
}

export interface SimEvents {
    onImpact?: (chip: Chip, speed: number) => void;
    onSettled?: (chip: Chip) => void;
    onReclaimed?: (chip: Chip) => void;
}

export class ChipSim {
    chips: Chip[] = [];
    // A brief recoil of the whole board, set by impacts, decaying to 0.
    shake = 0;
    private accumulator = 0;
    private nextId = 1;
    private reclaimTarget: [number, number, number] = [0, 0, 0];

    constructor(public events: SimEvents = {}) {}

    spawn(owner: Player, col: number, row: number, holdTime: number): Chip {
        const chip: Chip = {
            id: this.nextId++,
            owner,
            col,
            row,
            x: 0,
            y: HOLD_Y,
            z: 0,
            vx: 0,
            vy: 0,
            spin: Math.random() * Math.PI * 2,
            spinVel: 0,
            tilt: 0,
            tiltVel: 0,
            phase: holdTime > 0 ? "held" : "falling",
            holdTime,
            appear: holdTime > 0 ? 0 : 1,
            restTime: 0,
            settled: false,
            winning: false,
            reclaimDelay: 0,
            reclaimT: 0,
            reclaimFrom: [0, 0, 0],
            scale: 1,
        };
        this.chips.push(chip);
        return chip;
    }

    // Every chip lifts out of the board, newest first, and drifts to
    // `target` (board-local), shrinking away.
    reclaimAll(target: [number, number, number]) {
        this.reclaimTarget = target;
        const live = this.chips.filter((c) => c.phase !== "gone");
        live.sort((a, b) => b.id - a.id).forEach((chip, i) => {
            chip.phase = "reclaim";
            chip.reclaimDelay = i * 0.07;
            chip.reclaimT = 0;
            chip.reclaimFrom = [colX(chip.col) + chip.x, chip.y, 0];
        });
    }

    clear() {
        this.chips = [];
    }

    get busy() {
        return this.chips.some((c) => c.phase === "held" || c.phase === "falling" || c.phase === "reclaim");
    }

    update(delta: number) {
        this.accumulator = Math.min(this.accumulator + delta, STEP * MAX_STEPS);
        while (this.accumulator >= STEP) {
            this.step(STEP);
            this.accumulator -= STEP;
        }
        this.shake *= Math.exp(-delta * 9);
        this.chips = this.chips.filter((c) => c.phase !== "gone");
    }

    private step(h: number) {
        // Held chips materialise, then let go.
        for (const chip of this.chips) {
            if (chip.phase !== "held") continue;
            chip.appear = Math.min(1, chip.appear + h / 0.45);
            chip.holdTime -= h;
            chip.spin += h * 1.5;
            if (chip.holdTime <= 0) {
                chip.phase = "falling";
                chip.appear = 1;
            }
        }

        // Each column is solved bottom-up.
        const byColumn = new Map<number, Chip[]>();
        for (const chip of this.chips) {
            if (chip.phase !== "falling" && chip.phase !== "resting") continue;
            const list = byColumn.get(chip.col) ?? [];
            list.push(chip);
            byColumn.set(chip.col, list);
        }
        byColumn.forEach((column) => {
            column.sort((a, b) => a.row - b.row);
            column.forEach((chip, i) => this.integrate(chip, column, i, h));
        });

        for (const chip of this.chips) {
            if (chip.phase === "reclaim") this.reclaimStep(chip, h);
        }
    }

    private integrate(chip: Chip, column: Chip[], index: number, h: number) {
        chip.vy -= GRAVITY * h;
        chip.y += chip.vy * h;
        chip.x += chip.vx * h;
        chip.spin += chip.spinVel * h;

        // Side walls of the slot.
        if (Math.abs(chip.x) > SLOT_PLAY) {
            chip.x = Math.sign(chip.x) * SLOT_PLAY;
            chip.vx *= -0.4;
        }

        // Contact with whatever is below: the slot floor or the chip under
        // it. Two discs offset sideways by dx sit a little closer than one
        // diameter apart, and the upper one is pushed off-centre - so
        // stacks lean into the walls the way real ones do.
        const below = index > 0 ? column[index - 1] : null;
        let floorY: number;
        let normalX = 0;
        if (below) {
            const dx = chip.x - below.x;
            const separation = Math.sqrt(Math.max(4 * CHIP_RADIUS * CHIP_RADIUS - dx * dx, 0));
            floorY = below.y + separation;
            normalX = dx / (2 * CHIP_RADIUS);
        } else {
            floorY = CHIP_RADIUS;
        }

        let touching = false;
        if (chip.y <= floorY) {
            touching = true;
            chip.y = floorY;
            const closing = chip.vy - (below?.vy ?? 0);
            if (closing < 0) {
                const speed = -closing;
                if (speed > REST_SPEED) {
                    const bounce = below ? BOUNCE_CHIP : BOUNCE_FLOOR;
                    chip.vy = (below?.vy ?? 0) + speed * bounce;
                    this.kick(chip, column, index, speed);
                    this.events.onImpact?.(chip, speed);
                } else {
                    chip.vy = below?.vy ?? 0;
                }
            }
            // Rolling off a curved neighbour, and rolling contact friction.
            chip.vx += GRAVITY * normalX * h * 0.5;
            chip.vx *= Math.exp(-h * 6);
            const rolling = -chip.vx / CHIP_RADIUS;
            chip.spinVel += (rolling - chip.spinVel) * Math.min(1, h * 25);
        } else {
            chip.spinVel *= Math.exp(-h * 0.4);
        }

        // Rocking between the panels: a stiff, well-damped spring.
        chip.tiltVel += (-chip.tilt * 900 - chip.tiltVel * 18) * h;
        chip.tilt += chip.tiltVel * h;
        if (Math.abs(chip.tilt) > MAX_TILT) {
            chip.tilt = Math.sign(chip.tilt) * MAX_TILT;
            chip.tiltVel *= -0.3;
        }

        // Asleep once it has stopped moving for a moment.
        const still = touching && Math.abs(chip.vy - (below?.vy ?? 0)) < 0.05 && Math.abs(chip.vx) < 0.03;
        chip.restTime = still ? chip.restTime + h : 0;
        if (chip.phase === "falling" && chip.restTime > 0.22) {
            chip.phase = "resting";
            if (!chip.settled) {
                chip.settled = true;
                this.events.onSettled?.(chip);
            }
        }
        if (chip.phase === "resting" && !still && Math.abs(chip.vy) > 0.2) {
            chip.phase = "falling";
        }
        // Resting chips seat on their row's exact height (a millimetre or
        // so up from leaning on the one below), so a tall column never
        // creeps and every chip sits centred in its hole.
        if (chip.phase === "resting") {
            chip.y += (rowY(chip.row) - chip.y) * Math.min(1, h * 20);
            chip.vy = below?.vy ?? 0;
        }
    }

    // An impact jolts the falling chip and rattles everything under it,
    // less the further down it is.
    private kick(chip: Chip, column: Chip[], index: number, speed: number) {
        const r = () => Math.random() - 0.5;
        chip.vx += r() * speed * 0.18;
        chip.spinVel += r() * speed * 5;
        chip.tiltVel += r() * speed * 6;
        for (let k = index - 1; k >= 0; k--) {
            const depth = index - k;
            const falloff = 1 / (1 + depth * 1.5);
            column[k].tiltVel += r() * speed * 3 * falloff;
            column[k].vx += r() * speed * 0.04 * falloff;
        }
        this.shake = Math.min(1, this.shake + speed * 0.12);
    }

    private reclaimStep(chip: Chip, h: number) {
        if (chip.reclaimDelay > 0) {
            chip.reclaimDelay -= h;
            return;
        }
        chip.reclaimT = Math.min(1, chip.reclaimT + h / RECLAIM_TIME);
        const t = chip.reclaimT;
        const ease = t * t * (3 - 2 * t);
        const [fx, fy, fz] = chip.reclaimFrom;
        const [tx, ty, tz] = this.reclaimTarget;
        // Up out of the top of the board first, then away to the target.
        const cx = fx;
        const cy = HOLD_Y + 0.6;
        const cz = fz;
        const u = 1 - ease;
        const px = u * u * fx + 2 * u * ease * cx + ease * ease * tx;
        const py = u * u * fy + 2 * u * ease * cy + ease * ease * ty;
        const pz = u * u * fz + 2 * u * ease * cz + ease * ease * tz;
        chip.x = px - colX(chip.col);
        chip.y = py;
        chip.z = pz;
        chip.spin += h * (4 + t * 10);
        chip.scale = 1 - Math.max(0, (t - 0.55) / 0.45);
        if (t >= 1) {
            chip.phase = "gone";
            this.events.onReclaimed?.(chip);
        }
    }
}
