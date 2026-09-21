import { SeededRandom } from '@/core/rng/random';
import type { EventBus } from '@/core/events/eventBus';
import type { NpcId, QuestId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import { pushCapped } from '@/core/util/collections';
import type { GameState } from '@/domain/world/gameState';
import { npcsAt } from '@/domain/world/gameState';
import type { Quest, QuestObjective } from '@/domain/quest/quest';
import { isQuestComplete } from '@/domain/quest/quest';
import { generateQuest, type GenerationContext } from '@/procgen/quest';
import { grantXp } from '@/domain/player/progression';
import { recordWorldEvent } from '@/narrative/eventService';
import { relationshipWith } from '@/narrative/memoryService';
import { resolveProblem } from '@/sim/worldDirector';
import { generateItem } from '@/procgen/loot';
import { addItem } from '@/domain/items/inventory';

const FINGERPRINT_MEMORY = 40;
const QUEST_COOLDOWN_DAYS = 2;

function buildContext(state: GameState, npc: NpcId | null): GenerationContext | null {
  const location = state.locations[state.player.currentLocationId];
  const locationState = state.locationStates[state.player.currentLocationId];
  if (!location || !locationState) return null;
  const region = state.regions[location.regionId];
  if (!region) return null;

  const available = npc ? [state.npcs[npc]].filter((entry): entry is NonNullable<typeof entry> => !!entry) : npcsAt(state, location.id);

  return {
    gameDay: state.world.gameDay,
    playerLevel: state.player.level,
    location,
    locationState,
    region,
    availableNpcs: available,
    recentEvents: state.events.slice(-20).reverse(),
    recentFingerprints: state.world.recentFingerprints,
    npcsRecentlyInvolved: Object.values(state.quests)
      .filter((quest) => quest.state === 'active' || quest.state === 'offered')
      .map((quest) => quest.giverNpcId)
      .filter((id): id is string => !!id),
    activeQuestTypes: Object.values(state.quests).filter((quest) => quest.state === 'active').map((quest) => quest.type),
    relationships: state.relationships,
    neighbourLocations: location.connectedLocationIds
      .map((id) => state.locations[id])
      .filter((entry): entry is NonNullable<typeof entry> => !!entry),
  };
}

/** Offers a quest from this NPC, or null when they have nothing right now. */
export function offerQuestFrom(state: GameState, npcId: NpcId, bus?: EventBus): Quest | null {
  const npc = state.npcs[npcId];
  if (!npc || !npc.alive) return null;

  const existing = Object.values(state.quests).find(
    (quest) => quest.giverNpcId === npcId && (quest.state === 'offered' || quest.state === 'active'),
  );
  if (existing) return existing.state === 'offered' ? existing : null;
  if (state.world.gameDay - npc.lastQuestDay < QUEST_COOLDOWN_DAYS) return null;

  const context = buildContext(state, npcId);
  if (!context) return null;

  const rng = new SeededRandom(`${state.world.seed}:quest:${npcId}:${state.world.gameDay}`, 'quest');
  const result = generateQuest(rng, context);
  if (!result) return null;

  state.quests[result.quest.id] = result.quest;
  state.world.recentFingerprints = pushCapped(state.world.recentFingerprints, result.quest.fingerprint, FINGERPRINT_MEMORY);
  npc.lastQuestDay = state.world.gameDay;
  bus?.emit('QUEST_OFFERED', { questId: result.quest.id, npcId });
  return result.quest;
}

export function acceptQuest(state: GameState, questId: QuestId, bus?: EventBus): boolean {
  const quest = state.quests[questId];
  if (!quest || quest.state !== 'offered') return false;
  quest.state = 'active';
  bus?.emit('QUEST_ACCEPTED', { questId });
  return true;
}

export function abandonQuest(state: GameState, questId: QuestId, bus?: EventBus): boolean {
  const quest = state.quests[questId];
  if (!quest || quest.state !== 'active') return false;
  quest.state = 'failed';
  bus?.emit('QUEST_FAILED', { questId, reason: 'abandonada' });

  if (quest.giverNpcId) {
    recordWorldEvent(state, {
      type: 'questFailed',
      locationId: quest.locationId,
      participantIds: [quest.giverNpcId],
      cause: 'missão abandonada',
      consequences: ['a confiança diminuiu'],
      importance: 38,
      summary: `Você abandonou "${quest.title}".`,
      memory: { memoryType: 'promiseBroken', emotionalWeight: -18, trustImpact: -16, fearImpact: 0, respectImpact: -8 },
      tags: ['quest'],
    }, bus);
  }
  return true;
}

/** Event-driven objective progress: nothing polls, everything reacts. */
export function progressObjectives(
  state: GameState,
  match: { kind: QuestObjective['kind']; targetRef: string; amount?: number },
  bus?: EventBus,
): QuestId[] {
  const touched: QuestId[] = [];
  for (const quest of Object.values(state.quests)) {
    if (quest.state !== 'active') continue;
    for (const objective of quest.objectives) {
      if (objective.done || objective.kind !== match.kind) continue;
      if (objective.targetRef !== match.targetRef) continue;
      objective.current = clamp(objective.current + (match.amount ?? 1), 0, objective.required);
      objective.done = objective.current >= objective.required;
      if (objective.done && objective.revealsCause) quest.causeRevealed = true;
      bus?.emit('QUEST_OBJECTIVE_PROGRESS', { questId: quest.id, objectiveId: objective.id, current: objective.current });
      touched.push(quest.id);
    }
  }
  return touched;
}

export interface QuestCompletionResult {
  ok: boolean;
  xp: number;
  gold: number;
  itemIds: string[];
  levelsGained: number;
}

export function completeQuest(state: GameState, questId: QuestId, bus?: EventBus): QuestCompletionResult {
  const quest = state.quests[questId];
  const empty = { ok: false, xp: 0, gold: 0, itemIds: [] as string[], levelsGained: 0 };
  if (!quest || quest.state !== 'active' || !isQuestComplete(quest)) return empty;

  quest.state = 'completed';
  state.player.stats.questsCompleted += 1;

  const levelUp = grantXp(state.player, quest.rewards.xp);
  state.player.gold += quest.rewards.gold;

  // A reward item worthy of the quest level, occasionally with a real origin.
  const rng = new SeededRandom(`${state.world.seed}:questreward:${quest.id}`, 'loot');
  const itemIds: string[] = [];
  if (rng.bool(0.65)) {
    const item = generateItem(rng, {
      itemLevel: quest.level + 1,
      luck: state.player.attributes.luck,
      minRarity: quest.type === 'dungeon' ? 'rare' : 'uncommon',
      classHint: state.player.classId,
    }, quest.giverNpcId ? { previousOwnerNpcId: quest.giverNpcId, lore: `Pertenceu a alguém ligado a "${quest.title}".` } : undefined);
    itemIds.push(addItem(state.player, state.items, item));
    bus?.emit('ITEM_ACQUIRED', { itemId: item.id, source: 'quest' });
  }

  for (const reward of quest.rewards.reputation) {
    applyReputation(state, reward, bus);
  }

  if (quest.giverNpcId) {
    recordWorldEvent(state, {
      type: 'questCompleted',
      locationId: quest.locationId,
      participantIds: [quest.giverNpcId],
      cause: quest.problem,
      consequences: [quest.consequence],
      importance: 58,
      summary: `Você concluiu "${quest.title}" para ${state.npcs[quest.giverNpcId]?.name ?? 'alguém'}.`,
      memory: { memoryType: 'quest', emotionalWeight: 24, trustImpact: 18, fearImpact: -2, respectImpact: 16, permanent: quest.level >= 5 },
      tags: ['quest', quest.type],
    }, bus);
  }

  // A completed quest closes the world problem that produced it.
  const locationState = state.locationStates[quest.locationId];
  const relatedProblem = locationState?.activeProblems.find(
    (problem) => !problem.resolved && quest.problem.includes(problem.summary.slice(0, 18)),
  );
  if (relatedProblem) resolveProblem(state, quest.locationId, relatedProblem.id, bus);

  bus?.emit('QUEST_COMPLETED', { questId, npcId: quest.giverNpcId });
  return { ok: true, xp: quest.rewards.xp, gold: quest.rewards.gold, itemIds, levelsGained: levelUp.levelsGained };
}

export function chooseQuestBranch(state: GameState, questId: QuestId, choiceId: string, bus?: EventBus): boolean {
  const quest = state.quests[questId];
  const choice = quest?.choices.find((entry) => entry.id === choiceId);
  if (!quest || !choice) return false;

  quest.chosenChoiceId = choiceId;
  for (const objective of quest.objectives) {
    if (objective.kind === 'choose') {
      objective.current = objective.required;
      objective.done = true;
    }
  }

  for (const effect of choice.effects.relationship ?? []) {
    const relationship = relationshipWith(state, effect.npcId);
    state.relationships[effect.npcId] = {
      ...relationship,
      trust: clamp(relationship.trust + effect.trust, -100, 100),
      affinity: clamp(relationship.affinity + effect.affinity, -100, 100),
      hostility: clamp(relationship.hostility + (effect.hostility ?? 0), -100, 100),
    };
  }
  for (const reward of choice.effects.reputation ?? []) applyReputation(state, reward, bus);
  if (choice.effects.problemResolvedId) resolveProblem(state, quest.locationId, choice.effects.problemResolvedId, bus);

  recordWorldEvent(state, {
    type: 'factionShift',
    locationId: quest.locationId,
    participantIds: quest.giverNpcId ? [quest.giverNpcId] : [],
    cause: `escolha em "${quest.title}"`,
    consequences: [choice.consequenceSummary],
    importance: 62,
    summary: `Você decidiu: ${choice.label}. ${choice.consequenceSummary}`,
    tags: ['choice', quest.type],
  }, bus);
  return true;
}

export function applyReputation(
  state: GameState,
  reward: { scope: 'global' | 'location' | 'faction'; targetId: string | null; amount: number },
  bus?: EventBus,
): void {
  const reputation = state.player.reputation;
  if (reward.scope === 'global') {
    reputation.global = clamp(reputation.global + reward.amount, -100, 100);
    return;
  }
  if (reward.scope === 'location' && reward.targetId) {
    reputation.byLocation[reward.targetId] = clamp((reputation.byLocation[reward.targetId] ?? 0) + reward.amount, -100, 100);
    return;
  }
  if (reward.scope === 'faction' && reward.targetId) {
    const next = clamp((reputation.byFaction[reward.targetId] ?? 0) + reward.amount, -100, 100);
    reputation.byFaction[reward.targetId] = next;
    const factionState = state.factionStates[reward.targetId];
    if (factionState) factionState.reputationWithPlayer = next;
    bus?.emit('FACTION_REPUTATION_CHANGED', { factionId: reward.targetId, delta: reward.amount, value: next });

    // A faction's enemies dislike what its friends applaud.
    for (const enemyId of factionState?.enemyIds ?? []) {
      const enemyValue = clamp((reputation.byFaction[enemyId] ?? 0) - Math.round(reward.amount * 0.5), -100, 100);
      reputation.byFaction[enemyId] = enemyValue;
      const enemyState = state.factionStates[enemyId];
      if (enemyState) enemyState.reputationWithPlayer = enemyValue;
    }
  }
}
