import { useUnlockStore } from "../../../stores/unlockStore";

// What the Rupee Shop sells. Everything is a permanent upgrade that works in
// every room, recorded in the unlock store under its id.

export type ShopItemId = "shop-fairy" | "shop-magnet" | "shop-boots" | "shop-disco";

export interface ShopItem {
    id: ShopItemId;
    name: string;
    price: number;
    blurb: string;
    color: string;
}

export const SHOP_ITEMS: ShopItem[] = [
    { id: "shop-disco", name: "Disco Ball", price: 15, blurb: "Hangs under the atrium dome. Sparkles.", color: "#c8d6ff" },
    { id: "shop-fairy", name: "Fairy Friend", price: 25, blurb: "A little light that follows you everywhere.", color: "#ff9de2" },
    { id: "shop-magnet", name: "Rupee Magnet", price: 40, blurb: "Rupees nearby fly straight to you.", color: "#ff4d5e" },
    { id: "shop-boots", name: "Cloud Boots", price: 60, blurb: "Jump again in mid-air. Anywhere.", color: "#8fd3ff" },
];

export const owns = (id: ShopItemId) => Boolean(useUnlockStore.getState().unlocked[id]);
export const useOwns = (id: ShopItemId) => useUnlockStore((s) => Boolean(s.unlocked[id]));
