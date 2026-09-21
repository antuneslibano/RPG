import type { EventId, FactionId, LocationId, NpcId } from '@/core/ids/ids';

export interface Faction {
  id: FactionId;
  name: string;
  kind: 'guard' | 'merchant' | 'druid' | 'thief' | 'temple' | 'noble' | 'bandit' | 'cult';
  description: string;
  leaderNpcId: NpcId | null;
  colorKey: string;
}

export interface FactionState {
  factionId: FactionId;
  reputationWithPlayer: number;
  resources: number;
  influence: number;
  enemyIds: FactionId[];
  allyIds: FactionId[];
  territoryIds: LocationId[];
  importantEventIds: EventId[];
}

export interface ReputationTier {
  min: number;
  label: string;
  tone: string;
}

export const REPUTATION_TIERS: readonly ReputationTier[] = [
  { min: -100, label: 'Inimigo Jurado', tone: 'danger' },
  { min: -50, label: 'Hostil', tone: 'danger' },
  { min: -20, label: 'Desconfiado', tone: 'warning' },
  { min: 20, label: 'Neutro', tone: 'muted' },
  { min: 50, label: 'Aliado', tone: 'success' },
  { min: 80, label: 'Campeão', tone: 'gold' },
];

export function reputationTier(value: number): ReputationTier {
  let current: ReputationTier = REPUTATION_TIERS[0]!;
  for (const tier of REPUTATION_TIERS) {
    if (value >= tier.min) current = tier;
  }
  return current;
}
