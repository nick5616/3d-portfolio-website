/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** wss:// URL of multiplayer-server; unset = single-player. */
    readonly VITE_MULTIPLAYER_URL?: string;
}
