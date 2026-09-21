import type { DungeonId, LocationId, RegionId, RoomId } from '@/core/ids/ids';

export const DUNGEON_KINDS = [
  'cave', 'crypt', 'mine', 'ruin', 'fortress', 'temple', 'sewer', 'cursedForest', 'tower', 'catacomb',
] as const;
export type DungeonKind = (typeof DUNGEON_KINDS)[number];

export const DUNGEON_KIND_LABELS: Record<DungeonKind, string> = {
  cave: 'Caverna', crypt: 'Cripta', mine: 'Mina', ruin: 'Ruína', fortress: 'Fortaleza',
  temple: 'Templo', sewer: 'Esgoto', cursedForest: 'Floresta Amaldiçoada', tower: 'Torre', catacomb: 'Catacumba',
};

export type RoomKind = 'entrance' | 'corridor' | 'combat' | 'treasure' | 'trap' | 'event' | 'rest' | 'secret' | 'miniboss' | 'boss';

export const ROOM_KIND_LABELS: Record<RoomKind, string> = {
  entrance: 'Entrada', corridor: 'Corredor', combat: 'Combate', treasure: 'Tesouro',
  trap: 'Armadilha', event: 'Evento', rest: 'Descanso', secret: 'Segredo',
  miniboss: 'Miniboss', boss: 'Chefe',
};

export interface DungeonRoom {
  id: RoomId;
  floor: number;
  kind: RoomKind;
  name: string;
  description: string;
  /** Room ids reachable from here. */
  exits: RoomId[];
  cleared: boolean;
  visited: boolean;
  /** Populated lazily when the player enters. */
  encounterCreatureIds: string[];
  trapDamage: number;
  treasureRolled: boolean;
  secret: boolean;
  eventText: string | null;
}

export interface Dungeon {
  id: DungeonId;
  name: string;
  kind: DungeonKind;
  regionId: RegionId;
  locationId: LocationId;
  levelRange: [number, number];
  floors: number;
  rooms: Record<RoomId, DungeonRoom>;
  entranceRoomId: RoomId;
  bossRoomId: RoomId;
  bossBaseId: string;
  /** Why this dungeon exists in this world — never just "random rooms". */
  narrativeContext: string;
  sourceEventId: string | null;
  cleared: boolean;
  discoveredDay: number;
  artKey: string;
  currentRoomId: RoomId | null;
}

export function dungeonProgress(dungeon: Dungeon): { visited: number; total: number } {
  const rooms = Object.values(dungeon.rooms);
  return { visited: rooms.filter((room) => room.visited).length, total: rooms.length };
}
