// src/configs/artConfig.ts

export const artPieces = [
    // North wall pieces (indices 0-5)
    "animal-sketches", // 0
    "bite-of-87", // 1
    "brushed-sunset", // 2
    "chaos-bird", // 3
    "far-east", // 4
    "teemo", // 5

    // South wall pieces (indices 6-11)
    "tree-night", // 6
    "wispette", // 7
    "wiz-dog", // 8
    "first-drawing", // 9
    "homunculus", // 10
    "link-botw", // 11

    // West wall pieces (indices 12-17)
    "okay-blue-heron", // 12
    "san-bernardino", // 13
    "teemo", // 14
    "smoke-man", // 15
    "snow-white-night", // 16
    "seal", // 17

    // East wall pieces (indices 18-23)
    "homunculus", // 18
    "link-botw", // 19
    "lion-sun", // 20
    "mackbook", // 21
    "marvin-martian", // 22
    "monster-under", // 23
];

// Helper function to get image URL for a piece
export const getArtImageUrl = (index: number): string => {
    if (index < 0 || index >= artPieces.length) {
        console.error(`Art piece index ${index} out of bounds`);
        return "";
    }
    return `/images/art/${artPieces[index]}.jpg`;
};
