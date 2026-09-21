import type { EventId, MemoryId, NpcId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';

export type MemoryTier = 'immediate' | 'relevant' | 'permanent' | 'summarized';

export type MemoryType =
  | 'metPlayer' | 'favor' | 'insult' | 'crime' | 'gift' | 'promise' | 'promiseBroken'
  | 'quest' | 'death' | 'kinship' | 'alliance' | 'enmity' | 'debt' | 'rumor' | 'witnessed';

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  metPlayer: 'Encontro', favor: 'Favor', insult: 'Insulto', crime: 'Crime', gift: 'Presente',
  promise: 'Promessa', promiseBroken: 'Promessa quebrada', quest: 'Missão', death: 'Morte',
  kinship: 'Parentesco', alliance: 'Aliança', enmity: 'Inimizade', debt: 'Dívida',
  rumor: 'Rumor', witnessed: 'Presenciado',
};

export interface NPCMemory {
  id: MemoryId;
  npcId: NpcId;
  eventId: EventId | null;
  /** Who the memory is about (usually the player). */
  subjectId: string;
  memoryType: MemoryType;
  emotionalWeight: number;
  trustImpact: number;
  fearImpact: number;
  respectImpact: number;
  importance: number;
  createdDay: number;
  lastRecalledDay: number;
  decayRate: number;
  permanent: boolean;
  tier: MemoryTier;
  summary: string;
  /** Second-hand memories are hedged in dialogue ("dizem que…"). */
  secondHand: boolean;
  mergedCount: number;
}

export interface NPCRelationship {
  npcId: NpcId;
  targetId: string;
  affinity: number;
  trust: number;
  fear: number;
  respect: number;
  gratitude: number;
  hostility: number;
  familiarity: number;
}

export function emptyRelationship(npcId: NpcId, targetId: string): NPCRelationship {
  return { npcId, targetId, affinity: 0, trust: 0, fear: 0, respect: 0, gratitude: 0, hostility: 0, familiarity: 0 };
}

const AXES = ['affinity', 'trust', 'fear', 'respect', 'gratitude', 'hostility'] as const;

export function applyMemoryToRelationship(rel: NPCRelationship, memory: NPCMemory): NPCRelationship {
  const scale = memory.secondHand ? 0.45 : 1;
  const next: NPCRelationship = { ...rel };
  next.trust = clamp(next.trust + memory.trustImpact * scale, -100, 100);
  next.fear = clamp(next.fear + memory.fearImpact * scale, -100, 100);
  next.respect = clamp(next.respect + memory.respectImpact * scale, -100, 100);
  next.affinity = clamp(next.affinity + memory.emotionalWeight * scale, -100, 100);
  if (memory.memoryType === 'favor' || memory.memoryType === 'gift') {
    next.gratitude = clamp(next.gratitude + Math.abs(memory.emotionalWeight) * scale, -100, 100);
  }
  if (memory.memoryType === 'insult' || memory.memoryType === 'crime' || memory.memoryType === 'promiseBroken') {
    next.hostility = clamp(next.hostility + Math.abs(memory.emotionalWeight) * scale, -100, 100);
  }
  if (!memory.secondHand) next.familiarity = clamp(next.familiarity + 1, 0, 100);
  for (const axis of AXES) next[axis] = Math.round(next[axis] * 10) / 10;
  return next;
}

export type Attitude = 'hostile' | 'wary' | 'neutral' | 'cordial' | 'loyal' | 'devoted';

export const ATTITUDE_LABELS: Record<Attitude, string> = {
  hostile: 'Hostil', wary: 'Desconfiado', neutral: 'Neutro',
  cordial: 'Cordial', loyal: 'Leal', devoted: 'Devotado',
};

/**
 * Six axes collapse into one attitude only for display — the axes themselves
 * stay independent, which is why an NPC can fear you and still be grateful.
 */
export function describeRelationship(rel: NPCRelationship): { attitude: Attitude; score: number } {
  const score =
    rel.affinity * 0.9 + rel.trust * 0.8 + rel.gratitude * 0.7 + rel.respect * 0.5 - rel.hostility * 1.1 - rel.fear * 0.25;
  const attitude: Attitude =
    score <= -60 ? 'hostile'
    : score <= -18 ? 'wary'
    : score < 22 ? 'neutral'
    : score < 70 ? 'cordial'
    : score < 130 ? 'loyal'
    : 'devoted';
  return { attitude, score: Math.round(score) };
}

/** Current strength of a memory after decay. Permanent memories never fade. */
export function memoryStrength(memory: NPCMemory, currentDay: number): number {
  if (memory.permanent) return memory.importance;
  const days = Math.max(0, currentDay - memory.lastRecalledDay);
  return Math.max(0, memory.importance - memory.decayRate * days);
}

export function tierFor(memory: NPCMemory, currentDay: number): MemoryTier {
  if (memory.permanent) return 'permanent';
  if (memory.mergedCount > 1) return 'summarized';
  const strength = memoryStrength(memory, currentDay);
  return strength >= 40 ? 'relevant' : 'immediate';
}
