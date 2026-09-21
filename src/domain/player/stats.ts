import { clamp, safeNumber, saturate } from '@/core/util/math';
import { type AttributeKey, type Attributes, ATTRIBUTE_KEYS, addAttributes, emptyAttributes } from '@/domain/player/attributes';
import { BALANCE } from '@/domain/player/balance';
import type { Item } from '@/domain/items/item';
import type { CombatStatKey } from '@/domain/items/affixes';

export interface DerivedStats {
  maxHp: number;
  maxMana: number;
  physicalAttack: number;
  magicAttack: number;
  defense: number;
  magicResist: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  speed: number;
  hpRegen: number;
  manaRegen: number;
}

export type FlatBonuses = Partial<Record<CombatStatKey, number>>;

export interface StatSources {
  level: number;
  attributes: Attributes;
  equipment: readonly Item[];
  bonuses?: FlatBonuses;
}

/** Sums the attribute grants carried by equipped items. */
export function equipmentAttributes(items: readonly Item[]): Attributes {
  let out = emptyAttributes();
  for (const item of items) {
    const grants: Partial<Attributes> = {};
    for (const key of ATTRIBUTE_KEYS) {
      const value = item.stats[key as AttributeKey];
      if (value) grants[key] = value;
    }
    out = addAttributes(out, grants);
  }
  return out;
}

export function equipmentCombatBonuses(items: readonly Item[]): FlatBonuses {
  const out: FlatBonuses = {};
  for (const item of items) {
    for (const [key, value] of Object.entries(item.stats)) {
      if ((ATTRIBUTE_KEYS as readonly string[]).includes(key)) continue;
      out[key as CombatStatKey] = (out[key as CombatStatKey] ?? 0) + safeNumber(value);
    }
  }
  return out;
}

/**
 * The only place derived stats are computed. Never persisted — always recomputed
 * from level + attributes + equipment, so a balance change reaches old saves.
 */
export function computeDerivedStats(sources: StatSources): DerivedStats {
  const level = clamp(safeNumber(sources.level, 1), 1, BALANCE.maxLevel);
  const attrs = addAttributes(sources.attributes, equipmentAttributes(sources.equipment));
  const gear = equipmentCombatBonuses(sources.equipment);
  const extra = sources.bonuses ?? {};
  const bonus = (key: CombatStatKey): number => safeNumber(gear[key]) + safeNumber(extra[key]);

  const maxHp = Math.round(
    BALANCE.hp.base + BALANCE.hp.perLevel * (level - 1) + BALANCE.hp.perVitality * attrs.vitality + bonus('maxHp'),
  );
  const maxMana = Math.round(
    BALANCE.mana.base +
      BALANCE.mana.perLevel * (level - 1) +
      BALANCE.mana.perIntelligence * attrs.intelligence +
      BALANCE.mana.perWisdom * attrs.wisdom +
      bonus('maxMana'),
  );

  const physicalAttack = Math.round(
    BALANCE.physicalAttack.base +
      BALANCE.physicalAttack.perStrength * attrs.strength +
      BALANCE.physicalAttack.perLevel * (level - 1) +
      bonus('physicalAttack'),
  );
  const magicAttack = Math.round(
    BALANCE.magicAttack.base +
      BALANCE.magicAttack.perIntelligence * attrs.intelligence +
      BALANCE.magicAttack.perWisdom * attrs.wisdom +
      BALANCE.magicAttack.perLevel * (level - 1) +
      bonus('magicAttack'),
  );
  const defense = Math.round(
    BALANCE.defense.perStrength * attrs.strength +
      BALANCE.defense.perVitality * attrs.vitality +
      BALANCE.defense.perLevel * (level - 1) +
      bonus('defense'),
  );
  const magicResist = Math.round(
    BALANCE.magicResist.perWisdom * attrs.wisdom +
      BALANCE.magicResist.perIntelligence * attrs.intelligence +
      BALANCE.magicResist.perLevel * (level - 1) +
      bonus('magicResist'),
  );

  const rawCrit =
    BALANCE.crit.base + BALANCE.crit.perDexterity * attrs.dexterity + BALANCE.crit.perLuck * attrs.luck + bonus('critChance');
  const rawDodge =
    BALANCE.dodge.base + BALANCE.dodge.perAgility * attrs.agility + BALANCE.dodge.perLuck * attrs.luck + bonus('dodgeChance');

  return {
    maxHp: Math.max(1, maxHp),
    maxMana: Math.max(0, maxMana),
    physicalAttack: Math.max(1, physicalAttack),
    magicAttack: Math.max(1, magicAttack),
    defense: Math.max(0, defense),
    magicResist: Math.max(0, magicResist),
    critChance: Math.round(saturate(Math.max(0, rawCrit), BALANCE.crit.softCap, BALANCE.crit.hardCap) * 10) / 10,
    critMultiplier: BALANCE.crit.multiplier + safeNumber(bonus('critMultiplier')) / 100,
    dodgeChance: Math.round(saturate(Math.max(0, rawDodge), BALANCE.dodge.softCap, BALANCE.dodge.hardCap) * 10) / 10,
    speed: Math.max(1, Math.round(BALANCE.speed.base + BALANCE.speed.perAgility * attrs.agility + BALANCE.speed.perDexterity * attrs.dexterity + bonus('speed'))),
    hpRegen: Math.max(0, Math.round((BALANCE.regen.flatHp + BALANCE.regen.hpPerVitality * attrs.vitality + bonus('hpRegen')) * 10) / 10),
    manaRegen: Math.max(0, Math.round((BALANCE.regen.flatMana + BALANCE.regen.manaPerWisdom * attrs.wisdom + bonus('manaRegen')) * 10) / 10),
  };
}
