import { createNewGame } from '@/game/newGame';
import { SeededRandom } from '@/core/rng/random';
import { generateItem } from '@/procgen/loot';
import {
  addItem, comparePower, countItems, equipItem, filterByCategory, inventoryEntries,
  removeItem, sortEntries, unequipSlot,
} from '@/domain/items/inventory';
import { buyItem, buyPrice, refreshStock, sellItem, sellPrice } from '@/game/economy';
import { itemPower } from '@/domain/items/item';

function game(seed = 'inv-0001') {
  return createNewGame({
    heroName: 'Teste', classId: 'druid', originId: 'origin_village',
    presentation: 'androgynous', allocatedAttributes: {}, seedLabel: seed,
  });
}

describe('inventário', () => {
  it('a classe começa com o equipamento inicial equipado', () => {
    const state = game();
    const entries = inventoryEntries(state.player, state.items);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((entry) => entry.equipped)).toBe(true);
    expect(state.player.equipment.mainHand).not.toBeNull();
  });

  it('empilha consumíveis do mesmo tipo', () => {
    const state = game('inv-stack');
    const before = countItems(state.player, state.items, 'base_potion_minor');
    const potion = generateItem(new SeededRandom('p1'), { itemLevel: 1, luck: 0, categories: ['consumable'] });
    potion.baseId = 'base_potion_minor';
    potion.stackable = true;
    potion.quantity = 2;
    addItem(state.player, state.items, potion);
    expect(countItems(state.player, state.items, 'base_potion_minor')).toBe(before + 2);
  });

  it('equipar troca o item do espaço e desequipar libera', () => {
    const state = game('inv-equip');
    const weapon = generateItem(new SeededRandom('w1'), { itemLevel: 5, luck: 0, categories: ['weapon'] });
    const id = addItem(state.player, state.items, weapon);
    const result = equipItem(state.player, state.items, id);
    expect(result.ok).toBe(true);
    expect(state.player.equipment[weapon.slot!]).toBe(id);
    expect(unequipSlot(state.player, weapon.slot!)).toBe(id);
    expect(state.player.equipment[weapon.slot!]).toBeNull();
  });

  it('recusa equipar consumível ou item fora do inventário', () => {
    const state = game('inv-refuse');
    const potion = generateItem(new SeededRandom('p2'), { itemLevel: 1, luck: 0, categories: ['consumable'] });
    const id = addItem(state.player, state.items, potion);
    expect(equipItem(state.player, state.items, id).ok).toBe(false);
    expect(equipItem(state.player, state.items, 'item_inexistente').ok).toBe(false);
  });

  it('remover um item equipado também o desequipa', () => {
    const state = game('inv-remove');
    const equippedId = state.player.equipment.mainHand!;
    removeItem(state.player, state.items, equippedId);
    expect(state.player.equipment.mainHand).toBeNull();
    expect(state.player.inventoryItemIds).not.toContain(equippedId);
    expect(state.items[equippedId]).toBeUndefined();
  });

  it('remover parte de uma pilha mantém o resto', () => {
    const state = game('inv-partial');
    const stackId = state.player.inventoryItemIds.find((id) => state.items[id]?.stackable && state.items[id]!.quantity > 1);
    if (!stackId) return;
    const before = state.items[stackId]!.quantity;
    removeItem(state.player, state.items, stackId, 1);
    expect(state.items[stackId]!.quantity).toBe(before - 1);
  });

  it('ordena e filtra corretamente', () => {
    const state = game('inv-sort');
    const rng = new SeededRandom('sortitems');
    for (let i = 0; i < 8; i++) addItem(state.player, state.items, generateItem(rng, { itemLevel: 10, luck: 10 }));
    const entries = inventoryEntries(state.player, state.items);

    const byPower = sortEntries(entries, 'power');
    for (let i = 1; i < byPower.length; i++) {
      expect(itemPower(byPower[i - 1]!.item)).toBeGreaterThanOrEqual(itemPower(byPower[i]!.item));
    }
    const weapons = filterByCategory(entries, 'weapon');
    expect(weapons.every((entry) => entry.item.category === 'weapon')).toBe(true);
    expect(filterByCategory(entries, 'all')).toHaveLength(entries.length);
  });

  it('comparePower indica melhoria e perda', () => {
    const weak = generateItem(new SeededRandom('weak'), { itemLevel: 1, luck: 0, categories: ['weapon'] });
    const strong = generateItem(new SeededRandom('strong'), { itemLevel: 40, luck: 40, minRarity: 'epic', categories: ['weapon'] });
    expect(comparePower(strong, weak)).toBeGreaterThan(0);
    expect(comparePower(weak, strong)).toBeLessThan(0);
    expect(comparePower(weak, null)).toBe(itemPower(weak));
  });
});

describe('economia', () => {
  it('o preço de venda é menor que o de compra', () => {
    const state = game('econ-1');
    const location = state.locations[state.player.currentLocationId]!;
    const shop = location.establishments.find((entry) => entry.kind === 'market')!;
    refreshStock(state, shop, location.id);
    const item = state.items[shop.stockItemIds[0]!]!;
    expect(sellPrice(state, item, shop, location.id)).toBeLessThan(buyPrice(state, item, shop, location.id));
  });

  it('escassez encarece e reputação barateia', () => {
    const state = game('econ-2');
    const location = state.locations[state.player.currentLocationId]!;
    const shop = location.establishments.find((entry) => entry.kind === 'market')!;
    refreshStock(state, shop, location.id);
    const item = state.items[shop.stockItemIds[0]!]!;

    const base = buyPrice(state, item, shop, location.id);
    state.economy.scarcityByCategory[item.category] = 1.8;
    expect(buyPrice(state, item, shop, location.id)).toBeGreaterThan(base);

    state.economy.scarcityByCategory[item.category] = 1;
    state.player.reputation.byLocation[location.id] = 100;
    expect(buyPrice(state, item, shop, location.id)).toBeLessThan(base);
  });

  it('comprar transfere o item e desconta as moedas', () => {
    const state = game('econ-3');
    const location = state.locations[state.player.currentLocationId]!;
    const shop = location.establishments.find((entry) => entry.kind === 'market')!;
    refreshStock(state, shop, location.id);
    const item = state.items[shop.stockItemIds[0]!]!;
    state.player.gold = 99999;

    const result = buyItem(state, shop, item.id, location.id);
    expect(result.ok).toBe(true);
    expect(state.player.gold).toBeLessThan(99999);
    expect(state.player.inventoryItemIds).toContain(item.id);
    expect(shop.stockItemIds).not.toContain(item.id);
  });

  it('recusa a compra sem moedas suficientes', () => {
    const state = game('econ-4');
    const location = state.locations[state.player.currentLocationId]!;
    const shop = location.establishments.find((entry) => entry.kind === 'market')!;
    refreshStock(state, shop, location.id);
    state.player.gold = 0;
    const result = buyItem(state, shop, shop.stockItemIds[0]!, location.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('insuficientes');
  });

  it('vender remove do inventário e paga', () => {
    const state = game('econ-5');
    const location = state.locations[state.player.currentLocationId]!;
    const shop = location.establishments.find((entry) => entry.kind === 'market')!;
    const sellable = inventoryEntries(state.player, state.items).find((entry) => !entry.equipped)!;
    const goldBefore = state.player.gold;

    const result = sellItem(state, shop, sellable.item.id, location.id);
    expect(result.ok).toBe(true);
    expect(state.player.gold).toBeGreaterThan(goldBefore);
    expect(state.player.inventoryItemIds).not.toContain(sellable.item.id);
  });

  it('o estoque só é renovado uma vez por dia', () => {
    const state = game('econ-6');
    const location = state.locations[state.player.currentLocationId]!;
    const shop = location.establishments.find((entry) => entry.kind === 'market')!;
    refreshStock(state, shop, location.id);
    const first = [...shop.stockItemIds];
    refreshStock(state, shop, location.id);
    expect(shop.stockItemIds).toEqual(first);

    state.world.gameDay += 1;
    refreshStock(state, shop, location.id);
    expect(shop.stockItemIds).not.toEqual(first);
  });
});
