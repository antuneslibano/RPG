import type {
  DungeonId, EventId, FactionId, ItemId, LocationId, NpcId, QuestId, RegionId, SkillId,
} from '@/core/ids/ids';

/** Typed event map. Systems react to events instead of calling each other. */
export interface GameEventMap {
  PLAYER_LEVEL_UP: { level: number; attributePoints: number; skillPoints: number };
  PLAYER_XP_GAINED: { amount: number; total: number };
  PLAYER_DAMAGED: { amount: number; remainingHp: number };
  PLAYER_DIED: { locationId: LocationId };
  NPC_MET: { npcId: NpcId; locationId: LocationId };
  NPC_DIED: { npcId: NpcId; locationId: LocationId; killedByPlayer: boolean };
  NPC_MOVED: { npcId: NpcId; fromLocationId: LocationId; toLocationId: LocationId };
  NPC_HELPED: { npcId: NpcId; magnitude: number; reason: string };
  NPC_WRONGED: { npcId: NpcId; magnitude: number; reason: string };
  QUEST_OFFERED: { questId: QuestId; npcId: NpcId };
  QUEST_ACCEPTED: { questId: QuestId };
  QUEST_OBJECTIVE_PROGRESS: { questId: QuestId; objectiveId: string; current: number };
  QUEST_COMPLETED: { questId: QuestId; npcId: NpcId | null };
  QUEST_FAILED: { questId: QuestId; reason: string };
  LOCATION_DISCOVERED: { locationId: LocationId; regionId: RegionId };
  REGION_ENTERED: { regionId: RegionId };
  LOCATION_ENTERED: { locationId: LocationId };
  FACTION_REPUTATION_CHANGED: { factionId: FactionId; delta: number; value: number };
  ITEM_ACQUIRED: { itemId: ItemId; source: string };
  ITEM_EQUIPPED: { itemId: ItemId; slot: string };
  ITEM_SOLD: { itemId: ItemId; gold: number };
  SKILL_UNLOCKED: { skillId: SkillId; rank: number };
  COMBAT_STARTED: { encounterId: string; locationId: LocationId };
  COMBAT_ENDED: { encounterId: string; victory: boolean; xp: number; gold: number };
  CREATURE_KILLED: { creatureBaseId: string; variant: string; level: number };
  DUNGEON_ENTERED: { dungeonId: DungeonId };
  DUNGEON_CLEARED: { dungeonId: DungeonId; floors: number };
  BOSS_DEFEATED: { dungeonId: DungeonId; bossBaseId: string };
  CITY_ATTACKED: { locationId: LocationId; severity: number };
  WORLD_EVENT_CREATED: { eventId: EventId; type: string; importance: number };
  RUMOR_SPREAD: { rumorId: string; regionId: RegionId };
  DAY_ADVANCED: { gameDay: number; gameYear: number };
  CHRONICLE_ENTRY_ADDED: { entryId: string; title: string };
  GAME_SAVED: { slotId: string; durationMs: number };
}

export type GameEventName = keyof GameEventMap;

export interface GameEventEnvelope<K extends GameEventName = GameEventName> {
  name: K;
  payload: GameEventMap[K];
  at: number;
}
