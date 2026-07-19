export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number; // e.g. 1 or 2 (R$ 1.00 or R$ 2.00)
  type: "emoji_pack_cosmic" | "emoji_pack_fantasy" | "xp_boost_500" | "xp_boost_1000";
  icon: string; // display emoji or icon name
  rewards: {
    emojis?: string[];
    xpBonus?: number;
  };
}

export interface UserShopRecord {
  unlockedItemIds: string[]; // List of unlocked item IDs
}
