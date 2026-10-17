import { create } from "zustand";

// Whether you're standing at the decks with the console up. Kept on its own
// so the app can mount the console (lazily) without loading the booth.
export const useDjConsole = create<{ open: boolean }>(() => ({ open: false }));
export const openDjConsole = () => useDjConsole.setState({ open: true });
export const closeDjConsole = () => useDjConsole.setState({ open: false });
