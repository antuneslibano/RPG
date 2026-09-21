import type { SavePartition } from '@/persistence/schema';
import { SCHEMA_VERSION } from '@/persistence/schema';

export interface Migration {
  /** Upgrades data written at `from` to `from + 1`. */
  from: number;
  describe: string;
  migrate: (partition: SavePartition, data: unknown) => unknown;
}

/**
 * Migrations run in order on load. Each one is small and total: it must accept
 * any shape the previous version could have produced.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    from: 1,
    describe: 'v1 -> v2: player.stats counters and world.recentFingerprints introduced',
    migrate: (partition, data) => {
      if (partition === 'player' && isRecord(data)) {
        const player = { ...data };
        if (!isRecord(player.stats)) {
          player.stats = { enemiesDefeated: 0, questsCompleted: 0, dungeonsCleared: 0, daysLived: 0 };
        }
        if (typeof player.playtimeSeconds !== 'number') player.playtimeSeconds = 0;
        return player;
      }
      if (partition === 'world' && isRecord(data)) {
        const world = { ...data };
        const inner = isRecord(world.world) ? { ...world.world } : null;
        if (inner && !Array.isArray(inner.recentFingerprints)) {
          inner.recentFingerprints = [];
          world.world = inner;
        }
        return world;
      }
      return data;
    },
  },
  {
    from: 2,
    describe: 'v2 -> v3: location states gained pendingConsequences for simulation LOD',
    migrate: (partition, data) => {
      if (partition !== 'world' || !isRecord(data)) return data;
      const world = { ...data };
      if (isRecord(world.locationStates)) {
        const states: Record<string, unknown> = {};
        for (const [id, value] of Object.entries(world.locationStates)) {
          states[id] = isRecord(value) && !Array.isArray(value.pendingConsequences)
            ? { ...value, pendingConsequences: [] }
            : value;
        }
        world.locationStates = states;
      }
      return world;
    },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface MigrationResult {
  data: unknown;
  applied: string[];
}

export function migratePartition(partition: SavePartition, version: number, data: unknown): MigrationResult {
  let current = data;
  let currentVersion = version;
  const applied: string[] = [];

  while (currentVersion < SCHEMA_VERSION) {
    const migration = MIGRATIONS.find((entry) => entry.from === currentVersion);
    if (!migration) {
      // No migration for this step: the shape is assumed compatible.
      currentVersion += 1;
      continue;
    }
    current = migration.migrate(partition, current);
    applied.push(migration.describe);
    currentVersion += 1;
  }

  return { data: current, applied };
}
