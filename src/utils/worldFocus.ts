import { useSceneStore } from "../stores/sceneStore";

// True while the player isn't actually "in" the world: the pause card is up
// (cursor freed) or an overlay owns the input. In-world hover prompts and
// aim cards should hide then, or they'd float over the pause screen.
export const isWorldUnfocused = () => {
    const { showStartPrompt, isInteracting } = useSceneStore.getState();
    return showStartPrompt || isInteracting;
};
