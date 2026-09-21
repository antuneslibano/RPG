import { ATTRIBUTE_KEYS } from '@/domain/player/attributes';
import { EQUIPMENT_SLOTS } from '@/domain/items/item';
import { BALANCE } from '@/domain/player/balance';
import { clamp, safeInt, safeNumber } from '@/core/util/math';
import type { GameState } from '@/domain/world/gameState';

export interface ValidationIssue {
  path: string;
  message: string;
  repaired: boolean;
}

/**
 * Persisted data is never trusted. This repairs what can be repaired and
 * reports the rest — NaNs, impossible negatives, orphan references, broken
 * inventory entries, quests pointing at NPCs that no longer exist.
 */
export function validateAndRepair(state: GameState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const note = (path: string, message: string, repaired = true): void => {
    issues.push({ path, message, repaired });
  };

  // --- Player numbers ---
  const player = state.player;
  player.level = clamp(safeInt(player.level, 1), 1, BALANCE.maxLevel);
  player.xp = Math.max(0, safeInt(player.xp, 0));
  player.gold = Math.max(0, safeInt(player.gold, 0));
  player.attributePoints = Math.max(0, safeInt(player.attributePoints, 0));
  player.skillPoints = Math.max(0, safeInt(player.skillPoints, 0));
  for (const key of ATTRIBUTE_KEYS) {
    const value = safeInt(player.attributes[key], 1);
    if (value < 0) note(`player.attributes.${key}`, 'valor negativo corrigido');
    player.attributes[key] = Math.max(0, value);
  }
  player.resources.hp = Math.max(0, safeNumber(player.resources.hp, 1));
  player.resources.mana = Math.max(0, safeNumber(player.resources.mana, 0));

  // --- Inventory and equipment integrity ---
  const validItemIds = new Set(Object.keys(state.items));
  const orphanItems = player.inventoryItemIds.filter((id) => !validItemIds.has(id));
  if (orphanItems.length > 0) {
    note('player.inventoryItemIds', `${orphanItems.length} referência(s) órfã(s) removida(s)`);
    player.inventoryItemIds = player.inventoryItemIds.filter((id) => validItemIds.has(id));
  }
  for (const slot of EQUIPMENT_SLOTS) {
    const id = player.equipment[slot];
    if (id === null || id === undefined) {
      player.equipment[slot] = null;
      continue;
    }
    if (!validItemIds.has(id)) {
      note(`player.equipment.${slot}`, 'item equipado inexistente removido');
      player.equipment[slot] = null;
      continue;
    }
    if (!player.inventoryItemIds.includes(id)) {
      note(`player.equipment.${slot}`, 'item equipado fora do inventário: reinserido');
      player.inventoryItemIds.push(id);
    }
  }
  for (const item of Object.values(state.items)) {
    item.quantity = Math.max(1, safeInt(item.quantity, 1));
    item.value = Math.max(0, safeInt(item.value, 1));
    for (const [key, value] of Object.entries(item.stats)) {
      if (!Number.isFinite(value)) {
        note(`items.${item.id}.stats.${key}`, 'valor não numérico removido');
        delete item.stats[key as keyof typeof item.stats];
      }
    }
  }

  // --- World references ---
  if (!state.locations[player.currentLocationId]) {
    const fallback = Object.keys(state.locations)[0];
    note('player.currentLocationId', 'localização inexistente: jogador reposicionado', !!fallback);
    if (fallback) player.currentLocationId = fallback;
  }
  player.discoveredLocationIds = [...new Set(player.discoveredLocationIds.filter((id) => !!state.locations[id]))];

  for (const location of Object.values(state.locations)) {
    const before = location.npcIds.length;
    location.npcIds = location.npcIds.filter((id) => !!state.npcs[id]);
    if (location.npcIds.length !== before) note(`locations.${location.id}.npcIds`, 'NPCs inexistentes removidos');
    location.connectedLocationIds = location.connectedLocationIds.filter((id) => !!state.locations[id]);
    location.dungeonIds = location.dungeonIds.filter((id) => !!state.dungeons[id]);
  }

  for (const npc of Object.values(state.npcs)) {
    if (!state.locations[npc.currentLocationId]) {
      note(`npcs.${npc.id}.currentLocationId`, 'NPC em local inexistente: devolvido para casa');
      npc.currentLocationId = state.locations[npc.homeLocationId] ? npc.homeLocationId : player.currentLocationId;
    }
    npc.relativeNpcIds = npc.relativeNpcIds.filter((id) => !!state.npcs[id]);
  }

  // --- Quests must stay completable ---
  for (const quest of Object.values(state.quests)) {
    if (quest.giverNpcId && !state.npcs[quest.giverNpcId]) {
      note(`quests.${quest.id}`, 'missão sem NPC: marcada como fracassada');
      quest.state = quest.state === 'completed' ? 'completed' : 'failed';
      quest.giverNpcId = null;
    }
    if (!state.locations[quest.locationId] && quest.state === 'active') {
      note(`quests.${quest.id}.locationId`, 'missão em local inexistente: marcada como fracassada');
      quest.state = 'failed';
    }
    for (const objective of quest.objectives) {
      objective.current = clamp(safeInt(objective.current, 0), 0, Math.max(1, safeInt(objective.required, 1)));
      objective.required = Math.max(1, safeInt(objective.required, 1));
      objective.done = objective.current >= objective.required;
    }
  }

  // --- Memories and relationships ---
  for (const [npcId, memories] of Object.entries(state.memories)) {
    if (!state.npcs[npcId]) {
      note(`memories.${npcId}`, 'memórias de NPC inexistente removidas');
      delete state.memories[npcId];
      continue;
    }
    state.memories[npcId] = memories.filter((memory) => Number.isFinite(memory.importance));
  }
  for (const npcId of Object.keys(state.relationships)) {
    if (!state.npcs[npcId]) delete state.relationships[npcId];
  }

  // --- Economy ---
  for (const [key, value] of Object.entries(state.economy.scarcityByCategory)) {
    state.economy.scarcityByCategory[key] = clamp(safeNumber(value, 1), 0.6, BALANCE.economy.scarcityMax);
  }
  for (const [key, value] of Object.entries(state.economy.priceModifierByLocation)) {
    state.economy.priceModifierByLocation[key] = clamp(safeNumber(value, 1), 0.5, 2.5);
  }

  return issues;
}
