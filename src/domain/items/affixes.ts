import type { AttributeKey } from '@/domain/player/attributes';

export const COMBAT_STAT_KEYS = [
  'maxHp', 'maxMana', 'physicalAttack', 'magicAttack', 'defense', 'magicResist',
  'critChance', 'critMultiplier', 'dodgeChance', 'speed', 'hpRegen', 'manaRegen',
] as const;

export type CombatStatKey = (typeof COMBAT_STAT_KEYS)[number];
export type StatKey = CombatStatKey | AttributeKey;

export type ItemStats = Partial<Record<StatKey, number>>;

export const STAT_LABELS: Record<CombatStatKey, string> = {
  maxHp: 'Vida',
  maxMana: 'Mana',
  physicalAttack: 'ATK Físico',
  magicAttack: 'ATK Mágico',
  defense: 'Defesa',
  magicResist: 'Res. Mágica',
  critChance: 'Crítico',
  critMultiplier: 'Dano Crítico',
  dodgeChance: 'Esquiva',
  speed: 'Velocidade',
  hpRegen: 'Regen. Vida',
  manaRegen: 'Regen. Mana',
};

export const PERCENT_STATS: ReadonlySet<StatKey> = new Set<StatKey>(['critChance', 'critMultiplier', 'dodgeChance']);

export type AffixKind = 'prefix' | 'suffix' | 'implicit';

export interface Affix {
  id: string;
  label: string;
  stat: StatKey;
  value: number;
  kind: AffixKind;
}

export interface AffixTemplate {
  id: string;
  /** Word placed before the base name ("Refinada …") or after ("… do Caçador"). */
  label: string;
  stat: StatKey;
  min: number;
  max: number;
  kind: AffixKind;
  /** Restricts the affix to item categories where it makes sense. */
  categories?: readonly string[];
  weight: number;
}

export function addStats(a: ItemStats, b: ItemStats): ItemStats {
  const out: ItemStats = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key as StatKey] = (out[key as StatKey] ?? 0) + (value ?? 0);
  }
  return out;
}

export function statsFromAffixes(affixes: readonly Affix[]): ItemStats {
  let out: ItemStats = {};
  for (const affix of affixes) out = addStats(out, { [affix.stat]: affix.value });
  return out;
}

export function formatStatValue(stat: StatKey, value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded >= 0 ? '+' : '';
  return PERCENT_STATS.has(stat) ? `${sign}${rounded}%` : `${sign}${rounded}`;
}
