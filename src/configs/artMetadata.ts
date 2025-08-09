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
