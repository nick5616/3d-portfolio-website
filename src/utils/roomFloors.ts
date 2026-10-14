import { RoomFloor } from "../types/scene.types";

// The player's body origin sits 0.2 below the bottom of their capsule.
const FEET_OFFSET = 0.2;

// Index of the floor at or just below height `y`. `slack` lets someone
// climbing the last few steps of a stair still count as downstairs until
// they're nearly at the top.
export const floorIndexAt = (floors: RoomFloor[], y: number, slack = 0.01) => {
    let index = 0;
    floors.forEach((floor, i) => {
        if (y >= floor.y - slack) index = i;
    });
    return index;
};

export const playerFloorIndex = (floors: RoomFloor[], bodyY: number) =>
    floorIndexAt(floors, bodyY + FEET_OFFSET, 0.75);
