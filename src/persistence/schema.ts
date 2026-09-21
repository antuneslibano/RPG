import { fnv1a } from '@/core/rng/random';

export const SCHEMA_VERSION = 3;

export const SAVE_PARTITIONS = [
  'meta', 'player', 'items', 'world', 'npcs', 'memories',
  'quests', 'chronicle', 'factions', 'economy', 'dungeons', 'settings',
] as const;

export type SavePartition = (typeof SAVE_PARTITIONS)[number];

export interface SaveEnvelope<T = unknown> {
  schemaVersion: number;
  checksum: string;
  updatedAt: number;
  data: T;
}

export interface SaveSlotMeta {
  slotId: string;
  heroName: string;
  className: string;
  level: number;
  seedLabel: string;
  gameDay: number;
  gameYear: number;
  locationName: string;
  updatedAt: number;
  playtimeSeconds: number;
}

export interface SaveIndex {
  activeSlotId: string | null;
  slots: SaveSlotMeta[];
}

export const STORAGE_PREFIX = 'rpg';

export function partitionKey(slotId: string, partition: SavePartition): string {
  return `${STORAGE_PREFIX}:slot:${slotId}:${partition}`;
}

export function backupKey(slotId: string, partition: SavePartition): string {
  return `${STORAGE_PREFIX}:backup:${slotId}:${partition}`;
}

export const INDEX_KEY = `${STORAGE_PREFIX}:index`;

export function checksumOf(value: unknown): string {
  return fnv1a(JSON.stringify(value) ?? '').toString(16);
}

export function wrap<T>(data: T): SaveEnvelope<T> {
  return { schemaVersion: SCHEMA_VERSION, checksum: checksumOf(data), updatedAt: Date.now(), data };
}

export type EnvelopeStatus = 'ok' | 'checksumMismatch' | 'malformed' | 'futureVersion';

export function inspectEnvelope(raw: string | null): { status: EnvelopeStatus; envelope: SaveEnvelope | null } {
  if (raw === null) return { status: 'malformed', envelope: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'malformed', envelope: null };
  }
  if (typeof parsed !== 'object' || parsed === null) return { status: 'malformed', envelope: null };
  const envelope = parsed as SaveEnvelope;
  if (typeof envelope.schemaVersion !== 'number' || !('data' in envelope)) {
    return { status: 'malformed', envelope: null };
  }
  if (envelope.schemaVersion > SCHEMA_VERSION) return { status: 'futureVersion', envelope };
  if (checksumOf(envelope.data) !== envelope.checksum) return { status: 'checksumMismatch', envelope };
  return { status: 'ok', envelope };
}
