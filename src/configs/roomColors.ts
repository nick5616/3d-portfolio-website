// Single source of truth for each room's identity color, so the minimap and
// any in-world UI (e.g. door theming) always agree on what color represents
// a given room - previously Minimap.tsx owned this map alone and Door.tsx
// had no way to reuse it.
export const roomColors: { [key: string]: string } = {
    atrium: "#4A90E2",
    gallery: "#E8C468",
    projects: "#7ED321",
    "gallery-hall-digitalart": "#C77DFF",
    "gallery-hall-paintings": "#FF9F7D",
    "gallery-hall-sketches": "#7DB8FF",
    "gallery-hall-lefthanded": "#FFC97D",
    "gallery-hall-miscellaneous": "#7DFFD4",
    "gallery-hall-notesappart": "#7DFF9F",
    achievements: "#FFD700",
    "cosmic-connect-four": "#8A5CFF",
    "rupee-shop": "#3EE58F",
    "meteor-math": "#45D4FF",
    courage: "#DEB887",
    "sky-course": "#8FD3FF",
    "art-studio": "#FF69B4",
    "jam-room": "#FF8AD8",
    "bird-dog-studio": "#B48CFF",
    "marble-machine": "#FFB347",
    forest: "#5FAE4A",
    observatory: "#6C7BFF",
};
