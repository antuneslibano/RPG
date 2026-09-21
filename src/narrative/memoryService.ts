import { SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { EventId, NpcId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { GameState } from '@/domain/world/gameState';
import { PLAYER_SUBJECT_ID } from '@/domain/world/gameState';
import type { WorldEvent } from '@/domain/narrative/events';
import type { MemoryType, NPCMemory, NPCRelationship } from '@/domain/narrative/memory';
import { applyMemoryToRelationship, emptyRelationship, memoryStrength, tierFor } from '@/domain/narrative/memory';

export interface MemoryInput {
  npcId: NpcId;
  eventId: EventId | null;
  memoryType: MemoryType;
  emotionalWeight: number;
  trustImpact: number;
  fearImpact: number;
  respectImpact: number;
  importance: number;
  summary: string;
  secondHand?: boolean;
  permanent?: boolean;
  subjectId?: string;
}

/** Events above this importance are remembered forever. */
const PERMANENT_THRESHOLD = 70;
const DISCARD_THRESHOLD = 6;
const MERGE_THRESHOLD = 22;
const MAX_MEMORIES_PER_NPC = 60;

export function recordMemory(state: GameState, input: MemoryInput): NPCMemory {
  const rng = new SeededRandom(`${state.world.seed}:memory:${input.npcId}:${state.events.length}`);
  const memory: NPCMemory = {
    id: makeId('memory', rng),
    npcId: input.npcId,
    eventId: input.eventId,
    subjectId: input.subjectId ?? PLAYER_SUBJECT_ID,
    memoryType: input.memoryType,
    emotionalWeight: clamp(input.emotionalWeight, -100, 100),
    trustImpact: input.trustImpact,
    fearImpact: input.fearImpact,
    respectImpact: input.respectImpact,
    importance: clamp(input.importance, 0, 100),
    createdDay: state.world.gameDay,
    lastRecalledDay: state.world.gameDay,
    decayRate: input.permanent ? 0 : clamp(3.2 - input.importance / 32, 0.3, 3.2),
    permanent: input.permanent ?? input.importance >= PERMANENT_THRESHOLD,
    tier: 'immediate',
    summary: input.summary,
    secondHand: input.secondHand ?? false,
    mergedCount: 1,
  };
  memory.tier = tierFor(memory, state.world.gameDay);

  const bucket = state.memories[input.npcId] ?? [];
  bucket.push(memory);
  state.memories[input.npcId] = bucket;

  const relationship = state.relationships[input.npcId] ?? emptyRelationship(input.npcId, memory.subjectId);
  state.relationships[input.npcId] = applyMemoryToRelationship(relationship, memory);

  return memory;
}

/** Everyone present remembers; participants remember more sharply. */
export function propagateEventToWitnesses(state: GameState, event: WorldEvent, template: Omit<MemoryInput, 'npcId'>): void {
  const seen = new Set<NpcId>();
  for (const npcId of event.participantIds) {
    if (seen.has(npcId)) continue;
    seen.add(npcId);
    recordMemory(state, { ...template, npcId });
  }
  for (const npcId of event.witnessIds) {
    if (seen.has(npcId)) continue;
    seen.add(npcId);
    recordMemory(state, {
      ...template,
      npcId,
      memoryType: 'witnessed',
      importance: Math.round(template.importance * 0.7),
      emotionalWeight: Math.round(template.emotionalWeight * 0.6),
      trustImpact: template.trustImpact * 0.5,
      fearImpact: template.fearImpact * 0.7,
      respectImpact: template.respectImpact * 0.5,
    });
  }
}

export function recallMemories(state: GameState, npcId: NpcId, limit = 5): NPCMemory[] {
  const bucket = state.memories[npcId] ?? [];
  const day = state.world.gameDay;
  const ranked = [...bucket].sort((a, b) => memoryStrength(b, day) - memoryStrength(a, day));
  const selected = ranked.slice(0, limit);
  for (const memory of selected) memory.lastRecalledDay = day;
  return selected;
}

export interface ConsolidationReport {
  discarded: number;
  merged: number;
  kept: number;
}

/**
 * Hierarchical pruning: permanent memories are untouched, weak ones of the same
 * type/subject condense into one summarised memory, leftovers below the floor
 * are dropped. Keeps the database bounded without erasing the NPC's past.
 */
export function consolidateMemories(state: GameState, npcId: NpcId): ConsolidationReport {
  const bucket = state.memories[npcId];
  if (!bucket || bucket.length === 0) return { discarded: 0, merged: 0, kept: 0 };
  const day = state.world.gameDay;

  const permanent: NPCMemory[] = [];
  const weak: NPCMemory[] = [];
  const strong: NPCMemory[] = [];

  for (const memory of bucket) {
    if (memory.permanent) {
      permanent.push(memory);
      continue;
    }
    const strength = memoryStrength(memory, day);
    if (strength < MERGE_THRESHOLD) weak.push(memory);
    else strong.push(memory);
  }

  let merged = 0;
  let discarded = 0;
  const mergedOutput: NPCMemory[] = [];
  const groups = new Map<string, NPCMemory[]>();
  for (const memory of weak) {
    const key = `${memory.memoryType}|${memory.subjectId}`;
    const group = groups.get(key);
    if (group) group.push(memory);
    else groups.set(key, [memory]);
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      const only = group[0]!;
      if (memoryStrength(only, day) < DISCARD_THRESHOLD) discarded += 1;
      else mergedOutput.push(only);
      continue;
    }
    const head = group[0]!;
    const total = group.reduce((sum, memory) => sum + memory.importance, 0);
    const summary: NPCMemory = {
      ...head,
      importance: clamp(Math.round(total / group.length + group.length * 2), 0, 100),
      emotionalWeight: clamp(Math.round(group.reduce((s, m) => s + m.emotionalWeight, 0) / group.length), -100, 100),
      tier: 'summarized',
      mergedCount: group.reduce((sum, memory) => sum + memory.mergedCount, 0),
      summary: summarise(head, group.length),
      lastRecalledDay: day,
      decayRate: Math.max(0.2, head.decayRate * 0.5),
    };
    merged += group.length;
    mergedOutput.push(summary);
  }

  let next = [...permanent, ...strong, ...mergedOutput];
  for (const memory of next) memory.tier = tierFor(memory, day);

  if (next.length > MAX_MEMORIES_PER_NPC) {
    next.sort((a, b) => memoryStrength(b, day) - memoryStrength(a, day));
    discarded += next.length - MAX_MEMORIES_PER_NPC;
    next = next.slice(0, MAX_MEMORIES_PER_NPC);
  }

  state.memories[npcId] = next;
  return { discarded, merged, kept: next.length };
}

function summarise(memory: NPCMemory, count: number): string {
  switch (memory.memoryType) {
    case 'favor': return `Você já o ajudou ${count} vezes.`;
    case 'insult': return `Houve ${count} desentendimentos entre vocês.`;
    case 'quest': return `Você cumpriu ${count} pedidos para ele.`;
    case 'metPlayer': return `Vocês se cruzaram ${count} vezes.`;
    case 'rumor': return `Ouviu ${count} histórias a seu respeito.`;
    default: return `${count} lembranças parecidas, já sem detalhe.`;
  }
}

export function relationshipWith(state: GameState, npcId: NpcId): NPCRelationship {
  return state.relationships[npcId] ?? emptyRelationship(npcId, PLAYER_SUBJECT_ID);
}

/** Runs on every day advance for NPCs outside the player's location (LOD). */
export function consolidateAll(state: GameState): ConsolidationReport {
  const total: ConsolidationReport = { discarded: 0, merged: 0, kept: 0 };
  for (const npcId of Object.keys(state.memories)) {
    const report = consolidateMemories(state, npcId);
    total.discarded += report.discarded;
    total.merged += report.merged;
    total.kept += report.kept;
  }
  return total;
}
