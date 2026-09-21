import type { ItemId, LocationId, SkillId } from '@/core/ids/ids';
import type { Attributes } from '@/domain/player/attributes';
import type { EquipmentSlot } from '@/domain/items/item';
import { EQUIPMENT_SLOTS } from '@/domain/items/item';
import type { ClassId } from '@/data/classes';

export type Presentation = 'masculine' | 'feminine' | 'androgynous';

export interface PlayerResources {
  hp: number;
  mana: number;
}

export interface PlayerReputation {
  global: number;
  byKingdom: Record<string, number>;
  byLocation: Record<string, number>;
  byFaction: Record<string, number>;
}

export interface Player {
  id: string;
  name: string;
  presentation: Presentation;
  portraitKey: string;
  classId: ClassId;
  originId: string;
  level: number;
  xp: number;
  attributePoints: number;
  skillPoints: number;
  attributes: Attributes;
  resources: PlayerResources;
  equipment: Record<EquipmentSlot, ItemId | null>;
  inventoryItemIds: ItemId[];
  skillRanks: Record<SkillId, number>;
  gold: number;
  currentLocationId: LocationId;
  discoveredLocationIds: LocationId[];
  reputation: PlayerReputation;
  createdAt: number;
  playtimeSeconds: number;
  /** Stable per-run counter used for bestiary and chronicle statistics. */
  stats: {
    enemiesDefeated: number;
    questsCompleted: number;
    dungeonsCleared: number;
    daysLived: number;
  };
}

export function emptyEquipment(): Record<EquipmentSlot, ItemId | null> {
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null])) as Record<EquipmentSlot, ItemId | null>;
}

export function emptyReputation(): PlayerReputation {
  return { global: 0, byKingdom: {}, byLocation: {}, byFaction: {} };
}

export function equippedItemIds(player: Player): ItemId[] {
  return EQUIPMENT_SLOTS.map((slot) => player.equipment[slot]).filter((id): id is ItemId => id !== null);
}
