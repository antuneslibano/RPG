import type {
  DungeonId, FactionId, KingdomId, LocationId, NpcId, QuestId, RegionId,
} from '@/core/ids/ids';
import type { Player } from '@/domain/player/player';
import type { ItemRegistry } from '@/domain/items/inventory';
import type { GameLocation, Kingdom, LocationState, Region, World } from '@/domain/world/world';
import type { Faction, FactionState } from '@/domain/faction/faction';
import type { NPC } from '@/domain/npc/npc';
import type { WorldEvent } from '@/domain/narrative/events';
import type { NPCMemory, NPCRelationship } from '@/domain/narrative/memory';
import type { Rumor } from '@/domain/narrative/rumor';
import type { ChronicleEntry } from '@/domain/narrative/chronicle';
import type { Quest } from '@/domain/quest/quest';
import type { Dungeon } from '@/domain/world/dungeon';
import type { BestiaryEntry } from '@/domain/combat/creature';
import type { CombatState } from '@/domain/combat/combat';

export interface GameSettings {
  reduceAnimations: boolean;
  uiScale: number;
  hapticsEnabled: boolean;
  showDamageNumbers: boolean;
}

export function defaultSettings(): GameSettings {
  return { reduceAnimations: false, uiScale: 1, hapticsEnabled: true, showDamageNumbers: true };
}

/** The whole save, in memory. Persistence writes it in independent partitions. */
export interface GameState {
  player: Player;
  items: ItemRegistry;
  world: World;
  kingdoms: Record<KingdomId, Kingdom>;
  regions: Record<RegionId, Region>;
  locations: Record<LocationId, GameLocation>;
  locationStates: Record<LocationId, LocationState>;
  factions: Record<FactionId, Faction>;
  factionStates: Record<FactionId, FactionState>;
  npcs: Record<NpcId, NPC>;
  events: WorldEvent[];
  memories: Record<NpcId, NPCMemory[]>;
  /** Relationship of each NPC towards the player. */
  relationships: Record<NpcId, NPCRelationship>;
  rumors: Rumor[];
  chronicle: ChronicleEntry[];
  quests: Record<QuestId, Quest>;
  dungeons: Record<DungeonId, Dungeon>;
  bestiary: Record<string, BestiaryEntry>;
  economy: { priceModifierByLocation: Record<LocationId, number>; scarcityByCategory: Record<string, number> };
  combat: CombatState | null;
  activeDungeonId: DungeonId | null;
  settings: GameSettings;
}

export const PLAYER_SUBJECT_ID = 'player';

export function currentLocation(state: GameState): GameLocation | null {
  return state.locations[state.player.currentLocationId] ?? null;
}

export function currentRegion(state: GameState): Region | null {
  const location = currentLocation(state);
  return location ? state.regions[location.regionId] ?? null : null;
}

export function currentLocationState(state: GameState): LocationState | null {
  return state.locationStates[state.player.currentLocationId] ?? null;
}

export function npcsAt(state: GameState, locationId: LocationId): NPC[] {
  const location = state.locations[locationId];
  if (!location) return [];
  return location.npcIds
    .map((id) => state.npcs[id])
    .filter((npc): npc is NPC => !!npc && npc.alive && npc.currentLocationId === locationId);
}

export function activeQuests(state: GameState): Quest[] {
  return Object.values(state.quests).filter((quest) => quest.state === 'active');
}
