import type { EventBus } from '@/core/events/eventBus';
import type { LocationId } from '@/core/ids/ids';
import type { GameState } from '@/domain/world/gameState';
import { recordWorldEvent } from '@/narrative/eventService';
import { materializePending } from '@/sim/simulation';
import { advanceDay } from '@/sim/simulation';

export interface TravelResult {
  ok: boolean;
  reason?: string;
  daysPassed: number;
  discovered: boolean;
  returnSummaries: string[];
}

/** Travelling costs a day, which is what lets the world change behind you. */
export function travelTo(state: GameState, destinationId: LocationId, bus?: EventBus): TravelResult {
  const origin = state.locations[state.player.currentLocationId];
  const destination = state.locations[destinationId];
  if (!destination) return { ok: false, reason: 'Destino desconhecido.', daysPassed: 0, discovered: false, returnSummaries: [] };
  if (destinationId === state.player.currentLocationId) {
    return { ok: false, reason: 'Você já está aqui.', daysPassed: 0, discovered: false, returnSummaries: [] };
  }
  if (origin && !origin.connectedLocationIds.includes(destinationId)) {
    return { ok: false, reason: 'Não há rota direta a partir daqui.', daysPassed: 0, discovered: false, returnSummaries: [] };
  }

  advanceDay(state, bus);
  state.player.currentLocationId = destinationId;

  const locationState = state.locationStates[destinationId];
  const firstVisit = !locationState?.discovered;
  if (locationState) locationState.discovered = true;
  if (!state.player.discoveredLocationIds.includes(destinationId)) {
    state.player.discoveredLocationIds.push(destinationId);
  }

  const region = state.regions[destination.regionId];
  if (region && !region.discovered) {
    region.discovered = true;
    bus?.emit('REGION_ENTERED', { regionId: region.id });
  }

  if (firstVisit) {
    bus?.emit('LOCATION_DISCOVERED', { locationId: destinationId, regionId: destination.regionId });
    recordWorldEvent(state, {
      type: 'discovery',
      locationId: destinationId,
      cause: 'exploração',
      consequences: [],
      importance: 32,
      summary: `Você descobriu ${destination.name}.`,
      tags: ['exploration'],
    }, bus);
  }

  const materialized = materializePending(state, destinationId, bus);
  bus?.emit('LOCATION_ENTERED', { locationId: destinationId });

  return { ok: true, daysPassed: 1, discovered: firstVisit, returnSummaries: materialized.summaries };
}

export function reachableFrom(state: GameState, locationId: LocationId) {
  const location = state.locations[locationId];
  if (!location) return [];
  return location.connectedLocationIds
    .map((id) => state.locations[id])
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);
}

/** Known locations for the map screen; undiscovered ones stay hidden. */
export function knownLocations(state: GameState) {
  return Object.values(state.locations).filter((location) => state.locationStates[location.id]?.discovered);
}
