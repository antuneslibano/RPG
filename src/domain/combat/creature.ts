import type { StatusKind } from '@/domain/skills/skill';

export const CREATURE_FAMILIES = [
  'beast', 'undead', 'humanoid', 'demon', 'construct', 'spirit', 'elemental', 'aberration',
] as const;
export type CreatureFamily = (typeof CREATURE_FAMILIES)[number];

export const FAMILY_LABELS: Record<CreatureFamily, string> = {
  beast: 'Feras', undead: 'Mortos-vivos', humanoid: 'Humanoides', demon: 'Demônios',
  construct: 'Constructos', spirit: 'Espíritos', elemental: 'Elementais', aberration: 'Aberrações',
};

export interface CreatureAbility {
  id: string;
  name: string;
  description: string;
  power: number;
  cooldown: number;
  targeting: 'enemy' | 'self';
  status?: { kind: StatusKind; magnitude: number; turns: number; chance: number };
  heal?: number;
  /** Boss mechanic: only usable below this HP ratio. */
  belowHpRatio?: number;
}

export interface CreatureBase {
  baseId: string;
  name: string;
  family: CreatureFamily;
  levelRange: [number, number];
  biomes: string[];
  /** Multipliers over the level-scaled baseline in BALANCE.enemy. */
  hpMultiplier: number;
  attackMultiplier: number;
  defenseMultiplier: number;
  speedBonus: number;
  damageType: 'physical' | 'magic';
  abilities: readonly CreatureAbility[];
  lootTableIds: readonly string[];
  artKey: string;
  lore: string;
  isBoss?: boolean;
  /** Boss phases trigger at these HP ratios. */
  phases?: readonly { atHpRatio: number; announce: string; attackBonus: number }[];
}

export interface CreatureVariant {
  id: string;
  name: string;
  /** Applied as suffix or prefix to the base creature name. */
  position: 'prefix' | 'suffix';
  hpMultiplier: number;
  attackMultiplier: number;
  defenseMultiplier: number;
  speedBonus: number;
  xpMultiplier: number;
  minLevel: number;
  biomes?: string[];
  extraAbilityIds?: readonly string[];
  weight: number;
}

/** A rolled, level-scaled creature ready to enter combat. */
export interface CreatureInstance {
  instanceId: string;
  baseId: string;
  variantId: string | null;
  name: string;
  family: CreatureFamily;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  magicResist: number;
  speed: number;
  critChance: number;
  damageType: 'physical' | 'magic';
  abilities: CreatureAbility[];
  xpReward: number;
  goldReward: number;
  artKey: string;
  isBoss: boolean;
  phases: readonly { atHpRatio: number; announce: string; attackBonus: number }[];
}

export interface BestiaryEntry {
  baseId: string;
  variantsSeen: string[];
  killCount: number;
  firstSeenDay: number;
  highestLevelSeen: number;
}
