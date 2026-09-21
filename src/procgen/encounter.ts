import type { SeededRandom } from '@/core/rng/random';
import { clamp } from '@/core/util/math';
import { BALANCE } from '@/domain/player/balance';
import { BOSS_BASES, CREATURE_BASES, CREATURE_BASE_BY_ID, CREATURE_VARIANTS } from '@/data/creatures';
import type { CreatureBase, CreatureInstance, CreatureVariant } from '@/domain/combat/creature';
import type { Biome } from '@/domain/world/world';

export interface EncounterContext {
  biome: Biome;
  playerLevel: number;
  regionLevelRange: [number, number];
  dangerLevel: number;
  /** Creature base ids fought very recently — avoided when possible. */
  recentBaseIds?: readonly string[];
}

function eligibleBases(context: EncounterContext): CreatureBase[] {
  const level = context.playerLevel;
  const pool = CREATURE_BASES.filter(
    (base) => base.biomes.includes(context.biome) && base.levelRange[0] <= level + 2 && base.levelRange[1] >= level - 3,
  );
  if (pool.length > 0) return pool;
  return CREATURE_BASES.filter((base) => base.biomes.includes(context.biome));
}

function pickVariant(rng: SeededRandom, level: number, biome: Biome): CreatureVariant {
  const pool = CREATURE_VARIANTS.filter(
    (variant) => variant.minLevel <= level && (!variant.biomes || variant.biomes.includes(biome)),
  );
  return rng.weighted((pool.length > 0 ? pool : CREATURE_VARIANTS).map((variant) => ({ value: variant, weight: variant.weight })));
}

export function buildCreature(
  rng: SeededRandom,
  base: CreatureBase,
  level: number,
  variant: CreatureVariant | null,
): CreatureInstance {
  const lvl = clamp(Math.round(level), 1, BALANCE.maxLevel);
  const hpBase = BALANCE.enemy.hpBase + BALANCE.enemy.hpPerLevel * lvl;
  const attackBase = BALANCE.enemy.attackBase + BALANCE.enemy.attackPerLevel * lvl;
  const defenseBase = BALANCE.enemy.defensePerLevel * lvl;

  const hpMul = base.hpMultiplier * (variant?.hpMultiplier ?? 1);
  const atkMul = base.attackMultiplier * (variant?.attackMultiplier ?? 1);
  const defMul = base.defenseMultiplier * (variant?.defenseMultiplier ?? 1);
  const xpMul = variant?.xpMultiplier ?? 1;

  const name = variant && variant.name
    ? variant.position === 'prefix' ? `${variant.name} ${base.name}` : `${base.name} ${variant.name}`
    : base.name;

  return {
    instanceId: `enemy_${rng.hex(8)}`,
    baseId: base.baseId,
    variantId: variant && variant.id !== 'var_none' ? variant.id : null,
    name,
    family: base.family,
    level: lvl,
    maxHp: Math.max(8, Math.round(hpBase * hpMul)),
    attack: Math.max(2, Math.round(attackBase * atkMul)),
    defense: Math.max(0, Math.round(defenseBase * defMul)),
    magicResist: Math.max(0, Math.round(defenseBase * defMul * 0.8)),
    speed: Math.max(1, Math.round(BALANCE.speed.base + lvl * 0.35 + base.speedBonus + (variant?.speedBonus ?? 0))),
    critChance: clamp(4 + lvl * 0.25, 0, 35),
    damageType: base.damageType,
    abilities: [...base.abilities],
    xpReward: Math.round((BALANCE.enemy.xpBase + BALANCE.enemy.xpPerLevel * lvl) * xpMul * (base.isBoss ? 6 : 1)),
    goldReward: Math.round((BALANCE.enemy.goldBase + BALANCE.enemy.goldPerLevel * lvl) * xpMul * (base.isBoss ? 8 : 1)),
    artKey: base.artKey,
    isBoss: base.isBoss ?? false,
    phases: base.phases ?? [],
  };
}

export interface Encounter {
  id: string;
  name: string;
  creatures: CreatureInstance[];
  isBossFight: boolean;
}

export function generateEncounter(rng: SeededRandom, context: EncounterContext): Encounter {
  const pool = eligibleBases(context);
  const avoided = new Set(context.recentBaseIds ?? []);
  const preferred = pool.filter((base) => !avoided.has(base.baseId));
  const bases = preferred.length > 0 ? preferred : pool;

  const groupSize = rng.weighted([
    { value: 1, weight: 46 },
    { value: 2, weight: 36 },
    { value: 3, weight: 18 + context.dangerLevel / 6 },
  ]);

  const creatures: CreatureInstance[] = [];
  for (let i = 0; i < groupSize; i++) {
    const base = rng.pick(bases);
    const level = clamp(
      rng.int(context.regionLevelRange[0], context.regionLevelRange[1]),
      Math.max(1, context.playerLevel - 2),
      context.playerLevel + 2,
    );
    const variant = pickVariant(rng, level, context.biome);
    creatures.push(buildCreature(rng, base, level, variant));
  }

  return {
    id: `enc_${rng.hex(8)}`,
    name: creatures.length === 1 ? creatures[0]!.name : `${creatures[0]!.name} e companhia`,
    creatures,
    isBossFight: false,
  };
}

export function generateBossEncounter(rng: SeededRandom, bossBaseId: string, level: number): Encounter {
  const base = CREATURE_BASE_BY_ID[bossBaseId] ?? BOSS_BASES[0]!;
  const boss = buildCreature(rng, base, level, null);
  return { id: `enc_boss_${rng.hex(8)}`, name: boss.name, creatures: [boss], isBossFight: true };
}
