import { clamp } from '@/core/util/math';
import { SeededRandom } from '@/core/rng/random';
import type { LocationId } from '@/core/ids/ids';
import { BALANCE } from '@/domain/player/balance';
import type { GameState } from '@/domain/world/gameState';
import type { Establishment } from '@/domain/world/world';
import type { Item } from '@/domain/items/item';
import { addItem, removeItem } from '@/domain/items/inventory';
import { generateItem } from '@/procgen/loot';
import { relationshipWith } from '@/narrative/memoryService';
import { describeRelationship } from '@/domain/narrative/memory';
import { OCCUPATION_BY_ID } from '@/data/npcContent';

/**
 * Price = base × rarity × region × scarcity × event × reputation/relationship.
 * A liked hero pays less; a famine makes potions expensive everywhere.
 */
export function buyPrice(state: GameState, item: Item, establishment: Establishment, locationId: LocationId): number {
  const scarcity = state.economy.scarcityByCategory[item.category] ?? 1;
  const regional = state.economy.priceModifierByLocation[locationId] ?? 1;
  const locationRep = state.player.reputation.byLocation[locationId] ?? 0;

  let relationshipDiscount = 0;
  if (establishment.ownerNpcId) {
    const relationship = relationshipWith(state, establishment.ownerNpcId);
    const { score } = describeRelationship(relationship);
    relationshipDiscount = clamp(score, -60, 140) * 0.0009;
  }

  const reputationDiscount = clamp(
    locationRep * BALANCE.economy.reputationDiscountPerPoint + relationshipDiscount,
    -0.15,
    BALANCE.economy.maxDiscount,
  );

  const price = item.value * establishment.priceModifier * scarcity * regional * (1 - reputationDiscount);
  return Math.max(1, Math.round(price));
}

export function sellPrice(state: GameState, item: Item, establishment: Establishment, locationId: LocationId): number {
  return Math.max(1, Math.round(buyPrice(state, item, establishment, locationId) * BALANCE.economy.sellRatio));
}

/** Shops restock on a day cadence, with stock that fits what they sell. */
export function refreshStock(state: GameState, establishment: Establishment, locationId: LocationId): void {
  if (establishment.stockRefreshedDay === state.world.gameDay) return;
  const location = state.locations[locationId];
  if (!location) return;

  const rng = new SeededRandom(`${state.world.seed}:stock:${establishment.id}:${state.world.gameDay}`, 'economy');
  for (const itemId of establishment.stockItemIds) delete state.items[itemId];
  establishment.stockItemIds = [];

  const owner = establishment.ownerNpcId ? state.npcs[establishment.ownerNpcId] : undefined;
  const categories = owner ? OCCUPATION_BY_ID[owner.occupationId]?.sellsCategories ?? [] : [];
  const pool = categories.length > 0 ? categories : ['consumable', 'material'];
  const itemLevel = Math.max(1, Math.round((location.levelRange[0] + location.levelRange[1]) / 2));
  const count = rng.int(4, 8);

  for (let i = 0; i < count; i++) {
    const item = generateItem(rng, { itemLevel, luck: 0, categories: [rng.pick(pool)] });
    state.items[item.id] = item;
    establishment.stockItemIds.push(item.id);
  }
  establishment.stockRefreshedDay = state.world.gameDay;
}

export interface TradeResult {
  ok: boolean;
  reason?: string;
  gold: number;
}

export function buyItem(state: GameState, establishment: Establishment, itemId: string, locationId: LocationId): TradeResult {
  const item = state.items[itemId];
  if (!item || !establishment.stockItemIds.includes(itemId)) {
    return { ok: false, reason: 'Item indisponível.', gold: state.player.gold };
  }
  const price = buyPrice(state, item, establishment, locationId);
  if (state.player.gold < price) return { ok: false, reason: 'Moedas insuficientes.', gold: state.player.gold };

  state.player.gold -= price;
  establishment.stockItemIds = establishment.stockItemIds.filter((id) => id !== itemId);
  addItem(state.player, state.items, item);
  return { ok: true, gold: state.player.gold };
}

export function sellItem(state: GameState, establishment: Establishment, itemId: string, locationId: LocationId): TradeResult {
  const item = state.items[itemId];
  if (!item || !state.player.inventoryItemIds.includes(itemId)) {
    return { ok: false, reason: 'Item não está no inventário.', gold: state.player.gold };
  }
  if (item.category === 'quest') return { ok: false, reason: 'Itens de missão não podem ser vendidos.', gold: state.player.gold };

  const price = sellPrice(state, item, establishment, locationId);
  state.player.gold += price;
  removeItem(state.player, state.items, itemId, item.quantity);
  return { ok: true, gold: state.player.gold };
}
