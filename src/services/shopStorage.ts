import { ShopItem, UserShopRecord } from "../types/shop";
import { UserProfile } from "../types";

const SHOP_STORAGE_KEY = "eduquest_shop_v1";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "emoji_pack_cosmic",
    name: "Pacote Cósmico 🪐",
    description: "Libere 6 Emojis Lendários do Espaço para o seu perfil: 🪐 👽 🛸 🌟 🛰️ ☄️",
    price: 1.00,
    type: "emoji_pack_cosmic",
    icon: "🪐",
    rewards: {
      emojis: ["🪐", "👽", "🛸", "🌟", "🛰️", "☄️"]
    }
  },
  {
    id: "emoji_pack_fantasy",
    name: "Pacote Fantasia 👑",
    description: "Libere 6 Emojis de Magia e Aventura para o seu perfil: 👑 🧙 🦄 🐉 🔮 🛡️",
    price: 1.00,
    type: "emoji_pack_fantasy",
    icon: "🔮",
    rewards: {
      emojis: ["👑", "🧙", "🦄", "🐉", "🔮", "🛡️"]
    }
  },
  {
    id: "xp_boost_500",
    name: "Super Impulso Estelar ⚡",
    description: "Ganhe +500 XP de bônus imediato para subir de nível e acelerar sua jornada!",
    price: 1.00,
    type: "xp_boost_500",
    icon: "⚡",
    rewards: {
      xpBonus: 500
    }
  },
  {
    id: "xp_boost_1000",
    name: "Hiper Nova Cósmica 🌌",
    description: "Ganhe +1000 XP de bônus imediato para dar um salto gigante na mudança de nível!",
    price: 2.00,
    type: "xp_boost_1000",
    icon: "🌌",
    rewards: {
      xpBonus: 1000
    }
  }
];

export function getShopRecord(): UserShopRecord {
  try {
    const raw = localStorage.getItem(SHOP_STORAGE_KEY);
    if (!raw) {
      return { unlockedItemIds: [] };
    }
    const parsed = JSON.parse(raw) as UserShopRecord;
    return parsed;
  } catch {
    return { unlockedItemIds: [] };
  }
}

export function saveShopRecord(record: UserShopRecord): void {
  try {
    localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error("Erro ao salvar dados da loja:", err);
  }
}

export function isItemUnlocked(itemId: string): boolean {
  const record = getShopRecord();
  return record.unlockedItemIds.includes(itemId);
}

// Returns list of all unlocked custom emojis for profile customization
export function getUnlockedEmojis(): string[] {
  const record = getShopRecord();
  const unlockedEmojis: string[] = [];
  
  for (const itemId of record.unlockedItemIds) {
    const item = SHOP_ITEMS.find(x => x.id === itemId);
    if (item && item.rewards.emojis) {
      unlockedEmojis.push(...item.rewards.emojis);
    }
  }
  
  return unlockedEmojis;
}

// Unlocks an item, applying immediate rewards like XP boosters directly to the profile state
export function unlockShopItem(
  itemId: string,
  profile: UserProfile | null,
  onProfileUpdate: (updatedProfile: UserProfile) => void
): { success: boolean; error?: string } {
  const item = SHOP_ITEMS.find(x => x.id === itemId);
  if (!item) {
    return { success: false, error: "Item não encontrado no catálogo." };
  }

  const record = getShopRecord();
  
  // XP boosts can be purchased multiple times, but emoji packs only once
  if (item.type.startsWith("emoji_pack") && record.unlockedItemIds.includes(itemId)) {
    return { success: false, error: "Você já possui este pacote de emojis desbloqueado!" };
  }

  // 1. If it has XP boost, apply it directly to the active profile
  if (item.rewards.xpBonus && item.rewards.xpBonus > 0) {
    if (!profile) {
      return { success: false, error: "Crie ou selecione um perfil antes de comprar itens de XP!" };
    }
    
    const updatedProfile: UserProfile = {
      ...profile,
      xp: profile.xp + item.rewards.xpBonus
    };
    
    // Save updated profile to localStorage
    localStorage.setItem("playenglish_profile", JSON.stringify(updatedProfile));
    onProfileUpdate(updatedProfile);
  }

  // 2. Save unlocked state for emoji packs or tracking record
  if (item.type.startsWith("emoji_pack")) {
    const updatedUnlocked = [...record.unlockedItemIds, itemId];
    saveShopRecord({ unlockedItemIds: updatedUnlocked });
  }

  return { success: true };
}
