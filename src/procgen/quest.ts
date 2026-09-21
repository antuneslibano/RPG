import { SeededRandom, fnv1a } from '@/core/rng/random';
import { makeId } from '@/core/ids/ids';
import type { LocationId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { GameLocation, LocationState, Region } from '@/domain/world/world';
import type { NPC } from '@/domain/npc/npc';
import type { NPCRelationship } from '@/domain/narrative/memory';
import { describeRelationship } from '@/domain/narrative/memory';
import type { WorldEvent } from '@/domain/narrative/events';
import type { Quest, QuestObjective, QuestType } from '@/domain/quest/quest';
import { QUEST_BLUEPRINTS, QUEST_MOTIVATIONS, type QuestBlueprint } from '@/data/questContent';
import { ARCHETYPE_BY_ID } from '@/data/npcContent';
import { CREATURE_BASES } from '@/data/creatures';
import { BALANCE } from '@/domain/player/balance';

/** Everything a generator must read before inventing anything. */
export interface GenerationContext {
  gameDay: number;
  playerLevel: number;
  location: GameLocation;
  locationState: LocationState;
  region: Region;
  /** NPCs currently available at the location. */
  availableNpcs: readonly NPC[];
  recentEvents: readonly WorldEvent[];
  recentFingerprints: readonly string[];
  npcsRecentlyInvolved: readonly string[];
  activeQuestTypes: readonly QuestType[];
  relationships: Readonly<Record<string, NPCRelationship>>;
  neighbourLocations: readonly GameLocation[];
}

const MAX_ATTEMPTS = 8;

export function questFingerprint(parts: {
  blueprintId: string;
  archetypeId: string;
  problem: string;
  targetRef: string;
  locationKind: string;
  consequence: string;
}): string {
  return fnv1a(
    [parts.blueprintId, parts.archetypeId, parts.problem, parts.targetRef, parts.locationKind, parts.consequence].join('|'),
  ).toString(16);
}

function eligibleBlueprints(context: GenerationContext, giver: NPC): QuestBlueprint[] {
  const archetype = ARCHETYPE_BY_ID[giver.archetypeId];
  const preferred = new Set(archetype?.questTypes ?? []);
  const pool = QUEST_BLUEPRINTS.filter((bp) => bp.minLevel <= context.playerLevel + 1);
  const matching = pool.filter((bp) => preferred.has(bp.type));
  return matching.length > 0 ? matching : pool;
}

function pickTargetCreature(rng: SeededRandom, context: GenerationContext): { ref: string; name: string } {
  const families = new Set(context.region.creatureFamilies);
  const pool = CREATURE_BASES.filter(
    (base) => families.has(base.family) && base.levelRange[0] <= context.playerLevel + 3,
  );
  const base = pool.length > 0 ? rng.pick(pool) : rng.pick(CREATURE_BASES);
  return { ref: base.baseId, name: base.name };
}

/** Prefers world state that is already open: an active problem becomes the quest. */
function problemFromWorld(context: GenerationContext, blueprint: QuestBlueprint, rng: SeededRandom): { problem: string; sourceProblemId: string | null } {
  const open = context.locationState.activeProblems.filter((problem) => !problem.resolved);
  if (open.length > 0 && rng.bool(0.7)) {
    const problem = rng.pick(open);
    return { problem: problem.summary, sourceProblemId: problem.id };
  }
  return { problem: rng.pick(blueprint.problems), sourceProblemId: null };
}

function buildObjectives(
  rng: SeededRandom,
  blueprint: QuestBlueprint,
  fill: (template: string) => string,
  targetRef: string,
  targetLocationId: LocationId,
  giverNpcId: string | null,
): QuestObjective[] {
  return blueprint.objectives.map((template, index) => {
    const required = rng.int(template.required[0], template.required[1]);
    const kind = template.kind as QuestObjective['kind'];
    const ref =
      kind === 'kill' || kind === 'collect' ? targetRef
      : kind === 'visit' || kind === 'clearDungeon' ? targetLocationId
      : kind === 'talk' ? giverNpcId ?? targetLocationId
      : targetRef;
    return {
      id: `obj_${index}`,
      kind,
      description: fill(template.template),
      targetRef: ref,
      required,
      current: 0,
      done: false,
      optional: kind === 'investigate',
      ...(kind === 'investigate' ? { revealsCause: true } : {}),
    };
  });
}

function relationshipContext(context: GenerationContext, giver: NPC): string {
  const relationship = context.relationships[giver.id];
  if (!relationship) return 'Vocês mal se conhecem.';
  const { attitude } = describeRelationship(relationship);
  switch (attitude) {
    case 'hostile': return `${giver.name} fala com você a contragosto.`;
    case 'wary': return `${giver.name} ainda não decidiu se confia em você.`;
    case 'cordial': return `${giver.name} te trata como conhecido.`;
    case 'loyal': return `${giver.name} confia em você o bastante para pedir isso.`;
    case 'devoted': return `${giver.name} pediria qualquer coisa a você.`;
    default: return `${giver.name} te reconhece de vista.`;
  }
}

function worldContextSummary(context: GenerationContext): string {
  const open = context.locationState.activeProblems.filter((problem) => !problem.resolved);
  if (open.length > 0) return `Em ${context.location.name}: ${open[0]!.summary}`;
  const recent = context.recentEvents.find((event) => event.importance >= 40);
  if (recent) return `Ainda se fala sobre: ${recent.summary}`;
  return `${context.region.name} segue seu ritmo — por enquanto.`;
}

function buildRewards(rng: SeededRandom, level: number, blueprint: QuestBlueprint, giver: NPC) {
  const gold = Math.round((BALANCE.enemy.goldBase + BALANCE.enemy.goldPerLevel * level) * rng.float(2.2, 4.4));
  const xp = Math.round((BALANCE.enemy.xpBase + BALANCE.enemy.xpPerLevel * level) * rng.float(2.6, 5));
  return {
    gold,
    xp,
    itemIds: [] as string[],
    reputation: [
      { scope: 'location' as const, targetId: giver.homeLocationId, amount: blueprint.type === 'defense' ? 12 : 6 },
      ...(giver.factionId ? [{ scope: 'faction' as const, targetId: giver.factionId, amount: 8 }] : []),
    ],
    relationship: { npcId: giver.id, trust: 12, affinity: 10 },
  };
}

export interface QuestGenResult {
  quest: Quest;
  attempts: number;
  rejectedFingerprints: string[];
}

/**
 * Combinatorial generation: ACTOR + MOTIVATION + PROBLEM + LOCATION + TARGET +
 * COMPLICATION + WORLD STATE + RELATIONSHIP + CONSEQUENCE + REWARD, rejected and
 * re-rolled while the semantic fingerprint repeats recent content.
 */
export function generateQuest(rng: SeededRandom, context: GenerationContext): QuestGenResult | null {
  const candidates = context.availableNpcs.filter((npc) => npc.alive);
  if (candidates.length === 0) return null;

  const rejected: string[] = [];
  let fallback: { quest: Quest; fingerprint: string } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Late attempts relax the "avoid recently involved NPCs" rule so we never stall.
    const pool = attempt <= MAX_ATTEMPTS / 2
      ? candidates.filter((npc) => !context.npcsRecentlyInvolved.includes(npc.id))
      : candidates;
    const giver = rng.pick(pool.length > 0 ? pool : candidates);
    const blueprint = rng.pick(eligibleBlueprints(context, giver));

    const target = pickTargetCreature(rng, context);
    const targetLocation = context.neighbourLocations.length > 0 && rng.bool(0.65)
      ? rng.pick(context.neighbourLocations)
      : context.location;
    const { problem, sourceProblemId } = problemFromWorld(context, blueprint, rng);
    const complication = rng.pick(blueprint.complications);
    const consequence = rng.pick(blueprint.consequences);
    const motivation = giver.motivations[0] ?? rng.pick(QUEST_MOTIVATIONS);
    const hiddenCause = rng.pick(blueprint.hiddenCauses);

    const fingerprint = questFingerprint({
      blueprintId: blueprint.id,
      archetypeId: giver.archetypeId,
      problem,
      targetRef: target.ref,
      locationKind: targetLocation.kind,
      consequence,
    });

    const fill = (template: string): string =>
      template
        .replace(/\{actor\}/g, giver.name)
        .replace(/\{target\}/g, target.name)
        .replace(/\{place\}/g, targetLocation.name)
        .replace(/\{problem\}/g, problem);

    const level = clamp(
      Math.round((context.playerLevel + targetLocation.levelRange[0]) / 2),
      1,
      BALANCE.maxLevel,
    );

    const quest: Quest = {
      id: makeId('quest', rng),
      title: fill(rng.pick(blueprint.titles)),
      template: blueprint.id,
      type: blueprint.type,
      giverNpcId: giver.id,
      motivation,
      problem,
      locationId: targetLocation.id,
      targetRef: target.ref,
      complication: fill(complication),
      worldContextSummary: worldContextSummary(context),
      relationshipContext: relationshipContext(context, giver),
      consequence: fill(consequence),
      hiddenCause: fill(hiddenCause),
      causeRevealed: false,
      briefing: [
        `${giver.name} quer ${motivation}.`,
        `Problema: ${problem}.`,
        `Complicação: ${fill(complication)}.`,
      ].join(' '),
      objectives: buildObjectives(rng, blueprint, fill, target.ref, targetLocation.id, giver.id),
      rewards: buildRewards(rng, level, blueprint, giver),
      choices: blueprint.type === 'negotiation' || blueprint.type === 'assassination'
        ? [
            {
              id: 'choice_a', label: `Ficar com ${giver.name}`,
              description: `Atender ao pedido de ${giver.name} até o fim.`,
              consequenceSummary: fill(consequence),
              effects: { relationship: [{ npcId: giver.id, trust: 18, affinity: 14 }], ...(sourceProblemId ? { problemResolvedId: sourceProblemId } : {}) },
            },
            {
              id: 'choice_b', label: 'Ficar com o outro lado',
              description: 'Recusar o enquadramento de quem te contratou.',
              consequenceSummary: 'A confiança de quem te procurou se perde — e outra porta se abre.',
              effects: { relationship: [{ npcId: giver.id, trust: -22, affinity: -18, hostility: 16 }] },
            },
          ]
        : [],
      chosenChoiceId: null,
      state: 'offered',
      fingerprint,
      createdDay: context.gameDay,
      expiresDay: blueprint.type === 'defense' ? context.gameDay + 6 : null,
      level,
    };

    if (!context.recentFingerprints.includes(fingerprint)) {
      return { quest, attempts: attempt, rejectedFingerprints: rejected };
    }
    rejected.push(fingerprint);
    if (!fallback) fallback = { quest, fingerprint };
  }

  // Every attempt repeated something recent; ship the first candidate anyway
  // rather than leaving the player with no quest at all.
  return fallback ? { quest: fallback.quest, attempts: MAX_ATTEMPTS, rejectedFingerprints: rejected } : null;
}
