import { SeededRandom } from '@/core/rng/random';
import type { LocationId, NpcId, RegionId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { EventBus } from '@/core/events/eventBus';
import type { GameState } from '@/domain/world/gameState';
import { consolidateMemories } from '@/narrative/memoryService';
import { propagateRumors } from '@/narrative/rumorService';
import { runWorldDirector, type DirectorReport } from '@/sim/worldDirector';
import { recordWorldEvent } from '@/narrative/eventService';

export type SimulationLod = 'detailed' | 'simplified' | 'abstract';

/**
 * Distance decides fidelity: we never simulate thousands of NPCs in full.
 * Far NPCs only exist through events, and their consequences are materialised
 * when the player comes back.
 */
export function lodFor(state: GameState, npcId: NpcId): SimulationLod {
  const npc = state.npcs[npcId];
  if (!npc) return 'abstract';
  if (npc.currentLocationId === state.player.currentLocationId) return 'detailed';
  const npcLocation = state.locations[npc.currentLocationId];
  const playerLocation = state.locations[state.player.currentLocationId];
  if (npcLocation && playerLocation && npcLocation.regionId === playerLocation.regionId) return 'simplified';
  return 'abstract';
}

const DAY_PHASES = ['morning', 'afternoon', 'evening', 'night'] as const;

export function phaseForDay(gameDay: number): (typeof DAY_PHASES)[number] {
  return DAY_PHASES[gameDay % DAY_PHASES.length]!;
}

export interface DayReport {
  gameDay: number;
  gameYear: number;
  director: DirectorReport;
  rumorsSpread: number;
  memoriesPruned: number;
  npcsMoved: number;
}

/** Advances one in-game day and runs every world system once. */
export function advanceDay(state: GameState, bus?: EventBus): DayReport {
  state.world.gameDay += 1;
  state.player.stats.daysLived += 1;
  if (state.world.gameDay > 360) {
    state.world.gameDay = 1;
    state.world.gameYear += 1;
  }

  const rng = new SeededRandom(`${state.world.seed}:day:${state.world.gameYear}:${state.world.gameDay}`);
  let npcsMoved = 0;

  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    const lod = lodFor(state, npc.id);
    if (lod === 'detailed') continue;

    // Simplified/abstract NPCs only take coarse decisions: travel and no more.
    if (npc.importance !== 'minor' && rng.bool(lod === 'simplified' ? 0.07 : 0.03)) {
      const home = state.locations[npc.homeLocationId];
      const options = home?.connectedLocationIds ?? [];
      if (options.length > 0) {
        const destination = npc.currentLocationId === npc.homeLocationId ? rng.pick(options) : npc.homeLocationId;
        moveNpc(state, npc.id, destination, bus);
        npcsMoved += 1;
      }
    }
  }

  let memoriesPruned = 0;
  for (const npcId of Object.keys(state.memories)) {
    if (lodFor(state, npcId) === 'detailed') continue;
    memoriesPruned += consolidateMemories(state, npcId).discarded;
  }

  const rumorsSpread = propagateRumors(state);
  const director = runWorldDirector(state, bus);

  // Economy drifts slowly back to normal unless the director pushed it again.
  for (const key of Object.keys(state.economy.scarcityByCategory)) {
    const value = state.economy.scarcityByCategory[key] ?? 1;
    state.economy.scarcityByCategory[key] = clamp(value + (value > 1 ? -0.04 : 0.04), 0.7, 1.9);
  }

  bus?.emit('DAY_ADVANCED', { gameDay: state.world.gameDay, gameYear: state.world.gameYear });
  return { gameDay: state.world.gameDay, gameYear: state.world.gameYear, director, rumorsSpread, memoriesPruned, npcsMoved };
}

export function moveNpc(state: GameState, npcId: NpcId, destinationId: LocationId, bus?: EventBus): void {
  const npc = state.npcs[npcId];
  const destination = state.locations[destinationId];
  if (!npc || !destination) return;
  const origin = state.locations[npc.currentLocationId];
  if (origin) origin.npcIds = origin.npcIds.filter((id) => id !== npcId);
  if (!destination.npcIds.includes(npcId)) destination.npcIds.push(npcId);
  const from = npc.currentLocationId;
  npc.currentLocationId = destinationId;
  bus?.emit('NPC_MOVED', { npcId, fromLocationId: from, toLocationId: destinationId });
}

export interface MaterializationResult {
  applied: number;
  summaries: string[];
}

/**
 * When the player returns, everything that accumulated while they were away
 * lands at once — that is what makes absence visible.
 */
export function materializePending(state: GameState, locationId: LocationId, bus?: EventBus): MaterializationResult {
  const locationState = state.locationStates[locationId];
  const location = state.locations[locationId];
  if (!locationState || !location) return { applied: 0, summaries: [] };

  const summaries: string[] = [];
  for (const consequence of locationState.pendingConsequences) {
    switch (consequence.kind) {
      case 'prosperity':
        locationState.prosperity = clamp(locationState.prosperity + consequence.amount, 0, 100);
        break;
      case 'danger':
        locationState.danger = clamp(locationState.danger + consequence.amount, 0, 100);
        break;
      case 'population':
        locationState.population = Math.max(0, locationState.population + consequence.amount);
        break;
      case 'destroy':
        locationState.destroyed = true;
        locationState.prosperity = clamp(locationState.prosperity - 30, 0, 100);
        locationState.population = Math.round(locationState.population * 0.7);
        break;
      case 'priceShift': {
        const current = state.economy.priceModifierByLocation[locationId] ?? 1;
        state.economy.priceModifierByLocation[locationId] = clamp(current + consequence.amount, 0.6, 2);
        break;
      }
      case 'npcDied': {
        const npc = consequence.targetId ? state.npcs[consequence.targetId] : undefined;
        if (npc) {
          npc.alive = false;
          npc.deathDay = state.world.gameDay;
          bus?.emit('NPC_DIED', { npcId: npc.id, locationId, killedByPlayer: false });
        }
        break;
      }
      case 'npcMoved':
        break;
    }
    summaries.push(consequence.summary);
  }

  const applied = locationState.pendingConsequences.length;
  locationState.pendingConsequences = [];
  locationState.lastVisitedDay = state.world.gameDay;

  if (applied > 0) {
    recordWorldEvent(state, {
      type: 'discovery',
      locationId,
      cause: 'ausência do jogador',
      consequences: summaries,
      importance: 44,
      summary: `Em ${location.name}, enquanto você estava fora: ${summaries.join(' ')}`,
      playerInvolved: false,
      tags: ['lod', 'return'],
    }, bus);
  }

  return { applied, summaries };
}

export function regionOf(state: GameState, locationId: LocationId): RegionId | null {
  return state.locations[locationId]?.regionId ?? null;
}
