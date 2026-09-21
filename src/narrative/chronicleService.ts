import { SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { GameState } from '@/domain/world/gameState';
import { EVENT_TYPE_LABELS, type WorldEvent } from '@/domain/narrative/events';
import type { ChronicleEntry } from '@/domain/narrative/chronicle';

const CHRONICLE_THRESHOLD = 30;
const MAX_ENTRIES = 300;

/** Turns procedural events into the personal history of this save. */
export function recordChronicle(state: GameState, event: WorldEvent): ChronicleEntry | null {
  if (event.importance < CHRONICLE_THRESHOLD && !event.playerInvolved) return null;
  const rng = new SeededRandom(`${state.world.seed}:chronicle:${event.id}`);

  const entry: ChronicleEntry = {
    id: makeId('chronicle', rng),
    gameYear: event.gameYear,
    gameDay: event.gameDay,
    title: EVENT_TYPE_LABELS[event.type] ?? 'Acontecimento',
    text: event.summary,
    eventId: event.id,
    importance: event.importance,
    tags: [...event.tags],
  };

  state.chronicle.push(entry);
  if (state.chronicle.length > MAX_ENTRIES) state.chronicle.shift();
  return entry;
}

export function chronicleByYear(state: GameState): { year: number; entries: ChronicleEntry[] }[] {
  const byYear = new Map<number, ChronicleEntry[]>();
  for (const entry of state.chronicle) {
    const bucket = byYear.get(entry.gameYear);
    if (bucket) bucket.push(entry);
    else byYear.set(entry.gameYear, [entry]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, entries]) => ({ year, entries: entries.sort((a, b) => b.gameDay - a.gameDay) }));
}
