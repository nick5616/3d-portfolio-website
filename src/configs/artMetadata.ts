export interface ArtPiece {
    name: string;
    description: string;
    date: string;
    fileName: string; // File name in Azure storage (e.g., "marvin-martian.jpg")
}

export const artPieces: ArtPiece[] = [
    {
        name: "Marvin Martian",
        description:
            "A whimsical portrait of Marvin the Martian in a futuristic style",
        date: "2024-01-15",
        fileName: "marvin-martian.jpg",
    },
    {
        name: "Monster Under the Bed",
        description:
            "A playful interpretation of childhood fears with a friendly monster",
        date: "2024-02-03",
        fileName: "monster-under.jpg",
    },
    {
        name: "Chaos Bird",
        description:
            "An abstract representation of chaos and freedom in avian form",
        date: "2024-01-28",
        fileName: "chaos-bird.jpg",
    },
    {
        name: "Teemo Portrait",
        description: "A detailed character study of Teemo in a fantasy setting",
        date: "2024-03-10",
        fileName: "teemo.jpg",
    },
    {
        name: "Tree at Night",
        description: "A serene nocturnal landscape featuring a majestic tree",
        date: "2024-02-18",
        fileName: "tree-night.jpg",
    },
    {
        name: "Wispette",
        description: "A mystical creature with ethereal lighting effects",
        date: "2024-03-05",
        fileName: "wispette.jpg",
    },
    {
        name: "Link - Breath of the Wild",
        description: "A dynamic action scene featuring Link in the open world",
        date: "2024-02-25",
        fileName: "link-botw.jpg",
    },
    {
        name: "Okay Blue Heron",
        description: "A graceful water bird captured in its natural habitat",
        date: "2024-01-20",
        fileName: "okay-blue-heron.jpg",
    },
    {
        name: "Wiz Dog",
        description: "A magical canine companion with mystical aura",
        date: "2024-03-12",
        fileName: "wiz-dog.jpg",
    },
    {
        name: "Snow White Night",
        description: "A winter landscape bathed in moonlight",
        date: "2024-02-08",
        fileName: "snow-white-night.jpg",
    },
    {
        name: "Smoke Man",
        description: "A mysterious figure emerging from swirling smoke",
        date: "2024-01-30",
        fileName: "smoke-man.jpg",
    },
    {
        name: "Seal",
        description: "A playful seal in its natural aquatic environment",
        date: "2024-02-14",
        fileName: "seal.jpg",
    },
    {
        name: "San Bernardino",
        description: "An urban landscape capturing the essence of the city",
        date: "2024-03-01",
        fileName: "san-bernardino.jpg",
    },
    {
        name: "Mackbook",
        description:
            "A sleek technological composition featuring modern design",
        date: "2024-02-20",
        fileName: "mackbook.jpg",
    },
    {
        name: "Lion Sun",
        description: "A majestic lion basking in golden sunlight",
        date: "2024-01-25",
        fileName: "lion-sun.jpg",
    },
    {
        name: "Homunculus",
        description: "A mystical alchemical creature with intricate details",
        date: "2024-02-28",
        fileName: "homunculus.jpg",
    },
    {
        name: "First Drawing",
        description:
            "A foundational piece marking the beginning of artistic journey",
        date: "2024-01-10",
        fileName: "first-drawing.jpg",
    },
    {
        name: "Far East",
        description: "An evocative scene inspired by Eastern aesthetics",
        date: "2024-03-08",
        fileName: "far-east.jpg",
    },
    {
        name: "Brushed Sunset",
        description: "A vibrant sunset captured with expressive brushwork",
        date: "2024-02-12",
        fileName: "brushed-sunset.jpg",
    },
    {
        name: "Bite of 87",
        description: "A dramatic scene with intense action and emotion",
        date: "2024-01-18",
        fileName: "bite-of-87.jpg",
    },
    {
        name: "Animal Sketches",
        description:
            "A collection of wildlife studies showcasing natural forms",
        date: "2024-02-05",
        fileName: "animal-sketches.jpg",
    },
    {
        name: "Sprites",
        description:
            "A collection of pixel art sprites with retro gaming aesthetic",
        date: "2024-03-15",
        fileName: "sprites.png",
    },
];

export const getArtPieceByIndex = (index: number): ArtPiece | undefined => {
    return artPieces[index];
};

export const getArtPieceByName = (name: string): ArtPiece | undefined => {
    return artPieces.find((piece) => piece.fileName === name);
};

export const getAllArtPieces = (): ArtPiece[] => {
    return artPieces;
};
