// src/configs/artConfig.ts

export const artPieces = [
    // North wall pieces (indices 0-5)
    "animal-sketches",
    "bite-of-87",
    "brushed-sunset",
    "chaos-bird",
    "far-east",
    "first-drawing",

    // South wall pieces (indices 6-11)

    "tree-night",
    "wispette",
    "wiz-dog",
    "first-drawing",
    "homunculus",
    "link-botw",

    // West wall pieces (indices 12-17)
    "okay-blue-heron",
    "san-bernardino",
    "seal",
    "smoke-man",
    "snow-white-night",
    "teemo",

    // East wall pieces (indices 18-23)
    "homunculus",
    "link-botw",
    "lion-sun",
    "mackbook",
    "marvin-martian",
    "monster-under",
];

// Helper function to get image URL for a piece
export const getArtImageUrl = (index: number): string => {
    if (index < 0 || index >= artPieces.length) {
        console.error(`Art piece index ${index} out of bounds`);
        return "/images/art/placeholder.jpg";
    }
    return `/images/art/${artPieces[index]}.jpg`;
};
