import type { ItemId } from '@/core/ids/ids';
import type { Player } from '@/domain/player/player';
import { type EquipmentSlot, type Item, type ItemCategory, isEquippable, itemPower, rarityIndex } from '@/domain/items/item';

export type ItemRegistry = Record<ItemId, Item>;

export interface InventoryEntry {
  item: Item;
  equipped: boolean;
  equippedSlot: EquipmentSlot | null;
}

export function resolveItems(ids: readonly ItemId[], registry: ItemRegistry): Item[] {
  const out: Item[] = [];
  for (const id of ids) {
    const item = registry[id];
    if (item) out.push(item);
  }
  return out;
}

export function equippedItems(player: Player, registry: ItemRegistry): Item[] {
  const out: Item[] = [];
  for (const id of Object.values(player.equipment)) {
    if (!id) continue;
    const item = registry[id];
    if (item) out.push(item);
  }
  return out;
}

export function inventoryEntries(player: Player, registry: ItemRegistry): InventoryEntry[] {
  const equippedBySlot = new Map<ItemId, EquipmentSlot>();
  for (const [slot, id] of Object.entries(player.equipment)) {
    if (id) equippedBySlot.set(id, slot as EquipmentSlot);
  }
  return resolveItems(player.inventoryItemIds, registry).map((item) => ({
    item,
    equipped: equippedBySlot.has(item.id),
    equippedSlot: equippedBySlot.get(item.id) ?? null,
  }));
}

/** Adds an item, merging into an existing stack when stackable. */
export function addItem(player: Player, registry: ItemRegistry, item: Item): ItemId {
  if (item.stackable) {
    const existingId = player.inventoryItemIds.find((id) => registry[id]?.baseId === item.baseId && registry[id]?.stackable);
    const existing = existingId ? registry[existingId] : undefined;
    if (existing) {
      existing.quantity += Math.max(1, item.quantity);
      return existing.id;
    }
  }
  registry[item.id] = item;
  player.inventoryItemIds.push(item.id);
  return item.id;
}

export function removeItem(player: Player, registry: ItemRegistry, itemId: ItemId, quantity = 1): boolean {
  const item = registry[itemId];
  if (!item) return false;
  if (item.stackable && item.quantity > quantity) {
    item.quantity -= quantity;
    return true;
  }
  unequipItemById(player, itemId);
  player.inventoryItemIds = player.inventoryItemIds.filter((id) => id !== itemId);
  delete registry[itemId];
  return true;
}

export function countItems(player: Player, registry: ItemRegistry, baseId: string): number {
  return resolveItems(player.inventoryItemIds, registry)
    .filter((item) => item.baseId === baseId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export interface EquipResult {
  ok: boolean;
  reason?: string;
  replacedItemId: ItemId | null;
}

export function equipItem(player: Player, registry: ItemRegistry, itemId: ItemId): EquipResult {
  const item = registry[itemId];
  if (!item) return { ok: false, reason: 'Item inexistente.', replacedItemId: null };
  if (!isEquippable(item) || !item.slot) return { ok: false, reason: 'Este item não pode ser equipado.', replacedItemId: null };
  if (!player.inventoryItemIds.includes(itemId)) return { ok: false, reason: 'Item fora do inventário.', replacedItemId: null };

  const slot = item.slot;
  const replacedItemId = player.equipment[slot];
  player.equipment[slot] = itemId;
  return { ok: true, replacedItemId };
}

export function unequipSlot(player: Player, slot: EquipmentSlot): ItemId | null {
  const current = player.equipment[slot];
  player.equipment[slot] = null;
  return current;
}

export function unequipItemById(player: Player, itemId: ItemId): void {
  for (const [slot, id] of Object.entries(player.equipment)) {
    if (id === itemId) player.equipment[slot as EquipmentSlot] = null;
  }
}

/** Positive means the candidate is stronger than what is equipped. */
export function comparePower(candidate: Item, equipped: Item | null): number {
  return itemPower(candidate) - (equipped ? itemPower(equipped) : 0);
}

export type SortMode = 'power' | 'rarity' | 'name' | 'value';

export function sortEntries(entries: readonly InventoryEntry[], mode: SortMode): InventoryEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    switch (mode) {
      case 'rarity':
        return rarityIndex(b.item.rarity) - rarityIndex(a.item.rarity) || a.item.name.localeCompare(b.item.name);
      case 'name':
        return a.item.name.localeCompare(b.item.name);
      case 'value':
        return b.item.value - a.item.value;
      case 'power':
      default:
        return itemPower(b.item) - itemPower(a.item) || a.item.name.localeCompare(b.item.name);
    }
  });
  return copy;
}

export function filterByCategory(entries: readonly InventoryEntry[], category: ItemCategory | 'all'): InventoryEntry[] {
  return category === 'all' ? [...entries] : entries.filter((entry) => entry.item.category === category);
}

export function inventoryWeightSummary(entries: readonly InventoryEntry[]): { count: number; value: number } {
  return {
    count: entries.reduce((sum, entry) => sum + entry.item.quantity, 0),
    value: entries.reduce((sum, entry) => sum + entry.item.value * entry.item.quantity, 0),
  };
}
