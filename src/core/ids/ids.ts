import { SeededRandom } from '@/core/rng/random';

/** Every persistent entity gets a stable prefixed ID. Names are never keys. */
export const ID_PREFIXES = {
  kingdom: 'kingdom',
  region: 'region',
  location: 'location',
  npc: 'npc',
  event: 'event',
  quest: 'quest',
  item: 'item',
  dungeon: 'dungeon',
  faction: 'faction',
  memory: 'memory',
  rumor: 'rumor',
  chronicle: 'chronicle',
  creature: 'creature',
  save: 'save',
  skill: 'skill',
  room: 'room',
} as const;

export type EntityKind = keyof typeof ID_PREFIXES;

export type KingdomId = string;
export type RegionId = string;
export type LocationId = string;
export type NpcId = string;
export type EventId = string;
export type QuestId = string;
export type ItemId = string;
export type DungeonId = string;
export type FactionId = string;
export type MemoryId = string;
export type RumorId = string;
export type ChronicleId = string;
export type CreatureId = string;
export type SaveId = string;
export type SkillId = string;
export type RoomId = string;

export function makeId(kind: EntityKind, rng: SeededRandom): string {
  return `${ID_PREFIXES[kind]}_${rng.hex(12)}`;
}

/** Deterministic ID for a conceptual slot (e.g. "region 2 of kingdom X"). */
export function makeStableId(kind: EntityKind, key: string): string {
  return `${ID_PREFIXES[kind]}_${new SeededRandom(`${kind}::${key}`).hex(12)}`;
}

export function idKind(id: string): EntityKind | null {
  const prefix = id.split('_')[0];
  const entry = Object.entries(ID_PREFIXES).find(([, value]) => value === prefix);
  return entry ? (entry[0] as EntityKind) : null;
}

export function isId(value: unknown, kind?: EntityKind): value is string {
  if (typeof value !== 'string') return false;
  const parsed = idKind(value);
  if (parsed === null) return false;
  return kind ? parsed === kind : true;
}
