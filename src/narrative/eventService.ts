import { SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { LocationId, NpcId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { EventBus } from '@/core/events/eventBus';
import type { GameState } from '@/domain/world/gameState';
import type { WorldEvent, WorldEventType } from '@/domain/narrative/events';
import type { MemoryType } from '@/domain/narrative/memory';
import { propagateEventToWitnesses } from '@/narrative/memoryService';
import { createRumorFromEvent } from '@/narrative/rumorService';
import { recordChronicle } from '@/narrative/chronicleService';

export interface WorldEventInput {
  type: WorldEventType;
  locationId?: LocationId | null;
  participantIds?: NpcId[];
  /** Left undefined, the NPCs present at the location become witnesses. */
  witnessIds?: NpcId[];
  cause: string;
  consequences?: string[];
  importance: number;
  tags?: string[];
  summary: string;
  playerInvolved?: boolean;
  memory?: {
    memoryType: MemoryType;
    emotionalWeight: number;
    trustImpact: number;
    fearImpact: number;
    respectImpact: number;
    permanent?: boolean;
  };
}

const MAX_EVENTS = 400;

/**
 * The single entry point for "something happened". Everything downstream —
 * memories, relationships, rumors, chronicle, location state — hangs off here.
 */
export function recordWorldEvent(state: GameState, input: WorldEventInput, bus?: EventBus): WorldEvent {
  const rng = new SeededRandom(`${state.world.seed}:event:${state.events.length}:${input.type}`);
  const locationId = input.locationId ?? state.player.currentLocationId;
  const location = locationId ? state.locations[locationId] : undefined;

  const witnessIds = input.witnessIds
    ?? (location
      ? location.npcIds.filter((npcId) => {
        const npc = state.npcs[npcId];
        return !!npc && npc.alive && npc.currentLocationId === locationId;
      })
      : []);

  const event: WorldEvent = {
    id: makeId('event', rng),
    timestamp: Date.now(),
    gameDay: state.world.gameDay,
    gameYear: state.world.gameYear,
    type: input.type,
    locationId: locationId ?? null,
    regionId: location?.regionId ?? null,
    kingdomId: location?.kingdomId ?? null,
    participantIds: input.participantIds ?? [],
    witnessIds: witnessIds.filter((id) => !(input.participantIds ?? []).includes(id)),
    cause: input.cause,
    consequences: input.consequences ?? [],
    importance: clamp(Math.round(input.importance), 0, 100),
    tags: input.tags ?? [],
    summary: input.summary,
    playerInvolved: input.playerInvolved ?? true,
  };

  state.events.push(event);
  if (state.events.length > MAX_EVENTS) state.events.shift();

  if (locationId && state.locationStates[locationId]) {
    const locationState = state.locationStates[locationId]!;
    locationState.historicalEventIds.push(event.id);
    if (locationState.historicalEventIds.length > 60) locationState.historicalEventIds.shift();
  }

  if (input.memory) {
    propagateEventToWitnesses(state, event, {
      eventId: event.id,
      memoryType: input.memory.memoryType,
      emotionalWeight: input.memory.emotionalWeight,
      trustImpact: input.memory.trustImpact,
      fearImpact: input.memory.fearImpact,
      respectImpact: input.memory.respectImpact,
      importance: event.importance,
      summary: event.summary,
      ...(input.memory.permanent !== undefined ? { permanent: input.memory.permanent } : {}),
    });
  }

  createRumorFromEvent(state, event);
  recordChronicle(state, event);

  bus?.emit('WORLD_EVENT_CREATED', { eventId: event.id, type: event.type, importance: event.importance });
  return event;
}

export function recentEvents(state: GameState, limit = 12): WorldEvent[] {
  return state.events.slice(-limit).reverse();
}

export function eventsAtLocation(state: GameState, locationId: LocationId, limit = 8): WorldEvent[] {
  return state.events.filter((event) => event.locationId === locationId).slice(-limit).reverse();
}
