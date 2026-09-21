import { SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { NpcId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { GameState } from '@/domain/world/gameState';
import type { WorldEvent } from '@/domain/narrative/events';
import type { Rumor, RumorAccuracy } from '@/domain/narrative/rumor';

const MAX_RUMORS = 80;

function accuracyFor(distortion: number, ageDays: number): RumorAccuracy {
  if (ageDays > 14) return 'outdated';
  if (distortion < 0.2) return 'true';
  if (distortion < 0.45) return 'partial';
  return 'exaggerated';
}

function distort(rng: SeededRandom, summary: string, distortion: number): string {
  if (distortion < 0.2) return summary;
  if (distortion < 0.45) {
    return rng.pick([
      `Dizem que ${lowerFirst(summary)} — mas ninguém concorda sobre os detalhes.`,
      `Contam algo parecido com isto: ${lowerFirst(summary)}`,
    ]);
  }
  return rng.pick([
    `Juram que ${lowerFirst(summary)} e que foi muito pior do que parece.`,
    `A versão que corre é que ${lowerFirst(summary)} — com o dobro de mortos.`,
    `Alguém no mercado garante que ${lowerFirst(summary)}, e que houve magia envolvida.`,
  ]);
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0]!.toLowerCase() + text.slice(1) : text;
}

/** Turns an event into a rumor seeded with the NPCs who actually witnessed it. */
export function createRumorFromEvent(state: GameState, event: WorldEvent): Rumor | null {
  if (event.importance < 25) return null;
  const rng = new SeededRandom(`${state.world.seed}:rumor:${event.id}`);
  const distortion = clamp(rng.float(0, 0.35) + (event.witnessIds.length === 0 ? 0.3 : 0), 0, 1);

  const rumor: Rumor = {
    id: makeId('rumor', rng),
    sourceEventId: event.id,
    text: distort(rng, event.summary, distortion),
    accuracy: accuracyFor(distortion, 0),
    distortion,
    createdDay: state.world.gameDay,
    regionId: event.regionId,
    topic: event.type,
    knownByNpcIds: [...event.witnessIds, ...event.participantIds],
    heardByPlayer: false,
    actionable: event.importance >= 45 && event.consequences.length > 0,
  };

  state.rumors.push(rumor);
  if (state.rumors.length > MAX_RUMORS) state.rumors.shift();
  return rumor;
}

/**
 * One propagation hop per day: the rumor reaches more NPCs in its region and
 * gets a little more wrong each time. NPCs never magically know everything.
 */
export function propagateRumors(state: GameState): number {
  const rng = new SeededRandom(`${state.world.seed}:rumorspread:${state.world.gameDay}`);
  let spread = 0;

  for (const rumor of state.rumors) {
    const age = state.world.gameDay - rumor.createdDay;
    if (age > 21) continue;
    if (rumor.knownByNpcIds.length === 0) continue;

    const candidates = Object.values(state.npcs).filter((npc) => {
      if (!npc.alive || rumor.knownByNpcIds.includes(npc.id)) return false;
      const location = state.locations[npc.currentLocationId];
      if (!location) return false;
      return rumor.regionId === null || location.regionId === rumor.regionId;
    });
    if (candidates.length === 0) continue;

    const hops = Math.min(candidates.length, rng.int(1, 3));
    for (const npc of rng.sample(candidates, hops)) {
      rumor.knownByNpcIds.push(npc.id);
      spread += 1;
    }
    rumor.distortion = clamp(rumor.distortion + rng.float(0.02, 0.09), 0, 1);
    rumor.accuracy = accuracyFor(rumor.distortion, age);
    if (rumor.distortion > 0.45 && rng.bool(0.35)) {
      rumor.text = distort(rng, rumor.text, rumor.distortion);
    }
  }
  return spread;
}

export function rumorsKnownBy(state: GameState, npcId: NpcId, limit = 3): Rumor[] {
  return state.rumors
    .filter((rumor) => rumor.knownByNpcIds.includes(npcId))
    .sort((a, b) => b.createdDay - a.createdDay)
    .slice(0, limit);
}

/** Does this NPC know about the event at all? Drives hedged dialogue. */
export function npcKnowsEvent(state: GameState, npcId: NpcId, eventId: string): 'firsthand' | 'rumor' | 'unknown' {
  const event = state.events.find((entry) => entry.id === eventId);
  if (!event) return 'unknown';
  if (event.participantIds.includes(npcId) || event.witnessIds.includes(npcId)) return 'firsthand';
  const heard = state.rumors.some((rumor) => rumor.sourceEventId === eventId && rumor.knownByNpcIds.includes(npcId));
  return heard ? 'rumor' : 'unknown';
}
