export interface ArtPiece {
    name: string;
    description: string;
    date: string;
    fileName: string; // File name in Azure storage (e.g., "marvin-martian.jpg")
}

export const artPieces: ArtPiece[] = [
    {
        name: "Marvin Martian",
        description: "",
        date: "Circa December 2024",
        fileName: "marvin-martian.jpg",
    },
    {
        name: "Monster Under My Bed",
        description: "The monster is you",
        date: "Circa 2023",
        fileName: "monster-under.jpg",
    },
    {
        name: "Chaos Bird",
        description: "An abstract representation of chaos in avian form",
        date: "Circa 2022",
        fileName: "chaos-bird.jpg",
    },
    {
        name: "Teemo Portrait",
        description:
            "I don't play this game (League of Legends) but I made it for my friend who used to play a lot. I think this character Teemo is very cute!",
        date: "Circa new year 2023",
        fileName: "teemo.jpg",
    },
    {
        name: "Tree at Night",
        description: "A serene nocturnal landscape featuring a majestic tree",
        date: "Circa 2023",
        fileName: "tree-night.jpg",
    },
    {
        name: "Wispette",
        description: "A mystical creature with ethereal lighting effects",
        date: "Circa 2022",
        fileName: "wispette.jpg",
    },
    {
        name: "Link - Breath of the Wild",
        description: "A dynamic action scene featuring Link",
        date: "Circa 2023",
        fileName: "link-botw.jpg",
    },
    {
        name: "Okay Blue Heron",
        description: "A quick sketch of a great blue heron, but okay-ified",
        date: "Circa 2024",
        fileName: "okay-blue-heron.jpg",
    },
    {
        name: "Wiz Dog",
        description:
            "A magical canine companion with mystical aura. It's based off my Aunt's dog, Arya. I drew it for her as a gift.",
        date: "Circa December 2024",
        fileName: "wiz-dog.jpg",
    },
    {
        name: "Snow White Night",
        description:
            "Disnet's Snow White lying across a natural landscape bathed in moonlight and fireflies",
        date: "Circa December 2024",
        fileName: "snow-white-night.jpg",
    },
    {
        name: "Smoke Man",
        description:
            "A mysterious figure emerging from swirling smoke. It tends to evoke dread.",
        date: "Circa 2022",
        fileName: "smoke-man.jpg",
    },
    {
        name: "Seal",
        description: "A playful seal in its natural aquatic environment",
        date: "Circa 2023",
        fileName: "seal.jpg",
    },
    {
        name: "San Bernardino",
        description:
            "The infamous Los Angeles neighborhood, depicted around the late 60's. I drew it for my Grandma, who was invited to live with my Grandpa when they were both very young. Her home town is all she knew. She cherishes these memories dearly",
        date: "Circa December 2024",
        fileName: "san-bernardino.jpg",
    },
    {
        name: "Mackbook",
        description:
            "A sleek technological composition featuring modern design",
        date: "3",
        fileName: "mackbook.jpg",
    },
    {
        name: "Lion Sun",
        description: "A majestic lion basking in golden sunlight",
        date: "Circa 2022",
        fileName: "lion-sun.jpg",
    },
    {
        name: "Homunculus",
        description: "A mystical alchemical creature with cartoonish details.",
        date: "Circa 2022",
        fileName: "homunculus.jpg",
    },
    {
        name: "First Drawing",
        description: "The first digital art I ever made. ",
        date: "Circa 2022",
        fileName: "first-drawing.jpg",
    },
    {
        name: "Far East",
        description:
            "A drawing I made for my Grandfather, who was stationed in Korea. My grandma often wrote to him while he was stationed there. He once had a backlog of letters that all came at once. He vividly remembers sitting down with coffee and his favorite cookies, and getting to read these letters from my Grandma.",
        date: "Circa December 2024",
        fileName: "far-east.jpg",
    },
    {
        name: "Brushed Sunset",
        description: "",
        date: "Circa 2022",
        fileName: "brushed-sunset.jpg",
    },
    {
        name: "Bite of 87",
        description: "I just drew with no objective in mind.",
        date: "Circa 2022",
        fileName: "bite-of-87.jpg",
    },
    {
        name: "Animal Sketches",
        description:
            "Random animal sketches with no reference. Some of them don't exist!",
        date: "Circa 2022",
        fileName: "animal-sketches.jpg",
    },
    {
        name: "Sprites",
        description:
            "I drew this for my partner. You don't get any more information than that.",
        date: "July 2025",
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
