import type { GameState } from '@/domain/world/gameState';
import { defaultSettings } from '@/domain/world/gameState';
import type { StorageAdapter } from '@/persistence/storage';
import {
  INDEX_KEY, SAVE_PARTITIONS, SCHEMA_VERSION, type SaveIndex, type SavePartition, type SaveSlotMeta,
  backupKey, inspectEnvelope, partitionKey, wrap,
} from '@/persistence/schema';
import { migratePartition } from '@/persistence/migrations';
import { validateAndRepair, type ValidationIssue } from '@/persistence/validation';
import { CLASS_BY_ID } from '@/data/classes';

/** Partition -> the slice of GameState it owns. */
function slice(state: GameState, partition: SavePartition): unknown {
  switch (partition) {
    case 'meta': return { seedLabel: state.world.seedLabel, createdAt: state.world.createdAt };
    case 'player': return state.player;
    case 'items': return state.items;
    case 'world': return {
      world: state.world, kingdoms: state.kingdoms, regions: state.regions,
      locations: state.locations, locationStates: state.locationStates,
    };
    case 'npcs': return state.npcs;
    case 'memories': return { memories: state.memories, relationships: state.relationships, rumors: state.rumors, events: state.events };
    case 'quests': return state.quests;
    case 'chronicle': return state.chronicle;
    case 'factions': return { factions: state.factions, factionStates: state.factionStates };
    case 'economy': return { economy: state.economy, bestiary: state.bestiary };
    case 'dungeons': return { dungeons: state.dungeons, activeDungeonId: state.activeDungeonId };
    case 'settings': return state.settings;
  }
}

function applySlice(state: GameState, partition: SavePartition, data: unknown): void {
  const record = data as Record<string, unknown>;
  switch (partition) {
    case 'meta': break;
    case 'player': state.player = data as GameState['player']; break;
    case 'items': state.items = (data ?? {}) as GameState['items']; break;
    case 'world':
      state.world = record.world as GameState['world'];
      state.kingdoms = (record.kingdoms ?? {}) as GameState['kingdoms'];
      state.regions = (record.regions ?? {}) as GameState['regions'];
      state.locations = (record.locations ?? {}) as GameState['locations'];
      state.locationStates = (record.locationStates ?? {}) as GameState['locationStates'];
      break;
    case 'npcs': state.npcs = (data ?? {}) as GameState['npcs']; break;
    case 'memories':
      state.memories = (record.memories ?? {}) as GameState['memories'];
      state.relationships = (record.relationships ?? {}) as GameState['relationships'];
      state.rumors = (record.rumors ?? []) as GameState['rumors'];
      state.events = (record.events ?? []) as GameState['events'];
      break;
    case 'quests': state.quests = (data ?? {}) as GameState['quests']; break;
    case 'chronicle': state.chronicle = (data ?? []) as GameState['chronicle']; break;
    case 'factions':
      state.factions = (record.factions ?? {}) as GameState['factions'];
      state.factionStates = (record.factionStates ?? {}) as GameState['factionStates'];
      break;
    case 'economy':
      state.economy = (record.economy ?? { priceModifierByLocation: {}, scarcityByCategory: {} }) as GameState['economy'];
      state.bestiary = (record.bestiary ?? {}) as GameState['bestiary'];
      break;
    case 'dungeons':
      state.dungeons = (record.dungeons ?? {}) as GameState['dungeons'];
      state.activeDungeonId = (record.activeDungeonId ?? null) as GameState['activeDungeonId'];
      break;
    case 'settings': state.settings = { ...defaultSettings(), ...(data as object) }; break;
  }
}

export interface SaveReport {
  slotId: string;
  partitionsWritten: SavePartition[];
  durationMs: number;
}

export interface LoadReport {
  ok: boolean;
  state: GameState | null;
  issues: ValidationIssue[];
  migrationsApplied: string[];
  recoveredPartitions: SavePartition[];
  failedPartitions: SavePartition[];
}

/**
 * Incremental, partitioned persistence. Only dirty partitions are written, each
 * with its own checksum and a one-generation backup, so a corrupt write can
 * never take the whole save down.
 */
export class SaveService {
  private readonly dirty = new Set<SavePartition>();

  constructor(private readonly storage: StorageAdapter) {}

  markDirty(...partitions: SavePartition[]): void {
    for (const partition of partitions) this.dirty.add(partition);
  }

  markAllDirty(): void {
    for (const partition of SAVE_PARTITIONS) this.dirty.add(partition);
  }

  hasPendingWrites(): boolean {
    return this.dirty.size > 0;
  }

  async save(slotId: string, state: GameState, options: { full?: boolean } = {}): Promise<SaveReport> {
    const started = Date.now();
    const partitions = options.full ? [...SAVE_PARTITIONS] : [...this.dirty];
    // 'meta' is cheap and keeps the slot list truthful after any write.
    if (partitions.length > 0 && !partitions.includes('meta')) partitions.push('meta');

    for (const partition of partitions) {
      const key = partitionKey(slotId, partition);
      const previous = await this.storage.getItem(key);
      if (previous !== null) await this.storage.setItem(backupKey(slotId, partition), previous);
      await this.storage.setItem(key, JSON.stringify(wrap(slice(state, partition))));
      this.dirty.delete(partition);
    }

    await this.updateIndex(slotId, state);
    return { slotId, partitionsWritten: partitions, durationMs: Date.now() - started };
  }

  async load(slotId: string, template: GameState): Promise<LoadReport> {
    const state = template;
    const migrationsApplied: string[] = [];
    const recoveredPartitions: SavePartition[] = [];
    const failedPartitions: SavePartition[] = [];

    for (const partition of SAVE_PARTITIONS) {
      const raw = await this.storage.getItem(partitionKey(slotId, partition));
      let inspection = inspectEnvelope(raw);

      if (inspection.status !== 'ok') {
        const backup = await this.storage.getItem(backupKey(slotId, partition));
        const fromBackup = inspectEnvelope(backup);
        if (fromBackup.status === 'ok') {
          inspection = fromBackup;
          recoveredPartitions.push(partition);
        } else {
          if (raw !== null) failedPartitions.push(partition);
          continue;
        }
      }

      const envelope = inspection.envelope;
      if (!envelope) continue;
      const migrated = migratePartition(partition, envelope.schemaVersion, envelope.data);
      migrationsApplied.push(...migrated.applied);
      applySlice(state, partition, migrated.data);
    }

    const issues = validateAndRepair(state);
    return {
      ok: failedPartitions.length === 0,
      state,
      issues,
      migrationsApplied: [...new Set(migrationsApplied)],
      recoveredPartitions,
      failedPartitions,
    };
  }

  async readIndex(): Promise<SaveIndex> {
    const raw = await this.storage.getItem(INDEX_KEY);
    const inspection = inspectEnvelope(raw);
    if (inspection.status !== 'ok' || !inspection.envelope) return { activeSlotId: null, slots: [] };
    const data = inspection.envelope.data as SaveIndex;
    return { activeSlotId: data.activeSlotId ?? null, slots: Array.isArray(data.slots) ? data.slots : [] };
  }

  async setActiveSlot(slotId: string | null): Promise<void> {
    const index = await this.readIndex();
    index.activeSlotId = slotId;
    await this.storage.setItem(INDEX_KEY, JSON.stringify(wrap(index)));
  }

  async deleteSlot(slotId: string): Promise<void> {
    for (const partition of SAVE_PARTITIONS) {
      await this.storage.removeItem(partitionKey(slotId, partition));
      await this.storage.removeItem(backupKey(slotId, partition));
    }
    const index = await this.readIndex();
    index.slots = index.slots.filter((slot) => slot.slotId !== slotId);
    if (index.activeSlotId === slotId) index.activeSlotId = index.slots[0]?.slotId ?? null;
    await this.storage.setItem(INDEX_KEY, JSON.stringify(wrap(index)));
  }

  async hasSave(slotId: string): Promise<boolean> {
    const raw = await this.storage.getItem(partitionKey(slotId, 'player'));
    return inspectEnvelope(raw).status === 'ok';
  }

  private async updateIndex(slotId: string, state: GameState): Promise<void> {
    const index = await this.readIndex();
    const meta: SaveSlotMeta = {
      slotId,
      heroName: state.player.name,
      className: CLASS_BY_ID[state.player.classId]?.name ?? state.player.classId,
      level: state.player.level,
      seedLabel: state.world.seedLabel,
      gameDay: state.world.gameDay,
      gameYear: state.world.gameYear,
      locationName: state.locations[state.player.currentLocationId]?.name ?? '—',
      updatedAt: Date.now(),
      playtimeSeconds: state.player.playtimeSeconds,
    };
    const existing = index.slots.findIndex((slot) => slot.slotId === slotId);
    if (existing >= 0) index.slots[existing] = meta;
    else index.slots.push(meta);
    index.activeSlotId = slotId;
    await this.storage.setItem(INDEX_KEY, JSON.stringify(wrap(index)));
  }
}

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;
