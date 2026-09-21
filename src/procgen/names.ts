import type { SeededRandom } from '@/core/rng/random';
import { NAME_SYLLABLES } from '@/data/names';
import { capitalize } from '@/core/util/text';

export function generatePersonName(rng: SeededRandom): string {
  const start = rng.pick(NAME_SYLLABLES.personStart);
  const mid = rng.bool(0.45) ? rng.pick(NAME_SYLLABLES.personMid) : '';
  const end = rng.pick(NAME_SYLLABLES.personEnd);
  return capitalize(`${start}${mid}${end}`.toLowerCase());
}

export function generateSurname(rng: SeededRandom): string {
  return rng.pick(NAME_SYLLABLES.surname);
}

export function generatePlaceName(rng: SeededRandom): string {
  return `${rng.pick(NAME_SYLLABLES.placePrefix)}${rng.pick(NAME_SYLLABLES.placeSuffix)}`;
}

export function generateKingdomName(rng: SeededRandom): string {
  return `${rng.pick(NAME_SYLLABLES.placePrefix)}${rng.pick(NAME_SYLLABLES.kingdomSuffix)}`;
}

export function generateDungeonName(rng: SeededRandom): string {
  return `${rng.pick(NAME_SYLLABLES.dungeonPrefix)} ${rng.pick(NAME_SYLLABLES.dungeonSuffix)}`;
}
