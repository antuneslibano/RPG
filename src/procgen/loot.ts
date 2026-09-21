import { SeededRandom, fnv1a } from '@/core/rng/random';
import { clamp } from '@/core/util/math';
import { makeId } from '@/core/ids/ids';
import { BALANCE } from '@/domain/player/balance';
import { AFFIX_TEMPLATES, ITEM_BASES, MATERIALS, QUALITIES, SPECIAL_EFFECTS } from '@/data/itemBases';
import type { Affix } from '@/domain/items/affixes';
import { addStats, statsFromAffixes } from '@/domain/items/affixes';
import { RARITIES, type Item, type ItemBase, type Rarity } from '@/domain/items/item';
import { titleCase } from '@/core/util/text';

export interface LootContext {
  itemLevel: number;
  luck: number;
  /** Narrows the base pool: e.g. ['weapon'] or ['consumable']. */
  categories?: readonly string[];
  tags?: readonly string[];
  /** Forces a minimum rarity, used by boss and quest rewards. */
  minRarity?: Rarity;
  classHint?: string;
}

function rarityWeights(itemLevel: number, luck: number): { value: Rarity; weight: number }[] {
  const bonus = 1 + luck * BALANCE.loot.luckWeightBonus + itemLevel * BALANCE.loot.levelWeightBonus;
  return RARITIES.map((rarity) => {
    const base = BALANCE.loot.rarityWeights[rarity];
    const rank = RARITIES.indexOf(rarity);
    // Higher rarities scale with luck/level; common scales down.
    const weight = rank === 0 ? base / bonus : base * bonus ** rank;
    return { value: rarity, weight };
  });
}

export function rollRarity(rng: SeededRandom, context: LootContext): Rarity {
  const rolled = rng.weighted(rarityWeights(context.itemLevel, context.luck));
  if (!context.minRarity) return rolled;
  return RARITIES.indexOf(rolled) >= RARITIES.indexOf(context.minRarity) ? rolled : context.minRarity;
}

function pickBase(rng: SeededRandom, context: LootContext): ItemBase {
  const tier = clamp(Math.ceil(context.itemLevel / 6), 1, 4);
  let pool = ITEM_BASES.filter((base) => base.tier <= tier + 1);
  if (context.categories?.length) pool = pool.filter((base) => context.categories!.includes(base.category));
  if (context.tags?.length) pool = pool.filter((base) => base.tags.some((tag) => context.tags!.includes(tag)));
  if (pool.length === 0) pool = ITEM_BASES.filter((base) => base.category === 'material');
  const weighted = pool.map((base) => ({
    value: base,
    weight: (context.classHint && base.classHint?.includes(context.classHint) ? 2.2 : 1) * (base.tier <= tier ? 3 : 1),
  }));
  return rng.weighted(weighted);
}

function pickMaterial(rng: SeededRandom, itemLevel: number, base: ItemBase) {
  const tier = clamp(Math.ceil(itemLevel / 6), 1, 4);
  const pool = MATERIALS.filter((material) => material.tier <= tier).filter((material) => {
    if (base.tags.includes('cloth')) return material.tags.includes('cloth') || material.tags.includes('arcane');
    if (base.tags.includes('wood') || base.tags.includes('nature') || base.tags.includes('totem') || base.tags.includes('staff')) {
      return material.tags.includes('wood') || material.tags.includes('nature') || material.tags.includes('arcane');
    }
    return !material.tags.includes('cloth');
  });
  return pool.length > 0 ? rng.pick(pool) : MATERIALS[1]!;
}

function pickAffixes(rng: SeededRandom, base: ItemBase, rarity: Rarity, itemLevel: number): Affix[] {
  const count = BALANCE.loot.affixCountByRarity[rarity];
  if (count === 0) return [];
  const pool = AFFIX_TEMPLATES.filter((template) => !template.categories || template.categories.includes(base.category));
  const chosen = new Set<string>();
  const affixes: Affix[] = [];
  const levelScale = 1 + itemLevel / 22;

  for (let i = 0; i < count; i++) {
    const available = pool.filter((template) => !chosen.has(template.id));
    if (available.length === 0) break;
    const template = rng.weighted(available.map((entry) => ({ value: entry, weight: entry.weight })));
    chosen.add(template.id);
    const raw = rng.float(template.min, template.max) * levelScale;
    const value = Math.round(raw * 10) / 10;
    affixes.push({ id: `${template.id}_${i}`, label: template.label, stat: template.stat, value, kind: template.kind });
  }
  return affixes;
}

function composeName(base: ItemBase, quality: string, material: string, affixes: readonly Affix[]): string {
  const prefix = affixes.find((affix) => affix.kind === 'prefix')?.label ?? '';
  const suffix = affixes.find((affix) => affix.kind === 'suffix')?.label ?? '';
  const parts = [base.name, quality, prefix, material, suffix].filter((part) => part.length > 0);
  return titleCase(parts.join(' '));
}

export interface LootOrigin {
  eventId?: string;
  previousOwnerNpcId?: string;
  lore?: string;
}

/**
 * Base + Material + Quality + Prefix + Suffix + Affixes + Special + Rarity.
 * Deterministic for a given rng state.
 */
export function generateItem(rng: SeededRandom, context: LootContext, origin?: LootOrigin): Item {
  const base = pickBase(rng, context);
  const itemLevel = Math.max(1, Math.round(context.itemLevel));

  if (base.category === 'consumable' || base.category === 'material') {
    return {
      id: makeId('item', rng),
      baseId: base.baseId,
      name: base.name,
      category: base.category,
      slot: null,
      rarity: 'common',
      itemLevel,
      materialId: null,
      qualityId: null,
      affixes: [],
      stats: {},
      value: base.baseValue,
      quantity: base.category === 'material' ? rng.int(1, 3) : 1,
      stackable: true,
      special: null,
      artKey: `icon.item.${base.baseId}`,
      ...(base.consumableEffect ? { consumableEffect: base.consumableEffect } : {}),
    };
  }

  const rarity = rollRarity(rng, context);
  const material = pickMaterial(rng, itemLevel, base);
  const quality = rng.weighted(QUALITIES.map((entry) => ({ value: entry, weight: entry.weight })));
  const affixes = pickAffixes(rng, base, rarity, itemLevel);

  const scale = material.multiplier * quality.multiplier * (1 + itemLevel / 14);
  const scaledBase = Object.fromEntries(
    Object.entries(base.baseStats).map(([key, value]) => [key, Math.round((value ?? 0) * scale * 10) / 10]),
  );
  const stats = addStats(scaledBase, statsFromAffixes(affixes));

  const rarityRank = RARITIES.indexOf(rarity);
  const special = rarityRank >= 3 ? rng.pick(SPECIAL_EFFECTS) : null;
  const value = Math.max(
    1,
    Math.round(base.baseValue * scale * BALANCE.loot.valueMultiplierByRarity[rarity]),
  );

  const item: Item = {
    id: makeId('item', rng),
    baseId: base.baseId,
    name: composeName(base, quality.name, material.name, affixes),
    category: base.category,
    slot: base.slot,
    rarity,
    itemLevel,
    materialId: material.id,
    qualityId: quality.id,
    affixes,
    stats,
    value,
    quantity: 1,
    stackable: false,
    special,
    artKey: `icon.item.${base.baseId}`,
  };

  if (rarityRank >= 4) {
    const legendRng = rng.derive('legend');
    item.uniqueName = titleCase(`${base.name} ${material.name} ${legendRng.pick(['do Juramento', 'da Última Guarda', 'do Inverno Longo', 'de Quem Não Voltou'])}`);
    item.name = item.uniqueName;
    item.lore = origin?.lore ?? 'Carrega a marca de alguém que morreu segurando isto.';
    if (origin?.eventId) item.originEventId = origin.eventId;
    if (origin?.previousOwnerNpcId) item.previousOwnerNpcId = origin.previousOwnerNpcId;
  }

  return item;
}

/** Deterministic drop roll for an encounter. */
export function rollLoot(rng: SeededRandom, context: LootContext, dropChance: number, maxDrops: number): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < maxDrops; i++) {
    if (!rng.bool(dropChance / (i + 1))) continue;
    items.push(generateItem(rng, context));
  }
  return items;
}

/** Semantic fingerprint used by the anti-repetition guard. */
export function itemFingerprint(item: Item): string {
  return fnv1a([item.baseId, item.rarity, item.materialId ?? '', item.affixes.map((a) => a.id).join('+')].join('|')).toString(16);
}
