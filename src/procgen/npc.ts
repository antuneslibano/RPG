import type { SeededRandom } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { FactionId, LocationId } from '@/core/ids/ids';
import type { NPC, NpcImportance } from '@/domain/npc/npc';
import { ARCHETYPE_BY_ID, OCCUPATIONS, type Occupation } from '@/data/npcContent';
import { FEARS, MOTIVATIONS, PERSONALITY_TRAITS, SECRETS } from '@/data/names';
import { generatePersonName, generateSurname } from '@/procgen/names';

export interface NpcGenOptions {
  homeLocationId: LocationId;
  factionId?: FactionId | null;
  occupationId?: string;
  importance?: NpcImportance;
  minAge?: number;
  maxAge?: number;
}

const DAY_PHASES = ['morning', 'afternoon', 'evening', 'night'] as const;

function buildSchedule(rng: SeededRandom, occupation: Occupation): NPC['schedule'] {
  const work = occupation.establishment ?? 'street';
  const rest = rng.pick(['inn', 'home', 'tavern']);
  const social = rng.pick(['tavern', 'market', 'temple', 'street']);
  const plan: Record<(typeof DAY_PHASES)[number], string> = {
    morning: work,
    afternoon: rng.bool(0.75) ? work : social,
    evening: social,
    night: rest,
  };
  return plan;
}

export function generateNpc(rng: SeededRandom, options: NpcGenOptions): NPC {
  const occupation =
    (options.occupationId ? OCCUPATIONS.find((entry) => entry.id === options.occupationId) : undefined) ??
    rng.pick(OCCUPATIONS);
  const archetype = ARCHETYPE_BY_ID[occupation.archetypeId];
  const importance: NpcImportance = options.importance ?? rng.weighted([
    { value: 'minor' as NpcImportance, weight: 55 },
    { value: 'notable' as NpcImportance, weight: 35 },
    { value: 'major' as NpcImportance, weight: 10 },
  ]);

  const secretCount = importance === 'major' ? 2 : importance === 'notable' ? 1 : rng.bool(0.3) ? 1 : 0;

  return {
    id: makeId('npc', rng),
    seed: rng.hex(8),
    name: generatePersonName(rng),
    surname: rng.bool(0.78) ? generateSurname(rng) : '',
    age: rng.centered(options.minAge ?? 17, options.maxAge ?? 68),
    presentation: rng.pick(['masculine', 'feminine', 'androgynous'] as const),
    archetypeId: archetype?.id ?? 'arch_farmer',
    occupationId: occupation.id,
    homeLocationId: options.homeLocationId,
    currentLocationId: options.homeLocationId,
    factionId: options.factionId ?? null,
    personalityTraits: rng.sample(PERSONALITY_TRAITS, rng.int(2, 3)),
    motivations: rng.sample(MOTIVATIONS, importance === 'minor' ? 1 : 2),
    fears: rng.sample(FEARS, 1),
    wealth: Math.round(rng.int(8, 60) * (importance === 'major' ? 4 : importance === 'notable' ? 2 : 1)),
    inventoryItemIds: [],
    alive: true,
    deathDay: null,
    schedule: buildSchedule(rng, occupation),
    secrets: rng.sample(SECRETS, secretCount).map((text, index) => ({
      id: `secret_${index}`,
      text,
      revealAtTrust: 35 + index * 20,
      revealed: false,
    })),
    importance,
    relativeNpcIds: [],
    portraitKey: `art.portrait.npc.${occupation.id}`,
    dialogueStage: 0,
    lastSpokeDay: -1,
    lastQuestDay: -99,
  };
}

/** Links a handful of NPCs into families so revenge and gratitude have targets. */
export function linkFamilies(rng: SeededRandom, npcs: NPC[]): void {
  const pool = rng.shuffle(npcs.filter((npc) => npc.importance !== 'minor'));
  for (let i = 0; i + 1 < pool.length; i += 2) {
    if (!rng.bool(0.55)) continue;
    const a = pool[i]!;
    const b = pool[i + 1]!;
    if (a.homeLocationId !== b.homeLocationId) continue;
    a.relativeNpcIds.push(b.id);
    b.relativeNpcIds.push(a.id);
    if (rng.bool(0.6)) b.surname = a.surname;
  }
}
