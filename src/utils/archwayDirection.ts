export type CardinalDirection = "north" | "south" | "east" | "west";

// Every archway's local position is authored on one of its room's own 4
// walls (axis-aligned), so the dominant axis of that local position tells
// us which wall/side it's on. Used both for laying out the schematic
// minimap and for keeping art frames off doorway walls.
export const archwayDirection = (
    position: [number, number, number]
): CardinalDirection => {
    const [x, , z] = position;
    if (Math.abs(x) > Math.abs(z)) {
        return x > 0 ? "east" : "west";
    }
    return z > 0 ? "south" : "north";
};
