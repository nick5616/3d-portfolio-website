import { ArtCategoryId, artCategories } from "./gcsConfig";
import { ArtRoomView, CanonImage, loadView } from "../data/canon";
import { registerArtSizes } from "../utils/artImages";

export interface ArtPiece {
    name: string;
    description: string;
    date: string;
    fileName: string; // the piece's Canon slug (stable; was the GCS file name)
    // True when the hall shows this piece's title. Plaques only show for
    // titled pieces; which pieces are titled is set in Canon (the piece's
    // holodeck-art-room placement), not here.
    titled: boolean;
    category: ArtCategoryId;
    url: string; // the largest size Canon publishes (at most 3200 px)
    image: CanonImage;
}

// The pieces come from Canon's holodeck-art-room view: one entry per hall
// (its slug is the category id), pieces already filtered (drafts and
// private pieces never reach the view), ordered, and sized. Titles,
// descriptions and dates are edited in Canon, not with gsutil setmeta.
const cachedArtPiecesByCategory = new Map<ArtCategoryId, Promise<ArtPiece[]>>();

const fetchArtPieces = async (
    category: ArtCategoryId
): Promise<ArtPiece[]> => {
    const view = await loadView<ArtRoomView>("holodeck-art-room");
    const hall = view.entries.find((e) => e.slug === artCategories[category].folder);
    return (hall?.pieces ?? []).map((p) => {
        registerArtSizes(p.image);
        return {
            name: p.title ?? p.slug,
            description: p.description ?? "",
            date: p.date?.display ?? "",
            fileName: p.slug,
            titled: p.title !== null,
            category,
            url: p.image.url,
            image: p.image,
        } satisfies ArtPiece;
    });
};

export const getAllArtPieces = (
    category: ArtCategoryId
): Promise<ArtPiece[]> => {
    if (!cachedArtPiecesByCategory.has(category)) {
        cachedArtPiecesByCategory.set(category, fetchArtPieces(category));
    }
    return cachedArtPiecesByCategory.get(category)!;
};

export const getArtPieceByIndex = async (
    category: ArtCategoryId,
    index: number
): Promise<ArtPiece | undefined> => {
    const pieces = await getAllArtPieces(category);
    return pieces[index];
};

export const getArtPieceByName = async (
    category: ArtCategoryId,
    fileName: string
): Promise<ArtPiece | undefined> => {
    const pieces = await getAllArtPieces(category);
    return pieces.find((piece) => piece.fileName === fileName);
};
