import { SeededRandom, generateSeedLabel, normalizeSeedLabel } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { GameState } from '@/domain/world/gameState';
import { defaultSettings } from '@/domain/world/gameState';
import { emptyEquipment, emptyReputation, type Player, type Presentation } from '@/domain/player/player';
import { addAttributes } from '@/domain/player/attributes';
import { CLASS_BY_ID, ORIGIN_BY_ID, type ClassId } from '@/data/classes';
import { ITEM_BASE_BY_ID } from '@/data/itemBases';
import { generateWorld } from '@/procgen/world';
import { generateItem } from '@/procgen/loot';
import { addItem, equipItem } from '@/domain/items/inventory';
import { computeDerivedStats } from '@/domain/player/stats';
import { recordWorldEvent } from '@/narrative/eventService';
import type { EventBus } from '@/core/events/eventBus';
import type { Item } from '@/domain/items/item';
import type { Attributes } from '@/domain/player/attributes';

export interface NewGameConfig {
  heroName: string;
  classId: ClassId;
  originId: string;
  presentation: Presentation;
  /** Extra attribute points the player distributed at creation. */
  allocatedAttributes: Partial<Attributes>;
  seedLabel?: string;
}

export function randomSeedLabel(): string {
  return generateSeedLabel(new SeededRandom(Date.now() ^ Math.floor(performance?.now?.() ?? 0), 'seedgen'));
}

/** Builds a starting item from a base id without rolling rarity or affixes. */
function craftStartingItem(rng: SeededRandom, baseId: string, quantity: number): Item | null {
  const base = ITEM_BASE_BY_ID[baseId];
  if (!base) return null;
  const item = generateItem(rng, { itemLevel: 1, luck: 0, categories: [base.category], tags: base.tags });
  item.baseId = base.baseId;
  item.name = base.name;
  item.category = base.category;
  item.slot = base.slot;
  item.rarity = 'common';
  item.stats = { ...base.baseStats };
  item.affixes = [];
  item.materialId = null;
  item.qualityId = null;
  item.value = base.baseValue;
  item.quantity = quantity;
  item.stackable = base.stackable ?? false;
  item.special = null;
  item.artKey = `icon.item.${base.baseId}`;
  if (base.consumableEffect) item.consumableEffect = base.consumableEffect;
  delete item.uniqueName;
  delete item.lore;
  return item;
}

export function createNewGame(config: NewGameConfig, bus?: EventBus): GameState {
  const seedLabel = normalizeSeedLabel(config.seedLabel && config.seedLabel.trim().length > 0 ? config.seedLabel : randomSeedLabel());
  const bundle = generateWorld({ seedLabel });
  const heroClass = CLASS_BY_ID[config.classId];
  const origin = ORIGIN_BY_ID[config.originId];

  const rng = new SeededRandom(`${seedLabel}:hero`, 'hero');
  const attributes = addAttributes(
    addAttributes(heroClass.baseAttributes, origin?.bonus ?? {}),
    config.allocatedAttributes,
  );

  const player: Player = {
    id: makeId('save', rng),
    name: config.heroName.trim().length > 0 ? config.heroName.trim() : 'Herói',
    presentation: config.presentation,
    portraitKey: heroClass.portraitKey,
    classId: config.classId,
    originId: config.originId,
    level: 1,
    xp: 0,
    attributePoints: 0,
    skillPoints: 1,
    attributes,
    resources: { hp: 1, mana: 0 },
    equipment: emptyEquipment(),
    inventoryItemIds: [],
    skillRanks: {},
    gold: 120,
    currentLocationId: bundle.startingLocationId,
    discoveredLocationIds: [bundle.startingLocationId],
    reputation: emptyReputation(),
    createdAt: Date.now(),
    playtimeSeconds: 0,
    stats: { enemiesDefeated: 0, questsCompleted: 0, dungeonsCleared: 0, daysLived: 0 },
  };

  const state: GameState = {
    player,
    items: {},
    world: bundle.world,
    kingdoms: bundle.kingdoms,
    regions: bundle.regions,
    locations: bundle.locations,
    locationStates: bundle.locationStates,
    factions: bundle.factions,
    factionStates: bundle.factionStates,
    npcs: bundle.npcs,
    events: [],
    memories: {},
    relationships: {},
    rumors: [],
    chronicle: [],
    quests: {},
    dungeons: {},
    bestiary: {},
    economy: { priceModifierByLocation: {}, scarcityByCategory: {} },
    combat: null,
    activeDungeonId: null,
    settings: defaultSettings(),
  };

  for (const entry of heroClass.startingItems) {
    const item = craftStartingItem(rng, entry.baseId, entry.quantity);
    if (!item) continue;
    const id = addItem(player, state.items, item);
    if (entry.equip) equipItem(player, state.items, id);
  }

  const stats = computeDerivedStats({ level: 1, attributes, equipment: [] });
  player.resources.hp = stats.maxHp;
  player.resources.mana = stats.maxMana;

  const startLocation = state.locations[bundle.startingLocationId]!;
  state.locationStates[bundle.startingLocationId]!.discovered = true;
  state.locationStates[bundle.startingLocationId]!.lastVisitedDay = 1;

  recordWorldEvent(state, {
    type: 'playerArrived',
    locationId: startLocation.id,
    cause: 'início da jornada',
    consequences: [],
    importance: 35,
    summary: `Você chegou a ${startLocation.name}.`,
    tags: ['start'],
    memory: { memoryType: 'metPlayer', emotionalWeight: 2, trustImpact: 1, fearImpact: 0, respectImpact: 0 },
  }, bus);

  if (origin) {
    recordWorldEvent(state, {
      type: 'discovery',
      locationId: startLocation.id,
      cause: 'origem do herói',
      consequences: [],
      importance: 28,
      summary: origin.narrativeHook,
      tags: ['origin'],
    }, bus);
  }

  return state;
}
