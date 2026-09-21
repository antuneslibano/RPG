import type { EventId, ItemId, NpcId } from '@/core/ids/ids';
import type { Affix, ItemStats } from '@/domain/items/affixes';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
  mythic: 'Mítico',
};

export const EQUIPMENT_SLOTS = [
  'mainHand', 'offHand', 'helmet', 'chest', 'gloves', 'boots',
  'belt', 'cloak', 'amulet', 'bracelet', 'ring', 'artifact',
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  mainHand: 'Arma',
  offHand: 'Escudo',
  helmet: 'Capacete',
  chest: 'Peitoral',
  gloves: 'Luvas',
  boots: 'Botas',
  belt: 'Cinto',
  cloak: 'Capa',
  amulet: 'Colar',
  bracelet: 'Bracelete',
  ring: 'Anel',
  artifact: 'Artefato',
};

export const ITEM_CATEGORIES = [
  'weapon', 'armor', 'accessory', 'consumable', 'material', 'quest', 'misc',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  weapon: 'Armas',
  armor: 'Armaduras',
  accessory: 'Acessórios',
  consumable: 'Consumíveis',
  material: 'Materiais',
  quest: 'Missão',
  misc: 'Outros',
};

export interface ItemBase {
  baseId: string;
  name: string;
  category: ItemCategory;
  slot: EquipmentSlot | null;
  tier: number;
  baseValue: number;
  baseStats: ItemStats;
  tags: readonly string[];
  /** Weapons scale from strength or intelligence. */
  damageType?: 'physical' | 'magic';
  classHint?: readonly string[];
  stackable?: boolean;
  consumableEffect?: ConsumableEffect;
  description?: string;
}

export interface ConsumableEffect {
  kind: 'heal' | 'mana' | 'cleanse' | 'buff';
  amount: number;
  stat?: string;
  durationTurns?: number;
}

export interface MaterialGrade {
  id: string;
  name: string;
  tier: number;
  multiplier: number;
  tags: readonly string[];
}

export interface QualityGrade {
  id: string;
  name: string;
  multiplier: number;
  weight: number;
}

export interface SpecialEffect {
  id: string;
  label: string;
  description: string;
  /** Hook consumed by the combat resolver. */
  trigger: 'onHit' | 'onCrit' | 'onKill' | 'onDamaged' | 'passive';
  magnitude: number;
  vsFamily?: string;
}

export interface Item {
  id: ItemId;
  baseId: string;
  name: string;
  category: ItemCategory;
  slot: EquipmentSlot | null;
  rarity: Rarity;
  itemLevel: number;
  materialId: string | null;
  qualityId: string | null;
  affixes: Affix[];
  stats: ItemStats;
  value: number;
  quantity: number;
  stackable: boolean;
  special: SpecialEffect | null;
  /** Legendary/mythic storytelling. */
  uniqueName?: string;
  lore?: string;
  originEventId?: EventId;
  previousOwnerNpcId?: NpcId;
  consumableEffect?: ConsumableEffect;
  artKey: string;
  questId?: string;
}

export function isEquippable(item: Item): boolean {
  return item.slot !== null && (item.category === 'weapon' || item.category === 'armor' || item.category === 'accessory');
}

export function rarityIndex(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}

/** Single comparable number used by "is this an upgrade?" hints. */
export function itemPower(item: Item): number {
  const weights: Record<string, number> = {
    physicalAttack: 2.2, magicAttack: 2.2, defense: 1.7, magicResist: 1.7,
    maxHp: 0.32, maxMana: 0.3, critChance: 2.6, critMultiplier: 1.4,
    dodgeChance: 2.4, speed: 1.9, hpRegen: 1.1, manaRegen: 1.1,
    strength: 2.4, vitality: 2.4, intelligence: 2.4, wisdom: 2.2, dexterity: 2.2, agility: 2.2, luck: 1.8,
  };
  let power = 0;
  for (const [key, value] of Object.entries(item.stats)) power += (weights[key] ?? 1) * (value ?? 0);
  return Math.round(power * 10) / 10;
}
