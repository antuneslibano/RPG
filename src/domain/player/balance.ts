/**
 * Single source of truth for progression and combat scaling.
 * No balance constant may live anywhere else in the codebase.
 */
export const BALANCE = {
  maxLevel: 60,
  xp: { base: 12, growth: 1.18, flat: 8 },
  pointsPerLevel: { attribute: 3, skill: 1 },
  startingAttributePoints: 5,

  hp: { base: 60, perLevel: 9, perVitality: 12 },
  mana: { base: 30, perLevel: 4, perIntelligence: 7, perWisdom: 3 },

  physicalAttack: { base: 4, perStrength: 2.1, perLevel: 1.1 },
  magicAttack: { base: 4, perIntelligence: 2.3, perWisdom: 0.7, perLevel: 1.1 },
  defense: { perStrength: 0.35, perVitality: 0.8, perLevel: 0.5 },
  magicResist: { perWisdom: 0.9, perIntelligence: 0.25, perLevel: 0.4 },

  crit: { base: 5, perDexterity: 0.45, perLuck: 0.2, softCap: 45, hardCap: 70, multiplier: 1.7 },
  dodge: { base: 2, perAgility: 0.4, perLuck: 0.15, softCap: 25, hardCap: 40 },
  speed: { base: 10, perAgility: 0.9, perDexterity: 0.2 },
  regen: { hpPerVitality: 0.15, manaPerWisdom: 0.22, flatHp: 1, flatMana: 1 },

  /** Damage = attack * mitigation(defense). Never reaches zero. */
  mitigation: { constant: 60 },

  enemy: {
    hpPerLevel: 26,
    hpBase: 34,
    attackPerLevel: 3.4,
    attackBase: 6,
    defensePerLevel: 1.5,
    xpBase: 6,
    xpPerLevel: 4.5,
    goldBase: 4,
    goldPerLevel: 3.2,
  },

  loot: {
    /** Rarity weights shift with item level and player Luck. */
    rarityWeights: { common: 100, uncommon: 42, rare: 16, epic: 5, legendary: 1.2, mythic: 0.18 },
    luckWeightBonus: 0.035,
    levelWeightBonus: 0.012,
    affixCountByRarity: { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 },
    valueMultiplierByRarity: { common: 1, uncommon: 1.8, rare: 3.4, epic: 7, legendary: 15, mythic: 32 },
  },

  economy: {
    sellRatio: 0.38,
    reputationDiscountPerPoint: 0.0012,
    maxDiscount: 0.2,
    scarcityMax: 1.9,
  },
} as const;

/** XP required to go from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  if (level >= BALANCE.maxLevel) return Number.POSITIVE_INFINITY;
  const { base, growth, flat } = BALANCE.xp;
  return Math.round(base * growth ** (level - 1) + flat * level);
}

export function totalXpToReach(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForNextLevel(l);
  return total;
}

/** Diminishing damage mitigation — defense never zeroes damage out. */
export function mitigate(rawDamage: number, defense: number): number {
  const factor = BALANCE.mitigation.constant / (BALANCE.mitigation.constant + Math.max(0, defense));
  return Math.max(1, Math.round(rawDamage * factor));
}
